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

---

## 2026-07-26 — 히다 Instagram ↔ foresttour 연결 사실 보정

- 기준선:
  - 히다 001은 이미 Instagram에 게시됐지만 로컬 원본에 `3박 4일`, `10월`,
    `자세한 여행 일정과 출발일` 약속이 남아 있었다.
  - 공개 예약 API 65건에는 히다·다카야마·시라카와고·게로와 정확히 연결되는 모집 일정이 없었다.
  - 히다 사진은 생성형 AI 연출 자산인데 시리즈 메타와 출처 문서에 그 상태가 없었다.
- 수정:
  - `photoStatus: placeholder`와 AI 연출 고지를 추가하고, 실제 현지 촬영 원본으로
    교체되기 전 새 게시·재게시를 차단하는 계약을 적용했다.
  - foresttour 히다 slug와 프로필·캐러셀·스토리·릴스 source 값을 시리즈 메타에 고정했다.
  - 카드와 캡션에서 확인되지 않은 `3박 4일·10월·출발일` 약속을 제거했다.
  - 다카야마 보존지구, 시라카와고·고카야마의 지리 구분, 게로 온천,
    히다규 인증 기준을 공식 자료에 맞춰 보정했다.
  - 생성형 AI 자산 7개의 최초 커밋, 크기, SHA-256, 역할, 미보존 provenance를
    `cardnews/photos/hida/출처.md`에 기록했다.
  - 통합 연결 규칙에 히다 001 상태와 운영 링크를 추가했다.
- 로컬 landing:
  - canonical: `https://foresttour.kr/stories/hida`
  - reservation 체크포인트: `a1b51a3`
  - 공개 모집 일정: 없음, `connectedTour: null`
- 검증:
  - 히다 시리즈와 `daily-publish.mjs` 구문 검사 통과.
  - `photoStatus`, landing path, 24자 이내 source, 일정 약속 제거, 게시용 캡션 추출 계약 통과.
  - `--validate-live --allow-placeholder`도 exit 1로 실게시 차단됨.
  - 임시 복제본에서 7장 1080×1350 렌더 성공, 제목·본문 잘림 없음.
  - 임시 렌더는 삭제했고 기존 `cardnews/out/hida` 실게시 산출물은 수정하지 않았다.
- 외부 경계:
  - 기존 Instagram 게시물·캡션·프로필은 수정하지 않았다.
  - 새 게시·재게시·원격 push·foresttour.kr 배포를 수행하지 않았다.

---

## 2026-07-26 — Instagram → foresttour.kr 공개 운영 반영

- foresttour.kr 프로덕션 배포와 공개 검증기 통과를 확인한 뒤에만 Instagram 외부 수정을 실행했다.
- 운영 계정: `@foresttour.kr`.
- 프로필:
  - 웹사이트 표시 `foresttour.kr` 유지.
  - 실제 목적지는
    `https://foresttour.kr/?utm_source=ig&utm_medium=social&utm_content=link_in_bio`.
  - 소개를 `가이드북 밖의 일본을 걷습니다 / 풍경·역사·마을을 잇는 여행 기록 /
    ↓ 인스타에서 본 이야기 이어보기`로 변경하고 공개 프로필에서 재확인했다.
- 대표 링크 실제 클릭:
  - Instagram의 `l.instagram.com` 경유 후 foresttour.kr 홈 200.
  - 홈 canonical `https://foresttour.kr/`, 콘솔 오류 0.
  - 히다·산리쿠 내부 링크는 최초 출처를 `from=insta`로 보존.
- 기존 게시물 캡션 교정:
  - 히다 `https://www.instagram.com/foresttour.kr/p/DbMh7tHj_H3/`
    - 확인되지 않은 `3박 4일`과 잘못된 `#도호쿠여행` 제거.
    - 고카야마의 도야마현 경계, 프로필 히다 기록 연결, AI 연출 이미지 고지 추가.
  - 산리쿠 `https://www.instagram.com/foresttour.kr/p/DbPkcaIEwSj/`
    - 존재하지 않는 `다음 출발` 약속 제거.
    - 프로필 산리쿠 기록 연결과 `실제 현지 답사 사진 아님` 고지 추가.
  - 산리쿠 `https://www.instagram.com/foresttour.kr/p/DbMCkYbEsxd/`
    - 확인되지 않은 `이번 10월`, `4박 5일` 약속 제거.
    - 프로필 산리쿠 기록 연결과 `실제 현지 답사 사진 아님` 고지 추가.
