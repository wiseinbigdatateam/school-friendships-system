# 학생 교우관계 분석 시스템

AI 기반 네트워크 분석을 통해 학생들의 교우관계를 시각화하고 분석하는 웹 애플리케이션입니다.

## 🚀 주요 기능

### 1. 학생 관리
- 학생 정보 조회 및 관리
- 학년/반별 필터링
- 학생별 상세 정보 확인

### 2. 설문 관리
- 교우관계 설문 템플릿 관리
- 설문 운영 및 모니터링
- 응답자 관리

### 3. 교우관계 분석
- **전체 현황**: 전체 학생 수, 고립 위험 학생, 인기 학생 통계
- **개별 분석**: 학생별 네트워크 메트릭 (사회적 지위, 친구 수, 고립도, 중심성)
- **관계 분석**: 학생 간 교우관계 상세 분석

### 4. 데이터 이관
- 학생 데이터를 다른 학교로 안전하게 이관
- 이관 범위 선택 (학업 기록, 행동 기록, 교우관계, 교사 메모, 개입 로그)
- 이관 상태 추적 및 관리

### 5. 리포트 및 모니터링
- 교우관계 분석 리포트 생성
- 실시간 설문 응답 모니터링
- 개입 효과 추적

## 🛠️ 기술 스택

- **Frontend**: React 19, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **상태 관리**: React Context API
- **폼 관리**: React Hook Form + Zod
- **UI 컴포넌트**: Heroicons, React Hot Toast
- **차트**: Recharts, D3.js, Cytoscape

## 📋 시스템 요구사항

- Node.js 18.0.0 이상
- npm 9.0.0 이상
- Supabase 계정

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/wiseinbigdatateam/school-friendships-system.git
cd school_friendships
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env` 파일을 생성하고 Supabase 프로젝트 정보를 입력하세요:

```bash
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 데이터베이스 스키마 설정
Supabase 대시보드에서 `supabase_schema.sql` 파일의 내용을 실행하여 데이터베이스 스키마를 생성하세요.

### 5. 애플리케이션 실행
```bash
npm start
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## 📊 데이터베이스 구조

### 핵심 테이블
- **student**: 학생 기본 정보
- **survey**: 설문 정보
- **survey_response**: 설문 응답
- **friendship_data**: 교우관계 데이터
- **network_analysis_result**: 네트워크 분석 결과
- **teacher_memo**: 교사 메모
- **intervention_log**: 교육적 개입 로그
- **data_transfer_request**: 데이터 이관 요청

### 데이터 이관 지원
- 영구 교육 식별자(LEI) 기반 학생 추적
- 학교 간 데이터 이관 시 학부모 동의 시스템
- 선택적 데이터 이관 범위 설정

## 🔐 권한 시스템

- **district_admin**: 교육청 관리자
- **school_admin**: 학교 관리자
- **grade_leader**: 학년장
- **homeroom_teacher**: 담임교사

각 역할별로 적절한 권한이 부여되어 데이터 접근을 제한합니다.

## 📈 네트워크 분석 메트릭

### 중심성 지표
- **연결 중심성 (Degree Centrality)**: 직접 연결된 친구 수
- **중개 중심성 (Betweenness Centrality)**: 네트워크에서의 중개 역할
- **근접 중심성 (Closeness Centrality)**: 다른 학생들과의 평균 거리

### 사회적 지위
- **인기 (Popular)**: 많은 친구를 가진 학생
- **보통 (Average)**: 평균적인 친구 수
- **고립 (Isolated)**: 적은 친구를 가진 학생
- **논란 (Controversial)**: 복잡한 교우관계를 가진 학생

### 고립도 점수
- 0.0-0.3: 낮음 (사회적 연결이 양호)
- 0.3-0.7: 보통 (일반적인 수준)
- 0.7-1.0: 높음 (고립 위험)

## 🔄 데이터 이관 프로세스

1. **이관 요청 생성**: 교사가 학생 데이터 이관 요청
2. **범위 선택**: 이관할 데이터 유형 선택
3. **승인 과정**: 학교 관리자 승인
4. **학부모 동의**: 필요한 경우 학부모 동의 수집
5. **데이터 이관**: 승인된 데이터 이관 실행
6. **완료 확인**: 이관 완료 및 검증

## 📱 반응형 디자인

- 모바일, 태블릿, 데스크톱 모든 기기 지원
- TailwindCSS를 활용한 현대적인 UI/UX
- 접근성 고려한 컴포넌트 설계

## 🧪 테스트

```bash
npm test
```

## 📦 빌드

```bash
npm run build
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

## 🔮 향후 계획

- [ ] 실시간 네트워크 시각화 (Cytoscape.js)
- [ ] LLM 기반 교우관계 분석
- [ ] 모바일 앱 개발
- [ ] 다국어 지원
- [ ] 고급 통계 분석 기능
- [ ] API 문서화

---

**개발자**: 학생 교우관계 분석 시스템 팀  
**최종 업데이트**: 2024년 12월
