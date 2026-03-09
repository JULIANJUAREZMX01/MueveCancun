# Prompt Jules — P4: Validación + Autocompletar de Direcciones

> **Para Jules:** Este módulo requiere P3.1 completado (Nominatim + `geocodeAddress()` en `src/lib/idb.ts`).
> Trabaja en rama `jules/p4-address-validation-{id}`. PR hacia `main`.
> NUNCA push directo a `main`.

---

## 0. Contexto y objetivo

P3.1 geocodifica después de guardar la parada. P4 mejora la experiencia ANTES de guardar:
- Mientras el usuario escribe la dirección, ve sugerencias en tiempo real
- Puede seleccionar una sugerencia → la dirección y las coordenadas se completan juntas
- Las coordenadas se guardan desde el inicio (sin esperar la geocodificación post-guardado)
- Las direcciones no reconocidas por Nominatim muestran advertencia

**Diferencia con P3.1:**
- P3.1: guardar primero → geocodificar después (en background)
- P4: geocodificar mientras escribe → seleccionar → guardar con coords ya incluidas

---

## 1. Análisis previo requerido

### 1.1 Analiza la API de Nominatim para autocompletar

Nominatim ofrece dos endpoints útiles:

**Search (usado en P3.1):**
```
GET /search?q=Av+Tulum+123&format=json&limit=5&countrycodes=mx
```

**Structured query (más preciso para Cancún):**
```
GET /search?street=Av+Tulum+123&city=Cancun&state=Quintana+Roo&country=mx&format=json&limit=5
```

**Opción alternativa: Photon (Komoot)**
```
GET https://photon.komoot.io/api/?q=Av+Tulum+123+Cancun&limit=5&lang=es&bbox=-87.3,21.0,-86.7,21.3
```
- Sin rate-limit explícito (más permisivo que Nominatim)
- Respuesta GeoJSON
- Soporta bounding box para limitar a Cancún

Jules debe investigar ambas opciones, probarlas con `curl` con direcciones reales de Cancún,
comparar la calidad de los resultados y **justificar cuál usar o combinar**.

### 1.2 Analiza el patrón debounce

El autocompletar debe esperar a que el usuario deje de escribir antes de hacer el request:

```javascript
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSearch(query: string) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchAddress(query);
  }, 400);  // 400ms de espera
}
```

¿Por qué 400ms y no 500ms (P3.1)? Porque el autocompletar debe sentirse más rápido que
la geocodificación post-guardado. Investigar cuál es el sweet spot para Android gama media.

### 1.3 Analiza el bounding box de Cancún

Para limitar sugerencias al área metropolitana de Cancún:
```
Suroeste: lat=20.8, lng=-87.3
Noreste:  lat=21.4, lng=-86.6
```

En Nominatim: `&viewbox=-87.3,20.8,-86.6,21.4&bounded=1`
En Photon: `&bbox=-87.3,20.8,-86.6,21.4`

Investigar qué pasa con paradas en Playa del Carmen o Isla Mujeres (también área de reparto).
Decidir: ¿bounded estricto o soft (preferencia por el área)?

### 1.4 Analiza las abreviaturas locales de Cancún

El repartidor escribe "SM 5" en lugar de "Supermanzana 5". Nominatim puede no reconocer la abreviatura.

Diccionario de expansiones a investigar y documentar:
- `SM` → `Supermanzana`
- `MZ` → `Manzana`
- `LT` → `Lote`
- `AV` → `Avenida`
- `BLVD` → `Boulevard`
- `COL` → `Colonia`
- `CARR` → `Carretera`
- `ESQ` → `Esquina con`

Jules debe crear una función `expandCancunAbbreviations(address: string): string` y probarla.

---

## 2. Implementación requerida

### 2.1 Agregar función `searchAddressSuggestions` en `src/lib/idb.ts`

