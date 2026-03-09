# Prompt Jules — P3.2: QR + OCR Scanner

> **Para Jules:** Lee este archivo completo. Trabaja en rama `jules/p3-2-qr-ocr-{id}`.
> PR hacia `main`. NUNCA push directo a `main`.
> **Este prompt depende de P3.1 completado** — `geocodeAddress()` debe existir en `src/lib/idb.ts`.

---

## 0. Contexto y problema a resolver

El tab "QR" en `/pedidos` muestra "Próximamente disponible" con un ícono decorativo.
No activa la cámara, no escanea nada, no extrae datos.

El repartidor real recibe pedidos por WhatsApp: fotos de chats, capturas de pantalla con
direcciones, notas con datos del cliente. También recibe paquetes con etiquetas QR.

**Lo que se necesita:**
1. **Modo QR** — leer códigos QR en tiempo real con la cámara
2. **Modo OCR** — tomar foto o subir imagen → extraer texto → parsear dirección y datos del pedido

Antes de escribir código, Jules debe:

1. **Leer** `src/pages/pedidos.astro` completo — especialmente el bloque `mode-qr` (líneas 98-106) y la función `saveStop()` y `switchMode()`
2. **Investigar** y comparar las librerías disponibles:
   - `jsQR` vs `@zxing/browser` vs `html5-qrcode` para QR
   - `Tesseract.js` vs `@google-cloud/vision` (requiere API key) para OCR
   - Peso bundle, soporte Android, velocidad de detección
3. **Analizar** el flujo de `getUserMedia` en móviles Android:
   - `facingMode: 'environment'` para cámara trasera
   - Permisos de cámara: `navigator.mediaDevices.getUserMedia`
   - Manejo de errores: usuario deniega, no hay cámara, contexto no-HTTPS
4. **Decidir** qué campos extraer de texto libre (OCR) y cómo parsearlos con regex

---

## 1. Análisis previo requerido

### 1.1 Comparativa de librerías QR — Jules debe investigar y documentar

| Librería | Tamaño gzip | Velocidad | Android | Worker | Decisión |
|---------|-------------|-----------|---------|--------|---------|
| `jsQR` | ~24KB | Buena | ✅ | No | **Preferida** |
| `@zxing/browser` | ~350KB | Mejor | ✅ | Sí | Demasiado pesada |
| `html5-qrcode` | ~500KB | Buena | ✅ | Sí | Demasiado pesada |

**Decisión:** `jsQR` — mínima, vanilla, sin framework, funciona directo en canvas.
Investigar si está disponible como CDN o si requiere instalación.

**Importante:** Verificar si `jsQR` se puede cargar desde CDN sin instalar npm:
```html
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
```
O bien instalar: `pnpm add jsqr` — verificar si afecta el bundle size del cliente.

### 1.2 Comparativa de librerías OCR — Jules debe investigar

| Librería | Tamaño | Idiomas | Precisión | Worker | Decisión |
|---------|--------|---------|-----------|--------|---------|
| `Tesseract.js` | ~2MB core | 100+ | Buena | ✅ (Worker) | **Preferida** |
| `@google-cloud/vision` | Pequeña | Todos | Excelente | No (API) | Requiere API key/pago |
| `easyocr` | N/A | Solo Python | — | — | No aplica |

**Decisión:** `Tesseract.js` v5 — gratuito, funciona offline, lazy-load via CDN.
Cargar **solo cuando el usuario activa el modo OCR** (no en carga inicial de página).

### 1.3 Analiza el flujo de permisos de cámara

```javascript
// El código mínimo para activar cámara trasera:
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: { ideal: 'environment' },  // Cámara trasera en móvil
    width:  { ideal: 1280 },
    height: { ideal: 720  },
  }
});
```

Casos de fallo que Jules debe manejar:
- `NotAllowedError` — usuario denegó cámara → mostrar mensaje claro con instrucciones
- `NotFoundError` — no hay cámara (laptop sin webcam, dispositivo raro) → mostrar fallback de subir imagen
- `NotSupportedError` — contexto no es HTTPS → en localhost funciona, en producción Render siempre es HTTPS ✅
- `OverconstrainedError` — cámara trasera no disponible → reintentar con cámara frontal

