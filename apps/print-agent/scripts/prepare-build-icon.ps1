$ErrorActionPreference="Stop"
$AgentDir=Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$RepoRoot=Resolve-Path (Join-Path $AgentDir "..\..")
$Source=Join-Path $RepoRoot "assets\img\logo.png"
$BuildDir=Join-Path $AgentDir "build"
$Target=Join-Path $BuildDir "icon.png"

if(-not (Test-Path -LiteralPath $Source)){ throw "Logo fonte nao encontrado: $Source" }
New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null

Add-Type -AssemblyName System.Drawing
$src=[System.Drawing.Image]::FromFile($Source)
try {
  $bmp=New-Object System.Drawing.Bitmap 512,512
  try {
    $g=[System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.Clear([System.Drawing.Color]::Transparent)
      $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.CompositingQuality=[System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $g.DrawImage($src,0,0,512,512)
    } finally { $g.Dispose() }
    $bmp.Save($Target,[System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $bmp.Dispose() }
} finally { $src.Dispose() }

Write-Host "Icone de build criado: $Target"
