@echo off
title Marvel Snap Variants - Aggiornamento Dati
cd /d "%~dp0"

echo ===============================================
echo   Aggiornamento Dati - Marvel Snap Variants
echo ===============================================
echo.

call "%~dp0_ensure-node.bat" || exit /b 1

if not exist "node_modules" (
    echo Prima installazione: installo le dipendenze...
    call npm install --legacy-peer-deps
    echo.
)

echo [1/3] Scarico l'elenco completo delle varianti da snapcomplete.com...
call npm run scrape-all
echo.

echo [2/3] Importo le varianti possedute dal salvataggio di Marvel Snap...
call npm run import-owned
echo.

echo [3/3] Importo i dati di costo/bundle dallo shop del salvataggio...
call npm run import-costs
echo.

echo ===============================================
echo   Aggiornamento completato!
echo   Ricarica la pagina del sito per vedere i dati aggiornati.
echo ===============================================
echo.

pause
