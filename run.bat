@echo off
title Bank Loan AI - Full Stack Launcher
color 0B

echo.
echo ============================================================
echo   BANK LOAN APPROVAL PREDICTION - FULL STACK LAUNCHER
echo ============================================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install from https://nodejs.org
    pause
    exit /b 1
)

:: Check Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Python not found. ML API will be skipped.
    set PYTHON_OK=0
) else (
    set PYTHON_OK=1
)

echo [INFO] Installing Backend dependencies...
cd /d "%~dp0backend"
if not exist node_modules (
    call npm install --silent
    echo [OK] Backend dependencies installed.
) else (
    echo [OK] Backend dependencies already installed.
)

echo.
echo [INFO] Installing Frontend dependencies...
cd /d "%~dp0frontend"
if not exist node_modules (
    call npm install --silent
    echo [OK] Frontend dependencies installed.
) else (
    echo [OK] Frontend dependencies already installed.
)

:: ML setup
if "%PYTHON_OK%"=="1" (
    echo.
    echo [INFO] Setting up Python ML environment...
    cd /d "%~dp0ml"
    if not exist venv (
        python -m venv venv
        echo [OK] Virtual environment created.
    )
    call venv\Scripts\activate.bat
    pip install -r requirements.txt -q
    if not exist models\rf_model.pkl (
        echo [INFO] Training ML model (first run - takes ~30 seconds)...
        python scripts\train_model.py
        echo [OK] Model trained and saved.
    ) else (
        echo [OK] ML model already exists.
    )
    call venv\Scripts\deactivate.bat
)

:: Create data directory
if not exist "%~dp0data" mkdir "%~dp0data"
if not exist "%~dp0uploads" mkdir "%~dp0uploads"

echo.
echo ============================================================
echo   STARTING ALL SERVICES
echo ============================================================
echo.

:: Start ML API (Python)
if "%PYTHON_OK%"=="1" (
    echo [STARTING] ML API on http://localhost:8000
    start "ML API (Python)" /MIN cmd /c "cd /d "%~dp0ml" && venv\Scripts\activate && python ml_api.py"
    timeout /t 3 /nobreak >nul
)

:: Start Backend (Node.js)
echo [STARTING] Backend API on http://localhost:5000
start "Backend API (Node.js)" /MIN cmd /c "cd /d "%~dp0backend" && npm run dev"
timeout /t 2 /nobreak >nul

:: Start Frontend (React)
echo [STARTING] Frontend on http://localhost:3000
start "Frontend (React)" cmd /c "cd /d "%~dp0frontend" && npm start"

echo.
echo ============================================================
echo   ALL SERVICES STARTED
echo ============================================================
echo.
echo   Frontend  : http://localhost:3000
echo   Backend   : http://localhost:5000
echo   ML API    : http://localhost:8000 (if Python available)
echo.
echo   Demo Login:
echo     User  : user / user123
echo     Admin : admin / admin123
echo.
echo   Press any key to open the app in browser...
pause >nul
start http://localhost:3000

echo.
echo [INFO] Close this window to keep services running.
echo [INFO] Close individual terminal windows to stop each service.
pause
