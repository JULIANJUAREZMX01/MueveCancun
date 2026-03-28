# 📊 MueveCancún PWA — Estado del Proyecto
**Fecha:** 2026-03-28
**Versión:** 1.0.0 (Nexus Prime v3.3.1)
**Estado General:** 🟢 ESTABLE — Motor WASM multi-módulo operativo, Pipeline de build robustecido

---

## 🎯 Resumen Ejecutivo

MueveCancun es una PWA offline-first de transporte público para Cancún y la Riviera Maya.
El motor de ruteo está compilado a WebAssembly (Rust), la UI es Astro 5 SSG, y toda la
persistencia funciona sobre IndexedDB sin necesidad de backend.

### Logros Acumulados (v3.3.1)

| Área | Estado |
|------|--------|
| Motor WASM (Nexus Transfer Engine) | ✅ Soporte multi-módulo (route-calculator + spatial-index) |
| Pipeline de Build | ✅ Nexus Signaling + execFileSync (Security Fix) |
| FFI Boundary | ✅ Documentado en ARCH_MANIFEST.md |
| Detección de transbordos (exacto + geo ≤350 m) | ✅ Funcional |
| Balance unificado IndexedDB | ✅ Resuelto |
| GPS → parada más cercana | ✅ Implementado |
| CI/CD (6 workflows) | ✅ Corregido workflow build-wasm (Git Tracking) |

---

## 📁 Estructura del Proyecto

```
MueveCancun/
├── .github/workflows/           # CI/CD (test, build-wasm, validate-data, autocurative, codeql)
├── docs/                        # Documentación del proyecto
├── public/
│   ├── data/                    # Catálogos maestros y optimizados
│   └── wasm/                    # Artefactos WASM trackeados (P0)
├── rust-wasm/                   # Código fuente Rust (Cargo Workspace)
├── scripts/                     # Scripts de automatización y build
├── src/                         # Código fuente Astro / TypeScript
├── ARCH_MANIFEST.md             # Manifiesto de Arquitectura y FFI (Nuevo)
├── package.json                 # v1.0.0
└── render.yaml                  # Configuración de despliegue
```

---

## 🔧 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Astro SSG | 5.16.15 |
| Estilos | Vanilla CSS | Custom Props |
| Motor | Rust + WebAssembly | wasm-pack 0.13.1 |
| Persistencia | IndexedDB (idb) | 8.0.3 |
| Build | Node.js | v22.22.1 |

---

## ⚙️ Algoritmos Clave (Motor WASM)

### Nexus Transfer Engine (`rust-wasm/route-calculator/src/lib.rs`)
- **Búsqueda**: 2 pasadas (Exacto + Geo Proximity).
- **Spatial Index**: Módulo dedicado para búsquedas geográficas aceleradas.

---

## 🔐 Seguridad Implementada

| Vector | Mitigación |
|--------|-----------|
| XSS | `escapeHtml()` + safe JSON stringification |
| Shell Injection | `execFileSync` en scripts de build |
| DoS WASM | Límite de 10 M ops + 10 MB payload |
| Artifact Tracking | WASM bins trackeados para evitar fallos de despliegue |

---

## 🐛 Deuda Técnica Activa

| Prioridad | Ítem |
|-----------|------|
| 🔴 Alta | `master_routes.json` aún contiene datos parciales de prueba |
| 🟡 Media | Analytics.ts es un stub sin proveedor real |
| 🟢 Baja | Cobertura de tipos TypeScript en componentes legacy |

---

## 📈 Próximos Sprints

| Sprint | Foco | Estado |
|--------|------|--------|
| v3.3.1 (actual) | Multi-módulo, Build Safety, ARCH_MANIFEST | ✅ Completado |
| v3.4 | Catálogo de rutas real Cancún | 🔲 Planificado |
| v3.5 | Crowdsourcing y Offline Sync | 🔲 Planificado |

**Última actualización:** 2026-03-28
