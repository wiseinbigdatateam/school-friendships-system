-- network_analysis_results 테이블 확장
-- 추가 분석 지표를 저장하기 위한 컬럼 추가

-- 1. current_status 컬럼 추가 (학생의 현재 상태)
ALTER TABLE network_analysis_results 
ADD COLUMN IF NOT EXISTS current_status JSONB;

-- 2. detailed_metrics 컬럼 추가 (상세 메트릭)
ALTER TABLE network_analysis_results 
ADD COLUMN IF NOT EXISTS detailed_metrics JSONB;

-- 3. analysis_version 컬럼 추가 (분석 버전 관리)
ALTER TABLE network_analysis_results 
ADD COLUMN IF NOT EXISTS analysis_version VARCHAR(50) DEFAULT '1.0';

-- 4. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_network_analysis_student_survey 
ON network_analysis_results(student_id, survey_id);

CREATE INDEX IF NOT EXISTS idx_network_analysis_type_date 
ON network_analysis_results(analysis_type, calculated_at DESC);

-- 5. 코멘트 추가
COMMENT ON COLUMN network_analysis_results.current_status IS '학생의 현재 상태 (학교생활 만족도, 교사 관계, 또래 관계, 네트워크 참여도)';
COMMENT ON COLUMN network_analysis_results.detailed_metrics IS '상세 네트워크 메트릭 (밀도, 클러스터링 계수 등)';
COMMENT ON COLUMN network_analysis_results.analysis_version IS '분석 알고리즘 버전';

-- 6. current_status 예시 구조
-- {
--   "school_satisfaction": "높음",
--   "teacher_relationship": "좋음",
--   "peer_relationship": "활발",
--   "network_participation": "높음"
-- }

-- 7. detailed_metrics 예시 구조
-- {
--   "network_density": 0.45,
--   "clustering_coefficient": 0.67,
--   "average_path_length": 2.3,
--   "modularity": 0.42,
--   "friend_ratio": 0.35
-- }