### 1.4 Analiza qué información extraer con regex del texto OCR

Texto crudo de un mensaje de WhatsApp escaneado:
```
Entrega Ramirez
Av. Tulum #340 depto 5B
SM 4 Cancun
Tel: 9981234567
Pago: $150
Nota: tocar timbre 2 veces
```

Patrones regex a implementar:
```javascript
// Teléfono mexicano (10 dígitos con variantes)
const PHONE = /(?:tel[.:]\s*)?(?:\+?52\s*)?(?:\(?(?:998|984|999|981)\)?\s*)?(\d[\d\s\-]{8,})/i;

// Monto en pesos
const AMOUNT = /(?:pago|cobro|total|monto|precio)[:\s]*\$?\s*(\d+(?:\.\d{1,2})?)/i;

// Nombre del cliente (línea que no es dirección ni teléfono)
const NAME = /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/m;

// Notas de entrega
const NOTES = /(?:nota|notas|instrucciones|avisos?)[:\s]*(.+)/i;

// Dirección (contiene palabras clave de vialidades)
const ADDRESS = /(?:av(?:enida)?|calle|boulevard|blvd|carr|carretera|sm|supermanzana|mz|manzana|lote|lt)[\s.]+.{10,}/i;
```

---

## 2. Estructura a implementar

### 2.1 Reemplazar el bloque `mode-qr` en `pedidos.astro` HTML

Reemplazar completamente el div `id="mode-qr"` actual (que solo dice "Próximamente") con:

```html
<div id="mode-qr" class="mode-panel" style="display:none;">

  <!-- Sub-tabs: QR Camera | OCR Foto -->
  <div class="scan-tabs" role="group" aria-label="Método de escaneo">
    <button class="scan-tab active" data-scan="qr"  aria-pressed="true">
      📷 Escanear QR
    </button>
    <button class="scan-tab"        data-scan="ocr" aria-pressed="false">
      📝 Foto de pedido
    </button>
  </div>

  <!-- Panel QR: cámara en tiempo real -->
  <div id="scan-qr-panel">
    <div id="qr-video-container" style="position:relative;border-radius:var(--radius-lg);overflow:hidden;background:#000;aspect-ratio:4/3;">
      <video id="qr-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
      <canvas id="qr-canvas" style="display:none;"></canvas>
      <!-- Visor de enfoque -->
      <div id="qr-viewfinder" style="position:absolute;inset:15%;border:2px solid var(--color-primary);border-radius:8px;box-shadow:0 0 0 1000px rgba(0,0,0,0.4);"></div>
      <!-- Estado -->
      <div id="qr-status" style="position:absolute;bottom:0.75rem;left:0;right:0;text-align:center;font-size:0.75rem;font-weight:700;color:white;">
        Apunta al código QR
      </div>
    </div>
    <button id="btn-start-qr" class="btn-primary btn-md" style="width:100%;margin-top:0.75rem;">
      Activar cámara QR
    </button>
    <button id="btn-stop-qr" class="btn-secondary btn-sm" style="width:100%;margin-top:0.5rem;display:none;">
      Detener cámara
    </button>
  </div>

  <!-- Panel OCR: foto o archivo -->
  <div id="scan-ocr-panel" style="display:none;">
    <div id="ocr-preview-container" style="border-radius:var(--radius-lg);overflow:hidden;background:var(--surface-elevated);border:1px dashed var(--border-light);aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;">
      <div id="ocr-placeholder" style="text-align:center;padding:1rem;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style="color:var(--text-tertiary);margin-bottom:0.5rem;display:block;margin-inline:auto;">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <p style="font-size:0.8125rem;color:var(--text-tertiary);margin:0;">Toma o selecciona una foto del pedido</p>
      </div>
      <img id="ocr-preview-img" style="display:none;width:100%;height:100%;object-fit:contain;" alt="Vista previa" />
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.75rem;">
      <button id="btn-take-photo" class="btn-primary btn-md">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M12 7a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5m-7-1H3V6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2l-2-2H9l-2 2z"/></svg>
        Tomar foto
      </button>
      <label class="btn-secondary btn-md" style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.375rem;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
        Galería
        <input id="file-ocr" type="file" accept="image/*" capture="environment" style="display:none;" />
      </label>
    </div>

    <div id="ocr-processing" style="display:none;text-align:center;padding:1rem;">
      <div style="width:24px;height:24px;border:3px solid var(--color-primary);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 0.5rem;"></div>
      <p style="font-size:0.8125rem;color:var(--text-secondary);margin:0;">Analizando texto...</p>
    </div>
  </div>

  <!-- Resultado del escaneo -->
  <div id="scan-result" style="display:none;margin-top:0.75rem;padding:0.75rem;background:var(--color-primary-light);border:1px solid var(--color-primary);border-radius:var(--radius-lg);">
    <p style="font-size:0.75rem;font-weight:700;color:var(--text-brand);margin:0 0 0.375rem;">Datos detectados — revisa y edita:</p>
    <div id="scan-result-content" style="font-size:0.8125rem;color:var(--text-secondary);"></div>
    <button id="btn-apply-scan" class="btn-primary btn-sm" style="width:100%;margin-top:0.625rem;">
      Usar estos datos
    </button>
    <button id="btn-discard-scan" class="btn-secondary btn-sm" style="width:100%;margin-top:0.375rem;">
      Descartar
    </button>
  </div>

</div>
```