- 새 게시·재게시:
  - 실행하지 않았다. 히다 AI 자산과 산리쿠 Pexels 대역은 모두
    `photoStatus: placeholder`이며 검증된 현지 원본 교체 전 실게시 차단을 유지한다.
- API 상태:
  - 로컬 Instagram Graph API 토큰은 읽기·게시 한도 요청 모두
    `OAuthException code 200: API access blocked`를 반환했다.
  - 토큰을 로그에 출력하거나 갱신 결과를 저장하지 않았으며, 이번 교정은 로그인된 Chrome의
    공식 Instagram 편집 화면에서 수행했다.

---

## 2026-07-27 — 북알프스 004 카드뉴스·출처·독립 검토

- `나만 몰랐던 일본 · 004 — 북알프스` 8장 캐러셀과 게시 캡션을 완성했다.
- 실제 장소 사진 8장은 Wikimedia Commons의 CC BY 2.0/2.5/3.0/4.0만 사용하며,
  사진별 저작자·원문·고정 revision·촬영일·다운로드일·Commons SHA-1·로컬 SHA-256·
  원본/다운로드 픽셀·가공 내역·장소 근거를 보존했다.
- 독립 사실·라이선스 검토를 반영했다.
  - 2,450m는 미쿠리가이케가 아니라 무로도 고도임을 명확히 했다.
  - 히라유 폭포는 2007-11-23 눈 쌓인 촬영임을 카드와 캡션에서 밝혔고,
    현재 단풍·적설이나 연결 출발일의 현황으로 오인시키지 않는다.
  - 실제 3840×2560 JPEG 6장의 출처 JSON·원장을 잘못된 2400×1600 기록에서 교정했다.
  - 가미코치 걷기와 히라유 교통 관문의 직접 공식 출처를 추가했다.
- 독립 UX 검토를 반영해 마지막 장을 여섯 단서로 통일하고 히라유를 포함했으며,
  긴 첫 항목과 `작은 지도` 과장 표현을 줄였다.
- `validate-cardnews-sources.mjs`가 JPEG SOF 픽셀 크기와 출처 JSON을 직접 대조하도록
  강화해 동일한 기록 오류가 다시 통과하지 않게 했다.
- 8장 1080×1350 PNG 재렌더와 게시용 JPEG 변환·드라이런을 완료했다.
  - 최종 UI 업로드 스테이징 지문: `0c7fc1e8567aed024f4a097f8cfc3134be2b7b5904b4fb1c3a1203f2377e6c1d`
  - 출처 검증, Instagram 자동화 테스트 4건, `git diff --check` 통과.
- 실제 Instagram 게시와 공개 랜딩 배포 결과는 아래 운영 체크포인트에 기록한다.

---

## 2026-07-27 — 북알프스 004 실게시·공개 퍼널 운영 체크포인트

- Instagram 공식 웹 UI로 `foresttour.kr` 계정에 8장 4:5 캐러셀을 게시했다.
  - 최종 퍼머링크: `https://www.instagram.com/p/DbRGuL5kwEU/`
  - 0h 관측 시각: `2026-07-26T19:15:31.598Z` (`2026-07-27 04:15:31 KST`)
  - 캡션 569자와 8장 전체 순서를 실게시 화면에서 확인했다.
  - 첫 장의 `나만 몰랐던 일본 · 004`, 마지막 장의 `여섯 가지 단서`,
    `06 · 11월 눈의 히라유`, 서로 다른 해·계절 사진 고지를 확인했다.
  - 게시 직후 프로필은 북알프스 1건을 포함한 총 5건이며, 팔로워·팔로우는
    화면에 실제 표시된 값인 0·0으로만 기록했다.
