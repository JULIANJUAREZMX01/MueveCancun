# Plan investigativo y operativo de recuperación

## Objetivo

Cerrar la brecha entre lo prometido y lo comprobable mediante entregables verificables, responsables claros y gates automatizados.

## Método de investigación

Para cada capacidad se exige esta cadena de evidencia:

1. **Promesa:** qué cree el usuario que recibe.
2. **Implementación:** archivos y servicios que deberían cumplirla.
3. **Prueba programática:** unit, integración, build o E2E.
4. **Prueba operativa:** dependencia runtime, datos reales y configuración.
5. **Prueba de campo:** confirmación externa cuando el código no puede demostrar realidad física.

La fuente de verdad ejecutable es `docs/recovery/capabilities.json`; el reporte se regenera con `pnpm audit:reality`.

## Fases y entregables

### Fase 0 — Veracidad y seguridad operacional (P0, ejecutada)

- [x] **TASK-001:** Desactivar tracking demo por defecto.
- [x] **TASK-002:** Etiquetar toda unidad por procedencia real/demo.
- [x] **TASK-003:** Sustituir health “Operational” por descripción honesta de capacidades.
- [x] **TASK-004:** Crear ADR de gates de realidad.
- [x] **TASK-005:** Crear auditoría reproducible y gate CI.

### Fase 1 — Flujo crítico demostrable (P0/P1, automatizada)

- [x] **TASK-101:** Verificar mapa y tracking explícitamente en Playwright CI.
- [x] **TASK-102:** Publicar telemetría al recibir la primera posición GPS.
- [ ] **TASK-103:** Conservar screenshot, trace y video de mapa trazando una ruta en cada release.
  - Criterio: artefacto descargable asociado al commit desplegado.
- [ ] **TASK-104:** Ejecutar prueba staging con `DATABASE_URL` y confirmar inserción/consulta de telemetría.
  - Criterio: POST 200, punto visible en heatmap y retención comprobada.

### Fase 2 — Realidad de datos y operación (requiere trabajo de campo)

- [ ] **TASK-201:** Validar las 78 rutas contra operadores/fuentes oficiales.
  - Entregable: ruta, fuente, fecha de verificación y responsable.
- [ ] **TASK-202:** Incorporar al menos una unidad real autorizada.
  - Criterio: `source=live`, actualización menor a cinco minutos y consentimiento documentado.
- [ ] **TASK-203:** Medir cobertura GPS y calidad de coordenadas.
  - Criterio: muestra de campo, error medio y rutas corregidas.
- [ ] **TASK-204:** Decidir e implementar mapa de calles verdaderamente offline o retirar esa promesa.

## Gestión automatizada

| Comando | Resultado |
|---|---|
| `pnpm audit:reality` | Regenera matriz y falla ante bloqueos estructurales. |
| `pnpm audit:survival` | Detecta dependencias runtime prohibidas. |
| `pnpm build` | Prueba compilación y prerender de producción. |
| `pnpm test -- --run` | Pruebas unitarias TS. |
| `cargo test --lib` | Pruebas del motor Rust. |
| Playwright CI | Evidencia en navegador de mapa, tracking y visuales. |

## Regla de cierre

Una tarea solo puede marcarse completada si su criterio de aceptación tiene evidencia reproducible. La compilación no sustituye una prueba operativa y una simulación nunca sustituye datos reales.
