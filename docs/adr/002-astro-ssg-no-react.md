# ADR-002: Astro SSG Without React

**Date:** 2026-01-15
**Status:** Accepted

## Context

MueveCancun is an offline-first PWA for public transit in Cancún. Every kilobyte of
JavaScript impacts load time on mid-range Android devices with slow connections.
React hydration ships ~45KB of runtime JS before any application code runs.

The philosophy (diogenes.dev) mandates minimal JS, sovereign data, and no framework lock-in.

## Decision

Use Astro 5 with `output: 'static'` (SSG). Components are `.astro` files that compile
to zero-JS HTML by default. JavaScript is only included when explicitly added via
`<script>` tags or `client:*` directives.

Inter-component communication uses native DOM CustomEvents instead of a state manager:
MAP_SET_STOP, SHOW_ROUTE_ON_MAP, BALANCE_UPDATED.

## Consequences

- No Virtual DOM, no React reconciler, no hydration cost.
- Components cannot share reactive state. All coordination is event-driven.
- i18n handled via Astro middleware + `[lang]` route segments.
- Static build output is deployable to any CDN or static host (Render.com).

## Alternatives Considered

- **Next.js**: Rejected — React hydration cost, SSR complexity, vendor lock-in.
- **SvelteKit**: Rejected — smaller ecosystem, less CI/CD tooling familiarity.
- **Vanilla HTML**: Rejected — no component system makes large UIs unmaintainable.
