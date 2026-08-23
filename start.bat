@echo off
title Predictive Inventory System Launcher
echo ========================================================
echo   Starting Predictive Inventory System
echo ========================================================
echo.

tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [1/3] MySQL database is already running.
) else (
    echo [1/3] Starting MySQL from XAMPP...
    start /B "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
    timeout /t 2 /nobreak >nul
)

echo [2/3] Starting Backend API on http://127.0.0.1:8001...
start "Predictive Inventory - Backend" cmd /k "cd /d %~dp0backend && C:\xampp\php\php.exe artisan serve --host=127.0.0.1 --port=8001"

echo [3/3] Starting Frontend on http://localhost:5188...
start "Predictive Inventory - Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo ========================================================
echo   Application is up and running!
echo   - Frontend: http://localhost:5188
echo   - Backend:  http://127.0.0.1:8001
echo ========================================================
echo.
echo Opening http://localhost:5188 in browser...
timeout /t 3 /nobreak >nul
start http://localhost:5188
