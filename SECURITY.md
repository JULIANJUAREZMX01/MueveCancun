# Security Policy — Mueve Reparto

## Versiones con soporte activo

| Versión | Soporte |
|---------|---------|
| `main` (latest) | Activo |
| Ramas `claude/*` | Solo durante desarrollo |

---

## Alcance de seguridad

Mueve Reparto es una PWA client-side con almacenamiento local (IndexedDB). No hay backend en el MVP.

### Áreas relevantes

| Área | Detalles |
|------|---------|
| **IndexedDB** | Datos del repartidor almacenados localmente en el dispositivo |
| **Service Worker** | Caché de recursos estáticos para uso offline |
| **Deep links externos** | Links a WhatsApp/Telegram (no se envían datos sensibles) |
| **Geolocalización** | GPS solo cuando el usuario inicia el modo reparto; no se almacena en servidor |
| **WASM** | Binario compilado de Rust (`public/wasm/`) — no ejecuta código arbitrario |

### Fuera de alcance (MVP)

- Autenticación / sesiones de usuario (no implementado hasta P5)
- Base de datos remota (no implementado hasta P3)
- Pagos o datos financieros reales

---

## Reportar una vulnerabilidad

Si encuentras una vulnerabilidad de seguridad:

1. **NO abrir un issue público** con detalles de la vulnerabilidad
2. Enviar un reporte privado mediante [GitHub Security Advisories](https://github.com/sistemascancunjefe-ai/MueveRepartoEnCancun-/security/advisories/new)
3. Incluir:
   - Descripción del problema
   - Pasos para reproducirlo
   - Impacto potencial
   - Sugerencia de solución (opcional)

**Tiempo de respuesta esperado:** 72 horas para acuse de recibo, 14 días para resolución.

---

## Prácticas de seguridad del proyecto

- No se almacenan claves de API en el código fuente
- Variables de entorno documentadas en `.env.example` (sin valores reales)
- Dependencias auditadas con `pnpm audit` en CI
- CodeQL activo en GitHub Actions (`.github/workflows/codeql.yml`)
- Sin eval(), sin innerHTML con datos de usuario sin sanitizar
- Content Security Policy (CSP) configurada en el servidor Astro
