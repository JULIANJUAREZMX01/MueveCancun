# 🗺️ Roadmap: MueveCancun / MueveReparto

Este roadmap define las etapas de evolución técnica y de producto para la plataforma.

## 🟢 Fase 1: Frontend & UI/UX Base (Actual)
- ✅ Migración a Astro 5.0 y TailwindCSS v4.
- ✅ Implementación de diseño PWA offline-first.
- ✅ Componentes visuales y layouts ("Sunny Mode" & Dark Mode).
- 🔄 Optimización de interacciones (animaciones, estados de carga).
- 🔄 Refinamiento de accesibilidad (ARIA, contrastes).

## 🟡 Fase 2: PWA & Motor WASM (En Progreso)
- ✅ Motor Rust/WASM para cálculo de rutas y tiempos offline.
- ✅ IndexDB local para persistencia (rutas, paradas, favoritos).
- 🔄 Sincronización optimizada Service Worker (caching de binarios WASM).
- 🔄 Multimodalidad y conexión de rutas complejas.

## 🔵 Fase 3: Preparación & Integración Backend (Próximamente)
- 🔄 Estructuración de API cliente (`src/utils/apiClient.ts`).
- 🔄 Endpoints estáticos de salud y mock (`/api/health`).
- ⏳ Integración con backend remoto para live-tracking y validación de entregas.
- ⏳ Autenticación de usuarios/repartidores (JWT/OAuth).

## 🟣 Fase 4: Producción & Escalamiento
- ⏳ Despliegue continuo estable en Render y CDN global.
- ⏳ Monitoreo de errores (Sentry / Analytics).
- ⏳ Expansión a flotas completas con gestión de multi-usuario.
