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

**Estado Actual:** ✅ ¡CONECTADO Y FUNCIONAL!
**Archivos:** `src/wasm/route_calculator_bg.wasm`, `src/pages/home.astro`, `src/components/RouteCalculator.astro`

El módulo Rust/WASM ya está plenamente integrado.

- Inicialización en `RouteCalculator.astro` con hidratación del lado del cliente.
- Conexión completa de "Origen" y "Destino" con lógica fuzzy-search en JS + Ruteo en Rust.
- Sistema bilingüe integrado en el motor de resultados.
- Comunicación via eventos (`SHOW_ROUTE_ON_MAP`) para dibujar en el mapa.

## 3. Mapas e Interactividad

**Estado Actual:** Funcional (Leaflet + Datos Estáticos)
**Archivo:** `src/components/InteractiveMap.astro`

El mapa carga y muestra rutas basadas en `src/data/routes.json`.

**Tarea:**

- Si se implementa búsqueda avanzada, asegurar que el mapa pueda renderizar GeoJSON generado dinámicamente por el backend/WASM, no solo los archivos estáticos.

## Notas de Despliegue (Render/Vercel)

- El proyecto está configurado como **Estático** (`output: 'static'`).
- El script `scripts/build-wasm.mjs` maneja la ausencia de `wasm-pack` en producción copiando binarios pre-compilados. **No eliminar esta lógica** a menos que el entorno de CI/CD soporte Rust toolchain.
