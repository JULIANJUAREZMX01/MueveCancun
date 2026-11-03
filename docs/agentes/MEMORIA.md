# Memoria compartida de agentes — MueveCancun

> Una sola bitácora para todos los agentes y herramientas. Léela antes de trabajar; agrega UNA entrada al terminar.
> Formato: fecha · área · problema · técnica · resultado. No dupliques. Esta memoria sobrevive aunque cambie la herramienta.

| Fecha | Área | Problema | Técnica aplicada | Resultado |
|---|---|---|---|---|
| 2025-03-02 | Rust WASM | `match_stop` hacía escaneo fuzzy O(N) sobre cada parada. | Usar el `HashMap` existente (`route.stop_name_to_index`) para coincidencias exactas. | Mejora medida de 36,480x. |
| 2026-03-02 | TypeScript | Deduplicación de rutas con `find` dentro de un bucle: O(N²). | Usar un `Set` para búsqueda O(1). | Complejidad sublineal. |
| 2026-03-04 | UI | `<img src=*.svg>` bloquea el render por petición de red. | Componente `Icon.astro` con `readFileSync` en build; solo SVG < 2 KB inline. | Sin peticiones de red para iconos. |
| 2026-11-03 | Build | Astro 7.2.8 rompe el build SSR (entrada HTML en rollupOptions). | Mantener Astro ^6.4.4 (ADR-014). | Build verde en 4.7 s. |
| 2026-11-03 | Backend | `resolveStop` en `/api/v1/journey` recalculaba índices y normalizaba cadenas con escaneo O(N) por petición. | Indexación en memoria a nivel de módulo con `Map` O(1) de nombres exactos, lista pre-normalizada y caché de paradas resueltas. | Latencia promedio de resolución reducida de 2.97 ms a 1.50 ms (p50: 1.97 ms → 0.73 ms, min: 1.80 ms → 0.29 ms, ~2.7x mejora p50). |
