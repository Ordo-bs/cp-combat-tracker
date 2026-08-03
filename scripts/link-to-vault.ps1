param(
    [Parameter(Mandatory = $true)]
    [string]$VaultPath,

    [string]$PluginId = "cp-combat-tracker"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$TargetDir = Join-Path $VaultPath ".obsidian\plugins\$PluginId"

if (-not (Test-Path $VaultPath)) {
    throw "Vault path not found: $VaultPath"
}

$pluginsDir = Join-Path $VaultPath ".obsidian\plugins"
if (-not (Test-Path $pluginsDir)) {
    New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
}

if (Test-Path $TargetDir) {
    $item = Get-Item $TargetDir -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Write-Host "Junction already exists: $TargetDir"
    } else {
        throw "Target exists and is not a junction: $TargetDir`nRemove or rename it first."
    }
} else {
    cmd /c mklink /J "$TargetDir" "$ProjectRoot" | Out-Null
    Write-Host "Created junction:`n  $TargetDir -> $ProjectRoot"
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. npm install"
Write-Host "  2. npm run dev"
Write-Host "  3. Enable 'CP Combat Tracker' in Obsidian Settings -> Community plugins"