### 2.2 Lógica JavaScript en `<script>` del `pedidos.astro`

Agregar después de las importaciones existentes:

```javascript
// ── QR Scanner ──
let qrStream: MediaStream | null = null;
let qrAnimFrame: number | null = null;
let scannedData: { address?: string; clientName?: string; clientPhone?: string; note?: string; income?: number } = {};

// Cargar jsQR desde CDN solo cuando se activa el modo QR
async function loadJsQR(): Promise<any> {
  if ((window as any).jsQR) return (window as any).jsQR;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    s.onload = () => resolve((window as any).jsQR);
    s.onerror = () => reject(new Error('No se pudo cargar jsQR'));
    document.head.appendChild(s);
  });
}

async function startQRScanner() {
  const video = document.getElementById('qr-video') as HTMLVideoElement;
  const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
  const status = document.getElementById('qr-status')!;
  const btnStart = document.getElementById('btn-start-qr')!;
  const btnStop = document.getElementById('btn-stop-qr')!;

  try {
    const jsQR = await loadJsQR();

    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    video.srcObject = qrStream;
    video.style.display = 'block';
    btnStart.style.display = 'none';
    btnStop.style.display = 'block';
    status.textContent = 'Buscando código QR...';

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    function scanFrame() {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          status.textContent = '✅ QR detectado!';
          stopQRScanner();
          processQRData(code.data);
          return;
        }
      }
      qrAnimFrame = requestAnimationFrame(scanFrame);
    }

    qrAnimFrame = requestAnimationFrame(scanFrame);
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      status.textContent = '❌ Permiso de cámara denegado — actívalo en configuración';
    } else if (err.name === 'NotFoundError') {
      status.textContent = '❌ No se encontró cámara — usa el modo "Foto de pedido"';
    } else {
      status.textContent = '❌ Error al activar cámara';
    }
  }
}

function stopQRScanner() {
  if (qrAnimFrame) { cancelAnimationFrame(qrAnimFrame); qrAnimFrame = null; }
  if (qrStream) { qrStream.getTracks().forEach(t => t.stop()); qrStream = null; }
  const video = document.getElementById('qr-video') as HTMLVideoElement;
  if (video) video.srcObject = null;
  const btnStart = document.getElementById('btn-start-qr')!;
  const btnStop = document.getElementById('btn-stop-qr')!;
  if (btnStart) btnStart.style.display = 'block';
  if (btnStop)  btnStop.style.display  = 'none';
}

function processQRData(raw: string) {
  // Un QR puede contener: URL de Google Maps, vCard, texto plano, JSON
  const parsed = parseScannedText(raw);
  showScanResult(parsed, raw);
}

// ── OCR Scanner ──
async function loadTesseract(): Promise<any> {
  if ((window as any).Tesseract) return (window as any).Tesseract;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = () => resolve((window as any).Tesseract);
    s.onerror = () => reject(new Error('No se pudo cargar Tesseract'));
    document.head.appendChild(s);
  });
}

async function runOCR(imageSource: string | File) {
  const processing = document.getElementById('ocr-processing')!;
  processing.style.display = 'block';

  try {
    const Tesseract = await loadTesseract();
    const result = await Tesseract.recognize(imageSource, 'spa', {
      // Configuración para texto impreso, no manuscrito
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyz0123456789 .,#-:/()áéíóúÁÉÍÓÚ$\n',
    });

    const rawText = result.data.text;
    const parsed = parseScannedText(rawText);
    showScanResult(parsed, rawText);
  } catch {
    alert('Error al procesar la imagen. Intenta con otra foto.');
  } finally {
    processing.style.display = 'none';
  }
}

// ── Parser de texto extraído ──
function parseScannedText(raw: string): typeof scannedData {
  const text = raw.trim();
  const result: typeof scannedData = {};

  // Teléfono mexicano
  const phoneMatch = text.match(/(?:tel[.:]\s*)?(?:\+?52\s*)?(\d{3}[\s\-]?\d{3}[\s\-]?\d{4}|\d{10})/i);
  if (phoneMatch) result.clientPhone = phoneMatch[1].replace(/[\s\-]/g, '');

  // Monto
  const amountMatch = text.match(/(?:pago|cobro|total|monto|precio|costo)[:\s]*\$?\s*(\d+(?:\.\d{1,2})?)/i);
  if (amountMatch) result.income = parseFloat(amountMatch[1]);

  // Dirección (línea que contiene palabras de vialidad mexicana)
  const addrMatch = text.match(/(?:av(?:enida)?\.?|calle|blvd|boulevard|carr\.?|carretera|col\.?|colonia|sm\s*\d|supermanzana|mz\s*\d|manzana|lote|lt\s*\d)[\s.]+[^\n]{8,}/i);
  if (addrMatch) result.address = addrMatch[0].trim();

  // Notas
  const notesMatch = text.match(/(?:nota[s]?|instrucciones|aviso)[:\s]+([^\n]{5,})/i);
  if (notesMatch) result.note = notesMatch[1].trim();

  // Nombre (primera línea que parece nombre propio)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}$/.test(line) && line !== result.address) {
      result.clientName = line;
      break;
    }
  }

  // Si no encontró dirección estructurada, usar la línea más larga que no sea nombre/tel/monto
  if (!result.address) {
    const longestLine = lines
      .filter(l => l.length > 15 && !/^\d{10}$/.test(l) && l !== result.clientName)
      .sort((a, b) => b.length - a.length)[0];
    if (longestLine) result.address = longestLine;
  }

  return result;
}

function showScanResult(parsed: typeof scannedData, rawText: string) {
  scannedData = parsed;
  const resultEl = document.getElementById('scan-result')!;
  const contentEl = document.getElementById('scan-result-content')!;

  const rows = [
    parsed.address    ? `<div>📍 <strong>Dirección:</strong> ${parsed.address}</div>` : '',
    parsed.clientName ? `<div>👤 <strong>Cliente:</strong> ${parsed.clientName}</div>` : '',
    parsed.clientPhone? `<div>📞 <strong>Tel:</strong> ${parsed.clientPhone}</div>` : '',
    parsed.income     ? `<div>💰 <strong>Cobro:</strong> $${parsed.income}</div>` : '',
    parsed.note       ? `<div>📝 <strong>Nota:</strong> ${parsed.note}</div>` : '',
  ].filter(Boolean);

  if (rows.length === 0) {
    contentEl.innerHTML = `<p style="color:var(--text-tertiary);">No se detectaron datos reconocibles. Texto crudo:<br/><code style="font-size:0.7rem;">${rawText.slice(0, 100)}</code></p>`;
  } else {
    contentEl.innerHTML = rows.join('');
  }

  resultEl.style.display = 'block';
}

function applyScanResult() {
  if (scannedData.address) {
    (document.getElementById('input-address') as HTMLTextAreaElement).value = scannedData.address;
  }
  if (scannedData.clientName) {
    (document.getElementById('input-client-name') as HTMLInputElement).value = scannedData.clientName;
  }
  if (scannedData.clientPhone) {
    (document.getElementById('input-client-phone') as HTMLInputElement).value = scannedData.clientPhone;
  }
  if (scannedData.income) {
    (document.getElementById('input-income') as HTMLInputElement).value = String(scannedData.income);
  }
  if (scannedData.note) {
    (document.getElementById('input-note') as HTMLInputElement).value = scannedData.note;
  }

  // Cambiar al modo texto para mostrar los datos extraídos
  switchMode('text');
  updateSaveBtn();
  document.getElementById('scan-result')!.style.display = 'none';
}
```

