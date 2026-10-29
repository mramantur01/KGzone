# Makes small card photos and shrinks part photos for faster loading.
#   static/cars/*.jpg  -> static/cars/thumb/*.jpg (640px wide, quality 72)
#   static/parts/*.jpg -> resized in place to max 800px wide (quality 75) when larger than 120 KB
# Usage: powershell -ExecutionPolicy Bypass -File scripts/photos/thumbs.ps1
Add-Type -AssemblyName System.Drawing
$root = Join-Path $PSScriptRoot '..\..\static'
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-Resized($src, $dest, $maxWidth, $quality) {
  $img = [System.Drawing.Image]::FromFile($src)
  $w = [Math]::Min($maxWidth, $img.Width); $h = [int]($img.Height * $w / $img.Width)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose(); $img.Dispose()
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$quality)
  $tmp = "$dest.tmp"
  $bmp.Save($tmp, $codec, $ep); $bmp.Dispose()
  Move-Item -Force $tmp $dest
}

$thumbDir = Join-Path $root 'cars\thumb'
New-Item -ItemType Directory -Force $thumbDir | Out-Null
foreach ($f in Get-ChildItem (Join-Path $root 'cars') -File -Filter *.jpg) {
  Save-Resized $f.FullName (Join-Path $thumbDir $f.Name) 640 72
}
foreach ($f in Get-ChildItem (Join-Path $root 'parts') -File -Filter *.jpg) {
  if ($f.Length -gt 120KB) { Save-Resized $f.FullName $f.FullName 800 75 }
}
"cars/thumb: {0:N0} KB, parts: {1:N0} KB" -f ((Get-ChildItem $thumbDir | Measure-Object Length -Sum).Sum / 1KB), ((Get-ChildItem (Join-Path $root 'parts') | Measure-Object Length -Sum).Sum / 1KB)