- 첫 UI 게시 `DbRFfObk56K`는 이전 캐시 스테이징의 마지막 장이
  `다섯 가지 단서`로 남은 것을 실게시 8장 전수 검사에서 발견했다.
  수정 렌더를 새로 스테이징해 위 최종 게시물을 먼저 검증한 뒤,
  잘못된 중복 게시를 삭제하고 프로필 5건·최종 퍼머링크 존속을 재확인했다.
- `data/activation/northern-alps-004/`에 퍼머링크와 0h 관측값을 저장했다.
  아직 소유자 외 반응과 Instagram 귀속 스토리 방문은 관측되지 않아
  활성화 상태는 추정 없이 `collecting`으로 유지한다.
- GitHub Actions 실게시 자격증명 `IG_USER_ID`, `IG_ACCESS_TOKEN`을 저장소
  Secrets에 값 노출 없이 등록했다.
  - 라이브 검증 실행: `https://github.com/6Soo/marketing/actions/runs/30216370194`
  - 안전조건, 8장 렌더, JPEG 아티팩트, 공개 자산 배포,
    HTTP/MIME/JPEG/SHA 검증은 모두 통과했다.
  - 공개 자산 커밋: `7c6f315828284a5dcaa15c5ff5c60d647b18e895`
  - CI 공개 자산 콘텐츠 지문:
    `67c2ee3c3f16ac77cb8da30656bdc4a41078d9e1c844c393a912e4e6520a1106`
  - Meta Graph API는 자격증명을 정상 수신한 뒤
    `OAuthException code 200: API access blocked`로 앱 접근 자체를 거부했다.
    토큰은 로그에서 마스킹됐고 API 게시·중복 게시 모두 발생하지 않았다.
    따라서 목표에 정의한 로그인된 공식 웹 UI 대체 경로를 사용했다.
- foresttour 공개 퍼널을 실환경에서 확인했다.
  - 스토리: `https://foresttour.kr/stories/northern-alps`
  - 프로필 링크는 UTM을 보존한 foresttour 홈으로 연결되고,
    홈의 북알프스 발견 카드가 동일한 스토리 맥락으로 이어진다.
  - 정확한 활성 상품 `fNod`가 런타임에서 검증될 때만
    `https://reserve.foresttour.kr/tour/fNod?from=insta` CTA가 표시된다.
  - API 오류·지연·불일치에서는 CTA가 fail-closed로 숨겨짐을 확인했다.
  - Vercel production 배포 `dpl_96otr4Y6fTjRD5QfQ7CyUoUtigpB`가 READY이며,
    모바일 390×844에서 canonical·메타데이터·8개 출처 링크·Norikura 문맥·
    홈 발견 카드·CTA·가로 넘침 없음·콘솔 오류 없음까지 확인했다.

---

## 2026-07-27 세션 핸드오프 — Instagram 활성화 측정·Story 후속

### 사용자 확정·공개 상태

- 운영 계정은 `@foresttour.kr`이며 사도·북알프스 검증 사진 캐러셀을 공개했다.
  - 사도: `https://www.instagram.com/p/DbRD-fWkyUL/`
  - 북알프스: `https://www.instagram.com/p/DbRGuL5kwEU/`
- 프로필 링크는
  `https://foresttour.kr/?utm_source=ig&utm_medium=social&utm_content=link_in_bio`다.
- 0h에서 확인 가능한 좋아요·댓글·저장·공유·프로필 방문·팔로우는 모두 0이었다.
  조회수·도달은 화면에서 미산출 상태였으므로 기록하지 않았다.
- 성공은 게시 링크만으로 판정하지 않는다. 소유자 외 유기적 반응과 Instagram 인앱 귀속
  `story_*_visit`가 함께 확인돼야 초기 활성화 증거다.

### 완료

- Graph API 사전검사, 공개 자산 배포, 브라우저 폴백, 게시 결과→0h 기록,
  0h/24h/72h/7d 보고·학습 체계를 구축했다.
- 실제 프로필 bio 유입에 맞춰 `insta` 또는 `insta-*` + `instagram-app` + 여행지별 이벤트가
  함께 일치할 때만 foresttour 방문을 귀속한다.
