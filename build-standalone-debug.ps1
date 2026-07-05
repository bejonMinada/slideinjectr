# Build standalone executable for SlideInjectr - PowerShell Version
# This version is more reliable than batch on modern Windows

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  SlideInjectr Standalone Build Script" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "[DEBUG] Script directory: $scriptDir" -ForegroundColor Gray

# Check Python
Write-Host "[STEP 1] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = & python --version 2>&1
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://www.python.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
Write-Host "[STEP 2] Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = & npm --version 2>&1
    Write-Host "[OK] npm found: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Build frontend
Write-Host ""
Write-Host "[STEP 3] Building frontend..." -ForegroundColor Yellow
$frontendDir = Join-Path $scriptDir "frontend"
Write-Host "[DEBUG] Frontend directory: $frontendDir" -ForegroundColor Gray

Push-Location $frontendDir

Write-Host "[STEP 3a] Running npm install..." -ForegroundColor Yellow
Write-Host "[DEBUG] Command: npm install" -ForegroundColor Gray
& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed with exit code $LASTEXITCODE" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] npm install completed" -ForegroundColor Green

Write-Host ""
Write-Host "[STEP 3b] Running npm run build..." -ForegroundColor Yellow
Write-Host "[DEBUG] Command: npm run build" -ForegroundColor Gray
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm run build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] npm run build completed" -ForegroundColor Green

# Verify frontend dist
$frontendDist = Join-Path $frontendDir "dist"
if (Test-Path $frontendDist) {
    $fileCount = @(Get-ChildItem -Recurse $frontendDist -File).Count
    Write-Host "[OK] frontend/dist exists with $fileCount files" -ForegroundColor Green
} else {
    Write-Host "[WARNING] frontend/dist does not exist!" -ForegroundColor Yellow
}

Pop-Location

# Setup Python environment
Write-Host ""
Write-Host "[STEP 4] Setting up Python virtual environment..." -ForegroundColor Yellow

$venvDir = Join-Path $scriptDir "venv-build"
if (Test-Path $venvDir) {
    Write-Host "[DEBUG] Removing old venv-build..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $venvDir | Out-Null
}

Write-Host "[STEP 4a] Creating virtual environment..." -ForegroundColor Yellow
Write-Host "[DEBUG] Command: python -m venv $venvDir" -ForegroundColor Gray
& python -m venv $venvDir
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create virtual environment" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Virtual environment created" -ForegroundColor Green

# Activate virtual environment
Write-Host "[STEP 4b] Activating virtual environment..." -ForegroundColor Yellow
$activateScript = Join-Path $venvDir "Scripts" "Activate.ps1"
Write-Host "[DEBUG] Activation script: $activateScript" -ForegroundColor Gray

if (Test-Path $activateScript) {
    & $activateScript
    Write-Host "[OK] Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Could not find activation script, continuing anyway..." -ForegroundColor Yellow
}

# Upgrade pip
Write-Host ""
Write-Host "[STEP 5] Upgrading pip..." -ForegroundColor Yellow
Write-Host "[DEBUG] Command: pip install --upgrade pip setuptools wheel" -ForegroundColor Gray
& pip install --upgrade pip setuptools wheel | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] pip upgrade failed (code $LASTEXITCODE), continuing..." -ForegroundColor Yellow
}
Write-Host "[OK] pip upgraded" -ForegroundColor Green

# Install backend requirements
Write-Host ""
Write-Host "[STEP 6] Installing backend requirements..." -ForegroundColor Yellow
$requirementsFile = Join-Path $scriptDir "backend" "requirements.txt"
Write-Host "[DEBUG] Requirements file: $requirementsFile" -ForegroundColor Gray

if (-not (Test-Path $requirementsFile)) {
    Write-Host "[ERROR] requirements.txt not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[DEBUG] Command: pip install -r $requirementsFile" -ForegroundColor Gray
& pip install -r $requirementsFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install requirements (code $LASTEXITCODE)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Backend requirements installed" -ForegroundColor Green

# Install PyInstaller
Write-Host ""
Write-Host "[STEP 7] Installing PyInstaller..." -ForegroundColor Yellow
Write-Host "[DEBUG] Command: pip install pyinstaller" -ForegroundColor Gray
& pip install pyinstaller | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install PyInstaller (code $LASTEXITCODE)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] PyInstaller installed" -ForegroundColor Green

# Build executable
Write-Host ""
Write-Host "[STEP 8] Building executable with PyInstaller..." -ForegroundColor Yellow
$specFile = Join-Path $scriptDir "slideinjectr.spec"
Write-Host "[DEBUG] Spec file: $specFile" -ForegroundColor Gray

if (-not (Test-Path $specFile)) {
    Write-Host "[ERROR] slideinjectr.spec not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Push-Location $scriptDir
Write-Host "[DEBUG] Command: pyinstaller $specFile" -ForegroundColor Gray
& pyinstaller $specFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] PyInstaller failed (code $LASTEXITCODE)" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] PyInstaller build completed" -ForegroundColor Green
Pop-Location

# Verify exe exists
Write-Host ""
Write-Host "[STEP 9] Verifying .exe was created..." -ForegroundColor Yellow
$exePath = Join-Path $scriptDir "dist" "slideinjectr.exe"
Write-Host "[DEBUG] Looking for: $exePath" -ForegroundColor Gray

if (Test-Path $exePath) {
    $exeInfo = Get-Item $exePath
    $sizeMB = [math]::Round($exeInfo.Length / 1MB, 2)
    Write-Host "[SUCCESS] Found executable!" -ForegroundColor Green
    Write-Host "[INFO] File: $exePath" -ForegroundColor Cyan
    Write-Host "[INFO] Size: $sizeMB MB" -ForegroundColor Cyan
    Write-Host "[INFO] Modified: $($exeInfo.LastWriteTime)" -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] Executable NOT found at $exePath" -ForegroundColor Red
    
    $distPath = Join-Path $scriptDir "dist"
    if (Test-Path $distPath) {
        Write-Host "[DEBUG] Contents of dist folder:" -ForegroundColor Gray
        Get-ChildItem -Recurse $distPath | Select-Object FullName
    } else {
        Write-Host "[DEBUG] dist folder does not exist!" -ForegroundColor Gray
    }
    
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] Build completed successfully!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure LibreOffice Impress is installed on target systems"
Write-Host "2. Distribute: $exePath"
Write-Host "3. Users just double-click to run"
Write-Host ""
Read-Host "Press Enter to exit"