### 2.3 Agregar event listeners en `init()`

```javascript
// QR Scanner events
document.getElementById('btn-start-qr')?.addEventListener('click', startQRScanner);
document.getElementById('btn-stop-qr')?.addEventListener('click', stopQRScanner);
document.getElementById('btn-apply-scan')?.addEventListener('click', applyScanResult);
document.getElementById('btn-discard-scan')?.addEventListener('click', () => {
  document.getElementById('scan-result')!.style.display = 'none';
  scannedData = {};
});

// Sub-tabs QR vs OCR
document.querySelectorAll('.scan-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = (tab as HTMLElement).dataset.scan!;
    document.querySelectorAll('.scan-tab').forEach(t => {
      t.classList.toggle('active', t === tab);
      (t as HTMLButtonElement).setAttribute('aria-pressed', String(t === tab));
    });
    const qrPanel  = document.getElementById('scan-qr-panel')!;
    const ocrPanel = document.getElementById('scan-ocr-panel')!;
    qrPanel.style.display  = mode === 'qr'  ? 'block' : 'none';
    ocrPanel.style.display = mode === 'ocr' ? 'block' : 'none';
    if (mode === 'ocr') stopQRScanner();  // Detener cámara QR si se cambia a OCR
  });
});

// OCR: tomar foto
document.getElementById('btn-take-photo')?.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    // Capturar frame
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    stream.getTracks().forEach(t => t.stop());
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Mostrar preview
    const img = document.getElementById('ocr-preview-img') as HTMLImageElement;
    const placeholder = document.getElementById('ocr-placeholder')!;
    img.src = dataUrl;
    img.style.display = 'block';
    placeholder.style.display = 'none';

    await runOCR(dataUrl);
  } catch {
    alert('No se pudo acceder a la cámara.');
  }
});

// OCR: subir archivo de galería
document.getElementById('file-ocr')?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const img = document.getElementById('ocr-preview-img') as HTMLImageElement;
  const placeholder = document.getElementById('ocr-placeholder')!;
  img.src = URL.createObjectURL(file);
  img.style.display = 'block';
  placeholder.style.display = 'none';

  await runOCR(file);
});
```

