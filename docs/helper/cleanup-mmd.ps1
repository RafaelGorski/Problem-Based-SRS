# Clean up temporary mermaid files
# This script removes .mmd source files after rendering

$imgPath = "C:\work\github\Problem-Based-SRS\docs\img"
Set-Location $imgPath

$mmdFiles = Get-ChildItem -Filter "*.mmd"

if ($mmdFiles.Count -eq 0) {
    Write-Host "No .mmd files found to clean up"
    exit 0
}

Write-Host "Cleaning up $($mmdFiles.Count) .mmd file(s)..."

foreach ($file in $mmdFiles) {
    Remove-Item $file.Name
    Write-Host "✓ Removed $($file.Name)" -ForegroundColor Green
}

Write-Host "`nCleanup complete!"
Write-Host "Remaining files:"
Get-ChildItem | Select-Object Name, Length
