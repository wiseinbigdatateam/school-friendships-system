#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
통합 네트워크 분석 API 서버
FastAPI를 사용한 REST API 엔드포인트
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import sys
import os
import logging
from datetime import datetime
from typing import Dict, List, Any
import uvicorn

# 현재 스크립트의 디렉토리를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# 네트워크 분석 모듈 import
from network_analysis_api import FriendshipNetworkAnalyzer
from individual_network_analysis import IndividualNetworkAnalyzer, analyze_individual_student_network

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="School Friendships Network Analysis API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """API 서버 상태 확인"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "unified-network-analysis-api"
    }

@app.post("/api/network-analysis/run")
async def run_network_analysis(request_data: Dict[str, Any]):
    """통합 네트워크 분석 실행"""
    try:
        logger.info("네트워크 분석 요청 수신")
        
        survey_id = request_data.get('surveyId')
        survey_data = request_data.get('surveyData', [])
        student_info = request_data.get('studentInfo', [])
        
        if not survey_id:
            raise HTTPException(status_code=400, detail="surveyId가 필요합니다.")
        
        logger.info(f"설문 ID: {survey_id}")
        logger.info(f"학생 수: {len(student_info)}")
        logger.info(f"관계 수: {len(survey_data)}")
        
        # 분석기 초기화 및 분석 실행
        analyzer = FriendshipNetworkAnalyzer()
        result = analyzer.analyze_network(survey_data, student_info)
        
        # 결과에 설문 ID 추가
        result['survey_id'] = survey_id
        
        logger.info(f"네트워크 분석 완료: {survey_id}")
        
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"네트워크 분석 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류가 발생했습니다: {str(e)}")

@app.post("/api/network-analysis/test")
async def test_analysis():
    """테스트용 분석 API"""
    try:
        # 테스트용 샘플 데이터
        sample_survey_data = [
            ['student_001', 'student_002', '친한 친구'],
            ['student_001', 'student_003', '함께 놀고 싶은 친구'],
            ['student_002', 'student_003', '친한 친구'],
            ['student_002', 'student_004', '친한 친구'],
            ['student_003', 'student_004', '함께 놀고 싶은 친구'],
        ]
        
        sample_student_info = [
            {'id': 'student_001', 'name': '김철수', 'grade': '1', 'class': '1'},
            {'id': 'student_002', 'name': '이영희', 'grade': '1', 'class': '1'},
            {'id': 'student_003', 'name': '박민수', 'grade': '1', 'class': '1'},
            {'id': 'student_004', 'name': '최지영', 'grade': '1', 'class': '1'},
        ]
        
        # 분석 실행
        analyzer = FriendshipNetworkAnalyzer()
        result = analyzer.analyze_network(sample_survey_data, sample_student_info)
        
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"테스트 분석 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"테스트 분석 중 오류가 발생했습니다: {str(e)}")

@app.post("/api/individual-analysis")
async def run_individual_analysis(request_data: Dict[str, Any]):
    """개별 학생 네트워크 분석 API 엔드포인트"""
    try:
        # 요청 데이터 파싱
        student_id = request_data.get('student_id')
        friendship_data = request_data.get('friendship_data', [])
        student_info = request_data.get('student_info', [])
        
        if not student_id:
            raise HTTPException(status_code=400, detail="student_id가 필요합니다.")
        
        logger.info(f"개별 학생 분석 요청: {student_id}")
        
        # 네트워크 분석 실행
        result = analyze_individual_student_network(
            student_id=student_id,
            friendship_data=friendship_data,
            student_info=student_info
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="분석 결과를 생성할 수 없습니다.")
        
        logger.info(f"개별 학생 분석 완료: {student_id}")
        
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        import traceback
        logger.error(f"개별 학생 분석 중 오류 발생: {str(e)}")
        logger.error(f"스택 트레이스:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"개별 학생 분석 중 오류가 발생했습니다: {str(e)}")

if __name__ == '__main__':
    # 개발 환경에서 실행
    uvicorn.run("main_api:app", host="0.0.0.0", port=3001, reload=True)