### 2.4 Cerrar cámara al cerrar el bottom sheet

En `closeAddSheet()`, agregar:
```javascript
function closeAddSheet() {
  stopQRScanner();  // ← Agregar esta línea
  // ... resto del código existente
}
```

### 2.5 Agregar CSS para los nuevos elementos

```css
/* Scan sub-tabs */
.scan-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  background: var(--surface-input);
  border-radius: var(--radius-lg);
  padding: 0.25rem;
}

.scan-tab {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.scan-tab.active {
  background: var(--surface-card);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 3. Pruebas que Jules debe ejecutar

### 3.1 Build TypeScript
```bash
pnpm build
```
**Criterio:** Sin errores de tipo. El modo QR tiene variables tipadas correctamente.

### 3.2 Test de jsQR (manual)
```bash
# Verificar que el CDN de jsQR es accesible
curl -I "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"
# Esperado: HTTP/2 200
```

### 3.3 Test de Tesseract.js (manual en navegador)
```javascript
// En DevTools console:
const s = document.createElement('script');
s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
document.head.appendChild(s);
// Esperar 3 segundos
const result = await Tesseract.recognize(
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/E_text.jpg/320px-E_text.jpg',
  'spa'
);
console.log(result.data.text);
// Debe imprimir texto reconocido
```

### 3.4 Test de flujo QR completo (en dispositivo o DevTools Mobile)
1. `pnpm dev`
2. Abrir en `https://localhost:4321` (requiere HTTPS para cámara — o usar ngrok/Render)
3. Ir a `/pedidos` → Agregar → tab QR → Escanear QR
4. Hacer clic en "Activar cámara QR"
5. **Verificar:** La cámara se activa, el visor verde aparece
6. Apuntar a cualquier código QR (puede ser de un producto)
7. **Verificar:** "QR detectado!" aparece y la cámara se detiene
8. **Verificar:** El panel "Datos detectados" muestra el contenido del QR
9. Hacer clic en "Usar estos datos"
10. **Verificar:** El campo de dirección (o el que corresponda) se rellena

