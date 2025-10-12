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
        """전체 학급 네트워크 생성 (개별 학생 분석을 위해)"""
        G = nx.Graph()
        
        # 모든 학생 노드 추가
        student_map = {student['id']: student for student in student_info}
        for student in student_info:
            G.add_node(student['id'], 
                      name=student['name'],
                      grade=student['grade'],
                      class_name=student['class'],
                      is_center=(student['id'] == student_id))
        
        # 모든 친구 관계 엣지 추가 (전체 학급 네트워크)
        for record in friendship_data:
            if record['student_id'] in student_map and record['friend_student_id'] in student_map:
                G.add_edge(record['student_id'], 
                          record['friend_student_id'],
                          weight=record.get('strength_score', 1),
                          relationship_type=record.get('relationship_type', 'friend'))
        
        self.network = G
        logger.info(f"전체 학급 네트워크 생성 완료: {G.number_of_nodes()}명, {G.number_of_edges()}개 관계")
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
        
        # 현재 상태 분석 추가
        try:
            isolation_level = isolation_risk.get('level', '보통') if isinstance(isolation_risk, dict) else '보통'
        except Exception as e:
            logger.error(f"isolation_risk level 추출 오류: {e}")
            isolation_level = '보통'
            
        current_status = self.analyze_current_status(
            centrality_metrics['degree'],
            degree,
            network_density,
            isolation_level,
            G.number_of_nodes()
        )
        
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
            'current_status': current_status,  # 추가
            'total_nodes': G.number_of_nodes(),
            'total_edges': G.number_of_edges()
        }
    
    def classify_friendship_type(self, degree: int, degree_centrality: float) -> str:
        """교우관계 유형 분류 (학급별 분석과 동일한 기준)"""
        if degree == 0:
            return "외톨이형"
        elif degree <= 2:
            return "소수 친구 학생"
        elif degree <= 5:
            return "평균적인 학생"
        elif degree <= 8:
            return "친구 많은 학생"
        else:
            return "사교 스타"
    
    def assess_isolation_risk(self, degree: int, degree_centrality: float, network_density: float) -> Dict[str, Any]:
        """고립 위험도 평가"""
        try:
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
        except Exception as e:
            logger.error(f"assess_isolation_risk 오류: {e}")
            return {
                'level': '보통',
                'score': 25,
                'description': '평가 중 오류 발생',
                'factors': {
                    'connection_count': degree,
                    'centrality': degree_centrality,
                    'network_density': network_density
                }
            }
    
    def assess_social_influence(self, centrality_metrics: Dict[str, float], degree: int) -> Dict[str, Any]:
        """사회적 영향력 평가"""
        try:
            # 종합 영향력 점수 계산
            influence_score = (
                centrality_metrics.get('degree', 0) * 0.4 +
                centrality_metrics.get('betweenness', 0) * 0.3 +
                centrality_metrics.get('closeness', 0) * 0.2 +
                centrality_metrics.get('eigenvector', 0) * 0.1
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
        except Exception as e:
            logger.error(f"assess_social_influence 오류: {e}")
            return {
                'level': '보통',
                'score': 30,
                'description': '평가 중 오류 발생',
                'metrics': centrality_metrics
            }
    
    def analyze_current_status(self, centrality: float, friend_count: int, 
                               network_density: float, isolation_risk: str, 
                               total_students: int) -> Dict[str, str]:
        """현재 상태 분석"""
        friend_ratio = friend_count / max(total_students - 1, 1)
        
        # 학교생활 만족도
        if network_density > 0.6 and centrality > 0.6:
            school_satisfaction = "매우 높음"
        elif network_density > 0.3 or centrality > 0.4:
            school_satisfaction = "높음"
        elif network_density > 0.15 or centrality > 0.2:
            school_satisfaction = "보통"
        else:
            school_satisfaction = "낮음"
        
        # 교사와의 관계
        if centrality > 0.6 and isolation_risk == "낮음":
            teacher_relationship = "매우 좋음"
        elif centrality > 0.3 and isolation_risk != "높음":
            teacher_relationship = "좋음"
        elif centrality > 0.15:
            teacher_relationship = "보통"
        else:
            teacher_relationship = "관심 필요"
        
        # 또래 관계
        if friend_count >= 5 and friend_ratio > 0.3:
            peer_relationship = "매우 활발"
        elif friend_count >= 3 and friend_ratio > 0.2:
            peer_relationship = "활발"
        elif friend_count >= 1 and friend_ratio > 0.1:
            peer_relationship = "보통"
        elif friend_count >= 1:
            peer_relationship = "제한적"
        else:
            peer_relationship = "고립"
        
        # 네트워크 참여도
        if centrality >= 0.7:
            network_participation = "매우 높음"
        elif centrality >= 0.4:
            network_participation = "높음"
        elif centrality >= 0.3:
            network_participation = "보통"
        elif centrality >= 0.15:
            network_participation = "낮음"
        else:
            network_participation = "매우 낮음"
        
        return {
            'school_satisfaction': school_satisfaction,
            'teacher_relationship': teacher_relationship,
            'peer_relationship': peer_relationship,
            'network_participation': network_participation
        }
    
    def generate_guidance_recommendations(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """개별 학생을 위한 맞춤형 지도 방안 생성"""
        friendship_type = metrics.get('friendship_type', '평균적인 학생')
        isolation_risk = metrics.get('isolation_risk', {})
        social_influence = metrics.get('social_influence', {})
        
        recommendations = {
            'immediate_actions': [],
            'short_term_goals': [],
            'long_term_goals': [],
            'monitoring_points': [],
            'intervention_level': 'none'
        }
        
        # 고립 위험도에 따른 즉시 조치
        try:
            isolation_level = isolation_risk.get('level', '보통') if isinstance(isolation_risk, dict) else '보통'
        except Exception as e:
            logger.error(f"isolation_risk 처리 오류: {e}")
            isolation_level = '보통'
        if isolation_level == '높음':
            recommendations['intervention_level'] = 'urgent'
            recommendations['immediate_actions'] = [
                "상담사 또는 전문가와의 즉시 상담 연계",
                "소규모 그룹 활동 참여 유도",
                "교사와의 일대일 상담 강화",
                "학부모와의 긴급 상담 실시"
            ]
        elif isolation_level == '보통':
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
        try:
            social_level = social_influence.get('level', '보통') if isinstance(social_influence, dict) else '보통'
        except Exception as e:
            logger.error(f"social_influence 처리 오류: {e}")
            social_level = '보통'
        if social_level in ['매우 높음', '높음']:
            recommendations['long_term_goals'] = [
                "네트워크 리더로서의 역할 수행",
                "또래 상담 및 멘토링 활동",
                "학교 공동체 발전에 기여"
            ]
        elif social_level == '보통':
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
    
    def detect_communities(self, G: nx.Graph) -> Dict[str, int]:
        """커뮤니티 탐지 (학급별 분석과 동일한 방법)"""
        try:
            from community import community_louvain
            communities = community_louvain.best_partition(G)
        except ImportError:
            # Louvain이 없으면 연결 요소 기반 커뮤니티 탐지
            communities = {}
            for i, component in enumerate(nx.connected_components(G)):
                for node in component:
                    communities[node] = i
        
        return communities

    def analyze_individual_student(self, student_id: str, friendship_data: List[Dict], 
                                 student_info: List[Dict]) -> Dict[str, Any]:
        """개별 학생 네트워크 분석 실행"""
        logger.info(f"개별 학생 {student_id} 네트워크 분석 시작")
        logger.info(f"analyze_individual_student - friendship_data 타입: {type(friendship_data)}, 길이: {len(friendship_data) if friendship_data else 0}")
        if friendship_data and len(friendship_data) > 0:
            logger.info(f"analyze_individual_student - 첫 번째 friendship_data 타입: {type(friendship_data[0])}")
            logger.info(f"analyze_individual_student - 첫 번째 friendship_data 값: {friendship_data[0]}")
        
        # 전체 학급 네트워크 생성
        G = self.create_individual_network(student_id, friendship_data, student_info)
        
        if G.number_of_nodes() == 0:
            logger.warning(f"학생 {student_id}에 대한 네트워크 데이터가 없습니다.")
            return {}
        
        # 커뮤니티 탐지
        communities = self.detect_communities(G)
        
        # 개별 지표 계산
        metrics = self.calculate_individual_metrics(G, student_id)
        
        # 커뮤니티 정보 추가
        metrics['community_id'] = communities.get(student_id, 0)
        
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
                'average_clustering': nx.average_clustering(G),
                'communities_count': len(set(communities.values()))
            },
            'individual_metrics': metrics,
            'recommendations': recommendations,
            'network_data': self.prepare_network_data(G, student_info),
            'communities': communities
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
