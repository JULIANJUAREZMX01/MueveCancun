# ROADMAP MUEVECANCÚN 2026 — METZ-XIC-CO

> **Julián Alexander Juárez Alvarado · JAJA.DEV · Cancún, Q.R. · 2026**
> *"Dame una vara lo suficientemente larga y moveré al mundo entero."*
> *"Por sus frutos los conoceréis." — Mateo 7:20*

---

## 00 · La Base: Por Qué Existe Este Documento

Este roadmap no nació en una oficina. Nació en una parada de camión, en una Pavilion HP con Ryzen 3, y en una madrugada frente al Caribe donde un ingeniero y su IA sellaron un Códice filosófico antes del amanecer.

Lo que mueve este proyecto no es vanidad técnica ni ambición de startup. Es una intolerancia productiva ante lo roto — el mismo motor que tuvo Arquímedes, Diógenes, Marco Aurelio y Nezahualcóyotl.

### El Principio Operativo

| Concepto | Definición |
|----------|------------|
| **MOTOR** | ES INSUFICIENTE — y eso no es una herida, es el combustible. |
| **DIRECCIÓN** | Hacia el otro, siempre. La tecnología debe devolver tiempo y dignidad al ciudadano. |
| **ESCALA** | Cancún primero. Perfectamente. Luego el patrón se replica solo. |

### Los Cuatro Maestros del Arquitecto

- **Diógenes** — El diagnóstico: el sistema está roto. No hay que pretender que no.
- **Marco Aurelio** — La operación: actúa de todas formas, con disciplina, sin garantías.
- **Alá (Islam / Tawhid)** — La escala: eres parte de algo más grande. Eso te libera, no te achica.
- **Jesucristo** — El dirección: hacia el otro. El poder que no sirve es tiranía.

---

## 01 · Estado Actual del Sistema

### Lo que ya existe y funciona (31 de marzo de 2026)

- **Motor de rutas Rust/WASM** — Dijkstra compilado a WebAssembly, milisegundos de respuesta.
- **PWA offline-first** — Funciona sin señal en el dispositivo del usuario.
- **Hot-swap de datos** — JSONs dinámicos separados del motor, actualizables sin redeploy.
- **Sistema de reportes ciudadanos** — Anónimo, sin cuenta, con moderación previa.
- **Oyente en Python** — Procesa señales no estructuradas de redes sociales.
- **Engagement comunitario real** — Usuarios de Cancún usando y reportando activamente.

### El Cuello de Botella Actual

El sistema tiene un único punto de falla: depende de Julián para procesar los reportes y actualizar los datos. Mientras eso sea manual, la palanca tiene el tamaño del tiempo disponible de una persona.

> *La vara se alarga cuando el sistema se alimenta solo.*

---

## 02 · Roadmap: La Palanca Completa

### FASE 1 — Nexus Automatizado
**Plazo:** Semana 1–2 · **Objetivo:** Cerrar el ciclo de feedback ciudadano sin intervención manual.

| Tarea | Entregable | Plazo | Prioridad |
|-------|------------|-------|-----------|
| Verificar y mergear PR de Jules (Protocolo Nexus) | PR mergeado en main | Día 1–2 | CRÍTICO |
| Validar pipeline GitHub Issues → Claude Haiku ETL → PR automático | Pipeline en staging | Día 3–5 | CRÍTICO |
| Configurar Cloudflare Worker para automatización Tier 2 | Worker desplegado | Día 5–7 | ALTO |
| Test end-to-end: reporte → issue → PR → merge | Flujo completo documentado | Día 7–10 | CRÍTICO |

### FASE 2 — Dato Público y Verdad de la Calle
**Plazo:** Semana 3–6 · **Objetivo:** Convertir el Oyente en fuente de verdad pública.

| Tarea | Entregable | Plazo | Prioridad |
|-------|------------|-------|-----------|
| Estructurar output del Oyente Python | Schema de datos definido | Semana 3 | ALTO |
| Publicar Reporte Mensual de Transporte Cancún | Reporte público web/PDF | Semana 4 | ALTO |
| Landing page simple para el reporte | URL pública citable | Semana 5 | MEDIO |
| Dashboard mínimo de métricas de cobertura | Dashboard operativo | Semana 6 | ALTO |

