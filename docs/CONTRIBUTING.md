# Contribuir a Mueve Reparto

Gracias por querer contribuir. Este documento explica el flujo de trabajo y las convenciones del proyecto.

---

## Flujo de trabajo

```
1. Fork (ya hecho si eres colaborador)
2. Crear rama: git checkout -b mi-feature
3. Hacer cambios
4. Commit con mensaje descriptivo
5. Push: git push -u origin mi-feature
6. Abrir PR hacia main
7. Esperar revisión y merge
```

---

## Convenciones de commits

Usa mensajes descriptivos en español o inglés:

```bash
# Bien
feat: agregar filtro de paradas urgentes en /pedidos
fix: corregir cálculo de ROI cuando no hay paradas del día
chore: actualizar dependencias pnpm

# Evitar
fix bug
update code
wip
```

---

## Estándares de código

- **Sin frameworks JS** — Astro + Vanilla JS únicamente
- **Tipos TypeScript** en frontmatter de componentes Astro
- **IDB para persistencia** — nunca localStorage para datos de negocio
- **Tailwind** para estilos — sin CSS en `<style scoped>` salvo animaciones complejas
- **Dark mode siempre** — no agregar variantes light

---

## Correr tests antes de hacer PR

```bash
pnpm lint       # Sin errores ESLint
pnpm test       # Sin tests rotos
pnpm build      # Build exitoso
```

---

## Reportar bugs

Abrir un [issue](https://github.com/sistemascancunjefe-ai/MueveRepartoEnCancun-/issues) con:
- Descripción del problema
- Pasos para reproducirlo
- Dispositivo y versión del sistema operativo
- Screenshot si aplica

---

## Áreas donde se necesita ayuda

- Tests unitarios para `src/lib/idb.ts`
- Tests E2E con Playwright para flujo de paradas
- Optimizador de ruta mejorado (2-opt en lugar de nearest-neighbor)
- Accesibilidad (ARIA labels en componentes interactivos)
