#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
개별 학생 네트워크 분석 API 서버
Flask를 사용한 REST API 엔드포인트
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import sys
import os
import logging
from datetime import datetime

# 현재 스크립트의 디렉토리를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from individual_network_analysis import IndividualNetworkAnalyzer, analyze_individual_student_network

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # CORS 허용

@app.route('/api/individual-analysis', methods=['POST'])
def analyze_individual_student():
    """개별 학생 네트워크 분석 API 엔드포인트"""
    try:
        # 요청 데이터 파싱
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        student_id = data.get('student_id')
        friendship_data = data.get('friendship_data', [])
        student_info = data.get('student_info', [])
        
        if not student_id:
            return jsonify({'error': 'student_id가 필요합니다.'}), 400
        
        logger.info(f"개별 학생 분석 요청: {student_id}")
        
        # 네트워크 분석 실행
        result = analyze_individual_student_network(
            student_id=student_id,
            friendship_data=friendship_data,
            student_info=student_info
        )
        
        if not result:
            return jsonify({'error': '분석 결과를 생성할 수 없습니다.'}), 500
        
        logger.info(f"개별 학생 분석 완료: {student_id}")
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"개별 학생 분석 중 오류 발생: {str(e)}")
        return jsonify({
            'error': f'분석 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/api/individual-analysis/health', methods=['GET'])
def health_check():
    """API 서버 상태 확인"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'individual-network-analysis-api'
    })

@app.route('/api/individual-analysis/test', methods=['POST'])
def test_analysis():
    """테스트용 분석 API"""
    try:
        # 테스트용 샘플 데이터
        sample_friendship_data = [
            {'student_id': 'student_001', 'friend_student_id': 'student_002', 'relationship_type': '친한 친구', 'strength_score': 1.0},
            {'student_id': 'student_001', 'friend_student_id': 'student_003', 'relationship_type': '함께 놀고 싶은 친구', 'strength_score': 0.8},
            {'student_id': 'student_002', 'friend_student_id': 'student_003', 'relationship_type': '친한 친구', 'strength_score': 1.0},
        ]
        
        sample_student_info = [
            {'id': 'student_001', 'name': '김철수', 'grade': '1', 'class': '1'},
            {'id': 'student_002', 'name': '이영희', 'grade': '1', 'class': '1'},
            {'id': 'student_003', 'name': '박민수', 'grade': '1', 'class': '1'},
        ]
        
        # 분석 실행
        result = analyze_individual_student_network(
            student_id='student_001',
            friendship_data=sample_friendship_data,
            student_info=sample_student_info
        )
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"테스트 분석 중 오류 발생: {str(e)}")
        return jsonify({
            'error': f'테스트 분석 중 오류가 발생했습니다: {str(e)}'
        }), 500

if __name__ == '__main__':
    # 개발 환경에서 실행
    app.run(host='0.0.0.0', port=3000, debug=True)
