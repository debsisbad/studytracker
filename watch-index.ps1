param(
    [string]$ProjectDir = $PSScriptRoot,
    [int]$Keep = 100
)

$IndexPath = Join-Path $ProjectDir "index.html"
$BackupDir = Join-Path $ProjectDir "Backups_Index"

if (-not (Test-Path $IndexPath)) {
    Write-Host "ERRO: index.html nao encontrado em $ProjectDir" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Get-Hash([string]$Path) {
    try {
        return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
    }
    catch {
        return $null
    }
}

function Save-Backup {
    param([string]$Hash)

    $stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $dest = Join-Path $BackupDir "index_$stamp.html"

    Copy-Item -LiteralPath $IndexPath -Destination $dest -Force
    Write-Host "Backup criado: $dest" -ForegroundColor Green

    Get-ChildItem -Path $BackupDir -Filter "index_*.html" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $Keep |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

$lastHash = $null

Write-Host ""
Write-Host "Backup automatico do index.html ATIVO." -ForegroundColor Cyan
Write-Host "Pasta monitorada: $ProjectDir"
Write-Host "Backups: $BackupDir"
Write-Host "Mantendo os ultimos $Keep backups."
Write-Host "Ctrl+C para parar."
Write-Host ""

while ($true) {
    if (Test-Path $IndexPath) {
        $currentHash = Get-Hash $IndexPath

        if ($currentHash -and $currentHash -ne $lastHash) {
            Save-Backup -Hash $currentHash
            $lastHash = $currentHash
        }
    }

    Start-Sleep -Seconds 1
}
