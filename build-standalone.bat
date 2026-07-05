@echo off
REM Build standalone executable for SlideInjectr
REM This script bundles the Python backend + frontend into a single .exe

echo.
echo ===============================================
echo   SlideInjectr Standalone Build Script
echo ===============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

echo Python found:
python --version

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo npm found:
npm --version

REM Build frontend
echo.
echo Building frontend...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (
    echo Error: Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo Error: Failed to build frontend
    cd ..
    pause
    exit /b 1
)

echo Frontend built successfully
cd ..

REM Setup Python environment
echo.
echo Setting up Python environment...
if exist venv-build (
    echo Removing old virtual environment...
    rmdir /s /q venv-build
)

python -m venv venv-build
if errorlevel 1 (
    echo Error: Failed to create virtual environment
    pause
    exit /b 1
)

REM Activate virtual environment
call venv-build\Scripts\activate.bat
if errorlevel 1 (
    echo Error: Failed to activate virtual environment
    pause
    exit /b 1
)

REM Install dependencies
echo Installing Python packages...
pip install --upgrade pip setuptools wheel
if errorlevel 1 (
    echo Error: Failed to upgrade pip
    pause
    exit /b 1
)

pip install -r backend\requirements.txt
if errorlevel 1 (
    echo Error: Failed to install backend requirements
    pause
    exit /b 1
)

pip install pyinstaller
if errorlevel 1 (
    echo Error: Failed to install PyInstaller
    pause
    exit /b 1
)

echo Python environment ready

REM Build executable
echo.
echo Building executable with PyInstaller...
pyinstaller slideinjectr.spec

if errorlevel 1 (
    echo Error: PyInstaller build failed
    pause
    exit /b 1
)

echo.
echo ===============================================
echo Build complete!
echo ===============================================
echo.
echo Executable location: dist\slideinjectr\slideinjectr.exe
echo.
echo Next steps:
echo 1. Ensure LibreOffice Impress is installed on target systems
echo 2. Run slideinjectr.exe from the dist folder
echo.
pause
