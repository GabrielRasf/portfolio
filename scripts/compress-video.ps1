param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Name,
    [int]$Width = 1280,
    [int]$Crf = 30
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    throw 'ffmpeg not found. Install with: winget install Gyan.FFmpeg'
}

$videos = Join-Path $PSScriptRoot '..\src\videos'
New-Item -ItemType Directory -Path $videos -Force | Out-Null
$target = Join-Path $videos "$Name.mp4"
# Encode outside src so the Vite watcher never sees a half-written file.
$temp = Join-Path $env:TEMP "$Name-$([guid]::NewGuid()).mp4"

ffmpeg -hide_banner -loglevel error -y -i $Source `
    -an `
    -vf "scale='min($Width,iw)':-2:flags=lanczos,fps=30" `
    -c:v libx264 -preset slow -crf $Crf -profile:v high -pix_fmt yuv420p `
    -movflags +faststart `
    $temp

if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed with exit code $LASTEXITCODE" }

Move-Item -LiteralPath $temp -Destination $target -Force

$before = (Get-Item -LiteralPath $Source).Length / 1MB
$after = (Get-Item -LiteralPath $target).Length / 1MB
'{0}: {1:N1} MB -> {2:N1} MB' -f $Name, $before, $after
