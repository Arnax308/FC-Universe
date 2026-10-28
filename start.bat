@echo off
setlocal
title FC Universe
rem Always run from the folder this file lives in (double-click, shortcut or "Run as admin")
cd /d "%~dp0"

echo.
echo  =============================================
echo     FC UNIVERSE  -  starting backend + frontend
echo  =============================================
echo.

set "VENV_PY=backend\venv\Scripts\python.exe"

rem ---- 1. Python virtual environment (created once) ----
if not exist "%VENV_PY%" (
    echo [setup] Creating Python environment in backend\venv ...
    where py >nul 2>nul && (py -3 -m venv backend\venv) || (python -m venv backend\venv)
    if not exist "%VENV_PY%" (
        echo [error] Could not create a Python environment. Install Python 3.12+ from python.org and try again.
        goto :fail
    )
)

rem ---- 2. Backend packages (re-installed only when something is missing) ----
"%VENV_PY%" -c "import fastapi, uvicorn, sqlalchemy, pydantic_settings, httpx" >nul 2>nul
if errorlevel 1 (
    echo [setup] Installing backend packages, this can take a minute ...
    "%VENV_PY%" -m pip install --quiet --upgrade pip
    "%VENV_PY%" -m pip install --quiet -e backend
    if errorlevel 1 (
        echo [error] Installing backend packages failed - check your internet connection.
        goto :fail
    )
)

rem ---- 3. Node.js for the frontend ----
where npm >nul 2>nul
if errorlevel 1 (
    echo [error] Node.js was not found. Install it from https://nodejs.org and try again.
    goto :fail
)

rem ---- 4. Launch (run.py installs frontend packages if needed and opens the browser) ----
"%VENV_PY%" run.py
if errorlevel 1 goto :fail
exit /b 0

:fail
echo.
echo FC Universe did not start. Read the message above, then press any key to close.
pause >nul
exit /b 1
