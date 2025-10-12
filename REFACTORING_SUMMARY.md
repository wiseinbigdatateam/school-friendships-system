# 네트워크 분석 리팩토링 요약

## 개요
IndividualAnalysis 페이지의 하드코딩된 분석 로직을 체계적으로 개선하여 데이터 기반 분석으로 전환했습니다.

## 주요 개선 사항

### 1. 유틸리티 함수 중앙화 ✅
**파일**: `src/utils/studentStatusCalculator.ts`

하드코딩된 조건문을 재사용 가능한 유틸리티 함수로 분리:

- `calculateCurrentStatus()`: 학생의 현재 상태 계산
  - 학교생활 만족도
  - 교사와의 관계
  - 또래 관계
  - 네트워크 참여도

- `calculateNetworkStability()`: 네트워크 안정성 지표 계산

- `generateRecommendationPlan()`: 개선방안 생성
  - 즉시 조치 사항
  - 단기 목표
  - 장기 목표
  - 개입 수준

- `generateMonitoringPoints()`: 모니터링 포인트 생성

- `assessRiskLevel()`: 종합 위험도 평가

### 2. Python API 확장 ✅
**파일**: `src/scripts/individual_network_analysis.py`

Python 분석 스크립트에 `analyze_current_status()` 메서드 추가:
- 네트워크 메트릭 기반 현재 상태 분석
- 학교생활 만족도, 교사 관계, 또래 관계, 네트워크 참여도 계산
- 분석 결과에 `current_status` 필드 포함

### 3. 프론트엔드 리팩토링 ✅
**파일**: `src/pages/IndividualAnalysis.tsx`

**Before (하드코딩)**:
```typescript
{socialInfluenceLevel === "높음" ? "매우 높음" : "보통"}
{friendCount >= 5 ? "매우 활발" : "보통"}
```

**After (데이터 기반)**:
```typescript
// Python 분석 결과 우선 사용
if (pythonAnalysisResult?.individual_metrics?.current_status) {
  currentStatus = pythonAnalysisResult.individual_metrics.current_status;
} else {
  // 유틸리티 함수로 계산
  currentStatus = calculateCurrentStatus(metrics);
}
```

### 4. 데이터베이스 스키마 확장 ✅
**파일**: `src/sql/enhance_network_analysis_results.sql`

`network_analysis_results` 테이블에 새 컬럼 추가:
- `current_status`: 학생의 현재 상태 (JSONB)
- `detailed_metrics`: 상세 네트워크 메트릭 (JSONB)
- `analysis_version`: 분석 버전 관리 (VARCHAR)

인덱스 추가:
- `idx_network_analysis_student_survey`: 학생-설문 조회 최적화
- `idx_network_analysis_type_date`: 분석 타입-날짜 조회 최적화

### 5. 분석 결과 저장 로직 개선 ✅
**파일**: `src/services/networkAnalysisService.ts`

새로운 메서드 추가:
- `saveIndividualAnalysis()`: 개별 학생 분석 결과 저장
  - current_status 포함
  - detailed_metrics 포함
  - analysis_version 2.0

기존 `saveAnalysis()` 메서드 확장:
- detailed_metrics 자동 생성 및 저장
- analysis_version 추가

## 데이터 흐름

### Before
```
IndividualAnalysis → 하드코딩된 조건문 → UI 표시
```

### After
```
IndividualAnalysis → Python API (우선) → current_status → UI 표시
                  ↓
                  유틸리티 함수 (fallback) → current_status → UI 표시
                  ↓
                  DB 저장 (캐싱 및 이력 관리)
```

## 이점

### 1. 일관성
- 모든 분석이 동일한 기준 적용
- Python과 TypeScript 간 로직 통일

### 2. 유지보수성
- 중앙화된 로직으로 수정 용이
- 버전 관리로 변경 이력 추적

### 3. 확장성
- 새로운 지표 추가 용이
- 다른 페이지에서도 재사용 가능

### 4. 성능
- DB 캐싱으로 반복 계산 방지
- 인덱스 최적화로 조회 속도 향상

### 5. 정확성
- Python 기반 과학적 분석
- Fallback 로직으로 안정성 보장

## 사용 예시

### TypeScript에서 사용
```typescript
import { calculateCurrentStatus, StudentMetrics } from '../utils/studentStatusCalculator';

const metrics: StudentMetrics = {
  centrality: 0.65,
  friendCount: 5,
  networkDensity: 0.45,
  isolationRisk: "낮음",
  socialInfluence: "높음",
  totalStudents: 25,
};

const currentStatus = calculateCurrentStatus(metrics);
// {
//   schoolSatisfaction: "높음",
//   teacherRelationship: "좋음",
//   peerRelationship: "활발",
//   networkParticipation: "높음"
// }
```

### Python에서 사용
```python
analyzer = IndividualNetworkAnalyzer()
metrics = analyzer.calculate_individual_metrics(G, student_id)
# metrics['current_status'] 자동 포함
```

## 마이그레이션 가이드

### 1. DB 스키마 업데이트
```bash
psql -d your_database -f src/sql/enhance_network_analysis_results.sql
```

### 2. Python 패키지 확인
```bash
pip install -r requirements.txt
```

### 3. 기존 분석 결과 재계산 (선택사항)
```bash
# 모든 설문에 대해 재분석 실행
npm run reanalyze-all
```

## 테스트 결과

- ✅ TypeScript 컴파일 성공
- ✅ Linter 오류 없음
- ✅ 빌드 성공 (warnings는 외부 라이브러리 source map 관련)
- ✅ 타입 안정성 확보

## 다음 단계 (선택사항)

1. **실시간 분석 업데이트**
   - WebSocket으로 분석 진행 상황 실시간 전달
   
2. **분석 이력 관리**
   - 시간별 변화 추이 추적
   - 개선 효과 측정

3. **머신러닝 통합**
   - 예측 모델 추가
   - 개입 효과 예측

4. **대시보드 통합**
   - 학급 전체 현황 요약
   - 위험군 학생 자동 알림

## 버전 정보

- **분석 버전**: 2.0
- **마지막 업데이트**: 2025-10-10
- **작성자**: AI Assistant

