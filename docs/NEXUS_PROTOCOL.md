# Protocolo Nexus — Documento Arquitectónico Maestro

**Proyecto:** MueveCancun
**Repositorio:** https://github.com/JULIANJUAREZMX01/MueveCancun
**Versión del documento:** 1.1
**Fecha:** Marzo 2026
**Autor:** Julián Alexander Juárez Alvarado
**Estado:** Activo — Beta pública en producción

---

> *"MueveCancun no nació en una oficina, nació en la parada del camión."*

Este documento no es un README. Es el plano estructural del sistema. Define por qué se tomó cada decisión técnica, cómo interactúan las capas, y el mapa exacto de lo que falta construir.

---

## 1. El Problema Real

### 1.1 Por qué Google Maps falla en Cancún
Google Maps opera sobre datos oficiales y estáticos. El transporte público de Cancún es un ecosistema informal donde los precios cambian por decreto verbal y las rutas se modifican sin aviso.

### 1.2 El usuario objetivo
Persona local, posiblemente con datos limitados y teléfono de gama baja.

---

## 2. Principios de Diseño (Nexus Protocol)

### P1 — Supervivencia Extrema (Offline-First)
### P2 — Cero Servidores Costosos
### P3 — Desacoplamiento de Datos (Hot-Swap)
### P4 — Tipado Estricto como Contrato (TypeScript-First)
Todo el código del frontend y scripts de soporte deben usar TypeScript. No se permite JavaScript en `src/`.
### P5 — El Humano en el Loop (Tier 1)

---

## 3. Arquitectura del Sistema

El sistema se divide en 4 capas:
1. **Inteligencia de Datos**: `public/data/master_routes.json`
2. **Motor (Rust/WASM)**: Algoritmo Dijkstra para cálculo de rutas.
3. **Frontend (Astro + TypeScript)**: Interfaz ligera y rápida.
4. **Infraestructura**: Render (Static) + GitHub Actions.

---

## 4. Deuda Técnica y TypeScript

### DT-001: Migración a TypeScript
El proyecto ha migrado la mayoría de su lógica a TypeScript para garantizar estabilidad. Cualquier nueva funcionalidad, incluyendo el `ReportWidget`, debe implementarse exclusivamente en TypeScript.

---

## 5. Decisiones Arquitectónicas (ADRs)

### ADR-006: Mandato TypeScript
**Estado:** Aceptado.
**Decisión:** Prohibir el uso de JavaScript en el directorio `src/`. Todo el código nuevo debe estar estrictamente tipado.