### 3.5 Test de flujo OCR completo
1. Ir a `/pedidos` → Agregar → tab QR → sub-tab "Foto de pedido"
2. Preparar imagen con texto: dirección "Av. Tulum 340, SM 4, Cancún" + teléfono "9981234567"
3. Subir la imagen desde galería
4. **Verificar:** "Analizando texto..." aparece mientras procesa
5. **Verificar:** El panel resultado muestra la dirección y el teléfono detectados
6. Hacer clic en "Usar estos datos"
7. **Verificar:** Campos rellenados, tab cambia a "Texto"

### 3.6 Test de errores de cámara
```javascript
// Simular NotAllowedError en DevTools:
// Chrome → Configuración → Privacidad → Cámara → Bloquear localhost
// Luego intentar activar cámara
// Verificar: mensaje "Permiso de cámara denegado" en lugar de crash
```

### 3.7 Test de cierre limpio
1. Activar cámara QR
2. Cerrar el bottom sheet sin escanear
3. **Verificar:** La cámara se detiene (no sigue en background)
4. Abrir DevTools → Application → Media — verificar que no hay streams activos

---

## 4. Verificaciones de calidad antes del PR

- [ ] `pnpm build` sin errores TypeScript
- [ ] `pnpm lint` sin errores ESLint
- [ ] jsQR y Tesseract cargados lazy (solo cuando el usuario activa el modo)
- [ ] Cámara detenida correctamente en: cierre de sheet, cambio de sub-tab, detener manual
- [ ] Manejo de errores: `NotAllowedError`, `NotFoundError`, `OverconstrainedError`
- [ ] `parseScannedText()` extrae correctamente: dirección, teléfono, monto, notas
- [ ] `applyScanResult()` rellena todos los campos y cambia a modo `text`
- [ ] El tab QR ya no muestra "Próximamente disponible"
- [ ] `updateSaveBtn()` se llama después de `applyScanResult()` para habilitar el botón guardar
- [ ] No se rompe nada de los modos existentes (texto, coords, link)

---

## 5. Entregables del PR

| Archivo | Cambio |
|---------|--------|
| `src/pages/pedidos.astro` | Bloque HTML `mode-qr` completo, funciones QR+OCR, eventos en `init()`, CSS nuevo, cierre de cámara en `closeAddSheet()` |

**NO crear archivos nuevos. NO modificar `src/lib/idb.ts` (a menos que P3.1 no esté mergeado aún).**

---

## 6. Mensaje de commit esperado

```
feat(P3.2): QR scanner + OCR de texto para captura de paradas

- jsQR lazy-load desde CDN: escaneo QR en tiempo real con cámara trasera
- Tesseract.js lazy-load: OCR de fotos con texto de pedidos de WhatsApp
- parseScannedText(): extrae dirección, teléfono, monto, notas via regex
- applyScanResult(): rellena campos del formulario automáticamente
- Sub-tabs 'Escanear QR' / 'Foto de pedido' dentro del modo QR
- Manejo de errores de cámara: NotAllowed, NotFound, contexto sin HTTPS
- Cámara se detiene automáticamente al cerrar el bottom sheet
```
