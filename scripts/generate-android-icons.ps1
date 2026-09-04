Add-Type -AssemblyName System.Drawing

$srcPath = "public/icons/icon_512.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source icon not found at $srcPath"
    exit 1
}

$densities = @(
    @{ Name = "mdpi"; Size = 48; ForeSize = 108 },
    @{ Name = "hdpi"; Size = 72; ForeSize = 162 },
    @{ Name = "xhdpi"; Size = 96; ForeSize = 216 },
    @{ Name = "xxhdpi"; Size = 144; ForeSize = 324 },
    @{ Name = "xxxhdpi"; Size = 192; ForeSize = 432 }
)

$srcImg = [System.Drawing.Bitmap]::FromFile((Resolve-Path $srcPath).Path)

function Resize-Image($src, $w, $h, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Create-Foreground($src, $size, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Adaptive icons place the graphic within the center ~66% of the canvas
    $iconSize = [int]($size * 0.72)
    $offset = [int](($size - $iconSize) / 2)
    $g.DrawImage($src, $offset, $offset, $iconSize, $iconSize)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

foreach ($d in $densities) {
    $dir = "android/app/src/main/res/mipmap-$($d.Name)"
    if (Test-Path $dir) {
        Resize-Image $srcImg $d.Size $d.Size "$dir/ic_launcher.png"
        Resize-Image $srcImg $d.Size $d.Size "$dir/ic_launcher_round.png"
        Create-Foreground $srcImg $d.ForeSize "$dir/ic_launcher_foreground.png"
        Write-Host "Updated icons for mipmap-$($d.Name)"
    }
}

$srcImg.Dispose()
Write-Host "All Android icons generated successfully from $srcPath!"
