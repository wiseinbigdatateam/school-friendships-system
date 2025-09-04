-- 학생 교우관계 분석 시스템 데이터베이스 스키마
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- UUID 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 교육청/지역 관리자 테이블
CREATE TABLE district_admin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_name VARCHAR(100) NOT NULL,
    admin_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 2. 학교 테이블
CREATE TABLE school (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID REFERENCES district_admin(id),
    school_code VARCHAR(20) UNIQUE NOT NULL,
    school_name VARCHAR(100) NOT NULL,
    school_type VARCHAR(20) CHECK (school_type IN ('elementary', 'middle', 'high', 'special')),
    address TEXT,
    contact_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 3. 사용자 테이블 (교사, 관리자)
CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lifelong_education_id VARCHAR(50) UNIQUE, -- 영구 교육 식별자
    school_id UUID REFERENCES school(id),
    name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(30) CHECK (role IN ('district_admin', 'school_admin', 'grade_leader', 'homeroom_teacher')),
    permissions JSONB DEFAULT '[]',
    grade VARCHAR(10),
    class VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- 4. 학생 테이블
CREATE TABLE student (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lifelong_education_id VARCHAR(50) UNIQUE NOT NULL, -- 영구 교육 식별자
    current_school_id UUID REFERENCES school(id),
    student_number VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    grade VARCHAR(10) NOT NULL,
    class VARCHAR(10) NOT NULL,
    parent_contact JSONB DEFAULT '{}',
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 5. 학생 학교 이력 테이블
CREATE TABLE student_school_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lifelong_education_id VARCHAR(50) REFERENCES student(lifelong_education_id),
    school_id UUID REFERENCES school(id),
    grade VARCHAR(10) NOT NULL,
    class VARCHAR(10) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    transfer_type VARCHAR(20) CHECK (transfer_type IN ('enrollment', 'transfer_in', 'transfer_out', 'graduation')),
    additional_info JSONB DEFAULT '{}'
);

-- 6. 설문 테이블
CREATE TABLE survey (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES school(id),
    created_by UUID REFERENCES "user"(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 설문 응답 테이블
CREATE TABLE survey_response (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES survey(id),
    respondent_student_id UUID REFERENCES student(id),
    answers JSONB NOT NULL DEFAULT '{}',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    is_validated BOOLEAN DEFAULT false
);

-- 8. 교우관계 데이터 테이블
CREATE TABLE friendship_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_response_id UUID REFERENCES survey_response(id),
    student_id UUID REFERENCES student(id), -- 응답자
    friend_id UUID REFERENCES student(id), -- 언급된 친구
    relationship_type VARCHAR(20) CHECK (relationship_type IN ('best_friend', 'close_friend', 'classmate', 'avoid')),
    relationship_strength INTEGER CHECK (relationship_strength BETWEEN 1 AND 5),
    reason TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 네트워크 분석 결과 테이블
CREATE TABLE network_analysis_result (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES survey(id),
    student_id UUID REFERENCES student(id),
    centrality_metrics JSONB NOT NULL DEFAULT '{}',
    community_detection JSONB NOT NULL DEFAULT '{}',
    isolation_score DECIMAL(5,4) CHECK (isolation_score BETWEEN 0 AND 1),
    social_status JSONB NOT NULL DEFAULT '{}',
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    analysis_version VARCHAR(20) NOT NULL
);

-- 10. 개입/지도 로그 테이블
CREATE TABLE intervention_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES student(id),
    teacher_id UUID REFERENCES "user"(id),
    intervention_type VARCHAR(30) CHECK (intervention_type IN ('counseling', 'group_activity', 'parent_meeting', 'peer_mediation')),
    description TEXT NOT NULL,
    goal TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    start_date DATE NOT NULL,
    target_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    outcome_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 교사 메모 테이블
CREATE TABLE teacher_memo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES student(id),
    teacher_id UUID REFERENCES "user"(id),
    memo_content TEXT NOT NULL,
    memo_type VARCHAR(20) CHECK (memo_type IN ('observation', 'concern', 'achievement', 'general')),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'school_staff', 'transferable')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. 데이터 이관 요청 테이블
CREATE TABLE data_transfer_request (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_lifelong_id VARCHAR(50) REFERENCES student(lifelong_education_id),
    from_school_id UUID REFERENCES school(id),
    to_school_id UUID REFERENCES school(id),
    requested_by UUID REFERENCES "user"(id),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'parent_consent_required', 'approved', 'in_progress', 'completed', 'rejected')),
    transfer_scope JSONB NOT NULL DEFAULT '{}',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    parent_consent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT
);

-- 13. 학부모 동의 테이블
CREATE TABLE parent_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_request_id UUID REFERENCES data_transfer_request(id),
    parent_name VARCHAR(50) NOT NULL,
    parent_contact VARCHAR(100) NOT NULL,
    consent_status VARCHAR(20) DEFAULT 'pending' CHECK (consent_status IN ('pending', 'approved', 'rejected')),
    consented_data_types TEXT[] DEFAULT '{}',
    digital_signature TEXT NOT NULL,
    consent_given_at TIMESTAMPTZ,
    ip_address INET NOT NULL,
    legal_documentation JSONB DEFAULT '{}'
);

