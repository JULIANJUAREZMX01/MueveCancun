# ADR: Estándar de agentes y memoria compartida en MueveCancun

- **Estado:** Aceptado
- **Fecha:** 2026-11-03
- **Responsable:** Julián Juárez (@JAJA.DEV)

## Contexto
Jules (Google) pasa a solo lectura el 2026-11-11 y se apaga el 2026-12-31. El conocimiento acumulado
(personas Bolt, Sentinel, Palette, Speedy) y las reglas vivían en su consola y en carpetas `.jules/` propias
de cada repo, con riesgo de perderse y de generar PRs duplicados.

## Decisión
1. `AGENTS.md` es la fuente única de reglas para cualquier agente.
2. `docs/agentes/MEMORIA.md` es la memoria compartida, versionada en git.
3. `.env.example` documenta cada variable; los valores reales nunca entran al repositorio.
4. Perfil de riesgo de este repo: **alto**.
5. Máximo un PR abierto por agente; sin merge automático.

## Consecuencias
- (+) Independiente de la herramienta: sirve con Jules, Claude, Copilot, Gemini o Antigravity.
- (+) Menos PRs duplicados y conocimiento auditable.
- (−) Requiere disciplina de actualizar la memoria al cerrar cada tarea.
