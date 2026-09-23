# ============================================================
# apply-ui.ps1
# Copies all Tiranga UI files from the output folder into
# the SIH_alter frontend project.
# Run from: Desktop  (or anywhere — paths are absolute)
# Usage: .\apply-ui.ps1
# ============================================================

$output  = "C:\Users\admin\OneDrive\Desktop\stitch_unified_web_portal\stitch_unified_web_portal\output"
$project = "C:\Users\admin\OneDrive\Desktop\SIH_alter\frontend"

Write-Host ""
Write-Host "=== VanRaksha Tiranga UI — Applying Files ===" -ForegroundColor Cyan
Write-Host ""

$files = @(
    @{ Src = "$output\tailwind.config.js";                                Dst = "$project\tailwind.config.js" },
    @{ Src = "$output\src\index.css";                                     Dst = "$project\src\index.css" },
    @{ Src = "$output\src\pages\tourist\TouristHome.jsx";                 Dst = "$project\src\pages\tourist\TouristHome.jsx" },
    @{ Src = "$output\src\pages\tourist\Login.jsx";                       Dst = "$project\src\pages\tourist\Login.jsx" },
    @{ Src = "$output\src\pages\tourist\Register.jsx";                    Dst = "$project\src\pages\tourist\Register.jsx" },
    @{ Src = "$output\src\pages\tourist\TouristSOS.jsx";                  Dst = "$project\src\pages\tourist\TouristSOS.jsx" },
    @{ Src = "$output\src\pages\ranger\RangerTerminal.jsx";               Dst = "$project\src\pages\ranger\RangerTerminal.jsx" },
    @{ Src = "$output\src\pages\control_room\ControlRoom.jsx";            Dst = "$project\src\pages\control_room\ControlRoom.jsx" }
)

foreach ($f in $files) {
    $dir = Split-Path $f.Dst -Parent
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Copy-Item -Path $f.Src -Destination $f.Dst -Force
    Write-Host "  ✓ $(Split-Path $f.Dst -Leaf)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== All files applied! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now start the servers:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor White
Write-Host "    cd C:\Users\admin\OneDrive\Desktop\SIH_alter\backend" -ForegroundColor Gray
Write-Host "    py -3.12 -m uvicorn main:app --port 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor White
Write-Host "    cd C:\Users\admin\OneDrive\Desktop\SIH_alter\frontend" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Open: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
