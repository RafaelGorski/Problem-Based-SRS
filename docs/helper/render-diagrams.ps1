# Render Mermaid Diagrams to PNG
# This script converts all .mmd files in docs/img to PNG format

$imgPath = "C:\work\github\Problem-Based-SRS\docs\img"
Set-Location $imgPath

# Get all .mmd files
$mmdFiles = Get-ChildItem -Filter "*.mmd"

if ($mmdFiles.Count -eq 0) {
    Write-Host "No .mmd files found in $imgPath"
    exit 0
}

Write-Host "Rendering $($mmdFiles.Count) mermaid diagram(s)..."

foreach ($file in $mmdFiles) {
    $outputFile = $file.BaseName + ".png"
    Write-Host "Rendering $($file.Name) -> $outputFile"
    mmdc -i $file.Name -o $outputFile -b transparent
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully rendered $outputFile" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to render $outputFile" -ForegroundColor Red
    }
}

Write-Host "`nRendering complete!"
Get-ChildItem -Filter "*.png" | Select-Object Name, Length, LastWriteTime
