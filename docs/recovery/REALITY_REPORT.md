# Reporte de realidad funcional

> Generado por `pnpm audit:reality`. No sustituye validación de campo.

## Resumen

- Verificadas: **4**
- Degradadas: **3**
- Bloqueadas: **0**
- Catálogo: **78/78** rutas con geometría dibujable

## Matriz de capacidades

| ID | Prioridad | Capacidad | Estado | Evidencia | Próximo entregable |
|---|---|---|---|---|---|
| CAP-001 | P0 | Build de producción reproducible | ✅ verified | El script build incluye el gate CSS y existe metadata de build. | Ejecutar pnpm build en cada PR. |
| CAP-002 | P0 | Mapa y red de rutas | ⚠️ degraded | Inicio y rastreo cargan una red local de alto contraste; los tiles de calles usan proxy propio, pero el modo totalmente offline no contiene calles. | Validar visualmente el proxy desplegado y entregar tiles/vector base locales antes de prometer calles 100% offline. |
| CAP-003 | P0 | Trazado de viaje | ✅ verified | El viaje seleccionado usa una capa separada, una línea de alto contraste y una aserción E2E específica. | Mantener verify_map.spec.ts como gate obligatorio. |
| CAP-004 | P0 | Tracking de unidades reales | ⚠️ degraded | Los stubs requieren opt-in explícito y cada unidad declara su procedencia; no hay evidencia versionada de una unidad real conectada. | Conectar una unidad autorizada y conservar evidencia de source=live con actualización menor a cinco minutos. |
| CAP-005 | P1 | Telemetría de viaje | ⚠️ degraded | Telemetría inmediata implementada; DATABASE_URL no está presente en este entorno. | Configurar DATABASE_URL y verificar inserciones/retención en staging. |
| CAP-006 | P0 | Catálogo verificable | ✅ verified | 78/78 rutas tienen al menos dos coordenadas válidas. | Validar en campo que la geometría corresponda al recorrido operativo real. |
| CAP-007 | P1 | Evidencia visual automatizada | ✅ verified | CI instala Chromium; la cobertura crítica debe ejecutar mapa y tracking explícitamente. | Conservar capturas y trazas como evidencia de cada PR. |

## Regla de comunicación

Solo las capacidades **verificadas** pueden anunciarse sin calificadores. Las degradadas deben explicar su límite y las bloqueadas no deben anunciarse como disponibles.
