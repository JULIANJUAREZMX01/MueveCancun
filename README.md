# 🏛️ MueveCancun: La Verdad de la Calle (Nexus Prime v3.2)

> "MueveCancun no nació en una oficina, nació en la parada del camión."

## 📍 El Problema: Google Maps no entiende a Cancún

En nuestra ciudad, el transporte público es un organismo vivo que cambia más rápido que los algoritmos de las grandes plataformas. Un aviso en Facebook, un bloqueo repentino o una nueva ruta informal son la **"verdad de la calle"** que Google Maps ignora.

MueveCancun es simple: **Funciona sin internet**, es ultrarrápida y está diseñada para que cualquier persona sepa exactamente qué ruta la lleva a su destino.

---

## 🏛️ La Arquitectura: El Protocolo Nexus (4 Capas)

Esta arquitectura de alto rendimiento está dividida en 4 sistemas secuenciales que trabajan en conjunto para ofrecer una aplicación offline-first ultrarrápida.

### 1. Capa de Datos: Listener de Python
- **Ubicación**: `scripts/listener/listener.py`
- **Función**: Script que inyecta "Señales Sociales" (alertas de tráfico, bloqueos, avisos de madrugada) en el catálogo base de rutas.
- **Output**: Genera `public/data/master_routes.json` con estructura validada para el motor WASM.
- **Dependencias**: `scripts/listener/requirements.txt` (Python 3.12+).

**Esquema JSON de master_routes.json:**
```json
{
  "metadata": {
    "last_updated": "ISO 8601 timestamp",
    "source": "Nexus Listener v1.0",
    "version": "3.2.0"
  },
  "social_alerts": ["Alerta global 1", "Alerta global 2"],
  "routes": [
    {
      "id": "R2_94_VILLAS_OTOCH_001",
      "nombre": "R-2-94 Villas Otoch (Eje Kabah - ZH)",
      "tarifa": 15,
      "moneda": "MXN",
      "hub_conexion": "Plaza Las Américas / Chedraui Lakin",
      "frecuencia_minutos": 10,
      "horario": {
        "inicio_oficial": "05:00",
        "fin_oficial": "22:30",
        "guardia_nocturna": "03:00 - 05:00"
      },
      "social_alerts": ["Aviso de madrugada", "Información de campo"],
      "paradas": [
        {
          "nombre": "OXXO Villas Otoch",
          "lat": 21.1685,
          "lng": -86.885,
          "orden": 1,
          "tipo": "origen_madrugada",
          "horario_salida_primer_turno": "03:55",
          "advertencia": "Punto de agrupación"
        }
      ],
      "tipo": "Bus_Urbano_Isla"
    }
  ]
}
```

**Señales Sociales**: El sistema captura información de campo que Google Maps no ofrece: tarifas de madrugada, puntos de Guardia Nocturna, advertencias de letreros obligatorios, y estados actuales del tráfico.

### 2. Capa de Procesamiento: Motor Rust/WASM
- **Core**: `rust-wasm/route-calculator/src/lib.rs`
- **Compilación**: `scripts/build-wasm.mjs` (usa wasm-pack + binaryen para optimización).
- **SpatialHash**: Estructura de índice espacial para búsquedas O(1) de rutas cercanas.
- **RouteCalculator**: Algoritmo que encuentra la mejor ruta considerando distancia, frecuencia y transbordos.
- **Ruta Crítica**: El binario WASM se sirve desde `/wasm/route-calculator/route_calculator.js`.
- **Seguridad**: Hardening contra DoS con Circuit Breaker de 2M ops máximo por request.

### 3. Capa de Presentación: Astro SSG
- **UI**: Componentes `.astro` sin framework JS pesado (Vanilla JS para interactividad).
- **Estilos**: `src/styles/global.css` y `src/index.css` con CSS Variables + Grid + Flexbox.
- **Diseño Responsive**: Optimizado para Dark/Light mode y navegación inferior fija (mobile-first).
- **PWA Offline**: Service Worker para funcionamiento sin conexión.
- **defaultLang**: 'es' (español) como idioma predeterminado.

### 4. Capa de Persistencia: IndexedDB
- **db.ts**: Gestiona el balance de usuario en IndexedDB (migración automática desde localStorage).
- **Stores en src/lib/**:
  - `SpatialHash.ts`: Índice espacial para rutas
  - `FavoritesStore.ts`: Rutas favoritas persistidas
  - `CoordinatesStore.ts`: Coordenadas del usuario
- **Estrategia**: Offline-first con sincronización cuando hay conexión.

---

## 🤖 CI / Automatización

- El flujo manual `Delegate to Claude (unscoped tasks)` requiere el secreto `ANTHROPIC_API_KEY`.
- Ejecútalo sólo en ramas no protegidas; las acciones deben crear cambios vía rama/PR, no push directo a `main`.

---

## 🛠️ Troubleshooting & Interconexión

Si el sistema falla, sigue esta guía de diagnóstico por capas (Protocolo Nexus):

### 🔴 Capa 1: Error en el Listener (Datos)
1. **Verificar ejecución**: `python3 scripts/listener/listener.py`
2. **Schema Check**: Confirma que `public/data/master_routes.json` tenga las claves `routes`, `social_alerts` y `metadata`.
3. **Validar JSON**: Asegúrate de que el archivo no tenga errores de sintaxis.

### 🟡 Capa 2: Error en Motor WASM (Procesamiento)
1. **Verificar WASM**: Revisa que `public/wasm/route-calculator/route_calculator_bg.wasm` exista y tenga tamaño >0.
2. **Path Audit**: Confirma que `RouteCalculator.astro` importa desde `/wasm/...`.
3. **Recompilar**: Ejecuta `node scripts/build-wasm.mjs`.
4. **Logs del navegador**: Revisa la consola para errores de WebAssembly.

### 🔵 Capa 3: Error en Frontend (Presentación)
1. **CSS Audit**: Revisa que los componentes usen clases compatibles con Dark Mode (ej. `dark:text-slate-100`).
2. **Z-Index**: La barra de navegación (`z-50`) no debe cubrir el contenido (`pb-24` en `MainLayout`).
3. **PWA**: Verifica que el Service Worker esté registrado en `src/pages/_offline.astro`.

### 🟢 Capa 4: Error en IndexedDB (Persistencia)
1. **Console DB**: Revisa errores en la consola del navegador relacionados con `db.ts`.
2. **Migración localStorage**: Verifica que la migración automática desde localStorage funcione.
3. **Storage quota**: Asegúrate de que el navegador tenga espacio disponible para IndexedDB.

### ⚡ Comandos de Diagnóstico Rápido
```bash
# Verificar estructura de datos
python3 -c "import json; print(json.load(open('public/data/master_routes.json')).keys())"

# Verificar compilación WASM
ls -la public/wasm/route-calculator/

# Verificar stores de persistencia
ls -la src/lib/
```

---

## 📦 Comandos de Desarrollo

1. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

2. **Generar Datos Maestros (Listener)**:
   ```bash
   python3 scripts/listener/listener.py
   ```

3. **Compilar Motor WASM**:
   ```bash
   node scripts/build-wasm.mjs
   ```

4. **Iniciar Servidor Local**:
   ```bash
   pnpm run dev
   ```

---

## 👤 Créditos

**Julián Alexander Juárez Alvarado**
_Lead Architect & Full Stack Data Engineer_

> "La eficiencia no es un lujo técnico, es un imperativo moral."