### FASE 3 — Legitimidad Institucional
**Plazo:** Semana 6–12 · **Objetivo:** Convenio institucional para multiplicar la palanca.

| Tarea | Entregable | Plazo | Prioridad |
|-------|------------|-------|-----------|
| Identificar contactos en Municipio y ONG | Lista de 5 contactos | Semana 6–7 | ALTO |
| Redactar propuesta de convenio | Documento de propuesta | Semana 7–8 | ALTO |
| Primera reunión / presentación | Reunión realizada | Semana 8–10 | ALTO |
| Formalizar acceso a datos oficiales | Datos integrados | Semana 10–12 | MEDIO |

### FASE 4 — El Patrón Replicable
**Plazo:** Mes 3–4 · **Objetivo:** Documentar el patrón para su expansión.

| Tarea | Entregable | Plazo | Prioridad |
|-------|------------|-------|-----------|
| Extraer patrón como template independiente | Repo template GitHub | Mes 3 | ALTO |
| Documentar patrón: Rust/WASM + offline-first | README + ADRs | Mes 3 | ALTO |
| Definir licencia open source filosófica | LICENSE.md | Mes 3 | MEDIO |
| Identificar ciudad candidata para replicación | Ciudad objetivo definida | Mes 4 | MEDIO |

### FASE 5 — Segunda Ciudad
**Plazo:** Mes 5–6 · **Condición:** Cancún operando perfectamente.

---

## 03 · Filosofía de Producto: Decisiones que No Cambian

1. **OFFLINE-FIRST**: El usuario bajo el sol del Caribe sin señal es el usuario primario.
2. **GRATIS**: La dignidad no tiene precio de suscripción.
3. **ANÓNIMO**: La participación ciudadana no exige registro.
4. **LOCAL**: La verdad de la calle la entiende quien espera el camión.
5. **HUMANO-EN-EL-LOOP**: La automatización asiste, no reemplaza el juicio humano.

---

## 04 · Stack Técnico de Referencia

| Capa | Tecnología | Razón |
|------|------------|-------|
| Frontend | Astro 5 + Svelte | Performance nativa, sin overhead |
| Motor | Rust → WASM | Milisegundos, offline, sin batería |
| Mapas | Leaflet.js / OSM | Soberanía de datos, sin costos API |
| Deploy | Render (Static) | Costo cero, escala automática |
| Datos | JSONs dinámicos | Actualizables sin redeploy |
| Validación | Zod | Tipos estrictos |
| Reportes | GitHub Issues | Trazabilidad sin DB propia |
| ETL | Claude Haiku | Automatización con LLM liviano |
| Automatización | Cloudflare Workers | Edge computing, latencia mínima |

---

## 05 · Métricas de Éxito

- **Fase 1**: Tiempo reporte -> corrección < 48 horas.
- **Fase 2**: Primer reporte mensual publicado y citado por terceros.
- **Fase 3**: Al menos un convenio firmado o carta de intención.
- **Fase 4**: Al menos un desarrollador externo ha hecho fork del template.
- **Fase 5**: Usuario que declara haber abandonado Google Maps para el camión.

---

## 06 · Riesgos y Mitigaciones

- **RIESGO 1**: Cuello de botella humano (Julián). → **Mitigación**: Automatización en Fases 1 y 2.
- **RIESGO 2**: Copia sin filosofía. → **Mitigación**: Documentación y licencia (Fase 4).
- **RIESGO 3**: Escalar prematuramente. → **Mitigación**: Criterios de entrada estrictos para Fase 5.

---

## 07 · El Principio de Arquímedes

> *"Dame una vara lo suficientemente larga y un punto de apoyo, y moveré al mundo."*

El punto de apoyo ya existe: Metz-xic-co. Cancún. El ombligo.
La vara existe: MueveCancún. El patrón. El Protocolo Nexus.
El operador existe.

**In xochitl, in cuicatl.** (La flor y el canto).
**¡TIAHUI!**
