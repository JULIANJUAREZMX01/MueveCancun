# ADR-0001: Unificación del prototipo SuperAgent

- **Fecha:** 2026-06-07
- **Estado:** Propuesto
- **Decisores:** mantenedores de MueveCancún
- **Alcance:** prototipo aislado en `superagent/`

## Contexto

Existen propuestas y prototipos de agentes con gateways de mensajería, cerebros de planificación, nodos locales y herramientas reutilizables. Mantener contratos distintos para cada experimento dificulta aplicar controles de permisos, descubrir herramientas y auditar acciones. Al mismo tiempo, MueveCancún ya contiene Nexus y tiene requisitos offline-first, por lo que una nueva capa de agentes no debe alterar su ejecución productiva sin una decisión posterior.

## Decisión

Crear un prototipo aislado llamado **KYNYKOS SuperAgent** con estas fronteras:

1. Un adaptador FastAPI actúa como entrada local del brain; no se expone públicamente por defecto.
2. El planificador separa selección de modelo, descubrimiento de herramientas y ejecución.
3. Las herramientas publican descriptores con la forma MCP y declaran un nivel de riesgo.
4. Las operaciones de nivel 2 o 3 requieren aprobación explícita; shell se clasifica conservadoramente como nivel 3.
5. El acceso a archivos queda confinado a un workspace configurado y shell evita `shell=True`, limita ejecutables y aplica timeout.
6. OpenClaw, proveedores LLM, canales externos y nodos con capacidades reales quedan como adaptadores futuros, no como dependencias del prototipo.
7. Cualquier integración de WhatsApp queda condicionada a validar las políticas vigentes del proveedor y el caso de uso al momento de implementarla.

## Alternativas consideradas

| Alternativa | Resultado |
|---|---|
| Integrar directamente el prototipo en Nexus | Descartada por mezclar una prueba de agentes generales con una API productiva de transporte. |
| Dar a cada canal acceso directo a herramientas | Descartada porque evita un gate central de permisos y auditoría. |
| Usar contratos ad hoc para herramientas | Descartada porque dificulta descubrimiento e interoperabilidad; se prefieren descriptores con forma MCP. |
| Permitir shell como riesgo 2 | Descartada inicialmente: incluso ejecutables allowlisted pueden realizar acciones destructivas. |

## Consecuencias

### Positivas

- Existe un punto de partida ejecutable y probado sin modificar la PWA ni Nexus.
- Los límites de workspace y el gate de aprobación están centralizados.
- Herramientas y skills pueden migrarse incrementalmente.

### Negativas y riesgos

- Los descriptores aún no constituyen un servidor MCP completo.
- El campo demostrativo `approved_risk` no es una autorización segura para producción.
- No hay memoria vectorial, ejecución distribuida, autenticación, audit log ni integración real con modelos.
- Las dependencias Python forman un stack adicional que debe mantenerse separado del build principal.

## Criterios para pasar a producción

- Autenticación fuerte y allowlists por canal.
- Aprobaciones firmadas, específicas, expirables y de un solo uso.
- Audit log y rate limiting.
- Aislamiento de procesos/nodos y revisión de comandos permitidos.
- Tests de integración para el gateway y el servidor MCP elegido.
- Revisión legal y de políticas para cada canal externo.