-- 14. LLM 분석 결과 테이블
CREATE TABLE llm_analysis_result (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES student(id),
    survey_id UUID REFERENCES survey(id),
    analysis_content TEXT NOT NULL,
    recommendations JSONB NOT NULL DEFAULT '{}',
    risk_factors JSONB NOT NULL DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    analysis_type VARCHAR(20) CHECK (analysis_type IN ('individual', 'comparative', 'longitudinal')),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_version VARCHAR(50) NOT NULL
);

-- 인덱스 생성
CREATE INDEX idx_student_lifelong_id ON student(lifelong_education_id);
CREATE INDEX idx_student_school_grade_class ON student(current_school_id, grade, class);
CREATE INDEX idx_survey_school_status ON survey(school_id, status);
CREATE INDEX idx_friendship_student_friend ON friendship_data(student_id, friend_id);
CREATE INDEX idx_network_analysis_survey_student ON network_analysis_result(survey_id, student_id);
CREATE INDEX idx_intervention_student_status ON intervention_log(student_id, status);
CREATE INDEX idx_transfer_request_status ON data_transfer_request(status);

-- RLS (Row Level Security) 정책 설정 (기본적으로 비활성화, 필요시 활성화)
-- ALTER TABLE student ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE survey ENABLE ROW LEVEL SECURITY;
-- 기타 테이블들도 필요에 따라 RLS 활성화

-- 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 자동 업데이트 트리거 설정
CREATE TRIGGER update_district_admin_updated_at BEFORE UPDATE ON district_admin FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_school_updated_at BEFORE UPDATE ON school FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_survey_updated_at BEFORE UPDATE ON survey FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intervention_log_updated_at BEFORE UPDATE ON intervention_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teacher_memo_updated_at BEFORE UPDATE ON teacher_memo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 삽입
INSERT INTO district_admin (district_name, admin_name, email, phone) VALUES
('서울특별시교육청', '김교육', 'admin@seoul.go.kr', '02-1234-5678');

INSERT INTO school (district_id, school_code, school_name, school_type, address, contact_info) VALUES
((SELECT id FROM district_admin LIMIT 1), 'SEL001', '서울중앙초등학교', 'elementary', '서울시 중구 태평로 1가', '02-1234-5678');

INSERT INTO "user" (school_id, name, email, phone, role, grade, class) VALUES
((SELECT id FROM school LIMIT 1), '김선생', 'kim.teacher@school.edu', '010-1234-5678', 'homeroom_teacher', '3', '2');

-- 학생 샘플 데이터
INSERT INTO student (lifelong_education_id, current_school_id, student_number, name, birth_date, gender, grade, class, parent_contact) VALUES
('LEI-000001', (SELECT id FROM school LIMIT 1), '0001', '김민수', '2010-03-15', 'male', '3', '2', '{"motherName": "김○○", "motherPhone": "010-1111-2222", "fatherName": "김○○", "fatherPhone": "010-3333-4444", "email": "parent1@email.com"}'),
('LEI-000002', (SELECT id FROM school LIMIT 1), '0002', '이지은', '2010-05-20', 'female', '3', '2', '{"motherName": "이○○", "motherPhone": "010-2222-3333", "fatherName": "이○○", "fatherPhone": "010-4444-5555", "email": "parent2@email.com"}'),
('LEI-000003', (SELECT id FROM school LIMIT 1), '0003', '박서준', '2010-07-08', 'male', '3', '2', '{"motherName": "박○○", "motherPhone": "010-3333-4444", "fatherName": "박○○", "fatherPhone": "010-5555-6666", "email": "parent3@email.com"}');

-- 설문 샘플 데이터
INSERT INTO survey (school_id, created_by, title, description, questions, start_date, end_date, status) VALUES
((SELECT id FROM school LIMIT 1), (SELECT id FROM "user" LIMIT 1), '2024년 1학기 교우관계 조사', '학급 내 교우관계 현황 파악을 위한 정기 설문조사', 
'[{"id": 1, "question": "가장 친한 친구 3명을 선택해주세요", "type": "multiple_choice"}, {"id": 2, "question": "어려움이 있을 때 도움을 요청할 수 있는 친구는 누구인가요?", "type": "multiple_choice"}]', 
'2024-01-01', '2024-01-31', 'active');

COMMENT ON TABLE district_admin IS '교육청/지역 관리자 정보';
COMMENT ON TABLE school IS '학교 정보';
COMMENT ON TABLE "user" IS '시스템 사용자 (교사, 관리자)';
COMMENT ON TABLE student IS '학생 정보';
COMMENT ON TABLE student_school_history IS '학생의 학교 이력';
COMMENT ON TABLE survey IS '설문 정보';
COMMENT ON TABLE survey_response IS '설문 응답';
COMMENT ON TABLE friendship_data IS '교우관계 데이터';
COMMENT ON TABLE network_analysis_result IS '네트워크 분석 결과';
COMMENT ON TABLE intervention_log IS '교육적 개입 로그';
COMMENT ON TABLE teacher_memo IS '교사 메모';
COMMENT ON TABLE data_transfer_request IS '데이터 이관 요청';
COMMENT ON TABLE parent_consent IS '학부모 동의 기록';
COMMENT ON TABLE llm_analysis_result IS 'LLM 분석 결과';
