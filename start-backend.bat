@echo off
REM Python 백엔드 서버 시작 스크립트 (Windows)

echo 🚀 Python 백엔드 서버를 시작합니다...

REM Python 가상환경 활성화
if exist "venv\Scripts\activate.bat" (
    echo 📦 Python 가상환경을 활성화합니다...
    call venv\Scripts\activate.bat
) else (
    echo ❌ Python 가상환경을 찾을 수 없습니다. venv 폴더가 있는지 확인해주세요.
    pause
    exit /b 1
)

REM 필요한 Python 패키지 확인
echo 🔍 필요한 Python 패키지를 확인합니다...
python -c "import fastapi, uvicorn, flask, flask_cors, networkx, numpy, matplotlib" 2>nul
if errorlevel 1 (
    echo 📥 필요한 패키지를 설치합니다...
    pip install fastapi uvicorn flask flask-cors networkx numpy matplotlib
)

REM 백엔드 서버 시작
echo 🌐 백엔드 API 서버를 포트 3001에서 시작합니다...
cd src\scripts
python main_api.py
pause

