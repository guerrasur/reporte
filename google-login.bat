@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" (
  echo No encontre Google Chrome instalado.
  pause
  exit /b 1
)

echo.
echo Se abrira Chrome NORMAL, sin Playwright.
echo Inicia sesion en Google y espera a que cargue el formulario.
echo Luego CERRA COMPLETAMENTE esa ventana de Chrome.
echo.

start "" /wait "%CHROME%" --user-data-dir="%CD%\perfil-google" --no-first-run --no-default-browser-check "https://docs.google.com/forms/d/e/1FAIpQLSePNS9A5ZGHISdKM29FAtI_2esxHzMOWAK0BS50EEHdmYzUDw/viewform"

> "%CD%\.google-session-ready" echo ready

echo.
echo Sesion preparada. Ya podes abrir reporte.bat.
echo.
pause
