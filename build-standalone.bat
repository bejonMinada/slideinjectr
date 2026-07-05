@echo off
setlocal enabledelayedexpansion
REM Build standalone executable for SlideInjectr
REM This script bundles the Python backend + frontend into a single .exe

echo.
echo ===============================================
echo   SlideInjectr Standalone Build Script
echo ===============================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
echo Script directory: !SCRIPT_DIR!
echo.

REM Check Python
echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://www.python.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Python found:
python --version
echo.

REM Check npm
echo Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] npm found:
npm --version
echo.

REM Build frontend
echo Building frontend...
cd /d "!SCRIPT_DIR!frontend"
echo Frontend directory: !CD!
echo.

echo Running: npm install
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install frontend dependencies
    cd /d "!SCRIPT_DIR!"
    pause
    exit /b 1
)
echo [OK] npm install completed
echo.

echo Running: npm run build
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to build frontend
    cd /d "!SCRIPT_DIR!"
    pause
    exit /b 1
)
echo [OK] Frontend build completed
echo.

cd /d "!SCRIPT_DIR!"

REM Setup Python environment
echo Setting up Python environment...

if exist venv-build (
    echo Removing old virtual environment...
    rmdir /s /q venv-build >nul 2>&1
    echo [OK] Old venv removed
)
echo.

echo Running: python -m venv venv-build
python -m venv venv-build
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to create virtual environment
    pause
    exit /b 1
)
echo [OK] Virtual environment created
echo.

REM Activate virtual environment
echo Activating virtual environment...
call "!SCRIPT_DIR!venv-build\Scripts\activate.bat"
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)
echo [OK] Virtual environment activated
echo.

REM Use explicit venv pip path to ensure we're in the virtual environment
set "VENV_PIP=!SCRIPT_DIR!venv-build\Scripts\pip.exe"
if not exist "!VENV_PIP!" (
    echo [ERROR] Virtual environment pip not found at: !VENV_PIP!
    pause
    exit /b 1
)
echo [DEBUG] Using venv pip: !VENV_PIP!
echo.

REM Install dependencies using explicit venv pip
echo Installing Python packages...
echo Running: !VENV_PIP! install --upgrade pip setuptools wheel
"!VENV_PIP!" install --upgrade pip setuptools wheel
if errorlevel 1 (
    echo [ERROR] Failed to upgrade pip
    pause
    exit /b 1
)
echo [OK] pip upgraded
echo.

echo Running: !VENV_PIP! install -r backend\requirements.txt
"!VENV_PIP!" install -r "!SCRIPT_DIR!backend\requirements.txt"
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install backend requirements
    pause
    exit /b 1
)
echo [OK] Backend requirements installed
echo.

echo Running: !VENV_PIP! install pyinstaller
"!VENV_PIP!" install pyinstaller
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install PyInstaller
    pause
    exit /b 1
)
echo [OK] PyInstaller installed
echo.

REM Build executable using explicit venv pyinstaller
set "VENV_PYINSTALLER=!SCRIPT_DIR!venv-build\Scripts\pyinstaller.exe"
if not exist "!VENV_PYINSTALLER!" (
    echo [ERROR] PyInstaller executable not found at: !VENV_PYINSTALLER!
    pause
    exit /b 1
)
echo [DEBUG] Using venv pyinstaller: !VENV_PYINSTALLER!
echo.

echo Building executable with PyInstaller...
echo Running: !VENV_PYINSTALLER! !SCRIPT_DIR!slideinjectr.spec
cd /d "!SCRIPT_DIR!"
"!VENV_PYINSTALLER!" "!SCRIPT_DIR!slideinjectr.spec"

if errorlevel 1 (
    echo.
    echo [ERROR] PyInstaller build failed
    pause
    exit /b 1
)

echo.
echo ===============================================
echo [SUCCESS] Build complete!
echo ===============================================
echo.
echo Executable location: !SCRIPT_DIR!dist\slideinjectr.exe
echo.
echo Next steps:
echo 1. Ensure LibreOffice Impress is installed on target systems
echo 2. Run slideinjectr.exe from the dist folder
echo.
pause
