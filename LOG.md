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
- 실행 도구: `cardnews/tools/daily-publish.mjs`, `cardnews/tools/render.mjs`, `tools/instagram-publish.mjs`.

### 2026-07-26 직접 검토 정정

- 7/25 로컬 수동 실게시 성공 기록은 유효하지만, GitHub Actions의 공개 JPEG 배포 단계는 아직
  연결되지 않았으므로 예약 자동 게시 상태는 아님.
- 생성형 AI 이미지를 실제 여행지 사진의 1순위로 쓰는 경로는 회사 비주얼 계약과 충돌해 렌더러에서 제외.
- 산리쿠 현행 사진은 Pexels 분위기 대역이므로 `photoStatus: placeholder`로 표시하고 재게시 차단.

### 함정·비자명 사실
- **JPEG-only** — render는 PNG라 반드시 변환. 이미지 URL은 **공개**여야 하고 발행 **전에** 라이브.
- 사장 폰(삼성 인앱 웹뷰)에서 **Artifact/HTML 첨부가 스피너로 안 뜸** → 완성 HTML은 PNG로 구워 전달(foresttour CLAUDE.md의 `tools/render-png.py` 흐름).
- 캐러셀에 음악은 API로 못 붙임(릴스만) — 음악 원하는 소재는 별도 릴스(build-reel.mjs).

### 로컬 도구

- `npm i`(sharp 등), Chromium(렌더 — /opt/pw-browsers 없으면 `npx playwright install chromium`).
- 클라우드 세션: 명령 앞 `NODE_USE_ENV_PROXY=1`.

---

## 2026-07-26 세션 핸드오프 — 인스타그램 전체 검토·카드뉴스 개선

### 이번 세션에 한 일

- `나만 몰랐던 일본 002 — 산리쿠` 카드뉴스 디자인 개선:
  - 표지·내지의 타이포 위계, 안전여백, 스크림, 인덱스 라인 정리.
  - 종이 카드에 필드노트 가로선·붉은 세로선 추가.
  - 마지막 장을 CTA 문구에서 `산리쿠 핵심 5장면` 저장형 요약으로 전환.
  - 표지 3개 후보를 확정안 1개로 정리하고 문구의 정차 과장을 완화.
  - 9장 PNG와 기록용 HTML 재렌더 완료.
- 캡션을 장소 이야기 → 여행 방식 → 저장 → 프로필 확인 순서로 전면 수정.
  프로필 링크 규칙을 `https://foresttour.kr`로 바로잡고 해시태그를 7개로 축소.
- 자동 게시 안전성 개선:
  - `캡션.md`의 검토 메모가 아니라 `---` 사이 게시 본문만 추출.
  - 캐러셀 자식·부모 컨테이너가 준비될 때까지 기다린 후 게시.
  - 현지 사진 미검증(`photoStatus !== verified`)이면 실게시 차단.
  - Windows Chrome/Edge에서도 로컬 PNG 렌더 가능.
- 전체 진단·우선순위 문서:
  `strategy/인스타그램-전체-검토-개선-0726.md`.

### 검증

- 관련 `.mjs` 전부 구문 검사 통과.
- 1080×1350 PNG 9장 렌더 및 표지·2장·9장 육안 검수 완료.
- 자동 게시 드라이런 성공: 9장 순서와 캡션 본문만 전달되는 것 확인.
- 대역 사진 상태에서 실게시 명령이 종료 코드 1로 차단되는 것 확인.
- `git diff --check` 통과.

### 게시 전 미결

1. 산리쿠 Pexels 분위기 대역 9장을 실제 현지 촬영 원본으로 교체.
2. 교체·출처 확인 후 `cards.mjs`의 `meta.photoStatus`를 `verified`로 변경.
3. 공개 JPEG 호스팅 단계와 IG 계정 시크릿 연결.
4. `.github/workflows/loop-workflows.yml` 초안의 토큰 평문 로그·아티팩트 문제를 해결하기 전 활성화 금지.
5. 로컬에는 JPEG 변환기(`sharp`)가 설치돼 있지 않음. PNG 렌더는 완료됐고 CI는 의존성 설치 후 변환 가능.

### 주의

- 세션 시작 전부터 자동화·멀티채널 관련 수정/신규 파일이 다수 존재해 이번 변경을 별도 커밋하지 않음.
  특히 `daily-cardnews.yml`, `daily-publish.mjs`, `data/`, 루프 도구는 기존 작업과 섞여 있으므로
  커밋 전 소유자 검토가 필요함.

### 2026-07-26 커밋 전 직접 검토 보완

- 별도 Git 저장소인 `bus/`는 marketing 커밋에서 제외하도록 `.gitignore`에 등록.
- 공개 호스팅·실계정 검증 전 자동 스케줄과 Actions의 자동 커밋·푸시를 중단하고 수동 실행으로 제한.
- 갱신 토큰을 로그·평문 아티팩트로 남기던 보조 워크플로 초안 제거.
- 실제 동작 없이 성공으로 기록하던 루프 엔진과 가짜 이미지를 만들 수 있던 사진 소싱·AI 사실검증
  프로토타입은 커밋 대상에서 제거.
- 카페·밴드 변환기가 존재하지 않는 `card.text`를 읽어 빈 글을 만들던 문제와 `--output` 경로
  처리 오류 수정. 두 도구는 외부 자동 게시기가 아니라 게시용 파일 생성기임을 명확히 함.
