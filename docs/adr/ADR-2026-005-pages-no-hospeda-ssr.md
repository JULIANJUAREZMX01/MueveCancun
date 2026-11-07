# ADR-2026-005: GitHub Pages no puede hospedar MueveCancún mientras sea SSR

- **Estado:** Aceptada · **Fecha:** 2026-11-06 · **Autor:** KynicOS (operador) · **Decisión de:** Julián Juárez
- **Relacionada:** ADR-006 (estándar AEI: sitios públicos en Pages con output static), ADR-014 (revert de Astro 7)

## Contexto

El estándar AEI pide que todo sitio público viva en GitHub Pages con `output: static`, un `pages.yml` y un gate de humo 200. MueveCancún tiene Pages habilitado en el repositorio (`build_type: workflow`) pero **cero** despliegues en 6,464 corridas de workflow: la URL `https://julianjuarezmx01.github.io/MueveCancun/` responde **404**. Verificado el 6-nov-2026 contra la API de GitHub y contra la URL en vivo.

## Diagnóstico (verificado en el código)

- `astro.config.ts` declara `output: 'server'` y un adaptador que cambia según el entorno: `@astrojs/vercel` o `@astrojs/node` en modo standalone.
- Existen 8 endpoints bajo `src/pages/api/`: `health`, `master_routes.json`, `reports`, `route-share`, `tracking`, `v1/community`, `v1/init-tables`, además de los estáticos de `public/api/`.
- `src/middleware.ts` resuelve redirecciones de idioma y completitud de tutorial **en el servidor**.
- Dependencias de escritura: `@supabase/supabase-js`, `@astrojs/vercel`, `@astrojs/node`.
- `site` apunta a `https://mueve-cancun.vercel.app`.

Consecuencia técnica: `astro build` genera **entradas de servidor**, no un `dist/` estático publicable. Publicar ese artefacto en Pages no funciona. Y si se forzara `output: 'static'`, los endpoints que escriben en Supabase (tracking, community, reports) dejarían de existir en producción.

El 404 no es un bug del código ni un workflow faltante: es la consecuencia de pedirle a Pages algo que este proyecto todavía no produce.

## Decisión

MueveCancún **no** se migra a Pages en bloque. Se parte en dos, siguiendo los cinco estratos del propio AEI (presentación estática, datos como archivos, frontera única `src/gateway/`, **servicios con proceso fuera de Pages**, operación agéntica con humano que decide):

1. **Presentación a Pages.** Mapa, rutas, catálogo, i18n y páginas informativas: build estático publicable.
2. **Servicios con proceso.** `reports`, `tracking`, `v1/community`, `v1/init-tables` y `route-share` se quedan fuera de Pages, en un proceso con runtime y su propio ciclo de vida.

### Fases

- **Fase 0 (este ADR).** Dejar constancia y corregir la expectativa: mientras no exista el build estático, la URL de Pages responde 404 y eso es lo esperado. No se publica un sitio a medias.
- **Fase 1.** Configuración separada `astro.config.pages.ts`: `output: 'static'`, `site: 'https://julianjuarezmx01.github.io'`, `base: '/MueveCancun'`. Los endpoints que requieren runtime quedan fuera de ese build y el sitio los consume por URL absoluta configurable (`PUBLIC_API_URL`).
- **Fase 2.** `deploy-pages.yml` con el mismo patrón ya probado en `Wasm-Kalpixk_IA_DevOps` (`deploy-pages.yml` en verde) más gate de humo: tres rutas con 200 antes de dar el despliegue por bueno.
- **Fase 3.** Retirar la dependencia de Vercel cuando el estático cubra el caso de uso público (consulta de rutas y mapa).

## Consecuencias

**Positivas.** El mapa y las rutas ganan hosting gratuito, sin facturación que pueda tumbar el servicio (el motivo por el que se está migrando todo). La separación deja explícito qué necesita servidor y qué no.

**Negativas.** Durante las fases 1 y 2 el proyecto mantiene dos destinos de despliegue. El frontend estático necesita una URL de API configurable, y los enlaces internos cambian por el `base`.

**Riesgo registrado.** Si alguien habilita un `pages.yml` que publique `dist/` de la config actual, Pages servirá un error o un sitio incompleto y parecerá que el código está roto cuando el problema es la configuración.

## Alternativas descartadas

- **Forzar la migración completa hoy.** Rompe tracking y community en producción; el 404 actual es menos dañino que un sitio sin funciones.
- **Eliminar los endpoints para volverse estático.** Pierde funciones que están en uso.
- **Deshabilitar Pages.** Deja el repositorio sin ruta hacia el estándar y sin recordatorio de la deuda.
- **Publicar `dist/` de la config SSR.** Falla en el gate de humo, o publica un sitio sin hidratación correcta.

## Estado de implementación

**Fase 1 — en revisión (PR `feat/pages-build-estatico`).**

- `config/astro.pages.mjs`: build estatico con `base` configurable. Vive en `config/` porque `scripts/check-astro-config.mjs` exige que `astro.config.ts` sea el unico `astro.config.*` del repo: el guardia sigue intacto y el despliegue SSR no se toca.
- `scripts/build-pages.mjs`: aparta `src/pages/api`, `src/middleware.ts` y `src/pages/healthz.ts` durante el build y los restaura en `finally`, incluso si falla. Nada se borra.
- `.github/workflows/pages-build.yml`: construye en cada PR que toque `src/`, y solo publica con `workflow_dispatch` y `publicar: true`, con gate de humo 200 sobre tres rutas.

**Deuda detectada que la fase 1 no resuelve.** El build cuenta los enlaces absolutos a raiz (`/es/home`) y los reporta: en Pages de proyecto el sitio vive bajo `/MueveCancun`, asi que esas rutas necesitan `import.meta.env.BASE_URL`. El aviso queda en `dist/.pages-report.json` y en el resumen del job; no bloquea el build, pero si explica por que no se publica en automatico todavia.
