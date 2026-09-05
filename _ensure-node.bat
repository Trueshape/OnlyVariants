@echo off
REM Makes `node` / `npm` available to the caller. Uses a Node already on
REM PATH if it is recent enough (>= 20.19); otherwise a portable copy under
REM tools\node, downloaded here on first run (no installer, no admin).
REM Called (not run directly) by avvia-sito.bat / aggiorna-dati.bat - it
REM sets PATH in the caller's environment.

cd /d "%~dp0"

set "NODE_VER=v22.14.0"
set "NODE_DIR=%~dp0tools\node"

REM 1. Already have the portable copy?
if exist "%NODE_DIR%\node.exe" (
    set "PATH=%NODE_DIR%;%PATH%"
    goto :eof
)

REM 2. A system Node on PATH that is new enough?
where node >nul 2>nul
if errorlevel 1 goto :download
for /f "tokens=1,2 delims=v." %%a in ('node -v 2^>nul') do (
    set "NODE_MAJOR=%%a"
    set "NODE_MINOR=%%b"
)
if not defined NODE_MAJOR goto :download
if %NODE_MAJOR% GEQ 21 goto :eof
if %NODE_MAJOR% EQU 20 if %NODE_MINOR% GEQ 19 goto :eof
echo.
echo Il Node.js installato (v%NODE_MAJOR%.%NODE_MINOR%) e' troppo vecchio: serve 20.19 o piu' recente.
echo Uso una copia portable.

:download
echo.
echo Scarico Node.js portable (~35 MB, solo la prima volta)...
echo.
if not exist "%~dp0tools" mkdir "%~dp0tools"

set "NODE_ZIP=%TEMP%\node-%NODE_VER%-win-x64.zip"
curl -L --fail -o "%NODE_ZIP%" "https://nodejs.org/dist/%NODE_VER%/node-%NODE_VER%-win-x64.zip"
if not exist "%NODE_ZIP%" (
    echo.
    echo Download non riuscito. Installa Node.js manualmente da https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo Estrazione...
if exist "%~dp0tools\node-%NODE_VER%-win-x64" rmdir /s /q "%~dp0tools\node-%NODE_VER%-win-x64"
tar -xf "%NODE_ZIP%" -C "%~dp0tools"
del "%NODE_ZIP%" >nul 2>nul
if exist "%NODE_DIR%" rmdir /s /q "%NODE_DIR%"
if exist "%~dp0tools\node-%NODE_VER%-win-x64" move "%~dp0tools\node-%NODE_VER%-win-x64" "%NODE_DIR%" >nul

if not exist "%NODE_DIR%\node.exe" (
    echo.
    echo Estrazione non riuscita. Installa Node.js manualmente da https://nodejs.org
    echo.
    pause
    exit /b 1
)

set "PATH=%NODE_DIR%;%PATH%"
echo Node portable pronto in tools\node
echo.
goto :eof
