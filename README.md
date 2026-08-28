# 김이주 포트폴리오 사이트 — 프로젝트 설정 가이드

## 폴더 구조
```
/
├── index.html, style.css, script.js   # 공개 포트폴리오 사이트 (로그인 불필요)
├── admin/
│   ├── index.html                     # 관리자 로그인 화면
│   └── dashboard.html                 # 로그인 후 대시보드 (콘텐츠 관리 기능은 다음 단계에서 추가)
├── api/auth/
│   ├── login.js                       # POST 로그인 → 세션 쿠키 발급
│   ├── logout.js                      # POST 로그아웃 → 세션 쿠키 삭제
│   └── me.js                          # GET 현재 로그인 상태 확인
├── lib/
│   ├── session.js                     # JWT 발급/검증 (1시간 만료)
│   └── cookies.js                     # 쿠키 직렬화/파싱
├── middleware.js                       # /admin/dashboard.html 접근을 서버 단에서 보호
└── scripts/hash-password.js           # 관리자 비밀번호 → bcrypt 해시 변환 스크립트
```

## 처음 설정하는 방법

### 1. GitHub 저장소 생성 후 이 폴더를 push
```bash
git init
git add .
git commit -m "init: 포트폴리오 사이트 + 관리자 로그인"
git remote add origin <본인 GitHub 저장소 URL>
git push -u origin main
```

### 2. Vercel에서 이 저장소 Import
[vercel.com/new](https://vercel.com/new) → GitHub 저장소 선택 → Import
(별도 빌드 설정 필요 없음 — Framework Preset은 "Other"로 두면 됩니다)

### 3. 관리자 비밀번호 해시 만들기 (본인 컴퓨터에서)
```bash
npm install
npm run hash-password -- "원하는비밀번호"
```
출력된 해시값을 복사해두세요. **평문 비밀번호는 어디에도 저장되지 않습니다.**

### 4. Vercel 환경변수 등록
Vercel 대시보드 → 프로젝트 → **Settings → Environment Variables** 에서 아래 값 등록 (`.env.example` 참고):

| 변수명 | 값 |
|---|---|
| `ADMIN_USERNAME` | 원하는 관리자 아이디 |
| `ADMIN_PASSWORD_HASH` | 3단계에서 만든 해시값 |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 로 생성한 랜덤 문자열 |
| `SUPABASE_URL` | (다음 단계 - 콘텐츠 CRUD에서 사용) |
| `SUPABASE_ANON_KEY` | (다음 단계) |
| `SUPABASE_SERVICE_ROLE_KEY` | (다음 단계) |

환경변수 등록 후 **Redeploy** 한 번 눌러주세요 (환경변수는 재배포해야 반영됩니다).

### 5. 동작 확인
- `https://내사이트주소/` → 포트폴리오 사이트 (그대로)
- `https://내사이트주소/admin` → 관리자 로그인 화면
- 로그인 성공 시 `/admin/dashboard.html`로 이동, 1시간 뒤 세션 자동 만료
- 로그아웃 버튼으로 즉시 세션 종료

## 로컬에서 테스트하고 싶다면
```bash
npm install -g vercel   # 최초 1회
vercel dev
```
`.env.example`을 복사해 `.env.local`을 만들고 값을 채운 뒤 실행하면 `http://localhost:3000`에서 동일하게 테스트할 수 있습니다.

## 보안 설계 요약
- 비밀번호는 **평문으로 어디에도 저장되지 않고** bcrypt 해시만 서버 환경변수에 보관
- 세션은 **httpOnly + Secure + SameSite=Strict** 쿠키에 담긴 JWT로, 브라우저 JS에서 직접 읽거나 조작 불가
- 세션 만료 1시간은 JWT 자체의 `exp` 클레임으로 강제되어, 쿠키를 임의로 연장해도 서버가 거부
- `/admin/dashboard.html`은 **미들웨어가 요청 단계에서 서버 측 차단** — 로그인하지 않고 URL을 직접 열어도 로그인 화면으로 리다이렉트

---

## 3단계: 콘텐츠 CRUD 설정 (내소개·경력·포트폴리오·SNS 관리)

### 1. `config.js`에 Supabase 값 채우기
Supabase 대시보드 → **Project Settings → API** 에서 두 값을 복사해서 프로젝트 루트의 `config.js`를 수정하세요.
```js
window.SUPABASE_CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',   // Project URL
  anonKey: 'eyJxxxx...',                  // anon public key
};
```
이 값들은 브라우저에 노출돼도 안전합니다 (RLS로 읽기만 공개되어 있음).

### 2. Vercel 환경변수 추가 등록
2단계에서 등록한 3개(`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`)에 아래 3개를 추가하세요:

| 변수명 | 값 | 비고 |
|---|---|---|
| `SUPABASE_URL` | Supabase Project URL | config.js와 동일한 값 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 키 | **절대 config.js나 프론트 코드에 넣지 말 것** — 서버 함수 전용 |

(`SUPABASE_ANON_KEY`는 서버에서는 안 쓰이고 `config.js`에서만 사용하므로 Vercel 환경변수 등록은 선택사항입니다.)

등록 후 **Redeploy** 잊지 마세요.

### 3. 동작 확인 순서
1. `/admin` 로그인 → 대시보드에서 내소개/경력/포트폴리오/SNS 입력
2. 이미지·PDF 업로드 시 "업로드 중..." → "등록됨"으로 바뀌는지 확인
3. **전체 저장** 클릭 → "저장 완료" 토스트 확인
4. 공개 사이트(`/`) 새로고침 → 입력한 내용이 실제로 반영되는지 확인
5. 포트폴리오 카드 클릭 → 이미지/PDF 레이어팝업이 뜨는지, 첫/마지막 슬라이드에서 화살표가 숨는지 확인

### 참고
- 이미지는 업로드 시 브라우저에서 자동으로 webp로 변환됩니다.
- PDF·다운로드 파일은 원본 그대로 Supabase Storage에 **브라우저에서 직접** 업로드됩니다 (Vercel 함수를 거치지 않아 30MB 같은 큰 파일도 문제없습니다).
- "전체 저장"은 경력/포트폴리오/SNS 목록을 매번 통째로 교체하는 방식입니다 — 관리자 1인이 가끔 저장하는 구조라 이 방식이 가장 단순하고 안전합니다.

