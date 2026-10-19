# Shrinks photos in static/cars to max 1024px wide JPEG (quality 78). Usage: powershell -File scripts/photos/compress.ps1
Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot '..\..\static\cars'
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 78L
foreach ($f in Get-ChildItem $dir -File -Filter *.jpg) {
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  if ($img.Width -le 1024 -and $f.Length -lt 200KB) { $img.Dispose(); continue }
  $w = [Math]::Min(1024, $img.Width); $h = [int]($img.Height * $w / $img.Width)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose(); $img.Dispose()
  $tmp = "$($f.FullName).tmp"
  $bmp.Save($tmp, $codec, $ep); $bmp.Dispose()
  Move-Item -Force $tmp $f.FullName
}
"{0:N1} MB" -f ((Get-ChildItem $dir | Measure-Object Length -Sum).Sum / 1MB)
