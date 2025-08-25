#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
교우관계 네트워크 분석 스크립트
NetworkX를 사용한 네트워크 분석 및 D3.js용 데이터 생성
"""

import networkx as nx
import pandas as pd
import numpy as np
import json
from typing import Dict, List, Tuple, Any
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FriendshipNetworkAnalyzer:
    """교우관계 네트워크 분석 클래스"""
    
    def __init__(self):
        self.networks = {}  # 시기별 네트워크 저장
        self.analysis_results = {}  # 분석 결과 저장
        
    def create_network_from_data(self, friendship_data: List[Dict], period: str) -> nx.Graph:
        """친구 관계 데이터로부터 네트워크 생성"""
        G = nx.Graph()
        
        # 학생 노드 추가
        students = set()
        for record in friendship_data:
            students.add(record['student_id'])
            students.add(record['friend_student_id'])
        
        for student_id in students:
            G.add_node(student_id)
        
        # 친구 관계 엣지 추가
        for record in friendship_data:
            G.add_edge(
                record['student_id'], 
                record['friend_student_id'],
                weight=record.get('strength_score', 1),
                relationship_type=record.get('relationship_type', 'friend')
            )
        
        self.networks[period] = G
        logger.info(f"{period} 네트워크 생성 완료: {G.number_of_nodes()}명, {G.number_of_edges()}개 관계")
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
        """커뮤니티 탐지 (Louvain 방법)"""
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
    
    def classify_friendship_type(self, centrality_metrics: Dict[str, Dict[str, float]], 
                               communities: Dict[str, int], G: nx.Graph) -> Dict[str, str]:
        """교우관계 유형 분류"""
        friendship_types = {}
        
        for node in G.nodes():
            degree = centrality_metrics[node]['degree']
            betweenness = centrality_metrics[node]['betweenness']
            eigenvector = centrality_metrics[node]['eigenvector']
            
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
    
    def analyze_network(self, period: str, friendship_data: List[Dict], 
                       student_info: List[Dict]) -> Dict[str, Any]:
        """네트워크 전체 분석"""
        logger.info(f"{period} 네트워크 분석 시작")
        
        # 네트워크 생성
        G = self.create_network_from_data(friendship_data, period)
        
        # 중심성 지수 계산
        centrality_metrics = self.calculate_centrality_metrics(G)
        
        # 커뮤니티 탐지
        communities = self.detect_communities(G)
        
        # 교우관계 유형 분류
        friendship_types = self.classify_friendship_type(centrality_metrics, communities, G)
        
        # 학생별 상세 정보 생성
        student_details = {}
        for student in student_info:
            student_id = student['id']
            if student_id in G.nodes():
                student_details[student_id] = {
                    'name': student['name'],
                    'grade': student['grade'],
                    'class': student['class'],
                    'friendship_type': friendship_types.get(student_id, "분류 불가"),
                    'centrality_metrics': centrality_metrics.get(student_id, {}),
                    'community_id': communities.get(student_id, 0),
                    'connection_count': G.degree(student_id),
                    'neighbors': list(G.neighbors(student_id))
                }
        
        # 통계 요약
        type_counts = {}
        for friendship_type in friendship_types.values():
            type_counts[friendship_type] = type_counts.get(friendship_type, 0) + 1
        
        # 분석 결과 저장
        analysis_result = {
            'period': period,
            'network_stats': {
                'total_students': G.number_of_nodes(),
                'total_relationships': G.number_of_edges(),
                'average_degree': sum(dict(G.degree()).values()) / G.number_of_nodes() if G.number_of_nodes() > 0 else 0,
                'density': nx.density(G),
                'clustering_coefficient': nx.average_clustering(G),
                'average_path_length': nx.average_shortest_path_length(G) if nx.is_connected(G) else float('inf')
            },
            'friendship_type_distribution': type_counts,
            'student_details': student_details,
            'network_data': self.prepare_d3_data(G, student_details)
        }
        
        self.analysis_results[period] = analysis_result
        logger.info(f"{period} 네트워크 분석 완료")
        
        return analysis_result
    
    def prepare_d3_data(self, G: nx.Graph, student_details: Dict[str, Any]) -> Dict[str, Any]:
        """D3.js 시각화용 데이터 준비"""
        # 노드 데이터
        nodes = []
        for node in G.nodes():
            if node in student_details:
                details = student_details[node]
                nodes.append({
                    'id': node,
                    'name': details['name'],
                    'grade': details['grade'],
                    'class': details['class'],
                    'friendship_type': details['friendship_type'],
                    'centrality': details['centrality_metrics']['degree'],
                    'community': details['community_id'],
                    'connection_count': details['connection_count']
                })
        
        # 엣지 데이터
        edges = []
        for edge in G.edges(data=True):
            edges.append({
                'source': edge[0],
                'target': edge[1],
                'weight': edge[2].get('weight', 1),
                'relationship_type': edge[2].get('relationship_type', 'friend')
            })
        
        return {
            'nodes': nodes,
            'edges': edges
        }
    
    def compare_periods(self, periods: List[str]) -> Dict[str, Any]:
        """시기별 비교 분석"""
        if len(periods) < 2:
            return {}
        
        comparison = {
            'periods': periods,
            'changes': {},
            'trends': {}
        }
        
        # 학생별 변화 추적
        all_students = set()
        for period in periods:
            if period in self.analysis_results:
                all_students.update(self.analysis_results[period]['student_details'].keys())
        
        for student_id in all_students:
            changes = []
            for period in periods:
                if (period in self.analysis_results and 
                    student_id in self.analysis_results[period]['student_details']):
                    details = self.analysis_results[period]['student_details']
                    changes.append({
                        'period': period,
                        'friendship_type': details[student_id]['friendship_type'],
                        'connection_count': details[student_id]['connection_count']
                    })
            
            if len(changes) > 1:
                comparison['changes'][student_id] = changes
        
        # 교우관계 유형 변화 추이
        for period in periods:
            if period in self.analysis_results:
                comparison['trends'][period] = self.analysis_results[period]['friendship_type_distribution']
        
        return comparison
    
    def export_results(self, output_file: str = None) -> str:
        """분석 결과를 JSON 파일로 내보내기"""
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"friendship_analysis_{timestamp}.json"
        
        export_data = {
            'analysis_timestamp': datetime.now().isoformat(),
            'networks': {period: nx.node_link_data(G) for period, G in self.networks.items()},
            'analysis_results': self.analysis_results,
            'comparison': self.compare_periods(list(self.analysis_results.keys()))
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"분석 결과를 {output_file}에 저장했습니다.")
        return output_file

def main():
    """메인 실행 함수"""
    analyzer = FriendshipNetworkAnalyzer()
    
    print("교우관계 네트워크 분석기")
    print("이 스크립트는 실제 데이터와 함께 사용되어야 합니다.")
    print("사용법:")
    print("1. friendship_data: 친구 관계 데이터 리스트")
    print("2. student_info: 학생 정보 데이터 리스트")
    print("3. analyzer.analyze_network() 호출하여 분석 수행")
    
    # 실제 사용 예시 (주석 처리)
    # friendship_data = [...]  # 실제 친구 관계 데이터
    # student_info = [...]     # 실제 학생 정보 데이터
    # result = analyzer.analyze_network('현재', friendship_data, student_info)
    
    print("\n분석기 초기화 완료!")

if __name__ == "__main__":
    main()
