@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ===================================================
echo   KakaoMap Excel Bookmark Auto-Registrar
echo ===================================================

if not exist "node_modules" (
  echo [1/2] Installing dependencies...
  call npm install
)

echo [2/2] Starting local web server at http://localhost:3000
start "" cmd /c "timeout /t 2 > nul && start http://localhost:3000"
call npm start
pause
