# 🚧 Tareas Pendientes del Backend (Backend Tasks)

Este documento detalla el estado actual de la integración Backend/Frontend tras la migración a SSG (Static Site Generation) y las mejoras de UX.

## 1. Integración del Formulario de Contribución (`/contribuir`)

**Estado Actual:** Visual (Frontend Only)
**Archivo:** `src/pages/contribuir.astro`

El formulario utiliza validación nativa HTML5 y estilos CSS5 (Floating Labels). Actualmente, el evento `submit` solo previene la recarga de la página y muestra un `console.log`.

**Tarea:**

- Crear un endpoint (Server Function, Edge Function, o API externa) para recibir los datos.
- Conectar el `submit` del formulario para enviar un POST request a este endpoint.
- Manejar la respuesta (éxito/error) visualmente (ya existen estilos para alertas, solo falta la lógica).

## 2. Motor de Búsqueda WASM (`route-calculator`)

**Estado Actual:** ✅ ¡CONECTADO Y DINÁMICO (Phase P0 COMPLETE)!
**Archivos:** `src/wasm/route_calculator_bg.wasm`, `src/components/RouteCalculator.astro`, `public/data/master_routes.json`

El módulo Rust/WASM está plenamente integrado y desacoplado:

- **Carga Dinámica:** El catálogo de rutas se inyecta desde `master_routes.json` al inicio (`load_catalog`), eliminando la necesidad de recompilar Rust para cambios en datos.
- **Seguridad:** Implementación "Zero Panics" verificada.
- **Rendimiento:** Búsquedas O(1) con `HashMap` y `RwLock` para concurrencia segura.
- Comunicación via eventos (`SHOW_ROUTE_ON_MAP`) para dibujar en el mapa.

## 3. Mapas e Interactividad

**Estado Actual:** Funcional (Leaflet + Datos Estáticos)
**Archivo:** `src/components/InteractiveMap.astro`

El mapa carga y muestra rutas basadas en `src/data/master_routes.json`.

**Tarea:**

- Si se implementa búsqueda avanzada, asegurar que el mapa pueda renderizar GeoJSON generado dinámicamente por el backend/WASM, no solo los archivos estáticos.

## Notas de Despliegue (Render/Vercel)

- El proyecto está configurado como **Estático** (`output: 'static'`).
- El script `scripts/build-wasm.mjs` maneja la ausencia de `wasm-pack` en producción copiando binarios pre-compilados. **No eliminar esta lógica** a menos que el entorno de CI/CD soporte Rust toolchain.
