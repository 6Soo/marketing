# LOG — marketing (카드뉴스·인스타 자동화)

세션 핸드오프 로그. 최신 블록이 맨 아래. 새 에이전트는 **맨 아래 블록부터** 읽으세요.

---

## 2026-07-23 세션 핸드오프

### 이번 세션에 한 일
- **모델 정책**: `CLAUDE.md`에 "모델 역할 분담"(Opus 지휘·검증 + Gemini `gemini-3.6-flash` 수행, GLM 명시 호출 시만, 래퍼 sonnet 최저 effort) 등록 + 구 "모델 우선순위(GLM 우선)" 중복 섹션 제거. `tools/gemini.mjs` 기본모델 → `gemini-3.6-flash` 고정.
- **일일 카드뉴스 자동발행 파이프라인** 신설:
  - `cardnews/tools/daily-publish.mjs` — `render.mjs(PNG) → JPEG 변환 → 공개폴더 스테이징 → tools/instagram-publish.mjs 캐러셀 위임`. 기본 드라이런, 실측 통과(산리쿠 002로 9장 조립 확인). 표지 1장+내지 전부, 최대 10장, 캡션은 시리즈폴더 `캡션.md`.
  - `.github/workflows/daily-cardnews.yml` — 매일 20:00 KST. **시크릿·호스팅 연결 전엔 드라이런 스모크**(실게시 안 함), `IG_PUBLISH_ENABLED=true`로 켬.
  - `package.json`(sharp 변환기 선언), `.gitignore`에 스테이징 경로.
- **🐛 정정**: Instagram Content Publishing API는 **JPEG만** 받음(PNG 불가, 공식 실측). `cardnews/docs/인스타-자동게시-음악.md`에 반영 + §7 일일 러너/크론.
- **learning/학습-10-릴스vs캐러셀-음악-저장전략.md** — "카드뉴스 hook에 음악 필수?" 통계 검증: 정적 캐러셀은 피드에서 음악 자동재생 안 돼 **훅이 아님**; 음악=릴스탭 도달 보너스(Mosseri 공식); 저장은 캐러셀+첫 장 텍스트가 지렛대(Buffer/Metricool/Socialinsider). 무음 캐러셀 자동발행이 저장 전략과 정합.
- **context/사장님-가이드.md §9** — 인스타 자동게시 "사람 몫" 절차서(메뉴 단위): 비즈 전환 → Meta 앱/Instagram Login 토큰 → IG_USER_ID → 호스팅 결정 → GitHub 시크릿 → 캡션 → 토큰 월갱신. Meta 콘솔 절차 공식 문서로 검증(불확실 UI 문구는 "(화면 확인)" 표기).

### 배포/런타임 상태
- marketing 리포는 **비배포**(콘텐츠·도구 저장소). 기본 브랜치 = **`claude/session-mh1iuv`**(origin/HEAD가 이걸 가리킴 — 트렁크 이름이 세션명이라 지저분, 아래 함정 참조). `Master`는 같은 커밋의 중복 포인터.
- **인스타 자동발행은 아직 미가동(드라이런)** — 사람이 §9 절차 완료해야 실게시.
- Gemini/GLM 브리지 키는 `.env`(GEMINI_API_KEY·GLM_API_KEY·PEXELS_API_KEY, gitignore).

### 미결·다음 할 일
1. **인스타 실게시 켜기**(사장 몫, 가이드 §9): ① 인스타 비즈 전환 ② Meta 앱+토큰 ③ 호스팅 방식 결정 → **PUBLIC_BASE_URL** 회신 ④ GitHub Secrets(IG_USER_ID·IG_ACCESS_TOKEN·PUBLIC_BASE_URL)+Variable(IG_PUBLISH_ENABLED=true) ⑤ `캡션.md` 최종 문구.
2. **호스팅 배포 seam 코드 연결**(방식 결정 후): daily-publish 스테이징 JPEG → 공개 URL 라이브. git-push 배포(Vercel)면 stage→배포→대기→publish로 분리 필요.
3. (선택) 매월 토큰 자동갱신 워크플로 작성.

### 함정·비자명 사실
- **JPEG-only** — render는 PNG라 반드시 변환. 이미지 URL은 **공개**여야 하고 발행 **전에** 라이브.
- 기본 브랜치가 세션명(`claude/session-mh1iuv`)이라 트렁크가 지저분 → GitHub UI Settings→Branches에서 `main`/`Master`로 **rename 권장**. 중복 `Master` 삭제는 **org 403**(실측)이라 UI에서.
- 사장 폰(삼성 인앱 웹뷰)에서 **Artifact/HTML 첨부가 스피너로 안 뜸** → 완성 HTML은 PNG로 구워 전달(foresttour CLAUDE.md의 `tools/render-png.py` 흐름).
- 캐러셀에 음악은 API로 못 붙임(릴스만) — 음악 원하는 소재는 별도 릴스(build-reel.mjs).

### 부트스트랩 (git에 없어 다시 세울 것)
- `.env`(리포 루트, gitignore): `GEMINI_API_KEY`, `GLM_API_KEY`, `PEXELS_API_KEY`.
- `npm i`(sharp 등), Chromium(렌더 — /opt/pw-browsers 없으면 `npx playwright install chromium`).
- 클라우드 세션: 명령 앞 `NODE_USE_ENV_PROXY=1`.
- 인스타 발행용(사람): IG 비즈 계정·Meta 앱·장기 토큰·공개 호스팅(§9).
