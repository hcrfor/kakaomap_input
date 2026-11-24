@echo off
cd /d "%~dp0"

echo ===================================================
echo   KakaoMap Excel Bookmark Auto-Registrar
echo ===================================================

if not exist "node_modules\express" (
  echo [1/2] Installing dependencies...
  call npm install
)

echo [2/2] Starting local web server at http://localhost:3000
start http://localhost:3000
call npm start
pause
