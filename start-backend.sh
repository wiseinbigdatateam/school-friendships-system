#!/bin/bash

# Python 백엔드 서버 시작 스크립트

echo "🚀 Python 백엔드 서버를 시작합니다..."

# Python 가상환경 활성화
if [ -d "venv" ]; then
    echo "📦 Python 가상환경을 활성화합니다..."
    source venv/bin/activate
else
    echo "❌ Python 가상환경을 찾을 수 없습니다. venv 폴더가 있는지 확인해주세요."
    exit 1
fi

# 필요한 Python 패키지 확인
echo "🔍 필요한 Python 패키지를 확인합니다..."
python -c "import fastapi, uvicorn, flask, flask_cors, networkx, numpy, matplotlib" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📥 필요한 패키지를 설치합니다..."
    pip install fastapi uvicorn flask flask-cors networkx numpy matplotlib
fi

# 백엔드 서버 시작
echo "🌐 백엔드 API 서버를 포트 3001에서 시작합니다..."
cd src/scripts
python main_api.py

