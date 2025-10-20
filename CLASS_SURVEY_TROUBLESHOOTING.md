# 🔍 Class Survey 페이지 접속 문제 해결 가이드

## 현재 상황
- **URL**: `http://localhost:3000/class-survey`
- **증상**: 페이지가 나오지 않음
- **파일 상태**: ✅ 존재 확인 (`src/pages/ClassSurvey.tsx`)
- **라우팅**: ✅ 정상 설정 (`src/App.tsx`)

---

## 🔍 체크리스트

### 1. 로그인 상태 확인 ⭐ (가장 가능성 높음)
`/class-survey`는 보호된 경로입니다. 로그인이 필요합니다.

**확인 방법**:
```
1. 브라우저에서 http://localhost:3000/login 접속
2. 로그인 완료
3. http://localhost:3000/class-survey 재접속
```

**예상 증상**:
- 로그인하지 않았다면 → `/login`으로 리다이렉트
- 로그인했다면 → 페이지 정상 표시

---

### 2. 브라우저 콘솔 에러 확인

**확인 방법**:
```
1. 브라우저에서 F12 (개발자 도구)
2. Console 탭 확인
3. 에러 메시지 확인
```

**예상 에러**:
- `Uncaught Error`: 컴포넌트 로딩 실패
- `404 Not Found`: 파일을 찾을 수 없음
- `Redirecting to /login`: 인증 필요

---

### 3. React Router 상태 확인

**현재 라우팅 설정**:
```tsx
<Route
  path="/class-survey"
  element={
    <ProtectedRoute>
      <ProtectedLayout>
        <ClassSurvey />
      </ProtectedLayout>
    </ProtectedRoute>
  }
/>
```

**체크 포인트**:
- ✅ `ProtectedRoute`: 로그인 필요
- ✅ `ProtectedLayout`: 헤더/푸터 레이아웃
- ✅ `ClassSurvey`: lazy loading 컴포넌트

---

### 4. 서버 재시작

캐시 문제일 수 있습니다.

**해결 방법**:
```bash
# 1. 기존 서버 종료
pkill -f "react-scripts"

# 2. 캐시 삭제
rm -rf node_modules/.cache

# 3. 서버 재시작
npm start
```

---

### 5. 브라우저 캐시 클리어

**해결 방법**:
- Chrome: Cmd + Shift + Delete → 캐시 삭제
- Safari: Cmd + Option + E
- 또는 시크릿 모드로 테스트

---

## 🛠️ 문제별 해결 방법

### 문제 A: 로그인 페이지로 리다이렉트
**원인**: 로그인하지 않음

**해결**:
```
1. http://localhost:3000/login 접속
2. 테스트 계정으로 로그인:
   - 이메일: test@school.edu
   - 비밀번호: (설정한 비밀번호)
3. /class-survey 재접속
```

---

### 문제 B: 빈 화면 또는 무한 로딩
**원인**: 컴포넌트 로딩 실패 또는 데이터 없음

**해결**:
1. 브라우저 콘솔에서 에러 확인
2. Network 탭에서 API 호출 확인
3. Supabase 데이터 확인 (surveys 테이블)

---

### 문제 C: 404 Not Found
**원인**: 라우팅 문제

**해결**:
```bash
# 서버 재시작
pkill -f "react-scripts"
npm start
```

---

## 🧪 테스트 시나리오

### 정상 동작 시나리오:
```
1. 로그인 완료 상태
   ↓
2. /class-survey 접속
   ↓
3. ClassSurvey 컴포넌트 로드
   ↓
4. 설문 데이터 조회 (Supabase)
   ↓
5. 차트 및 데이터 표시
```

### 현재 예상되는 시나리오:
```
1. /class-survey 접속 시도
   ↓
2. ProtectedRoute 체크
   ↓
3. 로그인 안 됨 → /login으로 리다이렉트
```

---

## 📊 디버깅 정보 수집

브라우저에서 다음 정보를 확인해주세요:

1. **브라우저 콘솔 (F12)**:
   - 에러 메시지
   - 경고 메시지
   - 네트워크 요청 실패

2. **Network 탭**:
   - API 호출 성공/실패
   - 응답 코드 (200, 401, 404 등)

3. **Application 탭**:
   - Local Storage: `wiseon_user`, `wiseon_auth_token` 확인
   - 로그인 정보 존재 여부

---

## ✅ 해결 단계

### Step 1: 로그인 확인
```
브라우저에서 확인:
- Local Storage에 wiseon_user, wiseon_auth_token이 있는가?
- 없다면 → /login 페이지에서 로그인
```

### Step 2: 서버 상태 확인
```bash
# 서버가 정상 실행 중인지 확인
curl http://localhost:3000
```

### Step 3: 라우팅 테스트
```
브라우저에서 다른 보호된 페이지 접속 테스트:
- http://localhost:3000/dashboard
- http://localhost:3000/students
→ 이것들도 안 되면 로그인 문제
→ 이것들은 되는데 /class-survey만 안 되면 컴포넌트 문제
```

---

## 🎯 가장 가능성 높은 원인

**1순위: 로그인 안 됨** (90% 확률)
- ProtectedRoute가 로그인을 체크
- 로그인 정보 없으면 /login으로 리다이렉트

**해결**: 로그인 후 재접속

**2순위: 서버 캐시 문제** (5% 확률)
- 이전 빌드 캐시가 남아있음

**해결**: 서버 재시작 + 캐시 삭제

**3순위: 컴포넌트 로딩 실패** (5% 확률)
- Lazy loading 실패

**해결**: 브라우저 콘솔에서 에러 확인

---

## 💡 즉시 확인 사항

브라우저에서 다음을 확인해주세요:

1. **로그인 여부**: Local Storage에 `wiseon_user` 있는지
2. **콘솔 에러**: F12 → Console 탭
3. **리다이렉트**: /login으로 자동 이동하는지

위 정보를 알려주시면 정확한 해결 방법을 제시해드리겠습니다!

