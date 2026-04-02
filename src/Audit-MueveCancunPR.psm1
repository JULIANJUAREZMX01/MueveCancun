<#
.SYNOPSIS
    Módulo de auditoría para validar la completitud de un PR antes del merge.
.DESCRIPTION
    Verifica que la rama actual contenga modificaciones en la documentación (.md)
    y evalúa la existencia de directorios de pruebas visuales/e2e para garantizar
    que el agente completó el QA.
#>

function Invoke-MueveCancunPRAudit {
    [CmdletBinding()]
    param (
        [string]$ProjectRoot = "."
    )

    Write-Host "[INIT] Iniciando auditoría de completitud del PR..." -ForegroundColor Cyan
    Push-Location $ProjectRoot

    try {
        # 1. Auditoría de Documentación (Docs-as-Code)
        Write-Host "`n[CHECK] Evaluando modificaciones en documentación (.md)..."
        # We use git diff --name-only to check for .md changes in the current working directory or staged
        $mdChanges = git status --porcelain | Select-String "\.md$"

        if ($mdChanges) {
            Write-Host "[PASS] Archivos de documentación modificados detectados." -ForegroundColor Green
        } else {
            Write-Host "[FAIL] No se detectaron cambios en archivos .md. Deuda documental detectada." -ForegroundColor Red
        }

        # 2. Auditoría de Artefactos de Prueba (Playwright / Snapshots)
        Write-Host "`n[CHECK] Evaluando artefactos de pruebas UI/E2E..."
        # Buscar carpetas típicas de reportes o snapshots de Playwright
        $testArtifacts = Test-Path "playwright-report"
        $snapshotArtifacts = Test-Path "test-results"

        if ($testArtifacts -or $snapshotArtifacts) {
            Write-Host "[PASS] Artefactos de prueba detectados." -ForegroundColor Green
        } else {
            Write-Host "[WARN] No se detectaron carpetas de resultados de pruebas visuales. Verificar ejecución de QA." -ForegroundColor Yellow
        }

        Write-Host "`n[SISTEMA] Auditoría finalizada. Revisa los resultados antes de aprobar el PR de Jules." -ForegroundColor Cyan
    }
    finally {
        Pop-Location
    }
}

# Exportar la función
Export-ModuleMember -Function Invoke-MueveCancunPRAudit -Alias mc-audit

# Establecer alias
Set-Alias -Name mc-audit -Value Invoke-MueveCancunPRAudit -Scope Global
