#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
개별 학생 교우관계 네트워크 분석 스크립트
NetworkX를 사용한 개별 학생 중심의 네트워크 분석
"""

import networkx as nx
import numpy as np
import json
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime
import logging
import os
import platform
import sys

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IndividualNetworkAnalyzer:
    """개별 학생 교우관계 네트워크 분석 클래스"""
    
    def __init__(self):
        self.network = None
        self.analysis_result = None
        
    def create_individual_network(self, student_id: str, friendship_data: List[Dict], 
                                student_info: List[Dict]) -> nx.Graph:
        """개별 학생 중심의 네트워크 생성"""
        G = nx.Graph()
        
        # 중심 학생 정보 찾기
        center_student = None
        for student in student_info:
            if student['id'] == student_id:
                center_student = student
                break
        
        if not center_student:
            logger.error(f"중심 학생 {student_id}를 찾을 수 없습니다.")
            return G
        
        # 중심 학생 노드 추가
        G.add_node(student_id, 
                  name=center_student['name'],
                  grade=center_student['grade'],
                  class_name=center_student['class'],
                  is_center=True)
        
        # 중심 학생과 연결된 친구들 찾기
        connected_friends = set()
        for record in friendship_data:
            if record['student_id'] == student_id:
                connected_friends.add(record['friend_student_id'])
            elif record['friend_student_id'] == student_id:
                connected_friends.add(record['student_id'])
        
        # 연결된 친구들 노드 추가
        for friend_id in connected_friends:
            friend_info = next((s for s in student_info if s['id'] == friend_id), None)
            if friend_info:
                G.add_node(friend_id,
                          name=friend_info['name'],
                          grade=friend_info['grade'],
                          class_name=friend_info['class'],
                          is_center=False)
        
        # 친구 관계 엣지 추가
        for record in friendship_data:
            if (record['student_id'] == student_id and record['friend_student_id'] in connected_friends) or \
               (record['friend_student_id'] == student_id and record['student_id'] in connected_friends):
                G.add_edge(record['student_id'], 
                          record['friend_student_id'],
                          weight=record.get('strength_score', 1),
                          relationship_type=record.get('relationship_type', 'friend'))
        
        self.network = G
        logger.info(f"개별 네트워크 생성 완료: {G.number_of_nodes()}명, {G.number_of_edges()}개 관계")
        return G
    
    def calculate_individual_metrics(self, G: nx.Graph, student_id: str) -> Dict[str, Any]:
        """개별 학생의 네트워크 지표 계산"""
        if not G.has_node(student_id):
            return {}
        
        # 기본 연결 정보
        degree = G.degree(student_id)
        neighbors = list(G.neighbors(student_id))
        
        # 중심성 지수 계산
        centrality_metrics = {}
        
        # 연결 중심성 (Degree Centrality)
        degree_centrality = nx.degree_centrality(G)
        centrality_metrics['degree'] = degree_centrality.get(student_id, 0)
        
        # 매개 중심성 (Betweenness Centrality)
        betweenness_centrality = nx.betweenness_centrality(G)
        centrality_metrics['betweenness'] = betweenness_centrality.get(student_id, 0)
        
        # 근접 중심성 (Closeness Centrality)
        closeness_centrality = nx.closeness_centrality(G)
        centrality_metrics['closeness'] = closeness_centrality.get(student_id, 0)
        
        # 고유벡터 중심성 (Eigenvector Centrality)
        try:
            eigenvector_centrality = nx.eigenvector_centrality(G, max_iter=1000)
            centrality_metrics['eigenvector'] = eigenvector_centrality.get(student_id, 0)
        except:
            centrality_metrics['eigenvector'] = 0.0
        
        # 네트워크 밀도 계산
        network_density = nx.density(G)
        
        # 클러스터링 계수 계산
        clustering_coefficient = nx.clustering(G, student_id)
        
        # 친구 관계 유형 분류
        friendship_type = self.classify_friendship_type(degree, centrality_metrics['degree'])
        
        # 고립 위험도 평가
        isolation_risk = self.assess_isolation_risk(degree, centrality_metrics['degree'], network_density)
        
        # 사회적 영향력 평가
        social_influence = self.assess_social_influence(centrality_metrics, degree)
        
        return {
            'student_id': student_id,
            'degree': degree,
            'neighbors': neighbors,
            'centrality_metrics': centrality_metrics,
            'network_density': network_density,
            'clustering_coefficient': clustering_coefficient,
            'friendship_type': friendship_type,
            'isolation_risk': isolation_risk,
            'social_influence': social_influence,
            'total_nodes': G.number_of_nodes(),
            'total_edges': G.number_of_edges()
        }
    
    def classify_friendship_type(self, degree: int, degree_centrality: float) -> str:
        """교우관계 유형 분류"""
        if degree == 0:
            return "고립형"
        elif degree <= 2:
            return "소수 친구형"
        elif degree <= 5:
            return "평균형"
        elif degree <= 8:
            return "친구 많은형"
        else:
            return "사교형"
    
    def assess_isolation_risk(self, degree: int, degree_centrality: float, network_density: float) -> Dict[str, Any]:
        """고립 위험도 평가"""
        risk_score = 0
        
        # 연결 수 기반 위험도
        if degree == 0:
            risk_score += 40
        elif degree <= 2:
            risk_score += 25
        elif degree <= 4:
            risk_score += 10
        
        # 중심성 기반 위험도
        if degree_centrality < 0.2:
            risk_score += 20
        elif degree_centrality < 0.4:
            risk_score += 10
        
        # 네트워크 밀도 기반 위험도
        if network_density < 0.1:
            risk_score += 15
        elif network_density < 0.3:
            risk_score += 5
        
        # 위험도 등급 결정
        if risk_score >= 50:
            risk_level = "높음"
            risk_description = "즉시 개입이 필요한 고립 위험 상태"
        elif risk_score >= 30:
            risk_level = "보통"
            risk_description = "관심이 필요한 상태"
        elif risk_score >= 15:
            risk_level = "낮음"
            risk_description = "양호한 상태"
        else:
            risk_level = "매우 낮음"
            risk_description = "매우 안정적인 상태"
        
        return {
            'level': risk_level,
            'score': risk_score,
            'description': risk_description,
            'factors': {
                'connection_count': degree,
                'centrality': degree_centrality,
                'network_density': network_density
            }
        }
    
    def assess_social_influence(self, centrality_metrics: Dict[str, float], degree: int) -> Dict[str, Any]:
        """사회적 영향력 평가"""
        # 종합 영향력 점수 계산
        influence_score = (
            centrality_metrics['degree'] * 0.4 +
            centrality_metrics['betweenness'] * 0.3 +
            centrality_metrics['closeness'] * 0.2 +
            centrality_metrics['eigenvector'] * 0.1
        ) * 100
        
        # 영향력 등급 결정
        if influence_score >= 70:
            influence_level = "매우 높음"
            influence_description = "네트워크의 핵심 인물로 강한 영향력 보유"
        elif influence_score >= 50:
            influence_level = "높음"
            influence_description = "네트워크에서 중요한 역할을 수행"
        elif influence_score >= 30:
            influence_level = "보통"
            influence_description = "네트워크에서 평균적인 영향력"
        elif influence_score >= 15:
            influence_level = "낮음"
            influence_description = "네트워크에서 제한적인 영향력"
        else:
            influence_level = "매우 낮음"
            influence_description = "네트워크에서 미미한 영향력"
        
        return {
            'level': influence_level,
            'score': influence_score,
            'description': influence_description,
            'metrics': centrality_metrics
        }
    
    def generate_guidance_recommendations(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """개별 학생을 위한 맞춤형 지도 방안 생성"""
        friendship_type = metrics['friendship_type']
        isolation_risk = metrics['isolation_risk']
        social_influence = metrics['social_influence']
        
        recommendations = {
            'immediate_actions': [],
            'short_term_goals': [],
            'long_term_goals': [],
            'monitoring_points': [],
            'intervention_level': 'none'
        }
        
        # 고립 위험도에 따른 즉시 조치
        if isolation_risk['level'] == '높음':
            recommendations['intervention_level'] = 'urgent'
            recommendations['immediate_actions'] = [
                "상담사 또는 전문가와의 즉시 상담 연계",
                "소규모 그룹 활동 참여 유도",
                "교사와의 일대일 상담 강화",
                "학부모와의 긴급 상담 실시"
            ]
        elif isolation_risk['level'] == '보통':
            recommendations['intervention_level'] = 'moderate'
            recommendations['immediate_actions'] = [
                "교사와의 정기적인 상담 일정 수립",
                "관심사 기반 동아리 활동 권장",
                "또래 멘토링 프로그램 참여 유도"
            ]
        
        # 교우관계 유형에 따른 단기 목표
        if friendship_type == "고립형":
            recommendations['short_term_goals'] = [
                "최소 1-2명의 친구 관계 형성",
                "그룹 활동에 적극 참여",
                "사회적 기술 향상 프로그램 참여"
            ]
        elif friendship_type == "소수 친구형":
            recommendations['short_term_goals'] = [
                "기존 친구 관계 강화",
                "새로운 친구 관계 확장",
                "다양한 활동 참여로 경험 확장"
            ]
        elif friendship_type == "평균형":
            recommendations['short_term_goals'] = [
                "현재 관계 유지 및 점진적 확장",
                "리더십 기회 제공",
                "다양한 활동 참여로 경험 확장"
            ]
        elif friendship_type == "친구 많은형":
            recommendations['short_term_goals'] = [
                "리더십 역할 강화",
                "또래 상담자 역할 수행",
                "새로운 학생들의 네트워크 연결 지원"
            ]
        elif friendship_type == "사교형":
            recommendations['short_term_goals'] = [
                "긍정적 영향력 확산",
                "네트워크 연결자 역할 강화",
                "사회적 책임감 향상"
            ]
        
        # 사회적 영향력에 따른 장기 목표
        if social_influence['level'] in ['매우 높음', '높음']:
            recommendations['long_term_goals'] = [
                "네트워크 리더로서의 역할 수행",
                "또래 상담 및 멘토링 활동",
                "학교 공동체 발전에 기여"
            ]
        elif social_influence['level'] == '보통':
            recommendations['long_term_goals'] = [
                "안정적인 네트워크 유지",
                "점진적인 영향력 확장",
                "다양한 사회적 역할 수행"
            ]
        else:
            recommendations['long_term_goals'] = [
                "사회적 기술 향상",
                "네트워크 참여도 증대",
                "자신감 및 소통 능력 향상"
            ]
        
        # 모니터링 포인트 설정
        if recommendations['intervention_level'] == 'urgent':
            recommendations['monitoring_points'] = [
                "주간 상담 및 관계 개선 상황 점검",
                "새로운 친구 관계 형성 여부 확인",
                "정서적 안정성 및 학교 적응도 평가",
                "학부모와의 정기적인 소통"
            ]
        elif recommendations['intervention_level'] == 'moderate':
            recommendations['monitoring_points'] = [
                "월간 네트워크 변화 추이 모니터링",
                "사회적 참여도 및 활동 참여 빈도 점검",
                "학업 성취도와 사회적 관계의 균형 평가"
            ]
        else:
            recommendations['monitoring_points'] = [
                "분기별 네트워크 상태 점검",
                "사회적 기술 발달 정도 평가",
                "전반적인 학교생활 만족도 조사"
            ]
        
        return recommendations
    
    def analyze_individual_student(self, student_id: str, friendship_data: List[Dict], 
                                 student_info: List[Dict]) -> Dict[str, Any]:
        """개별 학생 네트워크 분석 실행"""
        logger.info(f"개별 학생 {student_id} 네트워크 분석 시작")
        
        # 개별 네트워크 생성
        G = self.create_individual_network(student_id, friendship_data, student_info)
        
        if G.number_of_nodes() == 0:
            logger.warning(f"학생 {student_id}에 대한 네트워크 데이터가 없습니다.")
            return {}
        
        # 개별 지표 계산
        metrics = self.calculate_individual_metrics(G, student_id)
        
        # 맞춤형 지도 방안 생성
        recommendations = self.generate_guidance_recommendations(metrics)
        
        # 분석 결과 통합
        analysis_result = {
            'student_id': student_id,
            'analysis_timestamp': datetime.now().isoformat(),
            'network_stats': {
                'total_nodes': G.number_of_nodes(),
                'total_edges': G.number_of_edges(),
                'network_density': nx.density(G),
                'average_clustering': nx.average_clustering(G)
            },
            'individual_metrics': metrics,
            'recommendations': recommendations,
            'network_data': self.prepare_network_data(G, student_info)
        }
        
        self.analysis_result = analysis_result
        logger.info(f"개별 학생 {student_id} 네트워크 분석 완료")
        
        return analysis_result
    
    def prepare_network_data(self, G: nx.Graph, student_info: List[Dict]) -> Dict[str, Any]:
        """네트워크 시각화용 데이터 준비"""
        # 노드 데이터
        nodes = []
        for node in G.nodes(data=True):
            node_data = {
                'id': node[0],
                'name': node[1].get('name', node[0]),
                'grade': node[1].get('grade', ''),
                'class': node[1].get('class_name', ''),
                'is_center': node[1].get('is_center', False),
                'degree': G.degree(node[0])
            }
            nodes.append(node_data)
        
        # 엣지 데이터
        edges = []
        for edge in G.edges(data=True):
            edge_data = {
                'source': edge[0],
                'target': edge[1],
                'weight': edge[2].get('weight', 1),
                'relationship_type': edge[2].get('relationship_type', 'friend')
            }
            edges.append(edge_data)
        
        return {
            'nodes': nodes,
            'edges': edges
        }

def analyze_individual_student_network(student_id: str, friendship_data: List[Dict], 
                                     student_info: List[Dict]) -> Dict[str, Any]:
    """개별 학생 네트워크 분석 실행 함수"""
    analyzer = IndividualNetworkAnalyzer()
    return analyzer.analyze_individual_student(student_id, friendship_data, student_info)

if __name__ == "__main__":
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
    result = analyze_individual_student_network('student_001', sample_friendship_data, sample_student_info)
    
    # 결과 출력
    print(json.dumps(result, ensure_ascii=False, indent=2))
