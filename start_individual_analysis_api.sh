#!/bin/bash

# 개별 학생 네트워크 분석 API 서버 실행 스크립트

echo "개별 학생 네트워크 분석 API 서버를 시작합니다..."

# Python 가상환경 활성화 (있는 경우)
if [ -d "venv" ]; then
    echo "Python 가상환경을 활성화합니다..."
    source venv/bin/activate
fi

# 필요한 Python 패키지 설치 확인
echo "필요한 Python 패키지를 확인합니다..."
pip install flask flask-cors networkx numpy matplotlib

# API 서버 실행
echo "API 서버를 포트 5001에서 실행합니다..."
cd src/scripts
python individual_network_analysis_api.py
