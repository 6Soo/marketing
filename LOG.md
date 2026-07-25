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

---

## 2026-07-25 세션 핸드오프 (Antigravity/Gemini Pro)

### 이번 세션에 한 일
- **인스타그램 계정 실시간 라이브 연동 및 자동 발행 성공**:
  - `IG_USER_ID`(`17841445215686571`), `IG_ACCESS_TOKEN` 인증 설정 완료.
  - `cardnews/series/sanriku` (산리쿠 편) 실게시 성공 (`media_id=17999828414975466`).
  - `cardnews/series/hida` (히다 편) 실게시 성공 (`media_id=18275147926294579`).
- **캡션 자동 정제 로직 도입**:
  - `daily-publish.mjs`에서 캡션 파일 읽을 때 마크다운 가이드 주석(`#`, `>`, `※`)을 자동으로 걸러내어, 인스타그램 피드에는 **순수 본문 텍스트와 해시태그만 깔끔하게 업로드**되도록 개선.
- **생성형 AI 사진 수급 파이프라인 구축 ([tools/gen-image.mjs](file:///d:/OneDrive/문서/AX/marketing/tools/gen-image.mjs))**:
  - 스톡 사진 소싱의 비정합성 극복을 위해 Imagen 3 / 나노바나나 기반 4:5 고화질 맞춤 비주얼 생성형 이미지 모듈 구축.
  - `render.mjs` 렌더러에 1순위 AI 생성을 탑재하고, 2순위 Pexels 스톡 소싱(`tools/stock-photo.mjs`) 안전 폴백 연결.
- **jsDelivr CDN 캐시버스팅 파이프라인 구현**:
  - 인스타그램 실게시 시, jsDelivr CDN의 영구 캐시 오염으로 인해 이전 검은색 이미지가 반복 노출되던 문제를 100% 규명.
  - `daily-publish.mjs` 파일명에 유니크 타임스탬프 해시(`Date.now().toString(36)`)를 적용하여 CDN 캐시 무력화 및 고화질 실사진 100% 정상 수급 보장.

### 배포/런타임 상태
- **기본 브랜치**: `Master` (모든 커밋 푸시 완료).
- **인스타그램 라이브 연동 가동 중**: `.env`에 `IG_USER_ID`, `IG_ACCESS_TOKEN`, `PUBLIC_BASE_URL`, `PUBLIC_DIR` 설정 완료.
- **카드뉴스 렌더링/발행 도구**:
  - `node cardnews/tools/daily-publish.mjs --series=cardnews/series/<시리즈> --publish`로 즉시 실게시 가능.

### 부트스트랩 (세션 이동 시)
- `.env` (리포 루트): `IG_USER_ID`, `IG_ACCESS_TOKEN`, `PUBLIC_BASE_URL`, `PUBLIC_DIR`, `GEMINI_API_KEY`, `PEXELS_API_KEY`.
- 실행 도구: `cardnews/tools/daily-publish.mjs`, `cardnews/tools/render.mjs`, `tools/gen-image.mjs`, `tools/instagram-publish.mjs`.
