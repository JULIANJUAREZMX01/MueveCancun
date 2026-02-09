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
**Estado Actual:** Compilado pero Desconectado
**Archivos:** `src/wasm/route_calculator_bg.wasm`, `src/pages/home.astro`

El módulo Rust/WASM se compila correctamente y se copia a `public/wasm/`. Sin embargo, la barra de búsqueda en la página de inicio es HTML estático.

**Tarea:**
- Inicializar el módulo WASM en el cliente (Client-side Hydration) en `home.astro`.
- Conectar los inputs de "Origen" y "Destino" a la función `find_route` del WASM.
- Renderizar los resultados retornados por Rust en el DOM.

## 3. Mapas e Interactividad
**Estado Actual:** Funcional (Leaflet + Datos Estáticos)
**Archivo:** `src/components/InteractiveMap.astro`

El mapa carga y muestra rutas basadas en `src/data/routes.json`.

**Tarea:**
- Si se implementa búsqueda avanzada, asegurar que el mapa pueda renderizar GeoJSON generado dinámicamente por el backend/WASM, no solo los archivos estáticos.

## Notas de Despliegue (Render/Vercel)
- El proyecto está configurado como **Estático** (`output: 'static'`).
- El script `scripts/build-wasm.mjs` maneja la ausencia de `wasm-pack` en producción copiando binarios pre-compilados. **No eliminar esta lógica** a menos que el entorno de CI/CD soporte Rust toolchain.
