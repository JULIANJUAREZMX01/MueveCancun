# Skill: reporte semanal

## Objetivo
Generar un reporte semanal a partir de archivos existentes dentro del workspace.

## Entradas
- Ruta relativa de los datos.
- Ruta relativa donde se guardará el reporte.

## Flujo
1. Usar `fs.read_text` (riesgo 0) para recopilar los datos.
2. Resumir hallazgos sin enviar datos a un modelo remoto si contienen información sensible.
3. Mostrar una vista previa y solicitar aprobación explícita.
4. Usar `fs.write_text` (riesgo 2) únicamente después de recibir aprobación.

## Guardrails
- Nunca leer fuera del workspace configurado.
- Nunca publicar ni enviar el reporte sin una segunda aprobación específica.
- Omitir secretos, tokens y datos personales del resultado.

## Pros y contras
- **Pro:** repetible, auditable y local-first.
- **Contra:** requiere aprobación humana antes de escribir el reporte.
