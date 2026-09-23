@echo off
title KaiStu - Personal Study Workstation
cd /d "%~dp0"

echo ========================================================
echo   Starting KaiStu Study Workstation Server...
echo ========================================================
echo.
echo   [PC Browser]   : http://localhost:5173
echo   [Mobile Phone] : http://192.168.0.101:5173
echo.
echo   * On your mobile phone connected to the same Wi-Fi,
echo     open: http://192.168.0.101:5173
echo ========================================================
echo.

rem Launch browser after a 2-second delay so Vite is listening
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5173"

rem Start the Vite dev server bound to all network interfaces
call npm.cmd run dev

pause
