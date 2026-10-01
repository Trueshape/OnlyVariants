@echo off
title Marvel Snap Variants - Server
cd /d "%~dp0"

echo ===============================================
echo   Marvel Snap Variants Wishlist
echo ===============================================
echo.

call "%~dp0_ensure-node.bat" || exit /b 1

if not exist "node_modules" (
    echo Prima installazione: installo le dipendenze...
    call npm install --legacy-peer-deps
    echo.
)

echo Avvio del server di sviluppo...
echo Il sito si aprira automaticamente nel browser tra qualche secondo.
echo Per chiudere il server, chiudi questa finestra.
echo.

REM Apre il browser dopo una breve attesa, mentre il server si avvia
start "" cmd /c "timeout /t 4 /nobreak >nul & start "" http://localhost:5173"

call npm run dev

pause