```typescript
export interface AddressSuggestion {
  displayName: string;   // Texto para mostrar al usuario
  shortName:   string;   // Versión corta (sin país/estado)
  lat:         number;
  lng:         number;
  importance:  number;   // 0-1, para ordenar resultados
}

// Expansiones de abreviaturas comunes en Cancún
function expandCancunAbbreviations(address: string): string {
  return address
    .replace(/\bSM\b/gi, 'Supermanzana')
    .replace(/\bMZ\b/gi, 'Manzana')
    .replace(/\bLT\b/gi, 'Lote')
    .replace(/\bAV\.?\b/gi, 'Avenida')
    .replace(/\bBLVD\.?\b/gi, 'Boulevard')
    .replace(/\bCOL\.?\b/gi, 'Colonia')
    .replace(/\bCARR\.?\b/gi, 'Carretera')
    .replace(/\bESQ\.?\b/gi, 'Esquina con');
}

let _lastSuggestCall = 0;

export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 4) return [];  // No buscar para < 4 caracteres

  // Rate limit (compartido con geocodeAddress si aplica)
  const elapsed = Date.now() - _lastSuggestCall;
  if (elapsed < 400) await new Promise(r => setTimeout(r, 400 - elapsed));
  _lastSuggestCall = Date.now();

  const expanded = expandCancunAbbreviations(trimmed);
  const q = encodeURIComponent(`${expanded}, Cancún, Quintana Roo`);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=mx&viewbox=-87.3,20.8,-86.6,21.4&bounded=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MueveReparto/1.0 (https://mueverepartoencancun.onrender.com)' },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return data.map((item: any) => {
      const addr = item.address || {};
      // Construir nombre corto sin país/estado
      const parts = [
        addr.road || addr.pedestrian,
        addr.house_number,
        addr.suburb || addr.neighbourhood,
        addr.city || 'Cancún',
      ].filter(Boolean);

      return {
        displayName: item.display_name,
        shortName:   parts.join(', ') || item.display_name.split(',').slice(0, 3).join(','),
        lat:         parseFloat(item.lat),
        lng:         parseFloat(item.lon),
        importance:  parseFloat(item.importance || '0'),
      } as AddressSuggestion;
    });
  } catch {
    return [];
  }
}
```

### 2.2 Modificar el textarea de dirección en `pedidos.astro` HTML

El input `id="input-address"` necesita un contenedor con la lista de sugerencias:

```html
<!-- Text mode — reemplazar el bloque existente -->
<div id="mode-text" class="mode-panel active">
  <label class="field-label">Dirección *</label>
  <div style="position:relative;">
    <textarea id="input-address" class="input" rows="2"
              placeholder="Av. Tulum #123, SM 5, Cancún..."
              style="resize:none;border-radius:var(--radius-lg);"
              autocomplete="off" autocorrect="off" spellcheck="false"></textarea>

    <!-- Indicador de geocodificación -->
    <div id="address-geo-status" style="display:none;position:absolute;right:0.5rem;top:0.5rem;">
      <div style="width:14px;height:14px;border:2px solid var(--color-primary);border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;"></div>
    </div>

    <!-- Sugerencias dropdown -->
    <div id="address-suggestions" style="
      display:none;
      position:absolute;
      top:100%;left:0;right:0;
      background:var(--surface-elevated);
      border:1px solid var(--border-light);
      border-radius:var(--radius-lg);
      max-height:200px;overflow-y:auto;
      z-index:100;
      box-shadow:0 8px 24px rgba(0,0,0,0.3);
      margin-top:2px;">
    </div>
  </div>

  <!-- Indicador de validación -->
  <div id="address-validation" style="display:none;font-size:0.75rem;margin-top:0.25rem;display:flex;align-items:center;gap:0.25rem;"></div>
</div>
```

### 2.3 Lógica JavaScript para el autocompletar

