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

# Check Node.js
$nodeCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "Error: npm is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ npm found: $(npm --version)" -ForegroundColor Green

# Get absolute path
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Build frontend
Write-Host "`nBuilding frontend..." -ForegroundColor Cyan
Push-Location "$scriptDir\frontend"
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
if (Test-Path "venv-build") {
    Write-Host "Removing old virtual environment..."
    Remove-Item -Recurse -Force "venv-build"
}

python -m venv venv-build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to create virtual environment" -ForegroundColor Red
    exit 1
}

# Activate virtual environment
& ".\venv-build\Scripts\Activate.ps1"

# Use explicit venv paths to ensure we're in the virtual environment
$venvPip = Join-Path $scriptDir "venv-build" "Scripts" "pip.exe"
$venvPyInstaller = Join-Path $scriptDir "venv-build" "Scripts" "pyinstaller.exe"

if (-not (Test-Path $venvPip)) {
    Write-Host "Error: Virtual environment pip not found at: $venvPip" -ForegroundColor Red
    exit 1
}

# Install dependencies using explicit venv pip
Write-Host "Installing Python packages..." -ForegroundColor Cyan
Write-Host "Using venv pip: $venvPip" -ForegroundColor Gray

& $venvPip install --upgrade pip setuptools wheel
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to upgrade pip" -ForegroundColor Red
    exit 1
}

$reqsFile = Join-Path $scriptDir "backend" "requirements.txt"
& $venvPip install -r "$reqsFile"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install backend requirements" -ForegroundColor Red
    exit 1
}

& $venvPip install pyinstaller
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install PyInstaller" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Python environment ready" -ForegroundColor Green

# Build executable using explicit venv pyinstaller
Write-Host "`nBuilding executable with PyInstaller..." -ForegroundColor Cyan
$specFile = Join-Path $scriptDir "slideinjectr.spec"

if (-not (Test-Path $venvPyInstaller)) {
    Write-Host "Error: PyInstaller executable not found at: $venvPyInstaller" -ForegroundColor Red
    exit 1
}

Write-Host "Using venv pyinstaller: $venvPyInstaller" -ForegroundColor Gray
& $venvPyInstaller "$specFile"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: PyInstaller build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Build complete!" -ForegroundColor Green
$exePath = Join-Path $scriptDir "dist" "slideinjectr.exe"
Write-Host "`nExecutable location: $exePath" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Ensure LibreOffice Impress is installed on target systems"
Write-Host "2. Run slideinjectr.exe from the dist folder" -ForegroundColor Cyan
Write-Host "`nDeactivating virtual environment..." -ForegroundColor Cyan
deactivate
