@echo off
setlocal enabledelayedexpansion
REM SlideInjectr Launcher for Windows
REM Simply runs the Python setup script

echo.
echo ===============================================
echo        SlideInjectr - Local Launcher
echo ===============================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
echo Script directory: !SCRIPT_DIR!
echo.

REM Check if Python is installed
echo Checking Python...
python --version
if errorlevel 1 (
    echo.
    echo [ERROR] Python is not installed or not in PATH
    echo Download from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
echo [OK] Python found
echo.

REM Change to script directory
cd /d "!SCRIPT_DIR!"
echo Current directory: !CD!
echo.

REM Check if setup-local.py exists
if not exist "setup-local.py" (
    echo [ERROR] setup-local.py not found in: !SCRIPT_DIR!
    pause
    exit /b 1
)
echo [OK] setup-local.py found
echo.

REM Run setup script
echo Running: python setup-local.py
echo.
python setup-local.py

if errorlevel 1 (
    echo.
    echo [ERROR] setup-local.py failed
    echo.
    pause
    exit /b 1
)

pause