```javascript
import { searchAddressSuggestions, geocodeAddress } from '../lib/idb';
import type { AddressSuggestion } from '../lib/idb';

let suggestDebounce: ReturnType<typeof setTimeout> | null = null;
let selectedCoords: { lat: number; lng: number } | null = null;
let selectedFromSuggestion = false;

function showSuggestions(suggestions: AddressSuggestion[]) {
  const container = document.getElementById('address-suggestions')!;

  if (suggestions.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.innerHTML = suggestions.map((s, i) => `
    <div class="suggestion-item" data-index="${i}"
         style="padding:0.625rem 0.75rem;cursor:pointer;border-bottom:1px solid var(--border-subtle);transition:background var(--transition-fast);">
      <p style="font-size:0.8125rem;font-weight:600;color:var(--text-primary);margin:0;">${s.shortName}</p>
      <p style="font-size:0.6875rem;color:var(--text-tertiary);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.displayName}</p>
    </div>`).join('');

  container.style.display = 'block';

  container.querySelectorAll('.suggestion-item').forEach((item, i) => {
    item.addEventListener('mouseenter', () => {
      (item as HTMLElement).style.background = 'var(--surface-card)';
    });
    item.addEventListener('mouseleave', () => {
      (item as HTMLElement).style.background = 'transparent';
    });
    item.addEventListener('click', () => {
      const s = suggestions[i];
      const textarea = document.getElementById('input-address') as HTMLTextAreaElement;
      textarea.value = s.shortName;
      selectedCoords = { lat: s.lat, lng: s.lng };
      selectedFromSuggestion = true;
      container.style.display = 'none';
      showAddressValidation('confirmed', `Ubicación confirmada en el mapa`);
      updateSaveBtn();
    });
  });
}

function showAddressValidation(state: 'searching' | 'confirmed' | 'not-found' | 'none', msg?: string) {
  const el = document.getElementById('address-validation')!;
  const geoStatus = document.getElementById('address-geo-status')!;

  if (state === 'none') {
    el.style.display = 'none';
    geoStatus.style.display = 'none';
    return;
  }

  if (state === 'searching') {
    geoStatus.style.display = 'block';
    el.style.display = 'none';
    return;
  }

  geoStatus.style.display = 'none';

  const colors = {
    confirmed:  'var(--color-primary)',
    'not-found': 'var(--color-warning)',
  };
  const icons = {
    confirmed: '✅',
    'not-found': '⚠️',
  };

  el.innerHTML = `<span style="color:${colors[state] || 'inherit'}">${icons[state] || ''} ${msg}</span>`;
  el.style.display = 'flex';
}

// Hook en el textarea de dirección (agregar en init())
function initAddressAutocomplete() {
  const textarea = document.getElementById('input-address') as HTMLTextAreaElement;
  const suggestContainer = document.getElementById('address-suggestions')!;

  textarea.addEventListener('input', () => {
    const val = textarea.value.trim();
    selectedFromSuggestion = false;
    selectedCoords = null;

    if (val.length < 4) {
      suggestContainer.style.display = 'none';
      showAddressValidation('none');
      updateSaveBtn();
      return;
    }

    showAddressValidation('searching');
    updateSaveBtn();

    if (suggestDebounce) clearTimeout(suggestDebounce);
    suggestDebounce = setTimeout(async () => {
      const suggestions = await searchAddressSuggestions(val);
      showSuggestions(suggestions);
      if (suggestions.length === 0) {
        showAddressValidation('not-found', 'Dirección no encontrada en el mapa — se guardará como texto');
      } else {
        showAddressValidation('none');  // Ocultar mientras hay sugerencias
      }
    }, 400);
  });

  // Cerrar sugerencias al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!textarea.contains(e.target as Node) && !suggestContainer.contains(e.target as Node)) {
      suggestContainer.style.display = 'none';
    }
  });
}
```

### 2.4 Modificar `saveStop()` para usar `selectedCoords`

```javascript
async function saveStop() {
  const address = getAddressValue();
  if (!address) return;

  // En modo texto: usar coordenadas seleccionadas de sugerencia si existen
  let lat = selectedCoords?.lat;
  let lng = selectedCoords?.lng;

  // Si no hay coords de sugerencia, usar los inputs manuales (modo coords)
  if (!lat && currentMode === 'coords') {
    const latInput = (document.getElementById('input-lat') as HTMLInputElement).value;
    const lngInput = (document.getElementById('input-lng') as HTMLInputElement).value;
    lat = latInput ? parseFloat(latInput) : undefined;
    lng = lngInput ? parseFloat(lngInput) : undefined;
  }

  const stop = {
    id:          editingId ?? generateId(),
    address,
    lat,
    lng,
    // ... resto igual
  };

  await dbPut(STORES.STOPS, stop);
  closeAddSheet();
  selectedCoords = null;
  selectedFromSuggestion = false;
  await renderStops();

  // Geocodificar en background solo si no tenemos coords
  if (!lat && !lng && currentMode === 'text') {
    const coords = await geocodeAddress(address);
    if (coords) {
      await dbPut(STORES.STOPS, { ...stop, lat: coords.lat, lng: coords.lng });
      await renderStops();
    }
  }
}
```

### 2.5 Agregar CSS

```css
/* Sugerencias de dirección */
.suggestion-item:last-child {
  border-bottom: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.suggestion-item:first-child {
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

#address-suggestions::-webkit-scrollbar {
  width: 4px;
}
#address-suggestions::-webkit-scrollbar-track {
  background: var(--surface-elevated);
}
#address-suggestions::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 2px;
}
```

---

## 3. Pruebas que Jules debe ejecutar

