# 📋 Lista de Tareas - MueveCancun PWA v3.0

## ✅ COMPLETADO (Sprint 1 & 2)

### 1. Mapa y Navegación

- [x] **Marcadores A/B Premium**: Implementados iconos personalizados para Inicio, Fin y Transbordos.
- [x] **Animación de Ruta**: Efecto "marching ants" en polylines.
- [x] **Navegación Unificada**: Creado componente `<BottomNav />` y aplicado en toda la app.
- [x] **Footer Completo**: Incluye Inicio, Rutas, Mapa, Mi Tarjeta, Comunidad.
- [x] **Unificación Wallet/Driver**: Eliminado `/driver`, estandarizado en `/wallet`.

### 2. PWA y Offline

- [x] **Service Worker**: Actualizado a `v3.0.1-ssg` con todas las rutas críticas (`/wallet`, `/community`, etc.).
- [x] **SSG**: Configurado `output: 'static'` para generación estática.
- [x] **Islands**: Ajustado `InteractiveMap` (script inline) y `RouteCalculator`.

---

## 🟡 PENDIENTE (Delegado a Jules)

### 1. Mejoras de UI/UX

- [x] **Geolocalización**: Botón para centrar mapa en ubicación del usuario.
- [x] **Disposición de Capas**: Corregido solapamiento de resultados y mapa (Bottom Sheet funcional).
- [ ] **Favoritos**: Guardar rutas frecuentes (localStorage).
- [x] **Modo Oscuro**: Implementado toggle de tema básico.
- [ ] **Transiciones**: Agregar `astro:transitions` o View Transitions API para navegación suave.

---

## 🚀 PRÓXIMOS PASOS (Sprint 6 & Full Stack)

- [ ] **Fase 1 WASM**: Desacoplamiento total de datos (Refactor lib.rs).
- [ ] **Cleanup CSS**: Migración final de `RouteCalculator.astro` a Vanilla.
- [ ] **The Listener**: Integración de scraper de redes sociales.
- [ ] **SEO Programático**: Generación dinámica de páginas de rutas.
- [ ] **Sitemap.xml**: Generación automática.
- [ ] **Performance**: Auditoría Lighthouse y optimización final.

---

## 📊 Estado Actual & Delegación

**Responsable**: Jules (Lead Full Stack)  
**Estado**: 🟢 App Estable y Operativa.  
**Próximo Hito**: Refactor de WASM para carga dinámica de catálogo.

_Última actualización: 2026-02-10 20:30_
