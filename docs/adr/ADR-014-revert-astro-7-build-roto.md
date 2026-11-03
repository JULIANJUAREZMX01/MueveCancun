# ADR-014: Revertir la subida a Astro 7 porque rompe el build SSR

- **Estado:** Aceptada · **Fecha:** 2026-11-03 · **Autor:** KynicOS (operador) · **Decisión de:** Julián Juárez
- **Reemplaza:** commit 7a21b47 (dependabot: astro 6.4.4 → 7.2.8)

## Contexto

El deploy de Render del commit `7a21b47` falló en 13 segundos con:

```
[build] output: "server"
[build] Building server entrypoints...
rollupOptions.input should not be an html file when building for SSR.
Please specify a dedicated SSR entry.
ELIFECYCLE Command failed with exit code 1.
```

Reproducido en local con Node 22.23.4 y pnpm 9.15.9 sobre el mismo commit.

## Diagnóstico

- El proyecto usa `output: 'server'` con `@astrojs/node` en modo standalone.
- Con Astro 7.2.8 la fase "Building server entrypoints" pasa al bundler una entrada HTML, que Vite 7 rechaza por definición.
- Se probaron dos hipótesis: (a) mover `vite.build.rollupOptions` a `environments.client`, (b) eliminar la página `src/pages/google….html.ts` (duplicada de `public/google….html`). **Ninguna cambió el error**, así que el fallo está en la integración Astro 7 ↔ adapter Node ↔ Vite 7, no en la configuración propia.

## Decisión

Revertir únicamente el bump de dependencias (merge `7a21b47`), dejando el código de aplicación intacto. Astro vuelve a `^6.4.4`.

## Consecuencias

- El build vuelve a verde: `Server built in 4.69s · Complete!`
- Se recupera el deploy en Render/Vercel sin tocar lógica de negocio.
- La modernización a Astro 7 queda como tarea propia: requiere ADR aparte, rama dedicada y revisión de `@astrojs/node` y `@astrojs/vercel` con sus versiones mayores correspondientes. No se acepta otro bump automático de Astro hasta entonces.
- Acción para Dependabot: excluir los saltos mayores de `astro` en el repo.
