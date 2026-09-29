@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0configurar-bistro.ps1" -Mode save -FilePath "%~dp0.bistro-credentials.json"
echo.
pause
