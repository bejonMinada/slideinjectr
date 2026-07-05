# Build standalone executable for SlideInjectr
# This script bundles the Python backend + frontend into a single .exe

Write-Host "SlideInjectr Standalone Build Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://www.python.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Python found: $(python --version)" -ForegroundColor Green

# Build frontend
Write-Host "`nBuilding frontend..." -ForegroundColor Cyan
Push-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install frontend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to build frontend" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Frontend built successfully" -ForegroundColor Green
Pop-Location

# Setup Python environment
Write-Host "`nSetting up Python environment..." -ForegroundColor Cyan
python -m venv venv-build
.\venv-build\Scripts\Activate.ps1

# Install dependencies
pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt
pip install pyinstaller

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install Python dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Python environment ready" -ForegroundColor Green

# Build executable
Write-Host "`nBuilding executable with PyInstaller..." -ForegroundColor Cyan
pyinstaller slideinjectr.spec

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: PyInstaller build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Build complete!" -ForegroundColor Green
Write-Host "`nExecutable location: ./dist/slideinjectr/slideinjectr.exe" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Ensure LibreOffice Impress is installed on target systems"
Write-Host "2. Run slideinjectr.exe from the dist folder" -ForegroundColor Cyan