- Instagram과 foresttour 수집을 독립 실행한다. 한쪽 성공 데이터는 보존하지만
  `graph-api|instagram-ui` 그룹과 `foresttour-admin`이 모두 모여야 체크포인트가 완료된다.
- 학습기도 완전한 체크포인트만 사용한다. 부분 수집으로 성과·순위·활성화를 추정하지 않는다.
- 사도 1080×1920 Story 후속 자산과 manifest를 만들었다.
  `cardnews/out/sado/story/01-discovery-link.jpg`
- Story 게시 준비 게이트는 24h 실측, JPEG 규격, 링크, source, 이벤트, 환경을 검사한다.
- 전용 GitHub Actions `Instagram Story follow-up package`는 게이트 통과 후
  JPEG·manifest·모바일 링크 스티커 지침을 7일 아티팩트로 만든다.
- 최신 테스트: 41개 통과. 비소유 `.omc/`와 `.codex-remote-attachments/`는 커밋하지 않는다.

### 외부 연결·제약

- GitHub secret에는 `IG_USER_ID`, `IG_ACCESS_TOKEN`만 있다.
- `FORESTTOUR_ADMIN_KEY`와 `ACTIVATION_COLLECT_ENABLED`는 없다.
- foresttour 운영 `/api/health`는 `adminKey: true`를 반환하므로 production에는 키가 있다.
  단, 값을 문서·로그에 노출하거나 기존 값을 추정·복사하지 않는다.
- Graph API는 `OAuthException code 200: API access blocked` 상태다.
- Meta 공식 API는 Business Story 게시를 지원하지만 링크 스티커 파라미터는 문서화돼 있지 않다.
  클릭 전환 Story는 모바일에서 링크 스티커를 추가한다.

### 미완료·첫 실행 순서

1. 사도 24h: `2026-07-27T18:47:02.033Z`, 북알프스 24h:
   `2026-07-27T19:15:31.598Z` 이후 Instagram UI 수치를 확인해 각각 기록한다.
2. 운영 ADMIN_KEY를 안전하게 재발급하거나 권한 있는 비밀 저장소에서 전달받아
   GitHub secret `FORESTTOUR_ADMIN_KEY`로 설정한다. 값은 채팅·문서·로그에 쓰지 않는다.
3. 두 데이터원이 준비된 뒤에만 repository variable `ACTIVATION_COLLECT_ENABLED=true`를 설정한다.
4. `npm run activation:status -- --experiment=sado-003`에서 24h가 `recorded`인지 확인한다.
5. `npm run story:ready -- --experiment=sado-003 --manifest=cardnews/out/sado/story/manifest.json --live-link`
   통과 후 `Instagram Story follow-up package`를 실행한다.
6. 모바일에서 `사도 이야기 이어보기` 링크 스티커를 추가해 Story를 게시하고,
   이후 `story_sado_visit`을 같은 귀속 규칙으로 측정한다.

---

## 2026-07-28 세션 — 인계서 사실 정정·감사

이번 세션은 **사실 정정 전용**이다. Persistent Goal(§3), 불변조건, 완료 게이트 문구는 건드리지 않았다.
게시·발행·secret 취급은 하지 않았다.

### 실측으로 확인해 정정한 것

1. **브랜치명**: 인계서 §1·§7이 `Master`라 적었으나 `origin/Master`는 없고 기본 브랜치는
   `main`(`origin/HEAD -> origin/main`)이다. §7의 `git switch Master` 재개 절차를 그대로
   실행하면 실패한다 → `main`으로 정정했다.
2. **24h 도래**: 인계서 §6의 "24h 미도래"는 낡았다. 사도 `2026-07-27T18:47:02Z`,
   북알프스 `2026-07-27T19:15:31Z` 기한은 이미 지났고, 현재 두 실험 모두 24h는 `due` /
   records 0이다. **시간이 더 흘러도 자동으로 `recorded`가 되지 않는다** — 수집 경로가
   실제로 실행돼야 기록된다.
