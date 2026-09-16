# 프로젝트: Jerry의 구직용 포트폴리오 사이트

## 목적 / 맥락
- 개인 구직용 포트폴리오 사이트. 관리자(Jerry) 1인만 콘텐츠를 관리하고, 방문자는 로그인 없이 공개 URL로 접속.
- 트래픽이 적은 개인 사이트 — 그래서 전부 **무료 티어**로만 구성 (Vercel Hobby + Supabase Free).
- 배포 주소: `jerry86.vercel.app`. GitHub 저장소: `halugo/portpolio` (오타처럼 보이지만 실제 저장소명이 `portpolio`임, 바꾸지 말 것).

## 스택과 그 이유
- **프레임워크 없음** — 순수 HTML/CSS/바닐라 JS(ESM). 트래픽이 적고 관리자가 코딩에 익숙하지 않아, 빌드 단계 없는 가장 단순한 구조를 의도적으로 선택함.
- **Vercel**: 정적 파일 호스팅 + `/api/**.js` 서버리스 함수(Node, ESM — `package.json`에 `"type": "module"` 필수).
- **Supabase**: Postgres(콘텐츠 데이터) + Storage(이미지/PDF) + 인증은 직접 구현(Supabase Auth 미사용, 아래 참고).
- **관리자 인증은 Supabase Auth가 아니라 자체 구현**: 고정 계정(`ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` 환경변수) + `jose`로 서명한 JWT를 httpOnly 쿠키에 담음. 세션 1시간, `middleware.js`가 `/admin/dashboard.html` 접근을 서버 단에서 차단.

## 데이터 흐름 (중요 — 두 갈래로 나뉨)
- **읽기(공개 사이트)**: 브라우저가 `anon` key로 Supabase를 **직접** 조회 (`script.js`). 서버 경유 안 함. RLS로 읽기만 전체 공개.
- **쓰기(관리자 저장)**: 브라우저 → `/api/admin/save` (Vercel 함수, `service_role` key 사용) → Supabase. `service_role` key는 절대 브라우저 코드에 노출 금지.
- **파일 업로드**: Vercel 함수 바디 용량 제한(수 MB) 때문에, PDF 등 대용량 파일은 **브라우저 → Supabase Storage로 직접** 업로드. 순서: `/api/admin/upload-url`에서 서명 URL 발급 → 브라우저가 `uploadToSignedUrl`로 직접 전송. 이미지 업로드 시에만 브라우저에서 webp로 변환 후 올림.

## 절대 다시 겪고 싶지 않은 이슈들 (원인 + 해결)
1. **Supabase 새 API 키 포맷(`sb_publishable_...`, `sb_secret_...`)은 `@supabase/supabase-js`에서 오작동함.**
   → 반드시 **Legacy 포맷**(`eyJhbGci...`로 시작하는 JWT, Supabase 대시보드 "Legacy anon, service_role API keys" 탭)을 `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`config.js`에 사용할 것.
2. **Supabase 무료 플랜 "7일 비활성 시 일시정지"는 "7일 안에 한 번"이 아니라 "매일 꾸준히"가 기준.** 3일 간격 GitHub Actions ping으로도 실제로 일시정지된 적 있음 → **매일 2회**(`.github/workflows/supabase-keepalive.yml`)로 변경해 해결. 이 워크플로우 절대 삭제/간격 늘리지 말 것.
3. **크로스도메인 파일의 HTML `download` 속성은 브라우저가 무시함** (한글 파일명이 깨지던 원인). → Supabase Storage의 `?download=파일명` 쿼리파라미터 방식 사용 (`script.js`의 `withDownloadName()`).
4. **Supabase insert 후 `.select().order()` 체이닝이 일부 환경에서 "column does not exist" 오류를 냄** (원인 불명, PostgREST 버전 이슈로 추정). → insert 시 넣은 `sort_order` 값으로 직접 매칭하는 방식으로 우회함(`api/admin/save.js`의 `idBySortOrder` Map 패턴). 이 패턴 유지할 것, `.order()`를 insert 체인에 다시 붙이지 말 것.
5. **파일 교체/삭제 시 Supabase Storage에 옛 파일이 고아로 남음.** → `save.js`가 매 저장마다 이전 URL과 새 URL을 비교해서 안 쓰이는 파일을 자동 삭제함(`lib/storageCleanup.js`). 새로운 파일 필드 추가 시 이 정리 로직도 같이 확장해야 함.
6. **공개 사이트 렌더링은 "Supabase 연결 실패"와 "정상 연결됐지만 0개"를 반드시 구분해야 함.** 후자를 전자처럼 처리하면 관리자가 콘텐츠를 전부 지워도 옛날 정적 예시가 계속 보이는 버그가 남(실제로 한 번 발생). `loadData()`의 `{ ok, ... }` 패턴 유지할 것.
7. **로컬 QA용 `wkhtmltoimage`는 CSS Grid를 거의 지원 안 함** — Grid 레이아웃이 이 도구로는 깨져 보여도 실제 브라우저는 정상. 이 도구로 Grid 관련 버그 판단하지 말 것 (레이아웃 구조 확인용이 아니라 텍스트/색상 확인용으로만 사용).
8. **모바일 라이트박스는 브라우저 네이티브 핀치줌에 의존하지 않음.** `position:fixed` 팝업과 네이티브 확대가 충돌해서 스와이프가 먹통이 됐던 적 있음 → `touch-action:none` + 자체 구현 핀치줌/팬/스와이프(`script.js` 하단, `resetZoom`/`applyZoomTransform` 등)로 완전히 직접 제어함.

## 작업 시 참고
- 이 프로젝트의 PC 작업 흐름(사용자가 개발 경험이 적음)은 지금까지 "AI가 파일을 zip으로 주면 사용자가 수동으로 덮어쓰고 git 명령어 입력" 방식이었음. Claude Code로 작업할 경우 이 절차 자체가 필요 없어짐(직접 파일 수정 + git 명령 실행 가능) — 다만 실제 배포에 영향 주는 저장소이므로, 파일 수정/git push 같은 동작은 매번 승인받고 진행할 것 (bypass 모드 쓰지 말 것).
- 커밋/푸시 후에는 실제로 GitHub 원격 저장소에 반영됐는지 확인할 것 (`git log --oneline -3`, `git status`) — 과거에 upstream 브랜치 미설정으로 push가 조용히 실패한 채 넘어간 적 있음.
- Supabase 스키마는 `supabase/schema.sql`에 정의되어 있고, 대시보드 SQL Editor에서 실행하는 방식. 테이블 구조 변경 시 이 파일도 같이 갱신할 것.
