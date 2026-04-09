# src/Automation/Validate-GitHubWorkflows.ps1
<#
.SYNOPSIS
Validates GitHub Actions YAML files for common security misconfigurations and syntax errors.

.DESCRIPTION
This script scans all .yml files in the .github/workflows/ directory.
It specifically looks for risky checkout configurations (like checking out untrusted refs)
and can be expanded to check for unpinned actions or missing secrets logic.
#>

function Validate-GitHubWorkflows {
    [CmdletBinding()]
    param(
        [string]$Path = "$PWD\.github\workflows"
    )

    if (-not (Test-Path $Path)) {
        Write-Error "El directorio de workflows no existe en la ruta: $Path"
        return
    }

    $yamlFiles = Get-ChildItem -Path $Path -Filter "*.yml" -File
    $issuesFound = 0

    foreach ($file in $yamlFiles) {
        Write-Host "Revisando: $($file.Name)..." -ForegroundColor Cyan
        $content = Get-Content $file.FullName

        # Regla 1: Validar checkout de ref no segura (como la que mitigamos)
        $untrustedRefMatch = $content | Select-String -Pattern "ref:\s*`$\{\{.*(github\.event\.pull_request\.head\.sha|github\.head_ref).*\}\}"

        if ($untrustedRefMatch) {
            Write-Host "  [ALERTA ALTA] Se detectó checkout de ref no confiable en $($file.Name):" -ForegroundColor Red
            foreach ($match in $untrustedRefMatch) {
                Write-Host "    Línea $($match.LineNumber): $($match.Line.Trim())" -ForegroundColor Yellow
            }
            $issuesFound++
        }

        # Regla 2: Validar que actions/checkout sea al menos v3 (buena práctica)
        $oldCheckoutMatch = $content | Select-String -Pattern "uses:\s*actions/checkout@[vV][12]"
        if ($oldCheckoutMatch) {
            Write-Host "  [ADVERTENCIA] Uso de versión obsoleta de actions/checkout en $($file.Name)." -ForegroundColor Yellow
            $issuesFound++
        }

        # Aquí puedes agregar más reglas personalizadas para tu entorno.
    }

    if ($issuesFound -eq 0) {
        Write-Host "Validación completada. No se encontraron problemas de seguridad evidentes." -ForegroundColor Green
    } else {
        Write-Host "Validación completada. Se encontraron $issuesFound problema(s) potencial(es)." -ForegroundColor Red
    }
}

# Ejecutar si el script es invocado directamente
if ($MyInvocation.InvocationName -ne '.') {
    Validate-GitHubWorkflows
}