3. **워크플로 실패**: `instagram-activation-checkpoints` 예약 실행이 07-27 19:50,
   07-28 03:30 두 건 연속 실패했다. 설계된 fail-closed이며 장애가 아니다. 다만
   `Determine due checkpoint` 스텝이 리포트 도구의 exit 2에서 죽어 안내 스텝
   (`Refuse silent checkpoint miss`)까지 가지 못하던 결함이 있었고 커밋 `4e3f76c`로 수정됐다.
4. **출처 링크 수**: §6의 "eight source links"는 사진 고정 리비전 8건 기준이었다.
   현재 `/stories/northern-alps`는 **총 14개**(공식 자료 6 + 사진 8)를 렌더한다 → 기준 갱신.
5. **`/stories/sado` 존재**: §6은 사도를 IG 게시물·Story 에셋으로만 기록했으나, 지금은
   canonical·OG·공식 출처 4건을 갖춘 정식 스토리 페이지이며 홈 발견 카드로 연결된다.
   연결된 공개 일정이 없어 CTA는 올바르게 숨김 상태다.
6. **폴라로이드 벽(`CLAUDE.md`)**: "현재 Pexels 임시" 서술이 낡았다. 현재 `/home2`는
   `FIELD NOTES` 4장 발견 카드 구조이고 사도·북알프스 카드는 실제 현지 사진 + CC 크레딧을 쓴다.
   **대장 촬영 원본 교체 대상은 히다·산리쿠로 좁혀졌다.**

### 알려진 취약점·결함으로 기록한 것

7. **CTA 취약점**: `fNod` CTA가 상품 제목의 부분 문자열 매칭(`알펜루트`·`가미코지`·`노리쿠라`)에
   의존한다. 카페 원문 제목이 바뀌면 CTA가 조용히 사라진다.
8. **사도 사진 결함**: `cardnews/series/sado`는 `photoStatus: 'verified'`인데
   `node tools/validate-cardnews-sources.mjs cardnews/series/sado`가 실패한다
   (표지가 `03-kitazawa.jpg` 재사용 → 중복). 실게시 게이트가 `photoStatus`만 보고
   검증기를 돌리지 않는 구멍이 있다.

### 손대지 않은 것

- 인계서 §0/§0-A(지시 연대기), §3 Persistent Goal·불변조건·완료 게이트, 카페 detour 역사 기록은
  원문 그대로 보존했다. 낡은 서술은 삭제하지 않고 "2026-07-28 확인: ~로 정정" 형태로 갱신했다.

---

## 2026-07-28 — 불변조건 7 회귀 테스트 + 게시 실행 기록 통합

감사에서 확인된 두 구멍(불변조건 7의 marketing 측 테스트 0건, 완료 게이트 3 미충족)을 닫았다.

### (A) `connectedTour` 계약 회귀 테스트 — 신규

- `tools/verify-series-connected-tour.mjs` + `.test.mjs`. `package.json`의
  `test:instagram`에 추가했다.
- 강제하는 것:
  - `connectedTour`가 있으면 `productId`·`policy`·매칭 조건(`requiredTitleTerms` 등 최소 1종)이
    모두 있어야 한다. `policy`는 허용 목록(`reservation-api-runtime-fail-closed`)에 있는
    fail-closed 값만 통과한다(기본 거부).
  - 카드·게시 캡션에 예약 딥링크가 있으면 `productId`와 일치해야 한다.
  - `connectedTour: null`(히다·산리쿠·사도)이면 카드·게시 캡션 어디에도 예약 링크·예약/모객 문구·
    출발일·박수·가격이 없어야 한다.
- 검사 대상 캡션은 `daily-publish.mjs`와 같은 규칙으로 뽑은 **게시 본문**뿐이다.
  캡션 파일 아래의 검토 메모("출발일·박수를 넣지 않는다" 같은 문장)는 대상이 아니다.
- 실제 4개 시리즈로 통과하고, 일부러 깨뜨린 픽스처 7종으로 실패한다.

### (B) 게시 실행 기록 통합 — `data/publish-records/<experiment>.json`

