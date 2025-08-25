# 교우관계 네트워크 분석 시스템

## 📊 개요

이 시스템은 Python을 이용한 네트워크 분석과 D3.js를 이용한 시각화를 통해 학생들의 교우관계를 분석하고 시각화하는 도구입니다.

## 🏗️ 시스템 구조

### 1. Python 백엔드 분석
- **NetworkX**: 네트워크 그래프 생성 및 분석
- **중심성 지수 계산**: 연결 중심성, 매개 중심성, 근접 중심성, 고유벡터 중심성
- **커뮤니티 탐지**: Louvain 방법을 이용한 그룹 탐지
- **교우관계 유형 분류**: 연결 수에 따른 자동 분류

### 2. React 프론트엔드
- **D3.js 시각화**: 인터랙티브 네트워크 그래프
- **통계 차트**: 교우관계 유형별 분포 차트
- **트렌드 분석**: 시기별 변화 추이 차트
- **실시간 데이터**: Supabase 연동

## 🚀 설치 및 실행

### Python 환경 설정

```bash
# 가상환경 생성
python -m venv venv

# 가상환경 활성화
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### React 환경 설정

```bash
# 의존성 설치
npm install

# D3.js 설치
npm install d3 @types/d3

# 개발 서버 실행
npm start
```

## 📁 파일 구조

```
src/
├── scripts/
│   └── network_analysis.py          # Python 네트워크 분석 스크립트
├── components/
│   ├── NetworkVisualization.tsx     # D3.js 네트워크 시각화
│   ├── FriendshipStatsChart.tsx     # 통계 차트
│   └── TrendComparisonChart.tsx     # 트렌드 비교 차트
├── services/
│   └── networkAnalysisService.ts    # 네트워크 분석 서비스
└── pages/
    └── NetworkAnalysis.tsx          # 메인 교우관계 분석 페이지
```

## 🔧 주요 기능

### 1. 네트워크 분석 (Python)

#### 중심성 지수 계산
```python
# 연결 중심성
degree_centrality = nx.degree_centrality(G)

# 매개 중심성
betweenness_centrality = nx.betweenness_centrality(G)

# 근접 중심성
closeness_centrality = nx.closeness_centrality(G)

# 고유벡터 중심성
eigenvector_centrality = nx.eigenvector_centrality(G)
```

#### 커뮤니티 탐지
```python
# Louvain 방법
from community import community_louvain
communities = community_louvain.best_partition(G)
```

#### 교우관계 유형 분류
```python
def classify_friendship_type(connections):
    if connections == 0:
        return "외톨이형"
    elif connections <= 2:
        return "소수 친구 학생"
    elif connections <= 5:
        return "평균적인 학생"
    elif connections <= 8:
        return "친구 많은 학생"
    else:
        return "사교 스타"
```

### 2. 시각화 (D3.js)

#### 네트워크 그래프
- **노드**: 학생을 원형으로 표현, 크기는 연결 수에 비례
- **엣지**: 친구 관계를 선으로 표현, 두께는 친밀도에 비례
- **색상**: 교우관계 유형별로 구분
- **인터랙션**: 줌, 드래그, 툴팁, 클릭 이벤트

#### 통계 차트
- **막대 그래프**: 교우관계 유형별 학생 수 분포
- **선 그래프**: 시기별 변화 추이
- **범례**: 색상별 유형 구분

## 📊 데이터 구조

### 학생 정보
```typescript
interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  network_metrics?: NetworkMetrics;
}
```

### 교우관계 데이터
```typescript
interface FriendshipData {
  id: string;
  student_id: string;
  friend_student_id: string;
  relationship_type: string;
  strength_score: number;
  survey_id: string;
  created_at: string;
  metadata: any;
}
```

### 네트워크 분석 결과
```typescript
interface NetworkAnalysisResult {
  period: string;
  network_stats: {
    total_students: number;
    total_relationships: number;
    average_degree: number;
    density: number;
    clustering_coefficient: number;
    average_path_length: number;
  };
  friendship_type_distribution: Record<string, number>;
  network_data: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
}
```

## 🔄 데이터 흐름

1. **데이터 수집**: Supabase에서 학생 정보 및 설문 응답 데이터 조회
2. **데이터 변환**: 설문 응답을 교우관계 네트워크 데이터로 변환
3. **Python 분석**: NetworkX를 이용한 네트워크 분석 수행
4. **결과 생성**: 분석 결과를 D3.js 시각화용 데이터로 변환
5. **시각화**: React 컴포넌트에서 D3.js를 이용한 인터랙티브 차트 표시

## 📈 분석 지표

### 네트워크 수준 지표
- **총 학생 수**: 네트워크에 참여하는 학생 수
- **총 관계 수**: 전체 친구 관계의 수
- **평균 연결 수**: 학생당 평균 친구 수
- **네트워크 밀도**: 실제 연결 수 / 가능한 최대 연결 수
- **클러스터링 계수**: 친구의 친구가 서로 친구일 확률
- **평균 경로 길이**: 두 학생 간 평균 거리

### 개인 수준 지표
- **연결 중심성**: 직접적인 친구 수
- **매개 중심성**: 다른 학생들 간의 중개자 역할
- **근접 중심성**: 모든 학생과의 평균 거리
- **고유벡터 중심성**: 영향력 있는 친구를 가진 정도

## 🎯 사용 시나리오

### 1. 교사용 대시보드
- 학급 전체 교우관계 현황 파악
- 외톨이형 학생 식별 및 관리
- 시기별 변화 추이 모니터링

### 2. 상담 및 개입
- 개별 학생의 사회적 위치 분석
- 친구 그룹별 특성 파악
- 개입 효과 측정

### 3. 학급 운영
- 조편성 및 그룹 활동 계획
- 사회적 기술 향상 프로그램 설계
- 학급 분위기 개선 전략 수립

## 🔧 커스터마이징

### 색상 테마 변경
```typescript
const colorScale = d3.scaleOrdinal()
  .domain(["외톨이형", "소수 친구 학생", "평균적인 학생", "친구 많은 학생", "사교 스타"])
  .range(["#ff6b6b", "#ffd93d", "#6bcf7f", "#4ecdc4", "#45b7d1"]);
```

### 차트 크기 조정
```typescript
<NetworkVisualization
  data={networkData}
  period="6월"
  width={800}
  height={600}
/>
```

### 분석 기준 조정
```python
# 교우관계 유형 분류 기준 변경
if connections <= 3:  # 2에서 3으로 변경
    friendship_type = "소수 친구 학생"
```

## 🚨 주의사항

1. **데이터 보안**: 개인정보 보호를 위해 익명화 처리 필요
2. **성능 최적화**: 대규모 네트워크의 경우 분석 시간 고려
3. **정확성 검증**: 설문 응답의 신뢰성 및 완성도 확인
4. **윤리적 고려**: 학생 간 관계 분석의 윤리적 함의 검토

## 📚 참고 자료

- [NetworkX 공식 문서](https://networkx.org/)
- [D3.js 공식 문서](https://d3js.org/)
- [네트워크 분석 이론](https://en.wikipedia.org/wiki/Social_network_analysis)
- [중심성 지수 설명](https://en.wikipedia.org/wiki/Centrality)

## 🤝 기여하기

1. 이슈 등록: 버그 리포트 및 기능 요청
2. 코드 리뷰: 풀 리퀘스트 검토 및 피드백
3. 문서 개선: README 및 주석 업데이트
4. 테스트 추가: 새로운 기능에 대한 테스트 케이스 작성

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