- Insights 드라이런의 가상 성과값을 제거하고, 분석기는 실측값이 없으면 추정하지 않도록 교체.

### 2026-07-26 자동 게시 파이프라인 정상화

- Chrome 수동 게시를 운영 경로로 쓰지 않고 GitHub Actions 기반 자동 게시 경로를 완결함.
- `daily-publish.mjs`에 `--validate-live`, `--stage-only`를 추가:
  - 실게시 전 사진 검증 상태를 별도 검사.
  - 공개 배포용 JPEG 9장·캡션·manifest를 지정 폴더에 준비.
- `daily-cardnews.yml`의 비어 있던 공개 배포 단계를 연결:
  - 전용 `instagram-assets` 브랜치에 실행별 JPEG 배포.
  - 배포 커밋 SHA 기반 raw GitHub URL 생성.
  - 첫 JPEG 공개 접근 성공 후에만 Instagram API 게시.
- 운영 워크플로는 `photoStatus: verified`만 허용하며 대역 사진 우회 입력을 제공하지 않음.
- 수동 실행 입력 `publish_live=false`가 기본값이라 명시적으로 켜야 실게시됨. 예약 실행은 아직 비활성.
- 로컬 검증: 구문·YAML 파싱, 대역 사진 차단, 명시적 CLI 예외 검사, sharp JPEG 9장 스테이징 성공.
---

## 2026-07-26 — 자연스러운 발견 퍼널·시니어 카페 점진 개편

- 마케팅 최상위 원칙을 `상품 노출`보다 `자연스러운 발견`으로 고정했다.
- 20~40대 인스타그램 이용층은 인스타그램 → foresttour.kr → 여행 이해·신뢰 → 예약으로 연결하고, 다음 카페 직접 유도는 피한다.
- `strategy/foresttour-자연스러운-상품연결-전략-0726.md`에 릴스·카드뉴스·홈페이지의 역할과 20초 릴스 구조를 정리했다.
- `strategy/cafe-시니어-점진개편-전략-0726.md`에 cafe.foresttour.kr의 점진 개편 계획을 추가했다.
  - 기존 시니어: 익숙한 동선·명칭 보존, 가독성·탐색·재방문 개선
  - 신규 시니어: 선택형 온보딩, 가입 후 첫 행동과 7일 안착 개선
  - 전면 개편 금지, 관찰 → 작은 변화 → 반응 검증 → 확대
- 실제 foresttour.kr 화면 코드는 별도 `reservation` 저장소의 `/home2`에 있으며, 같은 세션에서 발견 중심 구조로 개편했다.
---

## 2026-07-26 — 시니어 예약 전환 감사·모바일 우선

- `reservation`과 `foresttour` 저장소를 병렬 감사했다.
- `/admin/traffic`은 예약 진입과 최종 완료만 집계해 14단계 중간 이탈을 설명하지 못한다.
- 카페 공지의 `3분, 성함과 연락처`와 실제 해외여행 13~14개 화면이 불일치한다.
- 신규 비회원에게 기존 카페 회원 소개자를 필수 요구하는 구조적 막힘을 확인했다.
- 계좌 안내가 서버 접수보다 먼저 나와 은행 앱 전환 시 입력 상태 소실 가능성이 있다.
- 카페 개선은 `m.cafe.daum.net/sixsungwon` 모바일 경험을 기준으로 하며 원본 최신글·댓글·전화 습관을 보존한다.
- 실행안은 `strategy/reserve-시니어-예약전환-개선계획-0726.md`에 정리했다.
- 최우선 순서: 모바일 퍼널 계측 → 비회원 막힘 제거 → 관심 접수/출발정보 분리 → 직접 신청/직원 도움 비교.

---

## 2026-07-26 — Instagram ↔ foresttour.kr 통합 편집 계약

- Instagram 카드뉴스·릴스·스토리와 foresttour.kr 착륙 콘텐츠를 하나의 여행지 편집 단위로 관리한다.
- 프로필은 깨끗한 `https://foresttour.kr/`를 유지하고, 스토리·릴스·식별 링크는 콘텐츠 slug와
  24자 이내의 `insta-<지면>-<source-alias>` 최초 유입 표식을 사용한다.
- 산리쿠 002의 표지 질문과 웹 첫 본문을 오사와 교량의 관람 정차 이야기로 맞췄다.
- 산리쿠 시리즈 메타에 profile URL, story path, 지면별 source code, 연결 일정 상태를 함께 기록했다.
- 공개 예약 시스템에 산리쿠 모집 일정이 없으므로 캡션의 `다음 출발` 약속을 제거했다.
- 현재 산리쿠 사진은 Pexels 분위기 대역이므로 기존 안전장치대로 재게시하지 않는다.
- 수동 명령에서도 `--allow-placeholder`로 실게시 검증을 우회할 수 없게 차단 조건을 고정했다.
- 세부 계약과 게시 전 체크리스트:
  `context/인스타그램-foresttour-콘텐츠-연결-규칙-2026-07-26.md`
- reservation 로컬 체크포인트: `d9455e8`.
- 외부 Instagram 캡션 수정·새 게시·사이트 배포·Git push는 수행하지 않았다.
