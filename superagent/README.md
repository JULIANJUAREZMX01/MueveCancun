# KYNYKOS SuperAgent — prototipo local

Este directorio contiene un primer **brain** local, auditable y orientado a MCP para conectar en el futuro un gateway de canales (por ejemplo, OpenClaw) con nodos y herramientas. El prototipo no reemplaza al Nexus de MueveCancún ni habilita canales externos automáticamente.

## Arquitectura

```text
Telegram / Web / canales permitidos
              │
        Gateway (adaptador futuro)
              │
       FastAPI brain (`main.py`)
        ├─ LLM Router
        ├─ Approval Gate
        └─ Tool Registry (descriptores MCP)
              │
    workspace local / nodos futuros
```

- **Brain:** `main.py` expone salud, descubrimiento de herramientas y una entrada de chat mínima.
- **Router:** mantiene entradas sensibles en el modelo local y sólo selecciona un modelo remoto configurado para solicitudes complejas.
- **Approval gate:** bloquea herramientas de riesgo 2 o 3 hasta que el cliente envía un nivel de aprobación suficiente.
- **Tools:** limitan archivos al workspace; shell usa argumentos sin `shell=True`, allowlist y timeout; navegador y capturas son stubs que deben conectarse a nodos reales.
- **Skills:** flujos Markdown reutilizables con pasos y guardrails.

## Niveles de riesgo

| Nivel | Significado | Comportamiento inicial |
|---|---|---|
| 0 | Lectura | Permitido |
| 1 | Creación no destructiva | Permitido |
| 2 | Modificación o envío | Requiere aprobación explícita |
| 3 | Potencialmente destructivo | Requiere aprobación explícita de nivel 3 |

El endpoint nunca debe considerar la aprobación enviada por un usuario de canal no autenticado como autorización suficiente. Antes de exponerlo fuera de localhost se debe añadir autenticación, allowlists por canal, expiración de aprobaciones y un audit log inmutable.

## Ejecutar

Desde la raíz del repositorio:

```sh
python3 -m venv .venv
.venv/bin/pip install -e './superagent[dev]'
SUPERAGENT_WORKSPACE="$HOME/.openclaw/workspace" .venv/bin/uvicorn superagent.main:app --host 127.0.0.1 --port 8000
```

No se recomienda escuchar en `0.0.0.0` hasta implementar autenticación y controles de canal.

## API inicial

- `GET /health`: health check.
- `GET /v1/tools`: descriptores de herramientas compatibles con la forma MCP (`name`, `description`, `inputSchema`).
- `POST /v1/chat`: selección de modelo y, opcionalmente, ejecución de una herramienta solicitada explícitamente.

Ejemplo de lectura de bajo riesgo:

```json
{
  "message": "Lee las notas",
  "requested_tool": "fs.read_text",
  "arguments": {"path": "MEMORY.md"}
}
```

Una escritura devuelve HTTP `409` mientras `approved_risk` sea menor que `2`. El prototipo usa ese campo únicamente para demostrar el gate; una implementación productiva debe reemplazarlo por aprobaciones firmadas y vinculadas a una acción concreta.

## Integraciones pendientes antes de producción

1. Adaptador autenticado para OpenClaw y allowlist independiente por canal.
2. Servidor MCP completo o adaptador al SDK oficial elegido; actualmente sólo se generan descriptores MCP.
3. Proveedores reales para Ollama/servicios remotos y políticas de red/privacidad.
4. Audit log, límites de tasa, aislamiento de procesos y aprobaciones firmadas de un solo uso.
5. Nodos reales para navegador/capturas y una política revisada para cualquier integración de WhatsApp. Las políticas del proveedor deben verificarse en el momento de implementar, no asumirse desde este prototipo.