- permalink·콘텐츠 지문·자산 목록·캡션·관측 시각을 게시 유닛 하나당 한 파일로 묶었다.
  `tools/verify-publish-record.mjs` + `.test.mjs`가 계약을 강제한다.
- 설계 원칙: **모르는 값은 채우지 않는다.** null이면 `gaps[]`에 사유가 있어야 통과한다.
  지문은 합치지 않고 셋 다 보존하되 "무엇의 해시인지"(`covers`) 라벨과 출처 강도(`status`)를
  붙인다. `verified-recomputable` 지문은 테스트가 실제로 다시 계산해 대조한다.

#### 지문 3종이 다른 이유 — 규명 결과

같은 카드에서 나온 **서로 다른 세 번의 스테이징**이라서 다르다. `contentFingerprint`는
`sha256(게시 캡션 바이트 ‖ JPEG 바이트들)`이므로 캡션이나 변환 환경이 다르면 값이 달라진다.

| 지문 | 무엇의 해시인가 | 상태 |
|---|---|---|
| `2e5fc060…` (manifest) | **독립 검토 반영 전** 캡션(523자) + 로컬 JPEG 8장 | 재계산 일치 확인 |
| `0c7fc1e8…` (LOG:261) | 실제 UI 업로드에 쓴 최종 스테이징(검토 반영 후) | 스테이징 미보존 → 재계산 불가 |
| `67c2ee3c…` (LOG:291) | 검토 반영 후 캡션(569자) + **CI가 변환한** JPEG 8장(commit `7c6f315`) | 재계산 일치 확인 |

- **중요**: `cardnews/out/northern-alps/_manifest-northern-alps.json`은 커밋 `0806e5e` 산출물이고,
  검토 반영 커밋 `5d0d957`은 PNG(07-hirayu·08-outro)와 캡션만 고쳤을 뿐 JPEG·manifest를
  재생성하지 않았다. 즉 **out/의 JPEG·manifest는 '다섯 가지 단서' 시기 자산이며 실게시본이 아니다.**
  permalink와 짝지어 인용하면 안 된다.
- 사도(`sado-003`)는 게시용 JPEG·manifest·캡션 스냅샷·지문이 하나도 보존되지 않았다.
  `fingerprints: []`, `assets.publishedAssets: null`, `caption.publishedSha256: null`로 두고
  각각 미보존 사유를 기록했다. 렌더 PNG 7장의 SHA-256만 실측값으로 남겼다.
- 두 기록 모두 `publish.publishedAt`은 null이다. Graph API가 차단돼 웹 UI로 게시했고
  게시 시각을 따로 기록하지 않아, 실측값은 0h 관측 시각뿐이다.
- 리포에 `_publish-result-*.json`이 0건인 이유도 여기 있다 — 그 파일은 `--publish` 경로에서만
  생성되는데 실게시가 웹 UI로 이뤄졌고, 스테이징 경로는 `.gitignore` 대상이다.

### 검증

- `npm run test:instagram` 60건 전부 통과(기존 41 + 신규 19).
- 외부 게시·발행·전송 없음. 시크릿 접근 없음. 기존 테스트 수정 없음.

---

## 2026-07-28 — 숲길따라 감성여행 네이버 밴드 운영 인계 1차 실행안 확정 및 저장소 기록

2026-07-28 설계·적대적 반박·재반론 검증 사이클의 확정안에 맞춰 네이버 밴드 운영 인계 1차 실행을 위한 문서 및 템플릿 구조를 저장소에 확정·기록했다.

### 주요 반영 사항

