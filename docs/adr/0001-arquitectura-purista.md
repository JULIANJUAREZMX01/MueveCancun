# ADR 0001: Arquitectura Purista MueveCancún

## Estado
Aceptado

## Fecha
2026-03-13

## Contexto
El proyecto MueveCancún requiere garantizar rendimiento extremo, accesibilidad total, y trazabilidad en su código. Actualmente, el proyecto utiliza Tailwind CSS y componentes Astro nativos para la UI, lo cual introduce dependencias no deseadas en el stack a largo plazo y acopla los estilos al framework.

## Decisión
Se adopta la **Arquitectura Purista MueveCancún** (estilo diógenes.dev.style) con las siguientes directrices:
1. **Orquestación**: Astro (Islands) para el SSR.
2. **Motor de Lógica**: Rust compilado a WASM.
3. **Estilos**: CSS puro + PostCSS/Houdini, eliminando frameworks como Tailwind, React o Bootstrap.
4. **UI**: Encapsulada mediante Web Components utilizando Lit.
5. **Persistencia**: IndexedDB offline-first.

## Consecuencias
- **Positivas**: Reducción del peso de la aplicación, cero dependencias de UI acopladas a frameworks pesados, interoperabilidad total usando Web Components, y alto rendimiento gracias a WASM.
- **Negativas**: Necesidad de migrar todos los componentes actuales de Astro/Tailwind a Lit/PostCSS, lo que requiere un esfuerzo considerable de refactorización.
