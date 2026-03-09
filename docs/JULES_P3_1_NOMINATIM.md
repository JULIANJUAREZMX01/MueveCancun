# Prompt Jules — P3.1: Geocodificación Nominatim OSM

> **Para Jules:** Lee este archivo completo antes de escribir una sola línea.
> Trabaja en rama `jules/p3-1-nominatim-{id}`. PR hacia `main` al terminar.
> NUNCA push directo a `main`.

---

## 0. Por qué esto es crítico (lee y comprende antes de actuar)

El mapa de `/reparto` solo muestra paradas que tienen `lat` y `lng` definidos.
Las paradas capturadas en modo **Texto** no tienen coordenadas — el campo dirección
es texto plano. Resultado: el repartidor agrega 10 paradas y el mapa aparece vacío.

Antes de escribir código, Jules debe:

1. **Leer** `src/pages/pedidos.astro` completo (especialmente las funciones `saveStop()`, `getAddressValue()` y el modo `text`)
2. **Leer** `src/lib/idb.ts` completo — entender la interfaz `Stop` y cómo funciona `openDB()` / `onupgradeneeded`
3. **Leer** `src/pages/reparto.astro` — entender línea 135: `const pending = stops.filter(s => s.status !== 'completed' && s.lat && s.lng)` — aquí está el problema
4. **Investigar** la API de Nominatim: `https://nominatim.openstreetmap.org/search?q=Av+Tulum+123+Cancun&format=json&limit=1&countrycodes=mx`
   - Probar la URL con `curl` y analizar la respuesta JSON
   - Identificar los campos `lat`, `lon`, `display_name`, `importance`
   - Leer la política de uso: máx 1 req/segundo, User-Agent obligatorio
5. **Comparar** alternativas de geocodificación:
   - Nominatim (OpenStreetMap) — gratuito, rate-limited
   - Photon (Komoot) — gratuito, sin rate limit explícito, basado en OSM
   - Google Maps Geocoding — de pago, requiere API key
   - **Decisión justificada:** usar Nominatim con rate-limit cliente + caché IDB

---

## 1. Contexto del proyecto (no modificar esto)

**Stack:**
- Astro 5 + SSR (`@astrojs/node`) + Vanilla JS en `<script>` tags
- IndexedDB via `idb` 8 — helpers en `src/lib/idb.ts`
- Sin React/Vue/Svelte — solo Vanilla JS
- Tailwind CSS v3 + CSS custom properties
- Deploy: Render Node.js — `https://mueverepartoencancun.onrender.com`

**Archivos clave a modificar:**
- `src/lib/idb.ts` — agregar store `geocache` + tipos + helper `geocodeAddress()`
- `src/pages/pedidos.astro` — integrar geocodificación en `saveStop()`

**Archivos que NO debes tocar:**
- `src/pages/reparto.astro` — ya filtra por `s.lat && s.lng` correctamente
- `src/pages/home.astro`, `enviar.astro`, `metricas.astro`, `index.astro`
- `src/layouts/MainLayout.astro`
- Cualquier archivo en `backend/`
- `pnpm-lock.yaml` (no editar manualmente)

---

## 2. Análisis que Jules debe realizar antes de implementar

### 2.1 Analiza el flujo actual en `pedidos.astro`

Localiza la función `saveStop()`. Actualmente:
```javascript
const stop = {
  id: editingId ?? generateId(),
  address,        // ← texto plano, sin lat/lng
  lat: lat ? parseFloat(lat) : undefined,   // solo se llena en modo 'coords'
  lng: lng ? parseFloat(lng) : undefined,   // solo se llena en modo 'coords'
  ...
};
await dbPut(STORES.STOPS, stop);
```

**Problema:** En modo `text`, `lat` y `lng` siempre son `undefined`.

**Solución a implementar:** Después del `dbPut`, si `currentMode === 'text'` y la parada no tiene coords, disparar geocodificación asíncrona.

