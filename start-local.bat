@echo off
REM SlideInjectr Launcher for Windows
REM Simply runs the Python setup script

echo.
echo ===============================================
echo        SlideInjectr - Local Launcher
echo ===============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Download from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Change to script directory
cd /d "%~dp0"

REM Run setup script
python setup-local.py

pause
