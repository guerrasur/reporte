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

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] No se encontro npm.
  echo Reinstala Node.js incluyendo npm.
  echo.
  pause
  exit /b 1
)

REM Primera instalacion o carpeta copiada/extraida desde GitHub.
if not exist "%~dp0node_modules\playwright\package.json" (
  echo Instalando dependencias por primera vez...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo [ERROR] No se pudieron instalar las dependencias.
    echo.
    pause
    exit /b 1
  )
)

echo Buscando actualizaciones...
node updater.js

REM Por si una actualizacion cambio package.json/package-lock.json o faltaban modulos.
if not exist "%~dp0node_modules\playwright\package.json" (
  echo Instalando dependencias...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo [ERROR] No se pudieron instalar las dependencias.
    echo.
    pause
    exit /b 1
  )
)

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
