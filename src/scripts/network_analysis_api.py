#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
교우관계 네트워크 분석 API 스크립트
Express.js에서 호출되는 Python 스크립트
"""

import sys
import json
import networkx as nx
import numpy as np
from typing import Dict, List, Tuple, Any
from datetime import datetime
import logging
import os
import platform

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_korean_font():
    """운영체제별 한글 폰트 설정"""
    system = platform.system()
    
    if system == "Darwin":  # macOS
        font_paths = [
            '/System/Library/Fonts/AppleSDGothicNeo.ttc',
            '/System/Library/Fonts/AppleGothic.ttf',
            '/Library/Fonts/AppleGothic.ttf'
        ]
    elif system == "Windows":
        font_paths = [
            'C:/Windows/Fonts/malgun.ttf',
            'C:/Windows/Fonts/gulim.ttc',
            'C:/Windows/Fonts/batang.ttc'
        ]
    else:  # Linux
        font_paths = [
            '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        ]
    
    # 사용 가능한 폰트 찾기
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                import matplotlib.font_manager as fm
                font_prop = fm.FontProperties(fname=font_path)
                logger.info(f"한글 폰트 설정 완료: {font_path}")
                return font_prop
            except Exception as e:
                logger.warning(f"폰트 로드 실패: {font_path}, {e}")
                continue
    
    logger.warning("한글 폰트를 찾을 수 없습니다. 기본 폰트를 사용합니다.")
    return None

class FriendshipNetworkAnalyzer:
    """교우관계 네트워크 분석 클래스"""
    
    def __init__(self):
        self.network = None
        self.analysis_results = {}
        
    def create_network_from_survey_data(self, survey_data: List[List], student_info: List[Dict]) -> nx.Graph:
        """설문 데이터로부터 네트워크 생성"""
        G = nx.Graph()
        
        # 학생 노드 추가
        student_map = {student['id']: student for student in student_info}
        
        for student in student_info:
            G.add_node(student['id'], 
                      name=student['name'],
                      grade=student['grade'],
                      class_name=student['class'])
        
        # 설문 데이터에서 관계 추가 (중복 제거)
        added_edges = set()
        for relationship in survey_data:
            if len(relationship) >= 3:
                source, target, relationship_type = relationship[0], relationship[1], relationship[2]
                if source in student_map and target in student_map:
                    # 중복 엣지 방지 (양방향 고려)
                    edge_key = tuple(sorted([source, target]))
                    if edge_key not in added_edges:
                        G.add_edge(source, target, 
                                  relationship_type=relationship_type,
                                  weight=1.0)
                        added_edges.add(edge_key)
        
        self.network = G
        logger.info(f"네트워크 생성 완료: {G.number_of_nodes()}명, {G.number_of_edges()}개 관계")
        return G
    
    def calculate_centrality_metrics(self, G: nx.Graph) -> Dict[str, Dict[str, float]]:
        """중심성 지수 계산"""
        centrality_metrics = {}
        
        # 연결 중심성 (Degree Centrality)
        degree_centrality = nx.degree_centrality(G)
        
        # 매개 중심성 (Betweenness Centrality)
        betweenness_centrality = nx.betweenness_centrality(G)
        
        # 근접 중심성 (Closeness Centrality)
        closeness_centrality = nx.closeness_centrality(G)
        
        # 고유벡터 중심성 (Eigenvector Centrality)
        try:
            eigenvector_centrality = nx.eigenvector_centrality(G, max_iter=1000)
        except:
            eigenvector_centrality = {node: 0.0 for node in G.nodes()}
        
        # 각 노드별 중심성 지수 통합
        for node in G.nodes():
            centrality_metrics[node] = {
                'degree': degree_centrality[node],
                'betweenness': betweenness_centrality[node],
                'closeness': closeness_centrality[node],
                'eigenvector': eigenvector_centrality[node]
            }
        
        return centrality_metrics
    
    def detect_communities(self, G: nx.Graph) -> Dict[str, int]:
        """커뮤니티 탐지 (Louvain 방법 또는 연결 요소 기반)"""
        communities = {}
        
        # 빈 그래프 처리
        if len(G.nodes()) == 0:
            return communities
            
        try:
            from community import community_louvain
            communities = community_louvain.best_partition(G)
        except (ImportError, Exception) as e:
            logger.warning(f"Louvain 커뮤니티 탐지 실패: {e}")
            # Louvain이 없거나 실패하면 연결 요소 기반 커뮤니티 탐지
            communities = {}
            for i, component in enumerate(nx.connected_components(G)):
                for node in component:
                    communities[node] = i
        
        return communities
    
    def classify_friendship_type(self, centrality_metrics: Dict[str, Dict[str, float]], 
                               communities: Dict[str, int], G: nx.Graph) -> Dict[str, str]:
        """교우관계 유형 분류"""
        friendship_types = {}
        
        for node in G.nodes():
            # 연결 수 기준
            connections = G.degree(node)
            
            # 교우관계 유형 분류
            if connections == 0:
                friendship_type = "외톨이형"
            elif connections <= 2:
                friendship_type = "소수 친구 학생"
            elif connections <= 5:
                friendship_type = "평균적인 학생"
            elif connections <= 8:
                friendship_type = "친구 많은 학생"
            else:
                friendship_type = "사교 스타"
            
            friendship_types[node] = friendship_type
        
        return friendship_types
    
    def analyze_network(self, survey_data: List[List], student_info: List[Dict]) -> Dict[str, Any]:
        """네트워크 전체 분석"""
        logger.info("네트워크 분석 시작")
        
        # 1단계: 설문 데이터 분석 및 관계 유형 매핑
        logger.info("=" * 60)
        logger.info("🔍 1단계: 설문 데이터 분석 및 관계 유형 매핑")
        logger.info("=" * 60)
        
        # 관계 유형별 분포 분석
        relationship_types = {}
        if survey_data and len(survey_data) > 0:
            for relationship in survey_data:
                if len(relationship) >= 3:
                    source, target, rel_type = relationship[0], relationship[1], relationship[2]
                    relationship_types[rel_type] = relationship_types.get(rel_type, 0) + 1
        
        logger.info("📊 관계 유형별 분포:")
        if relationship_types:
            for rel_type, count in relationship_types.items():
                percentage = (count / len(survey_data)) * 100
                logger.info(f"   - {rel_type}: {count}개 ({percentage:.1f}%)")
        else:
            logger.info("   - 관계 데이터가 없습니다.")
        
        # 네트워크 생성
        logger.info("\n🔗 2단계: 네트워크 그래프 생성")
        G = self.create_network_from_survey_data(survey_data, student_info)
        
        # 중심성 지수 계산
        logger.info("\n📈 3단계: 중심성 지수 계산")
        centrality_metrics = self.calculate_centrality_metrics(G)
        
        # 커뮤니티 탐지
        logger.info("\n👥 4단계: 커뮤니티 탐지")
        communities = self.detect_communities(G)
        
        # 교우관계 유형 분류
        logger.info("\n🎯 5단계: 교우관계 유형 분류")
        friendship_types = self.classify_friendship_type(centrality_metrics, communities, G)
        
        # 교우관계 유형별 분포 출력
        logger.info("\n📊 교우관계 유형별 분포:")
        type_counts = {}
        for friendship_type in friendship_types.values():
            type_counts[friendship_type] = type_counts.get(friendship_type, 0) + 1
        
        for friendship_type, count in type_counts.items():
            percentage = (count / len(friendship_types)) * 100
            logger.info(f"   - {friendship_type}: {count}명 ({percentage:.1f}%)")
        
        # 학생별 상세 정보 생성
        logger.info("\n👤 6단계: 학생별 상세 정보 생성")
        student_details = {}
        for student in student_info:
            student_id = student['id']
            if student_id in G.nodes():
                centrality = centrality_metrics.get(student_id, {})
                student_details[student_id] = {
                    'name': student['name'],
                    'grade': student['grade'],
                    'class': student['class'],
                    'friendship_type': friendship_types.get(student_id, "분류 불가"),
                    'centrality_metrics': centrality,
                    'community_id': communities.get(student_id, 0),
                    'connection_count': G.degree(student_id),
                    'neighbors': list(G.neighbors(student_id))
                }
                
                # 상위 중심성 학생들 출력
                if centrality.get('degree', 0) > 0.3:  # 높은 중심성을 가진 학생들
                    logger.info(f"   🌟 {student['name']}: 중심성 {centrality.get('degree', 0):.3f}, 연결수 {G.degree(student_id)}개")
        
        # 통계 요약
        type_counts = {}
        for friendship_type in friendship_types.values():
            type_counts[friendship_type] = type_counts.get(friendship_type, 0) + 1
        
        # 네트워크 메트릭 계산
        logger.info("\n📊 7단계: 네트워크 메트릭 계산")
        # 빈 그래프 처리
        if G.number_of_nodes() == 0:
            network_stats = {
                'total_students': 0,
                'total_relationships': 0,
                'average_degree': 0,
                'density': 0,
                'clustering_coefficient': 0,
                'average_path_length': 0,
                'connected_components': 0
            }
        else:
            network_stats = {
                'total_students': G.number_of_nodes(),
                'total_relationships': G.number_of_edges(),
                'average_degree': sum(dict(G.degree()).values()) / G.number_of_nodes(),
                'density': nx.density(G),
                'clustering_coefficient': nx.average_clustering(G),
                'average_path_length': nx.average_shortest_path_length(G) if nx.is_connected(G) else 0,
                'connected_components': nx.number_connected_components(G)
            }
        
        logger.info("📈 네트워크 통계:")
        logger.info(f"   - 총 학생 수: {network_stats['total_students']}명")
        logger.info(f"   - 총 관계 수: {network_stats['total_relationships']}개")
        logger.info(f"   - 평균 연결 수: {network_stats['average_degree']:.2f}")
        logger.info(f"   - 네트워크 밀도: {network_stats['density']:.3f}")
        logger.info(f"   - 클러스터링 계수: {network_stats['clustering_coefficient']:.3f}")
        logger.info(f"   - 연결된 구성 요소: {network_stats['connected_components']}개")
        
        # 커뮤니티 정보 생성
        logger.info("\n👥 8단계: 커뮤니티 분석")
        community_info = []
        for community_id in set(communities.values()):
            community_members = [node for node, cid in communities.items() if cid == community_id]
            community_subgraph = G.subgraph(community_members)
            
            community_info.append({
                'id': community_id,
                'size': len(community_members),
                'members': community_members,
                'internal_density': nx.density(community_subgraph) if len(community_members) > 1 else 0.0
            })
            
            logger.info(f"   🏘️ 커뮤니티 {community_id + 1}: {len(community_members)}명, 밀도 {nx.density(community_subgraph):.3f}")
        
        # 최종 분석 요약
        logger.info("\n" + "=" * 60)
        logger.info("🎉 최종 분석 요약")
        logger.info("=" * 60)
        logger.info(f"✅ 총 {network_stats['total_students']}명의 학생 분석 완료")
        logger.info(f"✅ 총 {network_stats['total_relationships']}개의 관계 분석 완료")
        logger.info(f"✅ {len(community_info)}개의 커뮤니티 탐지 완료")
        logger.info(f"✅ 네트워크 밀도: {network_stats['density']:.3f}")
        logger.info("=" * 60)
        
        # 분석 결과 저장
        analysis_result = {
            'network_stats': network_stats,
            'friendship_type_distribution': type_counts,
            'student_details': student_details,
            'communities': community_info,
            'centrality_metrics': centrality_metrics,
            'community_membership': communities,
            'analysis_timestamp': datetime.now().isoformat()
        }
        
        self.analysis_results = analysis_result
        logger.info("네트워크 분석 완료")
        
        return analysis_result

def main():
    """메인 실행 함수 - API 호출용"""
    if len(sys.argv) != 3:
        print("사용법: python network_analysis_api.py <입력파일> <출력파일>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    try:
        # 입력 데이터 읽기
        with open(input_file, 'r', encoding='utf-8') as f:
            input_data = json.load(f)
        
        survey_id = input_data.get('survey_id')
        survey_data = input_data.get('survey_data', [])
        student_info = input_data.get('student_info', [])
        
        logger.info(f"설문 ID: {survey_id}")
        logger.info(f"학생 수: {len(student_info)}")
        logger.info(f"관계 수: {len(survey_data)}")
        
        # 분석기 초기화 및 분석 실행
        analyzer = FriendshipNetworkAnalyzer()
        result = analyzer.analyze_network(survey_data, student_info)
        
        # 결과에 설문 ID 추가
        result['survey_id'] = survey_id
        
        # 결과 파일 저장
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        logger.info(f"분석 결과를 {output_file}에 저장했습니다.")
        print("✅ Python 네트워크 분석 완료")
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(error_result, f, ensure_ascii=False, indent=2)
        
        logger.error(f"분석 중 오류 발생: {e}")
        print(f"❌ Python 네트워크 분석 오류: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