### 2.2 Analiza la estructura del IDB actual

En `src/lib/idb.ts`, `DB_VERSION = 1`. Agregar un nuevo store requiere **incrementar la versión** a `2` y manejar `onupgradeneeded` sin romper datos existentes.

Antes de implementar, verifica: ¿Qué pasa si un usuario ya tiene la base de datos v1 y se actualiza a v2? El `onupgradeneeded` solo se ejecuta cuando la versión cambia, y los stores existentes se conservan. Solo se agrega el store nuevo.

### 2.3 Analiza el rate-limit de Nominatim

La política oficial de Nominatim:
- Máx 1 request por segundo
- Header `User-Agent` obligatorio y descriptivo
- No bulk geocoding (no se pueden hacer 20 llamadas seguidas)
- Caché del lado cliente es obligatoria

**Implementar:**
- Variable `lastNominatimCall: number = 0`
- Antes de cada llamada: `const elapsed = Date.now() - lastNominatimCall`
- Si `elapsed < 1000`: `await sleep(1000 - elapsed)`
- Después: `lastNominatimCall = Date.now()`

### 2.4 Analiza el esquema de caché óptimo

El caché en IDB debe:
- Usar la dirección normalizada (lowercase, sin acentos) como clave
- Almacenar `lat`, `lng`, `displayName`, `timestamp`
- Expirar entradas con más de 30 días (el mapa de Cancún cambia poco)
- Buscar en caché antes de llamar a Nominatim

---

## 3. Implementación requerida

### 3.1 Modificar `src/lib/idb.ts`

**a) Agregar interfaz `GeoCache`:**
```typescript
export interface GeoCache {
  key: string;      // dirección normalizada (trim + lowercase)
  lat: number;
  lng: number;
  displayName: string;
  timestamp: number; // Date.now()
}
```

**b) Agregar `STORES.GEO` en el objeto STORES:**
```typescript
export const STORES = {
  STOPS:    'stops',
  SYNC:     'sync_queue',
  TRACKING: 'tracking_points',
  STATS:    'daily_stats',
  GEO:      'geocache',        // ← AGREGAR
} as const;
```

**c) Incrementar `DB_VERSION` de `1` a `2` y agregar el store en `onupgradeneeded`:**

```typescript
const DB_VERSION = 2;  // era 1

req.onupgradeneeded = (e) => {
  const db = (e.target as IDBOpenDBRequest).result;
  const oldVersion = e.oldVersion;

  // Stores v1 (solo si no existen — para instalaciones nuevas)
  if (!db.objectStoreNames.contains(STORES.STOPS)) { /* ... igual que antes */ }
  if (!db.objectStoreNames.contains(STORES.SYNC)) { /* ... */ }
  if (!db.objectStoreNames.contains(STORES.TRACKING)) { /* ... */ }
  if (!db.objectStoreNames.contains(STORES.STATS)) { /* ... */ }

  // Store v2 (solo si oldVersion < 2)
  if (oldVersion < 2 && !db.objectStoreNames.contains(STORES.GEO)) {
    db.createObjectStore(STORES.GEO, { keyPath: 'key' });
  }
};
```

**d) Agregar helper `geocodeAddress(address: string): Promise<{lat: number, lng: number} | null>`:**

