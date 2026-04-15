<#
.SYNOPSIS
Modulo de integración para el centro de mando: Auditoría de Supervivencia y Aislamiento de Red.
.DESCRIPTION
Este script debe ser guardado en la carpeta src/ de la configuración del entorno.
Verifica que el código fuente no introduzca dependencias externas en tiempo de ejecución (CDNs, APIs de terceros no autorizadas) que comprometan la operatividad offline del Protocolo Nexus.
#>

function Invoke-NexusSurvivalAudit {
    [CmdletBinding()]
    param (
        [string]$TargetDirectory = "src/"
    )

    Write-Host "[NEXUS COMMAND] Iniciando auditoria de aislamiento de red (Offline-First Strict Mode)..." -ForegroundColor Cyan

    $ForbiddenPatterns = @(
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://fonts.googleapis.com",
        "https://maps.googleapis.com"
    )

    $ViolationsFound = $false

    foreach ($Pattern in $ForbiddenPatterns) {
        # Note: PowerShell 7+ syntax for globbing in Select-String
        $Results = Select-String -Path "$TargetDirectory**/*.*" -Pattern $Pattern -Exclude "*.md"

        if ($Results) {
            $ViolationsFound = $true
            Write-Host "[ALERTA DE SEGURIDAD] Dependencia externa detectada que rompe la supervivencia offline:" -ForegroundColor Red
            foreach ($Match in $Results) {
                Write-Host " -> Archivo: $($Match.Filename) | Linea: $($Match.LineNumber) | Coincidencia: $Pattern" -ForegroundColor Yellow
            }
        }
    }

    if (-not $ViolationsFound) {
        Write-Host "[NEXUS COMMAND] Auditoria de aislamiento exitosa. El sistema mantiene 100% de soberania local." -ForegroundColor Green
    } else {
        Write-Host "[NEXUS COMMAND] FALLO ESTRUCTURAL. Reemplace los recursos externos con activos locales forjados en el build." -ForegroundColor Red
        exit 1
    }
}

Set-Alias -Name audit-survival -Value Invoke-NexusSurvivalAudit -Scope Global

# Export members for the module
Export-ModuleMember -Function Invoke-NexusSurvivalAudit -Alias audit-survival

Write-Host "[SISTEMA] Alias "audit-survival" registrado y en memoria." -ForegroundColor DarkGray