1. **1차 실행안 확정 (`strategy/네이버밴드-운영인계-1차실행.md`)**:
   - **첫 2주 relative 편성표 (`T0`~`T0+13`)**: T0 이전 5가지 준비 항목, 발견 → 욕구 → 낮은 압력의 일정 연결 구조 5편 순차 게시, 편성 기간 3가지 제약 명시.
   - **즉시 게시 가능한 텍스트 초안 5편**: 오타 정정(걸었던), 마크다운 백틱 제거, 사진 소싱 3순위/CC BY 크레딧 표기 양식/금지 수칙 반영.
   - **달력 점유 UI 악화 중단 및 단계적 접근안**: 당시 후속 후보 등록을 동결하고 필요 시
     월 1회 출발 색인 공지 1건을 쓰는 대안 D를 확정했다. 이때의 미등록 가정은 아래 2차 정정으로 폐기했다.
   - **신규 대표일 일정 파일럿 (대안 A)**: 2주 후 탐색 수요 및 G2/G4 게이트 통과 시 1건만 실행 (국제선 21일 하한 및 조건 전문 적용).
   - **기존 일정 수정 안전 조건**: 7개 선행 조건 및 사후 검증, 1회 원값 복원 규칙 명시.
   - **롤백 및 측정/판정 절차**: 7종 보존 필드 기반 롤백 수칙과 T0+14 사후 판정 질문 4개 수록.
   - **권한 부족 처리 및 체크리스트**: 계정 역할별 대응 행동, PII 없는 권한 요청 문구, 외부 실행자 체크리스트 8항목 및 final §12 미확정 목록 수록.
   - **게이트 및 안전조건**: G1~G4 게이트 준수, PII 미기록, 딥링크 완전 제거.

2. **표준 운영 로그 양식 확정 (`operations/band/TEMPLATE.md`)**:
   - `operations/band/YYYY-MM-DD.md` 생성을 위한 PII 보호 및 구조화 필드 로그 템플릿 추가.

### 안전 및 준수
- 외부 BAND 게시·수정·삭제 없음 (메인 세션 브라우저 실측 및 확인 후 실행 전제).
- 계정명·실명·연락처·계좌·참석자명·댓글 원문 등 PII 미기록 원칙 준수.

---

## 2026-07-28 — 네이버 BAND 일정 점유 문제 2차 사실 정정·실행 준비

### 권위 충돌 정정

- marketing의 2026-07-26 핸드오프는 당시 예약 API의 61개 여행 후보와 최초 8월 등록 배치를
  기준으로 후속 작업량을 계산한 역사적 스냅샷이다.
- foresttour 최신 인계에는 초기 배치 뒤 다수 일정이 등록됐고, 마지막 11건도 추가 등록·날짜
  수정되어 2027-05-01 출발분까지 월별 확인됐다고 기록되어 있다.
- 따라서 과거 후속 후보를 현재 미등록 일정으로 보던 1차 실행안의 가정은 폐기했다.
- 현재 BAND의 정확한 고유 일정 수·다일 일정 수·중복 수·공유글 연결 수는 브라우저 UI 전수
  감사 전까지 `unknown`이다. 과거 API 후보 수를 현재 BAND 일정 수로 쓰지 않는다.

### 확정한 목표 규칙

- 신규 일정은 출발일 하루 종일 1일만 달력에 표시한다.
- 제목에는 박수를, 본문 첫 줄에는 카페 원문과 reserve 상세가 일치한 전체 여행기간을 적는다.
- 신규 일정의 `게시글로 공유`는 끄고 저장 뒤 새 일정 공유글 0건을 확인한다.
- 피드는 2주 동안 여행지·후기·관계형 글 5편으로 운영한다. 월간 출발 색인은 첫 2주 뒤
  일정 탐색 질문이 반복될 때만 별도로 검토한다.

### 기존 일정 정정 절차

1. 브라우저 복구 뒤 2026년 8월~2027년 5월을 읽기 전용으로 감사하고 고유 이벤트 ID 수를 센다.
2. 가장 먼 미래·다일·댓글 0·참석 0·날짜 일치 일정 1건을 파일럿한다.
3. 출발일 하루 표시, 전체 기간, URL, 댓글, 참석, 공유글, 알림, 피드 재노출을 검증한다.
4. 통과 시 가장 먼 미래부터 최대 3건씩 변환하고 배치마다 같은 검증을 반복한다.
5. 실패 시 해당 건을 변경 전 값으로 한 번만 복원하고 같은 세션의 나머지 작업을 중단한다.

### 대안 판정