```typescript
let _lastNominatimCall = 0;

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const key = address.trim().toLowerCase();
  if (!key || key.length < 5) return null;

  // 1. Buscar en caché IDB
  const cached = await dbGet<GeoCache>(STORES.GEO, key);
  if (cached) {
    const AGE_30_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - cached.timestamp < AGE_30_DAYS) {
      return { lat: cached.lat, lng: cached.lng, displayName: cached.displayName };
    }
    // Caché expirada, continuar
  }

  // 2. Rate limit: esperar si la última llamada fue hace < 1 segundo
  const elapsed = Date.now() - _lastNominatimCall;
  if (elapsed < 1000) {
    await new Promise(r => setTimeout(r, 1000 - elapsed));
  }
  _lastNominatimCall = Date.now();

  // 3. Llamar a Nominatim
  try {
    const q = encodeURIComponent(`${address}, Cancún, Quintana Roo, México`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=mx`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MueveReparto/1.0 (https://mueverepartoencancun.onrender.com)' },
      signal: AbortSignal.timeout(5000),  // 5 segundos máximo
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;

    const result = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };

    // 4. Guardar en caché
    await dbPut<GeoCache>(STORES.GEO, {
      key,
      lat: result.lat,
      lng: result.lng,
      displayName: result.displayName,
      timestamp: Date.now(),
    });

    return result;
  } catch {
    return null;  // Timeout, sin red, error Nominatim — fallback gracioso
  }
}
```

### 3.2 Modificar `src/pages/pedidos.astro`

**a) Importar `geocodeAddress` en el script:**
```javascript
import { dbPut, dbDelete, dbGetAll, getStops, completeStop, generateId, STORES, geocodeAddress } from '../lib/idb';
```

**b) Modificar `saveStop()` para geocodificar después de guardar:**

```javascript
async function saveStop() {
  const address = getAddressValue();
  if (!address) return;

  // Construir objeto stop igual que antes
  const stop = { ... };

  // Guardar primero (respuesta inmediata al usuario)
  await dbPut(STORES.STOPS, stop);
  closeAddSheet();
  await renderStops();

  // Geocodificar en segundo plano SOLO en modo texto y si no tiene coords
  if (currentMode === 'text' && !stop.lat && !stop.lng) {
    showGeocodingIndicator(stop.id, true);
    const coords = await geocodeAddress(address);
    if (coords) {
      await dbPut(STORES.STOPS, { ...stop, lat: coords.lat, lng: coords.lng });
      await renderStops();  // Re-render con coords
    }
    showGeocodingIndicator(stop.id, false);
  }
}
```

**c) Agregar indicador visual de geocodificación:**

En la tarjeta de parada generada por `renderStops()`, si la parada no tiene coords y está pending:
```html
<span id="geo-${stop.id}" class="geo-indicator" style="display:none;">
  <svg ... /> <!-- spinner -->
  Buscando coords...
</span>
```

Función `showGeocodingIndicator(id, show)`:
```javascript
function showGeocodingIndicator(id, show) {
  const el = document.getElementById(`geo-${id}`);
  if (el) el.style.display = show ? 'flex' : 'none';
}
```

**d) Botón "Geocodificar pendientes"** — al abrir la página, si hay paradas sin coords y hay conexión:
```javascript
async function geocodePendingStops() {
  if (!navigator.onLine) return;
  const stops = await getStops();
  const pending = stops.filter(s => !s.lat && !s.lng && s.status !== 'completed');
  for (const stop of pending) {
    const coords = await geocodeAddress(stop.address);
    if (coords) {
      await dbPut(STORES.STOPS, { ...stop, lat: coords.lat, lng: coords.lng });
    }
  }
  await renderStops();
}
```

Llamar esto en `init()` de `pedidos.astro`, con un timeout corto para no bloquear el render inicial:
```javascript
setTimeout(() => geocodePendingStops(), 2000);
```

---

## 4. Pruebas que Jules debe ejecutar

### 4.1 Build sin errores
```bash
cd /home/user/MueveRepartoEnCancun-  # raíz del repo
pnpm install                          # por si acaso
pnpm build                            # debe completar sin errores TypeScript
```
**Criterio de éxito:** `dist/server/entry.mjs` existe y no hay errores de tipo.

### 4.2 Test de la API Nominatim
```bash
curl -s "https://nominatim.openstreetmap.org/search?q=Av+Tulum+123+Canc%C3%BAn+M%C3%A9xico&format=json&limit=1&countrycodes=mx" \
  -H "User-Agent: MueveReparto/1.0-test" | python3 -m json.tool
