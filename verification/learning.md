<!--
  OBJETO DE ESTUDIO — verification (agente de verificación)
  ===========================================================
  Este archivo registra reglas aprendidas durante la verificación de cambios.
  Cada regla nace de un error real o de una situación que pudo haber salido mal.
  El objetivo es que el agente (y el desarrollador) no repitan los mismos errores.

  SEGUIMIENTO DE REGLAS
  =======================
  | # | Regla                                                | Aprendida en     |
  |---|------------------------------------------------------|------------------|
  | 1 | No commitear .wasm en tareas JS/TS                   | Validación CI    |
  | 2 | Correr `validate-routes.mjs` después de editar JSON  | Error prod. data |
  | 3 | Correr `pnpm test` antes de cualquier commit          | Regresión Vitest |
  | 4 | Incrementar CACHE_VERSION en sw.js al cambiar assets | Bug offline cache|
  | 5 | Usar `escapeHtml()` en todo innerHTML con datos externos | Audit XSS      |
  | 6 | Verificar que `coordinatesStore.init()` precede GPS  | Bug GPS silencioso|
-->

# Reglas de Verificación — MueveCancun

* Cuando trabajas con tests o comandos de build, **no** stages ni commitees binarios WASM compilados (`.wasm`) si la tarea solo toca JS/TS.
* Siempre correr `node scripts/validate-routes.mjs` después de editar `master_routes.json`.
* Siempre correr `pnpm test` antes de cualquier commit para evitar regresiones.
* Incrementar `CACHE_VERSION` en `public/sw.js` cuando se cambian assets estáticos cacheados.
* Usar `escapeHtml()` en **toda** interpolación de strings de usuario o catálogo en `innerHTML`.
* Verificar que `coordinatesStore.init()` se haya resuelto antes de llamar a `findNearestWithDistance()`.
