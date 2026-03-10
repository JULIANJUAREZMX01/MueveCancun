with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

new_js = """  // ── QR Scanner ──
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
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyz0123456789 .,#-:/()áéíóúÁÉÍÓÚ$\\n',
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
    const phoneMatch = text.match(/(?:tel[.:]\\s*)?(?:\\+?52\\s*)?(\\d{3}[\\s\\-]?\\d{3}[\\s\\-]?\\d{4}|\\d{10})/i);
    if (phoneMatch) result.clientPhone = phoneMatch[1].replace(/[\\s\\-]/g, '');

    // Monto
    const amountMatch = text.match(/(?:pago|cobro|total|monto|precio|costo)[:\\s]*\\?\\s*(\\d+(?:\\.\\d{1,2})?)/i);
    if (amountMatch) result.income = parseFloat(amountMatch[1]);

    // Dirección (línea que contiene palabras de vialidad mexicana)
    const addrMatch = text.match(/(?:av(?:enida)?\\.?|calle|blvd|boulevard|carr\\.?|carretera|col\\.?|colonia|sm\\s*\\d|supermanzana|mz\\s*\\d|manzana|lote|lt\\s*\\d)[\\s.]+[^\\n]{8,}/i);
    if (addrMatch) result.address = addrMatch[0].trim();

    // Notas
    const notesMatch = text.match(/(?:nota[s]?|instrucciones|aviso)[:\\s]+([^\\n]{5,})/i);
    if (notesMatch) result.note = notesMatch[1].trim();

    // Nombre (primera línea que parece nombre propio)
    const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}$/.test(line) && line !== result.address) {
        result.clientName = line;
        break;
      }
    }

    // Si no encontró dirección estructurada, usar la línea más larga que no sea nombre/tel/monto
    if (!result.address) {
      const longestLine = lines
        .filter(l => l.length > 15 && !/^\\d{10}$/.test(l) && l !== result.clientName)
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
"""

replacement_marker = "import type { Stop } from '../lib/idb';"

if replacement_marker in content:
    new_content = content.replace(replacement_marker, f"{replacement_marker}\n\n{new_js}")
    with open('src/pages/pedidos.astro', 'w') as f:
        f.write(new_content)
    print("JS logic added successfully.")
else:
    print("Could not find replacement marker.")