- 목표안 A: 감사된 적격 기존 미래 다일 일정을 파일럿 후 소배치로 대표일 하루 일정으로 전환.
- 폴백 B: 파일럿·권한·알림·브라우저 게이트가 실패하면 기존을 보존하고 신규부터 하루 일정 +
  월간 색인을 적용.
- 조건부 C: 일정과 공유글의 독립성이 입증된 경우에만 기존 공유글을 별도 정리.

### 문서·템플릿

- `.cycle/design.md`: 2차 정정 설계 전문.
- `strategy/네이버밴드-운영인계-1차실행.md`: 현재 상태·대안·감사·파일럿·배치 실행안으로 교체.
- `context/네이버밴드-OG-세션핸드오프-2026-07-26.md`: 당시 후보 수를 현재 상태로 오독하지
  않도록 정정 주석 추가.
- `operations/band/TEMPLATE.md`: 일정 감사·변경 전·보존 검증·롤백을 위한
  `Event remediation` 블록 추가.

### 안전·다음 실행

- 외부 BAND 게시·수정·삭제 없음.
- PII·인증정보·댓글 원문·참석자명 저장 없음.
- 다음 메인 세션은 브라우저를 복구한 뒤 쓰기 전에 읽기 감사와 운영 로그부터 완료한다.

---

## 2026-07-29 — 네이버 BAND 2차 정정 2차 수정 (최종 설계 구현 반영)

### 명시적 사실 폐기 및 정정

- 2026-07-28 세션 로그에서 "foresttour 최신 인계에서 2027-05-01 출발분까지 월별 확인됐다"고 기록했던 종전 문장을 명시적으로 폐기한다.
- foresttour 최신 인계의 실제 2026-07-26 시점 기록은 `2027-01-16` 출발분까지 등록 확인이며, `2027-01-24` 이후 11건의 추가 등록 및 월별 검증은 **미완료**로 기록되어 있다.
- 2026-07-29 현재 BAND UI 상의 실제 11건 존재 여부 및 고유 일정 수는 읽기 전용 UI 감사 전까지 `unknown`으로 취급한다.
- 과거 61 API 후보, 최초 9건, 후속 52건 숫자는 2026-07-26 당시 API 후보 스냅샷이며, 현재 BAND UI 일정 수로 절대 사용하지 않는다.

### 확정 정책 및 실행 규약

- **신규 일정 기본 규칙**: 출발일 하루 종일 1일 표시, 제목 `[출발] M/D 여행지 · N박N일`, 본문 첫 줄 `전체 여행기간: YYYY.M.D–M.D`, `게시글로 공유` 끄기.
- **기존 일정 정정 (대안 A)**: 읽기 전용 감사 → 가장 먼 미래 댓글 0·참석 0 1건 파일럿 → 사후 보존 검증 (URL, 댓글, 참석, 공유글, 알림 0건) → 향후 60일 구간부터 시작일 오름차순으로 출발 7일 이상 적격 일정 소배치.
- **실행 상한**: 하루 최대 3건 성공 저장, 하루 1회 세션, 주 최대 2일 이하, 원복 저장 실패 시 해당 건 1회만 허용, 알림·재공유·피드 재상단 허용 상한 누적 0건. 실패 시 1회 원복 후 세션 즉시 중단.
- **보류 대상**: 댓글/참석 있는 일정(`multi_day_future_engaged`), 진행 중(`active`), 종료(`past`), 날짜 불일치(`date_conflict`), 중복 의심, 출발 7일 미만 일정.
- **기존 공유글 정리**: 일정과의 독립성 및 무손실이 입증되기 전까지 삭제 금지.
- **피드 콘텐츠 5편**: 무관한 일상글 5편 전문 및 CC BY 크레딧/사진 규칙 100% 보존. 월간 출발 색인은 2주 뒤 필요 시에만 별도 1편.
- **foresttour 정책 충돌**: foresttour 구 밴드 실행안은 `superseded_pending_sync` 취급 및 메인 세션 단일 실행 권위 명시.
- **외부 경계**: 외부 BAND 쓰기 및 foresttour 저장소 변경 없음. PII 기록 0.
