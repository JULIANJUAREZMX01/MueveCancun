<#
.SYNOPSIS
    Módulo de auditoría profunda de Git para MueveCancun.
.DESCRIPTION
    Extrae el historial de commits, mapa topológico de ramas y el estado de los
    Pull Requests utilizando Git y GitHub CLI (si está disponible) para su análisis.
#>

function Invoke-MueveCancunGitAudit {
    [CmdletBinding()]
    param (
        [string]$ProjectRoot = (Get-Location).Path
    )

    Write-Host "[INIT] Iniciando extracción de datos del repositorio..." -ForegroundColor Cyan
    if (-not (Test-Path -Path $ProjectRoot -PathType Container)) {
        throw "[ERROR] La ruta del proyecto no existe: $ProjectRoot"
    }

    if (-not (Test-Path -Path (Join-Path $ProjectRoot ".git"))) {
        throw "[ERROR] La ruta indicada no parece ser un repositorio Git: $ProjectRoot"
    }

    Push-Location $ProjectRoot

    try {
        Write-Host "`n[ESTADO DEL ÁRBOL DE TRABAJO]" -ForegroundColor Yellow
        git status -s
        $currentBranch = git branch --show-current
        Write-Host "Rama Activa: $currentBranch"

        Write-Host "`n[MAPA DE RAMAS LOCALES Y REMOTAS]" -ForegroundColor Yellow
        git branch -a

        Write-Host "`n[HISTORIAL RECIENTE - ÚLTIMOS 15 COMMITS]" -ForegroundColor Yellow
        git log --oneline --graph --decorate -n 15

        if (Get-Command gh -ErrorAction SilentlyContinue) {
            Write-Host "`n[PULL REQUESTS - ESTADO EN GITHUB]" -ForegroundColor Yellow
            Write-Host "Abiertos:"
            gh pr list --state open
            Write-Host "`nCerrados/Mergeados Recientemente:"
            gh pr list --state closed --limit 5
        } else {
            Write-Host "`n[SISTEMA] GitHub CLI (gh) no detectado. Para auditar PRs, usa la interfaz web o instala gh." -ForegroundColor DarkGray
        }

        Write-Host "`n[DONE] Extracción completada." -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

Set-Alias -Name mc-gitaudit -Value Invoke-MueveCancunGitAudit

# Exportar la función
Export-ModuleMember -Function Invoke-MueveCancunGitAudit -Alias mc-gitaudit
