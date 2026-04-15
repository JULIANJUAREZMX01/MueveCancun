#!/bin/bash

# Nexus Survival Audit - Bash Equivalent
# Verifies that no unauthorized external runtime dependencies are introduced.

TARGET_DIR=${1:-"src"}
FORBIDDEN_PATTERNS=(
    "https://cdn.jsdelivr.net"
    "https://unpkg.com"
    "https://fonts.googleapis.com"
    "https://maps.googleapis.com"
)

echo -e "\033[0;36m[NEXUS COMMAND] Iniciando auditoria de aislamiento de red (Offline-First Strict Mode)...\033[0m"

VIOLATIONS_FOUND=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    # Search recursively, exclude markdown files AND the audit script itself (to avoid false positives from the list of patterns)
    # Also exclude the PowerShell module to avoid false positives there too.
    results=$(grep -rn "$pattern" "$TARGET_DIR" --exclude="*.md" --exclude="audit-survival.sh" --exclude="Audit-NexusSurvival.psm1" 2>/dev/null)

    if [ -n "$results" ]; then
        VIOLATIONS_FOUND=1
        echo -e "\033[0;31m[ALERTA DE SEGURIDAD] Dependencia externa detectada que rompe la supervivencia offline: $pattern\033[0m"
        echo "$results" | while read -r line; do
            echo -e "\033[0;33m -> $line\033[0m"
        done
    fi
done

if [ $VIOLATIONS_FOUND -eq 0 ]; then
    echo -e "\033[0;32m[NEXUS COMMAND] Auditoria de aislamiento exitosa. El sistema mantiene 100% de soberania local.\033[0m"
    exit 0
else
    echo -e "\033[0;31m[NEXUS COMMAND] FALLO ESTRUCTURAL. Reemplace los recursos externos con activos locales forjados en el build.\033[0m"
    exit 1
fi
