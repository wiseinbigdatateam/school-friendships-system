#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
교우관계 네트워크 분석 스크립트
NetworkX를 사용한 네트워크 분석, 시각화 및 D3.js용 데이터 생성
"""

import networkx as nx
import numpy as np
import json
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from typing import Dict, List, Tuple, Any
from datetime import datetime
import logging
import os
import platform

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 한글 폰트 설정 함수
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
                font_prop = fm.FontProperties(fname=font_path)
                plt.rcParams['font.family'] = font_prop.get_name()
                logger.info(f"한글 폰트 설정 완료: {font_path}")
                return font_prop
            except Exception as e:
                logger.warning(f"폰트 로드 실패: {font_path}, {e}")
                continue
    
    # 폰트를 찾지 못한 경우 기본 설정
    logger.warning("한글 폰트를 찾을 수 없습니다. 기본 폰트를 사용합니다.")
    plt.rcParams['font.family'] = 'DejaVu Sans'
    return None

# 샘플 데이터 생성 함수
def generate_sample_data():
    """교우관계 분석용 샘플 데이터 생성"""
    survey_data = [
        ('학생A', '학생B', '가장 친한 친구'), ('학생A', '학생C', '가장 친한 친구'), ('학생A', '학생D', '가장 친한 친구'),
        ('학생B', '학생A', '가장 친한 친구'), ('학생B', '학생D', '함께 놀고 싶은 친구'),
        ('학생C', '학생A', '가장 친한 친구'), ('학생C', '학생E', '고민 상담'),
        ('학생D', '학생B', '함께 놀고 싶은 친구'), ('학생D', '학생E', '존경/닮고 싶은'),
        ('학생E', '학생A', '함께 놀고 싶은 친구'), ('학생E', '학생C', '고민 상담'),
        ('학생F', '학생G', '가장 친한 친구'), ('학생G', '학생F', '가장 친한 친구'),
        ('학생H', '학생I', '함께 놀고 싶은 친구'), ('학생I', '학생H', '함께 놀고 싶은 친구'),
        ('학생J', '학생K', '고민 상담'), ('학생K', '학생J', '고민 상담'),
    ]
    
    # 학생 정보 생성
    students = set()
    for source, target, _ in survey_data:
        students.add(source)
        students.add(target)
    
    student_info = []
    for i, student_id in enumerate(sorted(students)):
        student_info.append({
            'id': student_id,
            'name': student_id,
            'grade': f'{i % 3 + 1}학년',
            'class': f'{i % 5 + 1}반'
        })
    
    return survey_data, student_info

# 관계 유형별 색상 및 스타일 정의
RELATION_COLORS = {
    '가장 친한 친구': '#FF6B6B',
    '함께 놀고 싶은 친구': '#4ECDC4',
    '고민 상담': '#45B7D1',
    '존경/닮고 싶은': '#96CEB4',
    '기타': '#FECA57'
}

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
    
    def visualize_network(self, period: str, save_path: str = None, show_plot: bool = True) -> str:
        """네트워크 시각화"""
        if period not in self.networks:
            logger.error(f"{period} 네트워크가 존재하지 않습니다.")
            return None
        
        G = self.networks[period]
        analysis_result = self.analysis_results.get(period, {})
        student_details = analysis_result.get('student_details', {})
        
        # 한글 폰트 설정
        font_prop = setup_korean_font()
        
        # 그래프 시각화
        plt.figure(figsize=(15, 12))
        
        # 노드 위치 결정 (레이아웃 알고리즘)
        pos = nx.spring_layout(G, k=3, iterations=50)
        
        # 노드, 엣지, 라벨 그리기
        nodes = G.nodes()
        edges = G.edges()
        
        # 엣지 색상을 리스트로 추출
        edge_colors = []
        for u, v in edges:
            edge_data = G[u][v]
            rel_type = edge_data.get('relationship_type', '기타')
            edge_colors.append(RELATION_COLORS.get(rel_type, RELATION_COLORS['기타']))
        
        # 노드 크기 결정 (연결 수에 비례)
        node_sizes = []
        node_colors = []
        for node in nodes:
            degree = G.degree(node)
            node_sizes.append(max(500, degree * 200))
            
            # 교우관계 유형에 따른 색상
            if node in student_details:
                friendship_type = student_details[node]['friendship_type']
                if friendship_type == "사교 스타":
                    node_colors.append('#FF6B6B')
                elif friendship_type == "친구 많은 학생":
                    node_colors.append('#4ECDC4')
                elif friendship_type == "평균적인 학생":
                    node_colors.append('#45B7D1')
                elif friendship_type == "소수 친구 학생":
                    node_colors.append('#96CEB4')
                else:
                    node_colors.append('#FECA57')
            else:
                node_colors.append('#D3D3D3')
        
        # 노드 그리기
        nx.draw_networkx_nodes(G, pos, node_size=node_sizes, node_color=node_colors, alpha=0.8)
        
        # 엣지 그리기 (방향성 그래프인 경우 화살표 포함)
        if isinstance(G, nx.DiGraph):
            nx.draw_networkx_edges(G, pos, width=2, edge_color=edge_colors, 
                                 arrowstyle='->', arrowsize=20, alpha=0.7)
        else:
            nx.draw_networkx_edges(G, pos, width=2, edge_color=edge_colors, alpha=0.7)
        
        # 노드 라벨(이름) 그리기
        labels = {}
        for node in nodes:
            if node in student_details:
                labels[node] = student_details[node]['name']
            else:
                labels[node] = node
        
        nx.draw_networkx_labels(G, pos, labels, font_size=10, font_weight='bold')
        
        # 범례 추가
        legend_elements = []
        for label, color in RELATION_COLORS.items():
            legend_elements.append(plt.Line2D([0], [0], color=color, lw=4, label=label))
        
        plt.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1.15, 1))
        
        # 제목 및 통계 정보
        title = f'교우 관계 네트워크 분석 - {period}'
        stats = analysis_result.get('network_stats', {})
        subtitle = f"학생 수: {stats.get('total_students', 0)}명, 관계 수: {stats.get('total_relationships', 0)}개"
        
        plt.title(f'{title}\n{subtitle}', fontsize=16, pad=20)
        plt.axis('off')
        
        # 그래프 저장
        if save_path:
            plt.savefig(save_path, format='PNG', dpi=300, bbox_inches='tight')
            logger.info(f"네트워크 그래프를 {save_path}에 저장했습니다.")
        
        if show_plot:
            plt.show()
        
        return save_path
    
    def create_relationship_analysis_chart(self, period: str, save_path: str = None) -> str:
        """교우관계 유형별 분포 차트 생성"""
        if period not in self.analysis_results:
            logger.error(f"{period} 분석 결과가 존재하지 않습니다.")
            return None
        
        analysis_result = self.analysis_results[period]
        type_distribution = analysis_result.get('friendship_type_distribution', {})
        
        # 한글 폰트 설정
        font_prop = setup_korean_font()
        
        # 파이 차트 생성
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # 교우관계 유형별 분포 파이 차트
        labels = list(type_distribution.keys())
        sizes = list(type_distribution.values())
        colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'][:len(labels)]
        
        ax1.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
        ax1.set_title('교우관계 유형별 분포', fontsize=14, pad=20)
        
        # 막대 차트
        ax2.bar(labels, sizes, color=colors, alpha=0.7)
        ax2.set_title('교우관계 유형별 학생 수', fontsize=14, pad=20)
        ax2.set_ylabel('학생 수')
        ax2.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        
        # 차트 저장
        if save_path:
            plt.savefig(save_path, format='PNG', dpi=300, bbox_inches='tight')
            logger.info(f"교우관계 분석 차트를 {save_path}에 저장했습니다.")
        
        plt.show()
        return save_path
    
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
    """메인 실행 함수 - 샘플 데이터로 네트워크 분석 실행"""
    print("=" * 60)
    print("교우관계 네트워크 분석기")
    print("=" * 60)
    
    # 분석기 초기화
    analyzer = FriendshipNetworkAnalyzer()
    
    # 샘플 데이터 생성
    print("📊 샘플 데이터 생성 중...")
    survey_data, student_info = generate_sample_data()
    
    print(f"✅ 샘플 데이터 생성 완료:")
    print(f"   - 학생 수: {len(student_info)}명")
    print(f"   - 관계 수: {len(survey_data)}개")
    
    # 설문 데이터를 분석기 형식으로 변환
    friendship_data = []
    for source, target, rel_type in survey_data:
        friendship_data.append({
            'student_id': source,
            'friend_student_id': target,
            'relationship_type': rel_type,
            'strength_score': 1.0
        })
    
    # 네트워크 분석 실행
    print("\n🔍 네트워크 분석 시작...")
    result = analyzer.analyze_network('현재', friendship_data, student_info)
    
    # 분석 결과 출력
    print("\n📈 분석 결과:")
    print(f"   - 총 학생 수: {result['network_stats']['total_students']}명")
    print(f"   - 총 관계 수: {result['network_stats']['total_relationships']}개")
    print(f"   - 평균 연결 수: {result['network_stats']['average_degree']:.2f}")
    print(f"   - 네트워크 밀도: {result['network_stats']['density']:.3f}")
    print(f"   - 클러스터링 계수: {result['network_stats']['clustering_coefficient']:.3f}")
    
    print("\n👥 교우관계 유형별 분포:")
    for friendship_type, count in result['friendship_type_distribution'].items():
        print(f"   - {friendship_type}: {count}명")
    
    # 시각화 생성
    print("\n🎨 네트워크 시각화 생성 중...")
    try:
        # 네트워크 그래프 생성
        network_image = analyzer.visualize_network('현재', 'friendship_network.png', show_plot=False)
        
        # 교우관계 분석 차트 생성
        chart_image = analyzer.create_relationship_analysis_chart('현재', 'friendship_analysis_chart.png')
        
        print("✅ 시각화 완료:")
        print(f"   - 네트워크 그래프: friendship_network.png")
        print(f"   - 분석 차트: friendship_analysis_chart.png")
        
    except Exception as e:
        print(f"⚠️ 시각화 생성 중 오류 발생: {e}")
        print("   matplotlib 또는 한글 폰트 설정을 확인해주세요.")
    
    # 결과 내보내기
    print("\n💾 분석 결과 내보내기...")
    json_file = analyzer.export_results()
    print(f"✅ JSON 파일 저장 완료: {json_file}")
    
    print("\n" + "=" * 60)
    print("분석 완료! 생성된 파일들을 확인해보세요.")
    print("=" * 60)

if __name__ == "__main__":
    main()