```
**Criterio de éxito:** JSON con `lat`, `lon`, `display_name` para una dirección de Cancún.

### 4.3 Test de migración IDB (manual en navegador)
1. Abrir la app en localhost:4321
2. Abrir DevTools → Application → IndexedDB
3. Verificar que existe el store `geocache` con keyPath `key`
4. Agregar una parada en modo Texto con dirección "Av. Tulum 123, Cancún"
5. Esperar 3-5 segundos
6. Verificar en IDB que la parada en `stops` ahora tiene `lat` y `lng` definidos
7. Verificar en IDB que en `geocache` existe la entrada para esa dirección

### 4.4 Test de caché (offline)
1. Agregar parada con "Av. Tulum 123" (con conexión) — debe geocodificarse
2. En DevTools Network → seleccionar "Offline"
3. Agregar parada con "Av. Tulum 123" de nuevo
4. Verificar que los coords se obtuvieron del caché (sin red)

### 4.5 Test de rate-limit
```javascript
// En DevTools console del navegador:
const { geocodeAddress } = await import('/src/lib/idb');
const start = Date.now();
await geocodeAddress('Av. Cobá 15, Cancún');
await geocodeAddress('Av. Yaxchilán 30, Cancún');
await geocodeAddress('Av. Bonampak 8, Cancún');
console.log(`3 geocodificaciones en ${Date.now() - start}ms`);
// Debe ser >= 2000ms (3 llamadas con 1 segundo entre cada una)
```

### 4.6 Test en `/reparto` (verificación final)
1. `pnpm dev`
2. Ir a `/pedidos` → agregar 3 paradas en modo Texto con direcciones reales de Cancún
3. Esperar la geocodificación automática
4. Ir a `/reparto`
5. **Criterio de éxito:** Las 3 paradas deben aparecer como marcadores en el mapa

---

## 5. Verificaciones de calidad antes del PR

- [ ] `pnpm build` completa sin errores TypeScript
- [ ] `pnpm lint` sin errores ESLint
- [ ] `DB_VERSION` incrementado de 1 a 2 en `src/lib/idb.ts`
- [ ] El store `geocache` se crea correctamente en `onupgradeneeded`
- [ ] `geocodeAddress` exportada desde `src/lib/idb.ts`
- [ ] El header `User-Agent` está presente en todas las llamadas a Nominatim
- [ ] Timeout de 5 segundos para evitar bloqueos sin red
- [ ] Fallback gracioso: si Nominatim falla, la parada se guarda sin coords (no hay error al usuario)
- [ ] Paradas existentes sin coords se geocodifican automáticamente al abrir `/pedidos`
- [ ] En modo `coords` y `link`, no se intenta geocodificar (ya tienen coords)
- [ ] No se rompen paradas existentes en IDB durante la migración v1→v2

---

## 6. Entregables del PR

| Archivo | Cambio |
|---------|--------|
| `src/lib/idb.ts` | `GeoCache` interface, `STORES.GEO`, `DB_VERSION=2`, `geocodeAddress()` |
| `src/pages/pedidos.astro` | Import `geocodeAddress`, modificar `saveStop()`, indicador visual, `geocodePendingStops()` |

**NO crear archivos nuevos. NO tocar otros archivos.**

---

## 7. Mensaje de commit esperado

```
feat(P3.1): geocodificación Nominatim OSM para paradas en modo Texto

- Agrega store 'geocache' en IDB (DB_VERSION 2) con expiración 30 días
- geocodeAddress() en idb.ts: caché → rate-limit 1req/s → Nominatim → fallback
- saveStop() geocodifica asíncronamente tras guardar parada
- geocodePendingStops() recupera coords de paradas existentes sin coords
- Las paradas ahora aparecen en el mapa de /reparto tras geocodificarse
```
