# ADR 0001: Arquitectura Purista MueveCancún

## Estado
En Progreso (migración activa)

## Fecha
2026-03-13

## Contexto
El proyecto MueveCancún requiere garantizar rendimiento extremo, accesibilidad total, y trazabilidad en su código. Actualmente, el proyecto utiliza Tailwind CSS y componentes Astro nativos para la UI, lo cual introduce dependencias no deseadas en el stack a largo plazo y acopla los estilos al framework.

## Decisión
Se adopta la **Arquitectura Purista MueveCancún** (estilo diógenes.dev.style) con las siguientes directrices:
1. **Orquestación**: Astro con `output: 'static'` (SSG — generación estática) para máxima portabilidad y despliegue sin servidor.
2. **Motor de Lógica**: Rust compilado a WASM.
3. **Estilos**: CSS puro + PostCSS/Houdini, eliminando progresivamente frameworks como Tailwind, React o Bootstrap.
4. **UI**: Encapsulada mediante Web Components utilizando Lit.
5. **Persistencia**: IndexedDB offline-first.

## Estado Actual vs Objetivo

| Aspecto | Estado Actual | Objetivo |
|---------|---------------|----------|
| CSS Framework | Tailwind CSS (`@astrojs/tailwind` integrado) | CSS puro + PostCSS/Houdini |
| UI Components | Componentes Astro nativos | Web Components con Lit |
| Build mode | SSG (`output: 'static'`) | SSG (`output: 'static'`) ✅ |
| Motor de ruteo | Rust/WASM | Rust/WASM ✅ |
| Persistencia | IndexedDB | IndexedDB ✅ |

## Plan de Migración
1. Mantener Tailwind funcional durante la migración para no bloquear desarrollo.
2. Migrar componentes de mayor impacto primero (RouteCalculator, InteractiveMap).
3. Eliminar dependencias de Tailwind una vez que todos los componentes estén migrados a Lit/PostCSS.
4. Señal de completitud: `@astrojs/tailwind`, `tailwindcss` y `@tailwindcss/typography` eliminados de `package.json`.

## Consecuencias
- **Positivas**: Reducción del peso de la aplicación, cero dependencias de UI acopladas a frameworks pesados, interoperabilidad total usando Web Components, y alto rendimiento gracias a WASM.
- **Negativas**: Necesidad de migrar todos los componentes actuales de Astro/Tailwind a Lit/PostCSS, lo que requiere un esfuerzo considerable de refactorización.
