# 네이버 웍스 이메일 설정 가이드

## 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# 네이버 웍스 설정
REACT_APP_NAVER_WORKS_CLIENT_ID=your_client_id_here
REACT_APP_NAVER_WORKS_CLIENT_SECRET=your_client_secret_here
REACT_APP_NAVER_WORKS_DOMAIN=your_domain_here

# 기존 Supabase 설정
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 네이버 웍스 설정 방법

1. **네이버 웍스 관리자 콘솔**에서 애플리케이션 생성
2. **API 사용 설정**에서 메일 API 활성화
3. **Client ID**와 **Client Secret** 확인
4. **도메인** 설정 확인

## 보안 주의사항

- `.env` 파일은 절대 Git에 커밋하지 마세요
- 프로덕션 환경에서는 환경 변수를 안전하게 관리하세요
- Client Secret은 외부에 노출되지 않도록 주의하세요

## 테스트

개발 환경에서 이메일 발송을 테스트하려면:

1. 네이버 웍스 설정 완료
2. 환경 변수 설정
3. 비밀번호 찾기 기능 테스트
4. 실제 이메일 수신 확인
