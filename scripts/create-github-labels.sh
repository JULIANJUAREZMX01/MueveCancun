#!/bin/bash
# 📋 Script de creación de labels para el Sistema de Inteligencia Ciudadana
# Uso: ./scripts/create-github-labels.sh JULIANJUAREZMX01 MueveCancun

REPO_OWNER=${1:-"JULIANJUAREZMX01"}
REPO_NAME=${2:-"MueveCancun"}
REPO="$REPO_OWNER/$REPO_NAME"

echo "🚀 Creando labels en $REPO..."

# Función para crear label si no existe
create_label() {
  local name=$1
  local color=$2
  local desc=$3
  gh label create "$name" --color "$color" --description "$desc" --repo "$REPO" 2>/dev/null || \
  gh label edit "$name" --color "$color" --description "$desc" --repo "$REPO"
}

# Labels de Tipo de Reporte
create_label "reporte:precio" "f59e0b" "Tarifa incorrecta en alguna ruta"
create_label "reporte:ruta" "3b82f6" "Ruta o destino equivocado en el sistema"
create_label "reporte:nueva-ruta" "22c55e" "Ruta existente en la calle pero no en la app"
create_label "reporte:cancelada" "ef4444" "Ruta fuera de servicio"
create_label "reporte:info" "8b5cf6" "Información relevante no categorizada"

# Labels de Estado
create_label "estado:pendiente" "e2e8f0" "Sin revisar"
create_label "estado:verificado" "bbf7d0" "Confirmado, pendiente de aplicar"
create_label "estado:aplicado" "86efac" "Actualizado en master_routes"
create_label "estado:rechazado" "fecaca" "Inválido o no reproducible"

echo "✅ Labels configurados correctamente."
