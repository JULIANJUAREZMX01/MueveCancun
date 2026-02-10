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

## 🟡 PENDIENTE (Sprint 3 - Polish & Features)

### 1. Mejoras de UI/UX

- [ ] **Geolocalización**: Botón para centrar mapa en ubicación del usuario.
- [ ] **Favoritos**: Guardar rutas frecuentes (localStorage).
- [ ] **Modo Oscuro**: Implementar toggle de tema.
- [ ] **Transiciones**: Agregar `astro:transitions` o View Transitions API para navegación suave.

### 2. PWA Refinement

- [ ] **Manifest.json**: Verificar que `names`, `icons` y `theme_color` coincidan con la nueva identidad.
- [ ] **Screenshots**: Agregar screenshots al manifest para instalación rica.
- [ ] **Offline Fallback**: Crear página `offline.html` personalizada si falla el cache.

### 3. Código y Optimización

- [ ] **InteractiveMap a React**: Convertir el mapa a componente React (`.tsx`) para mejor manejo de estado y lazy loading real (`client:visible`).
- [ ] **Lazy Loading**: Aplicar `loading="lazy"` a imágenes en `community.astro`.
- [ ] **Lighthouse**: Auditar performance y accesibilidad.

---

## 🔧 Comandos Útiles

```bash
# Build & Preview
npm run build && npm run preview -- --host

# Limpiar cache de Astro
Remove-Item -Path "node_modules\.astro" -Recurse -Force
```

## 📊 Estado Actual

**Versión:** v3.0.1-ssg
**Páginas:** 18 rutas estáticas
**Navegación:** BottomNav (5 items)
**Mapa:** Leaflet sin React (Script Inline)
