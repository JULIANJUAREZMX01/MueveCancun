# ADR-2026-004 — Gates de realidad funcional y recuperación operativa

- **Estado:** Aprobado
- **Fecha:** 2026-06-10
- **Responsable:** Equipo MueveCancún
- **Alcance:** mapa, routing, tracking, telemetría, catálogo, CI y comunicación pública

## Contexto

La aplicación acumuló implementaciones parciales que podían pasar pruebas unitarias sin demostrar el flujo completo. Además, el endpoint de tracking activaba unidades simuladas salvo que se configurara explícitamente `false`, mientras la interfaz podía parecer un sistema en vivo. El mapa offline conserva rutas y marcadores, pero no contiene un mapa de calles local. La telemetría depende de GPS, consentimiento y `DATABASE_URL`.

El resultado fue una diferencia material entre la promesa, el código existente y la capacidad operativa verificable.

## Decisión

1. Mantener una matriz versionada de capacidades en `docs/recovery/capabilities.json`.
2. Ejecutar `pnpm audit:reality` como gate CI. El gate falla ante capacidades bloqueadas y genera `docs/recovery/REALITY_REPORT.md`.
3. Prohibir unidades demo por defecto. `TRACKING_STUBS_ENABLED=true` será un opt-in explícito y toda unidad deberá declarar `source` e `is_stub`.
4. Definir tres estados de comunicación:
   - **verified:** puede anunciarse sin calificadores.
   - **degraded:** debe anunciarse junto con su limitación.
   - **blocked:** no puede anunciarse como disponible.
5. Enviar telemetría con la primera posición GPS, no solo después del intervalo de 15 segundos.
6. Ejecutar en CI los flujos Playwright críticos de mapa y tracking, además de la auditoría visual general.
7. El endpoint estático `/api/health` no declarará “Operational”; describirá únicamente capacidades de shell estático y dependencias runtime.

## Consecuencias

### Positivas
- Evita presentar simulaciones como datos reales.
- Convierte el estado del producto en evidencia reproducible.
- Identifica explícitamente dependencias operativas externas.
- Reduce regresiones donde el build pasa pero el flujo principal no funciona.

### Negativas
- El tracking local aparecerá offline si no se habilitan stubs intencionalmente.
- El reporte puede marcar capacidades degradadas aunque el código compile.
- La validación de campo sigue siendo necesaria para afirmar que los recorridos son reales.

## Criterios de aceptación

- `pnpm audit:reality` termina sin capacidades bloqueadas.
- `pnpm build`, tests TS, tests Rust y validación de rutas pasan.
- CI ejecuta `e2e/verify_map.spec.ts` y `e2e/tracking-mobile.spec.ts`.
- Sin `TRACKING_STUBS_ENABLED=true`, `/api/tracking` nunca genera unidades demo.
- La primera lectura GPS intenta publicar telemetría inmediatamente.

## Alternativas descartadas

- **Conservar stubs activos por defecto:** descartado porque puede inducir al usuario a creer que observa unidades reales.
- **Documentar manualmente el estado:** descartado porque se vuelve obsoleto y no bloquea regresiones.
- **Considerar build verde como prueba funcional:** descartado porque no demuestra mapa, routing, GPS ni backend.
