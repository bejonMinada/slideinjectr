@echo off
setlocal enabledelayedexpansion
REM Debug version - shows EVERYTHING that happens

echo.
echo ===============================================
echo   SlideInjectr Build - DEBUG MODE
echo ===============================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
echo [DEBUG] Script directory: !SCRIPT_DIR!
echo [DEBUG] Current directory: !CD!
echo.

REM Check Python
echo [STEP 1] Checking Python...
python --version
echo [DEBUG] Python exit code: !ERRORLEVEL!
if errorlevel 1 (
    echo [FAILED] Python not found or error occurred
    echo.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)
echo [OK] Python is installed
echo.

REM Check npm
echo [STEP 2] Checking npm...
npm --version
echo [DEBUG] npm exit code: !ERRORLEVEL!
if errorlevel 1 (
    echo [FAILED] npm not found or error occurred
    echo.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] npm is installed
echo.

REM Build frontend
echo [STEP 3] Building frontend...
echo [DEBUG] Changing to frontend directory: !SCRIPT_DIR!frontend
cd /d "!SCRIPT_DIR!frontend"
echo [DEBUG] Current directory is now: !CD!
echo.

echo [STEP 3a] Running npm install...
echo [DEBUG] Command: npm install
call npm install
set "npm_install_code=!ERRORLEVEL!"
echo [DEBUG] npm install exit code: !npm_install_code!
if !npm_install_code! neq 0 (
    echo [FAILED] npm install failed with code !npm_install_code!
    cd /d "!SCRIPT_DIR!"
    pause
    exit /b 1
)
echo [OK] npm install completed
echo.

echo [STEP 3b] Running npm run build...
echo [DEBUG] Command: npm run build
call npm run build
set "npm_build_code=!ERRORLEVEL!"
echo [DEBUG] npm run build exit code: !npm_build_code!
if !npm_build_code! neq 0 (
    echo [FAILED] npm run build failed with code !npm_build_code!
    cd /d "!SCRIPT_DIR!"
    pause
    exit /b 1
)
echo [OK] npm run build completed
echo.

echo [DEBUG] Verifying frontend/dist exists...
if exist "!SCRIPT_DIR!frontend\dist" (
    echo [OK] frontend/dist folder exists
    dir /s "!SCRIPT_DIR!frontend\dist" | find /c /v ""
) else (
    echo [WARNING] frontend/dist does not exist!
)
echo.

cd /d "!SCRIPT_DIR!"
echo [DEBUG] Changed back to: !CD!
echo.

REM Setup Python environment
echo [STEP 4] Setting up Python virtual environment...

if exist "!SCRIPT_DIR!venv-build" (
    echo [DEBUG] Removing old venv-build...
    rmdir /s /q "!SCRIPT_DIR!venv-build"
)

echo [STEP 4a] Creating virtual environment...
echo [DEBUG] Command: python -m venv !SCRIPT_DIR!venv-build
python -m venv "!SCRIPT_DIR!venv-build"
set "venv_code=!ERRORLEVEL!"
echo [DEBUG] venv creation exit code: !venv_code!
if !venv_code! neq 0 (
    echo [FAILED] Failed to create virtual environment with code !venv_code!
    pause
    exit /b 1
)
echo [OK] Virtual environment created
echo.

REM Activate virtual environment
echo [STEP 4b] Activating virtual environment...
echo [DEBUG] Activation script: !SCRIPT_DIR!venv-build\Scripts\activate.bat
call "!SCRIPT_DIR!venv-build\Scripts\activate.bat"
set "activate_code=!ERRORLEVEL!"
echo [DEBUG] activate.bat exit code: !activate_code!
if !activate_code! neq 0 (
    echo [WARNING] activate.bat returned code !activate_code! (this is often normal)
)
echo [OK] Attempting to use virtual environment
echo.

REM Upgrade pip
echo [STEP 5] Upgrading pip...
echo [DEBUG] Command: pip install --upgrade pip setuptools wheel
pip install --upgrade pip setuptools wheel
set "pip_upgrade_code=!ERRORLEVEL!"
echo [DEBUG] pip upgrade exit code: !pip_upgrade_code!
if !pip_upgrade_code! neq 0 (
    echo [WARNING] pip upgrade returned code !pip_upgrade_code! (trying to continue)
)
echo.

REM Install backend requirements
echo [STEP 6] Installing backend requirements...
echo [DEBUG] Requirements file: !SCRIPT_DIR!backend\requirements.txt
if exist "!SCRIPT_DIR!backend\requirements.txt" (
    echo [OK] requirements.txt found
) else (
    echo [ERROR] requirements.txt NOT found!
    pause
    exit /b 1
)
echo [DEBUG] Command: pip install -r !SCRIPT_DIR!backend\requirements.txt
pip install -r "!SCRIPT_DIR!backend\requirements.txt"
set "requirements_code=!ERRORLEVEL!"
echo [DEBUG] pip install requirements exit code: !requirements_code!
if !requirements_code! neq 0 (
    echo [FAILED] Failed to install requirements with code !requirements_code!
    pause
    exit /b 1
)
echo [OK] Backend requirements installed
echo.

REM Install PyInstaller
echo [STEP 7] Installing PyInstaller...
echo [DEBUG] Command: pip install pyinstaller
pip install pyinstaller
set "pyinstaller_install_code=!ERRORLEVEL!"
echo [DEBUG] PyInstaller install exit code: !pyinstaller_install_code!
if !pyinstaller_install_code! neq 0 (
    echo [FAILED] Failed to install PyInstaller with code !pyinstaller_install_code!
    pause
    exit /b 1
)
echo [OK] PyInstaller installed
echo.

REM Build executable
echo [STEP 8] Building executable with PyInstaller...
echo [DEBUG] Spec file: !SCRIPT_DIR!slideinjectr.spec
if exist "!SCRIPT_DIR!slideinjectr.spec" (
    echo [OK] slideinjectr.spec found
) else (
    echo [ERROR] slideinjectr.spec NOT found!
    pause
    exit /b 1
)
echo [DEBUG] Command: pyinstaller !SCRIPT_DIR!slideinjectr.spec
cd /d "!SCRIPT_DIR!"
pyinstaller "!SCRIPT_DIR!slideinjectr.spec"
set "pyinstaller_code=!ERRORLEVEL!"
echo [DEBUG] PyInstaller exit code: !pyinstaller_code!
if !pyinstaller_code! neq 0 (
    echo [FAILED] PyInstaller failed with code !pyinstaller_code!
    pause
    exit /b 1
)
echo [OK] PyInstaller build completed
echo.

REM Verify exe exists
echo [STEP 9] Verifying .exe was created...
set "exe_path=!SCRIPT_DIR!dist\slideinjectr.exe"
echo [DEBUG] Looking for: !exe_path!
if exist "!exe_path!" (
    echo [SUCCESS] Found executable!
    for %%A in ("!exe_path!") do (
        echo [INFO] File size: %%~zA bytes
        echo [INFO] Modified: %%~TA
    )
) else (
    echo [FAILED] Executable NOT found at !exe_path!
    if exist "!SCRIPT_DIR!dist" (
        echo [DEBUG] Contents of dist folder:
        dir "!SCRIPT_DIR!dist"
    ) else (
        echo [DEBUG] dist folder does not exist
    )
    pause
    exit /b 1
)
echo.

echo ===============================================
echo [SUCCESS] Build completed successfully!
echo ===============================================
echo.
echo Executable: !exe_path!
echo.
pause
