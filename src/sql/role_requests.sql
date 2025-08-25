-- 역할 요청 테이블 생성
CREATE TABLE IF NOT EXISTS role_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('school_admin', 'district_admin')),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_role_requests_user_id ON role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_requests_created_at ON role_requests(created_at);

-- RLS 정책 설정
ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;

-- 메인관리자만 모든 역할 요청을 볼 수 있음
CREATE POLICY "메인관리자_역할요청_전체조회" ON role_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'main_admin'
    )
  );

-- 메인관리자만 역할 요청을 생성/수정/삭제할 수 있음
CREATE POLICY "메인관리자_역할요청_전체관리" ON role_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'main_admin'
    )
  );

-- 사용자는 자신의 역할 요청만 볼 수 있음
CREATE POLICY "사용자_자신의_역할요청_조회" ON role_requests
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- 사용자는 자신의 역할 요청을 생성할 수 있음
CREATE POLICY "사용자_자신의_역할요청_생성" ON role_requests
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_role_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 업데이트 트리거 생성
CREATE TRIGGER trigger_update_role_requests_updated_at
  BEFORE UPDATE ON role_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_role_requests_updated_at();

-- 샘플 데이터 삽입 (선택사항)
-- INSERT INTO role_requests (user_id, requested_role, school_id, reason) VALUES
--   ('사용자ID1', 'school_admin', '학교ID1', '학교 관리자 권한이 필요합니다.'),
--   ('사용자ID2', 'district_admin', NULL, '교육청 차원의 데이터 분석이 필요합니다.');
