@echo off
setlocal
cd /d "%~dp0"

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" (
  echo No encontre Google Chrome instalado.
  pause
  exit /b 1
)

start "" "%CHROME%" --user-data-dir="%CD%\perfil-google" --no-first-run --no-default-browser-check "https://docs.google.com/forms/d/e/1FAIpQLSePNS9A5ZGHISdKM29FAtI_2esxHzMOWAK0BS50EEHdmYzUDw/viewform"

echo.
echo Este Chrome NO esta controlado por Playwright.
echo Inicia sesion en Google aca y luego cerra la ventana.
echo La sesion queda guardada en perfil-google.
echo.
pause
