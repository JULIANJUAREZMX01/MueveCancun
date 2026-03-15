# ADR 0001: Arquitectura Purista MueveCancún

## Estado
Aceptado (objetivo a largo plazo; ver sección "Estado actual vs. estado objetivo")

## Fecha
2026-03-13

## Contexto
El proyecto MueveCancún requiere garantizar rendimiento extremo, accesibilidad total, y trazabilidad en su código. Actualmente, el proyecto utiliza Tailwind CSS y componentes Astro nativos para la UI, lo cual introduce dependencias no deseadas en el stack a largo plazo y acopla los estilos al framework.

## Decisión
Se adopta la **Arquitectura Purista MueveCancún** (estilo diógenes.dev.style) con las siguientes directrices:
1. **Orquestación**: Astro (Islands) para **SSG (Static Site Generation)** — la configuración actual usa `output: 'static'`, no SSR.
2. **Motor de Lógica**: Rust compilado a WASM.
3. **Estilos**: CSS puro + PostCSS/Houdini, eliminando frameworks como Tailwind, React o Bootstrap (migración pendiente; ver estado actual).
4. **UI**: Encapsulada mediante Web Components utilizando Lit.
5. **Persistencia**: IndexedDB offline-first.

## Estado actual vs. estado objetivo

| Aspecto | Estado actual | Estado objetivo |
|---------|--------------|-----------------|
| Render | `output: 'static'` (SSG) | SSG (sin cambio) |
| CSS framework | Tailwind CSS + @astrojs/tailwind (activos) | CSS puro + PostCSS/Houdini |
| UI components | Componentes Astro | Web Components (Lit) |
| Estilos base | Tailwind utilities | CSS custom properties + PostCSS |

**Tailwind NO ha sido eliminado aún.** Las dependencias `tailwindcss`, `@astrojs/tailwind` y `@tailwindcss/typography` permanecen activas. La migración a CSS puro es un proceso incremental documentado en este ADR como objetivo.

## Señales de completitud (cuándo este ADR pasa a "Implementado")
- [ ] `tailwindcss`, `@astrojs/tailwind` y `@tailwindcss/typography` removidos de `package.json`.
- [ ] Todos los componentes migrados a Lit + CSS puro sin clases de Tailwind.
- [ ] `postcss.config.cjs` con `postcss-preset-env` + `cssnano` activos y validados en build.
- [ ] Build CI verde sin dependencias de Tailwind.

## Consecuencias
- **Positivas**: Reducción del peso de la aplicación, cero dependencias de UI acopladas a frameworks pesados, interoperabilidad total usando Web Components, y alto rendimiento gracias a WASM.
- **Negativas**: Necesidad de migrar todos los componentes actuales de Astro/Tailwind a Lit/PostCSS, lo que requiere un esfuerzo considerable de refactorización.
