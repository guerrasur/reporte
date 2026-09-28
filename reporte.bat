@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Si una actualizacion anterior dejo un launcher nuevo, aplicarlo primero.
if exist "%~dp0reporte.bat.new" (
  move /y "%~dp0reporte.bat.new" "%~f0" >nul
  call "%~f0"
  exit /b
)

set "VER="
if exist VERSION set /p VER=<VERSION
title Reporte v%VER%

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] No se encontro Node.js.
  echo.
  pause
  exit /b 1
)

echo Buscando actualizaciones...
node updater.js

REM Releer VERSION por si acaba de actualizarse.
set "VER="
if exist VERSION set /p VER=<VERSION
title Reporte v%VER%

echo.
echo Iniciando Reporte v%VER%...
echo MODO PRUEBA: completa el formulario pero NO lo envia automaticamente.
echo.
node reporte.js --dry

pause
