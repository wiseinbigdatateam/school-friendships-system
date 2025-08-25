# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 회원가입/로그인
2. "New project" 클릭
3. 프로젝트 이름: `school-friendships`
4. 데이터베이스 비밀번호 설정
5. 리전 선택 (Asia Northeast - Seoul 권장)

## 2. 데이터베이스 스키마 생성

1. Supabase 대시보드에서 "SQL Editor" 메뉴 선택
2. "New query" 클릭
3. `supabase_schema.sql` 파일의 내용을 복사해서 붙여넣기
4. "Run" 버튼 클릭하여 실행

## 3. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가:

```bash
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase URL 및 키 찾는 방법:

1. Supabase 대시보드에서 "Settings" > "API" 메뉴 선택
2. "Project URL"을 복사하여 `REACT_APP_SUPABASE_URL`에 입력
3. "anon public" 키를 복사하여 `REACT_APP_SUPABASE_ANON_KEY`에 입력

## 4. Row Level Security (RLS) 설정 (선택사항)

보안을 강화하려면 다음 SQL을 실행:

```sql
-- 학생 테이블 RLS 활성화
ALTER TABLE student ENABLE ROW LEVEL SECURITY;

-- 같은 학교의 데이터만 조회 가능하도록 정책 설정
CREATE POLICY "Users can view students from their school" ON student
    FOR SELECT USING (
        current_school_id IN (
            SELECT school_id FROM "user" 
            WHERE id = auth.uid()
        )
    );

-- 기타 테이블에도 유사한 정책 적용
ALTER TABLE survey ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view surveys from their school" ON survey
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM "user" 
            WHERE id = auth.uid()
        )
    );
```

## 5. 샘플 데이터 확인

스키마 실행 후 다음 데이터가 자동으로 생성됩니다:

- 교육청: 서울특별시교육청
- 학교: 서울중앙초등학교
- 교사: 김선생 (3학년 2반 담임)
- 학생: 김민수, 이지은, 박서준 (3학년 2반)
- 설문: 2024년 1학기 교우관계 조사

## 6. 애플리케이션 실행

```bash
npm start
```

## 7. 기능 테스트

### 학생 관리 페이지 (`/students`)
- 학생 목록 조회
- 학생 상세 정보 모달
- 교사 메모 추가
- 필터링 (학년, 반, 위험도)

### 설문 관리 페이지 (`/survey-management`)
- 설문 목록 조회
- 새 설문 생성
- 설문 상태별 필터링

## 8. 타입 안전성

TypeScript 타입은 `src/lib/database.types.ts`에 정의되어 있으며, Supabase CLI를 사용하여 자동 생성할 수도 있습니다:

```bash
npx supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
```

## 9. 문제 해결

### 연결 오류 시:
1. 환경 변수가 올바르게 설정되었는지 확인
2. Supabase 프로젝트가 활성 상태인지 확인
3. 네트워크 연결 상태 확인

### 데이터 조회 오류 시:
1. 샘플 데이터가 표시되는지 확인
2. 브라우저 개발자 도구의 Network 탭에서 API 호출 확인
3. Supabase 대시보드의 "Logs" 메뉴에서 에러 로그 확인

## 10. 다음 단계

- 인증 시스템 구현 (Supabase Auth)
- 실시간 기능 추가 (Supabase Realtime)
- 네트워크 분석 알고리즘 구현
- LLM 기반 분석 시스템 연동
