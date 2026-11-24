@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ===================================================
echo   KakaoMap Excel Bookmark Auto-Registrar
echo ===================================================

if not exist "node_modules\express" (
  echo [1/2] 필수 부품(node_modules)을 설치하고 있습니다... (1~2분 소요)
  call npm install
  if errorlevel 1 (
    echo.
    echo [오류] 필수 부품 설치(npm install)에 실패했습니다.
    echo 인터넷 연결 상태를 확인하시거나, 폴더를 C:\kakaomap_input 같은 영문 단순 경로로 옮겨서 다시 실행해 보세요.
    echo.
    pause
    exit /b 1
  )
)

echo [2/2] 로컬 웹 서버를 실행합니다... (http://localhost:3000)
start "" cmd /c "timeout /t 2 > nul && start http://localhost:3000"
call npm start
if errorlevel 1 (
  echo.
  echo [오류] 서버 실행 도중 문제가 발생했습니다.
  pause
)