### 3.1 Build TypeScript
```bash
pnpm build
# Sin errores. `AddressSuggestion` tipada correctamente.
```

### 3.2 Test de la función `expandCancunAbbreviations`
```javascript
// En DevTools console:
// Importar la función (después de cargar la página)
const { searchAddressSuggestions } = await import('/src/lib/idb');

// Test directo de abreviaturas (si la función es exportada)
// Verificar manualmente con:
// Input:  "SM 5 MZ 3 LT 12 Cancun"
// Output: "Supermanzana 5 Manzana 3 Lote 12 Cancun"
```

### 3.3 Test de autocompletar en vivo
```
1. pnpm dev
2. Abrir /pedidos → Agregar
3. Escribir "Av. Tulum 3" (esperar 400ms)
4. Verificar: dropdown con sugerencias de Cancún aparece
5. Escribir "XYZ123NOEXISTE" (esperar 400ms)
6. Verificar: mensaje "⚠️ Dirección no encontrada..."
7. Escribir dirección válida → seleccionar sugerencia
8. Verificar: campo relleno, "✅ Ubicación confirmada"
9. Guardar parada
10. Abrir /reparto → verificar que la parada aparece en el mapa
```

### 3.4 Test de rate-limit con búsquedas rápidas
```
Escribir rápidamente una letra por segundo: "A", "Av", "Av.", "Av. T", "Av. Tu", "Av. Tul"
Solo la última búsqueda debe ejecutar el request (debounce 400ms)
Verificar en DevTools Network → solo 1 request por "burst" de escritura
```

### 3.5 Test con bounding box
```bash
curl -s "https://nominatim.openstreetmap.org/search?q=Paseo+de+los+Heroes+Tijuana&format=json&limit=5&countrycodes=mx&viewbox=-87.3,20.8,-86.6,21.4&bounded=1" | python3 -m json.tool
# Esperado: [] — Tijuana está fuera del bounding box de Cancún
```

### 3.6 Test offline (sugerencias desde caché)
```
1. Buscar "Av. Tulum 123" (con conexión) → seleccionar sugerencia
2. DevTools → Network → Offline
3. Guardar parada (debe funcionar sin red)
4. Verificar que las coords se guardaron
```

---

## 4. Verificaciones de calidad antes del PR

- [ ] `pnpm build` sin errores TypeScript
- [ ] `pnpm lint` sin errores
- [ ] `AddressSuggestion` interface exportada desde `src/lib/idb.ts`
- [ ] `searchAddressSuggestions()` exportada y tipada correctamente
- [ ] `expandCancunAbbreviations()` maneja SM, MZ, LT, AV, BLVD, COL, CARR, ESQ
- [ ] Debounce de 400ms para evitar exceder rate-limit de Nominatim
- [ ] Bounding box aplicado (sugerencias limitadas a zona Cancún)
- [ ] Seleccionar sugerencia → textarea actualizado + coords guardadas en `selectedCoords`
- [ ] Al guardar con sugerencia seleccionada → parada tiene lat/lng inmediatamente
- [ ] Al guardar sin sugerencia → geocodificación de background (P3.1) sigue funcionando
- [ ] Sugerencias se cierran al hacer clic fuera del textarea
- [ ] Validación visual: ✅ confirmado, ⚠️ no encontrado, spinner mientras busca
- [ ] Modo coords y modo link no activado el autocompletar

---

## 5. Entregables del PR

| Archivo | Cambio |
|---------|--------|
| `src/lib/idb.ts` | `AddressSuggestion` interface, `expandCancunAbbreviations()`, `searchAddressSuggestions()` |
| `src/pages/pedidos.astro` | HTML dropdown de sugerencias, `initAddressAutocomplete()`, `showSuggestions()`, `showAddressValidation()`, modificar `saveStop()`, CSS |

---

## 6. Mensaje de commit esperado

```
feat(P4): autocompletar de direcciones con Nominatim + validación visual

- searchAddressSuggestions() en idb.ts: Nominatim bounded a Cancún, debounce 400ms
- expandCancunAbbreviations(): SM→Supermanzana, MZ→Manzana, etc.
- Dropdown de sugerencias en tiempo real debajo del textarea de dirección
- Al seleccionar sugerencia: lat/lng se guardan sin esperar geocodificación
- Validación visual: ✅ confirmada / ⚠️ no encontrada / spinner buscando
- saveStop() usa coords de sugerencia seleccionada si existen
```
