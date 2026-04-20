@echo off
cd /d "%~dp0"
title Trassa dev

if not exist "node_modules\" (
echo [1/2] Installing website dependencies first time...
call npm install
if errorlevel 1 (
echo ERROR: npm install failed. Install Node.js from nodejs.org
pause
exit /b 1
)
)

if not exist "server\node_modules\" (
echo [2/2] Installing server dependencies first time...
call npm run server:install
if errorlevel 1 (
echo ERROR: server install failed.
pause
exit /b 1
)
)

if not exist ".env" (
echo VITE_USE_AUTH_API=true>.env
echo Created .env file.
)

if not exist "server\.env" (
if exist "server\.env.example" copy /Y "server\.env.example" "server\.env" >nul
echo Created server\.env from example.
)

echo.
echo If port 4000 was busy, it is freed automatically (old API closed).
echo Open in browser: usually http://localhost:5173
echo If that port is busy, Vite prints another address below - use that URL.
echo To stop: close this window or press Ctrl+C
echo.
call npm run dev:all
echo.
pause
