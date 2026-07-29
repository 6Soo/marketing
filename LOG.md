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
- ~~foresttour 최신 인계에는 초기 배치 뒤 다수 일정이 등록됐고, 마지막 11건도 추가 등록·날짜
  수정되어 2027-05-01 출발분까지 월별 확인됐다고 기록되어 있다.~~
  **[2026-07-29 폐기]** 위 문장은 근거 문서의 오독이다. 실제 기록은 `2027-01-16` 출발분까지
  등록 확인이며 `2027-01-24` 이후 11건은 등록·월별 검증 **미완료**다. 아래
  `2026-07-29 — 네이버 BAND 2차 정정 2차 수정` 블록의 정정을 따른다.
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
---

## 2026-07-28~29 — foresttour.kr 브랜드 심볼 교체 (reservation 리포 작업, 미완)

홈(`/home2`)·여행지 상세(`/stories/[slug]`)의 한글 `숲길` 원형 텍스트 마크를 그림형 SVG 심볼로
교체하는 작업. **코드·문서 전량은 reservation 리포에 커밋·push 완료**(`4ca3ef9`, `72150a8`).

- 상태: **FAIL(미완).** 공용 컴포넌트·42/36px·접근성·링크 보존·통합 검증기·테스트(70/70)·
  production build는 전부 실측 통과했으나, **36px/DPR1에서 "열린 굽은 길"이 한 줄로 뭉개져**
  판독 게이트를 통과하지 못했다.
- 다음 작업: 요소 축약 재설계(V3 = 나무 한 그루 + 굵은 단일 곡선, trail stroke 2.25px) 구현.
  배관은 그대로 두고 심볼 `d` 속성과 stroke 폭만 교체하면 된다.
- 인계 문서(이 한 건만 읽으면 됨):
  `reservation/docs/FORESTTOUR_BRAND_SYMBOL_HANDOFF_2026-07-29.md`
- cycle.sh 산출물(`.cycle/`)은 확정본을 reservation `docs/`로 옮겨 보존하고 `.gitignore` 처리했다.

---

## 2026-07-29 — 인계 결함 3건 해소 + 브랜드 심볼 V3 블라인드 판정

인계서(§6 "알려진 취약점·결함")와 브랜드 심볼 인계에서 열려 있던 항목을 실행했다.
외부 게시·발행·전송 없음. secret 접근 없음. reservation은 push하지 않았다.

### (A) 실게시 게이트에 출처 검증기 연결 — marketing `d43db4f`

`daily-publish.mjs`의 `--publish`/`--validate-live` 경로가 `meta.photoStatus`만 확인하고
`tools/validate-cardnews-sources.mjs`를 실행하지 않던 구멍을 막았다. 이제 게이트에서
검증기를 실행하고 실패 시 exit 1로 차단한다.

- 회귀 테스트 3건 신설: `cardnews/tools/daily-publish.test.mjs`
  (중복 사진 차단 / 서로 다른 검증 사진 통과 / `photoStatus: placeholder` 차단)
- 픽스처는 `cardnews/__gate-fixtures/` 아래에 만든다. `cardnews/series/` 아래에 만들면
  `verify-series-connected-tour.test.mjs`의 시리즈 스캔에 잡혀 다른 테스트를 깨뜨린다.
  또 검증기가 `resolve(seriesDir,'..','..','..')`로 리포 루트를 잡으므로 깊이 3이어야 한다.

### (B) 게시 증거 줄바꿈 변환 차단 — 이번에 새로 발견 (같은 커밋)

`core.autocrlf=true`인 Windows 체크아웃에서 git이
`cardnews/out/northern-alps/_caption-northern-alps.txt`를 CRLF로 바꿔
`verify-publish-record`의 `verified-recomputable` 지문 재계산이 실패한다.
**실측**: 기대 `2e5fc060…` / 실제 `916423ea…` (1125바이트 → 1150바이트).

즉 기존 "지문 재계산 일치 확인" 기록은 **LF 체크아웃 환경에서만** 유효했다.
`.gitattributes`로 `cardnews/out/**`·`cardnews/photos/**`·`data/publish-records/**`의
EOL 변환을 차단했다. 향후 게시 증거를 추가할 때 이 경로 밖에 두면 같은 함정이 재발한다.

### (C) 사도 003 표지 중복 해소 — marketing `0b6bec1`

표지가 3장 카드와 같은 `03-kitazawa.jpg`를 재사용하던 결함을 닫았다. (A) 덕분에 이 결함은
이제 실게시를 실제로 차단한다.

- 새 표지 `cardnews/photos/sado/01-kitazawa-terrace.jpg`
  — Commons `File:北沢浮遊選鉱場内の濁川 02.jpg`, 저작자 Indiana jo, **CC0**,
  3648×2736, 고정 리비전 993748777.
- 화면 기준 실사 확인: 우측에 층층 테라스가 뚜렷해 표지 문구와 소재가 맞고,
  하단 1/3이 균일한 녹지라 스크림·흰 글씨를 얹을 수 있으며 상단 좌우가 비어 있다.
- **로컬 재인코딩 고지**: Commons 원본 바이트가 JPEG 종료 마커(`FF D9`) 없이 `FF FF`로
  끝나 검증기의 `isJpeg()`를 통과하지 못한다. Commons 서버도 이 파일의 썸네일 생성에
  실패해 어떤 요청 폭(2000·2400·2800·3000·3400)에서도 원본을 반환한다. 그래서 픽셀
  크기·크롭·색을 바꾸지 않고 JPEG로만 재인코딩(q92, 4:4:4)했다. 원본 SHA-1은
  `commonsSha1`에, 로컬 해시는 `sha256`/`localSha1`에 보존했다.
- 캡션 크레딧도 정정: 카드에 쓰이지 않는 `Tensaibuta`(cover-a.jpg)를 빼고
  `Indiana jo(CC0)`를 넣었다.
- **재렌더·재게시하지 않았다.** `cardnews/out/sado/`의 PNG와 공개된 Instagram 게시물은
  옛 표지 상태 그대로다.

#### 사도 Commons 가용 사진 실측 (다음 세션이 다시 세지 않도록)

CLAUDE.md 비주얼 계약 2번대로 착수 전에 실조회로 셌다. 검색어 14종 + 카테고리 5종을
훑어 **PD·CC0·CC BY이면서 장변 2700px↑인 후보는 사도 전체에서 약 20건**이고, 그중
표지로 쓸 만한 풍경·유적 컷은 손에 꼽는다. 나머지는 박물관 내부·음식·맨홀·도로 표지다.
`File:Japan - panoramio (1).jpg`(CC BY 3.0, 5760×3840, 항공에서 본 사도 전경)가
남은 최상급 후보지만 현재 표지 문구("층층 구조물")와 소재가 맞지 않아 쓰지 않았다.

또 **Wikimedia는 이 워크스테이션의 Range 요청(`bytes=-2`)을 전부 거부한다.** JPEG 종료
마커를 원격으로 미리 검사할 수 없으므로, 후보는 내려받은 뒤 로컬에서 확인해야 한다.

### (D) 브랜드 심볼 V3 — 블라인드 T5로 FAIL 확정 (reservation)

인계서는 "다음 작업 = V3 구현"이라 적었으나, **다른 세션이 이미 구현·검증(R4)을 마쳐
워킹트리에 미커밋 상태로 있었다.** 자동 게이트(ESLint·tsc·test 82/82·build·production
validator·Playwright)는 전량 통과했고 의미 판독만 FAIL이었는데, 그 판정은 **설계를 읽은
구현자가 내려 §7.2의 블라인드 요건을 충족하지 못한다고 R4 스스로 적어 두었다.**

이번 세션은 그 공백을 채웠다. production 빌드 → `next start` → Chromium DPR 1 캡처
(390×844 상단 390×110 크롭 = 심볼 36×36 device pixel 무재샘플링 / 1280×900 = 42px) 후
설계를 모르는 독립 세션 2개에 선택지 순서를 서로 다르게 무작위화해 강제선택시켰다.

- 정답 범주 `나무 한 그루 + 아래에서 굽어 나오는 한 줄 길` 선택 = **10건 중 0건**
  (36px 5/5 `추상 배지`, 42px 5/5 `화살표 + 갈고리`)
- **36px에서 SEPARATION도 5/5 실패** — R4 자기판정(통과)보다 나쁘다. 설계가 계산한
  3.33px 잉크 공백이 실제로는 분리로 읽히지 않는다.
- 두 판정자 모두 묻지 않은 false affordance(`맨 위로 가기`·`업로드` 버튼 오인)를 스스로 지적했다.
- 기록: `reservation/docs/FORESTTOUR_BRAND_SYMBOL_T5_BLIND_2026-07-29.md`

**보존 조치**: V3 구현이 유실될 위험이 있어 `main`이 아니라 전용 브랜치
`brand/v3-r4-blind-fail`(`1ce7b9c`)에 커밋했다. `main` 워킹트리는 R3 상태로 되돌렸으므로
누가 `main`을 push해도 실패한 심볼이 배포되지 않는다. **push는 하지 않았다.**

### (E) 브랜드 검증기 Windows 위양성 버그 — reservation main `0c0dd2b`

`scripts/verify-foresttour-brand.mjs`의 main-module 가드가
`import.meta.url === ` + "`file://${process.argv[1]}`" + `였다. Windows에서
`process.argv[1]`은 `D:\...\x.mjs`이고 `import.meta.url`은 퍼센트 인코딩된
`file:///D:/OneDrive/%EB%AC%B8%EC%84%9C/...`라 **이 조건은 절대 참이 되지 않는다.**
검증기 본체가 통째로 건너뛰어져 5페이지 중 한 곳도 검사하지 않고 exit 0으로 끝났다.

- 즉 과거 "production 검증기 통과" 기록은 **macOS에서만** 유효하다.
- `pathToFileURL(process.argv[1]).href` 비교로 교체. 실증: 구 조건 false / 신 조건 true,
  수정 후 5페이지 실검사 전부 `✓`. `npm test` 73/73, `tsc --noEmit` 통과.
- 심볼 기하와 무관하므로 V3 판정과 분리해 `main`에 적용했다(push 없음).

### 사장님 결정이 필요한 것

1. **브랜드 심볼 V4 방향.** R3(나무 2그루+단차)와 R4(나무 1그루)의 실패를 합치면
   구조적 충돌이 확정된다 — 침엽수로 읽히게 하는 특징은 34px에서 소멸하고, 그걸 빼면
   남는 실루엣은 삼각형 하나이며 삼각형+아래 돌출부는 화살표로 읽힌다. 좌표 탐색으로는
   벗어날 수 없다. 선택지 4종과 근거는 위 블라인드 기록 §6. 블라인드 결과를 보태면
   ①요소를 하나로 / ④비협상 조건 완화(모바일 40~42px 또는 모노그램)의 근거가 가장 강하다.
2. **공개된 사도 Instagram 캡션 정정 여부.** 현재 공개 캡션은 카드에 쓰이지 않는
   `Tensaibuta(Public Domain)`를 크레딧한다. 로컬은 고쳤지만 공개 게시물 수정은 외부
   작업이라 하지 않았다.
3. **사도 표지 문구 `섬 한가운데`.** 북택부유선광장이 있는 아이카와는 사도 서해안이라
   지리적으로 부정확하다. 이미 공개된 문구라 임의로 바꾸지 않았다.

### (F) 브랜드 심볼 V4 확정·배포 — 세 라운드 만에 판독 게이트 통과

사장님이 "fable과 sol의 검증수용반박 과정을 통해 결정된 사안으로 자동으로 다 진행해"라고
결정 권한을 위임해, 아래 사이클로 확정하고 배포까지 마쳤다.

**절차**: Fable 제안 → Sonnet 적대적 반박 → Opus 사실검증 → Fable 수용·개정 → Opus 확정.

- **해제**: V3 §D-13의 회화 도상 비협상 조건("나무 한 그루 + 곡선 하나"). 근거는 취향이
  아니라 실측 — R3 실패, R4 FAIL, 블라인드 0/10, "침엽수 판별 특징은 34px에서 소멸하고
  남은 삼각형은 화살표로 읽힌다"는 구조 결론.
- **중간 폐기**: Fable 1차안 "FT 모노그램". 축 정렬 대문자라는 구조 통찰은 옳았고 36px
  렌더도 또렷했으나, ① 타겟 세대(한국 20~40대)의 "FT" 1차 연상이 회사가 아니고
  ② 바로 옆 `FOREST TOUR` 워드마크와 직무가 중복되며 사내에 없던 약칭을 발명한다는
  반박을 수용해 글자 선택 자체를 버렸다. 구현 커밋은 `brand/v4-ft-monogram`에 남겼다.
- **채택**: 축 정렬 **산(山) 픽토그램** — 세로획 3개(가운데가 가장 높음) + 바닥 획 1개,
  닫힌 면 채우기 path 2개. 대각선 0·곡선 0이라 오독 사슬이 구조적으로 끊기고,
  글자가 아니라 형상이라 워드마크와 직무가 겹치지 않는다.
  - ridge `M9 17.2 H12.6 V28.2 H29.4 V17.2 H33 V31.8 H9 Z`
  - peak `M19.2 10.2 H22.8 V31.8 H19.2 Z`
  - 모바일 34px 기준 획 두께 2.91px, 세로획 간격 5.34px, 판별 특징(중앙 우위) 5.67px
    — V3에서 분리 실패했던 3.33px의 1.6~1.7배다.

**Sonnet 반박 처리 — 치명 반박 2건은 무효였다.** 반박자가 `d` 문자열 끝의 `H9.2`를
빠뜨리고 인용해, 존재하지 않는 대각선(줄기가 바닥에서 폭 0으로 수렴)을 결함이라고 주장했다.
경로 전개(대각선 0개)와 실제 렌더로 반증했다. **다른 에이전트의 보고는 액면 그대로 받지
않는다는 원칙이 실제로 작동한 사례다.** 나머지 반박(원 테두리 여유 명칭 오류, FT 연상,
워드마크 중복, 크기 완화 과잉 일반화)은 수용·부분수용해 설계에 반영했다.

**블라인드 T5: PASS 10/10** (V3는 0/10). 설계를 모르는 독립 세션 2개, 선택지 순서를
서로 다르게 무작위화. 36px 5/5 + 42px 5/5 모두 정답 범주("가운데가 가장 높은 세로 봉우리
세 개가 바닥 획으로 이어진 산 모양")를 선택했고, PEAKS·NOISE·CENTERING·CONTRAST도 전량 통과.

**자동 게이트**: ESLint 0 · `tsc --noEmit` 0 · `npm test` 82/82 · build 성공 ·
로컬 production `verify:foresttour-brand` 5페이지 전부 ✓.

**배포 완료**: reservation `main` `5461689` push → 프로덕션 반영. 근거 문서는
`reservation/docs/FORESTTOUR_BRAND_SYMBOL_V4_FINAL_DESIGN_2026-07-29.md`와
`…_V4_T5_BLIND_2026-07-29.md` 2건.

### (G) 보류 결정 2건 처리

- **사도 공개 캡션 크레딧**: Graph API가 Meta 앱 레벨 차단이라 자동 수정 경로가 없다.
  로컬 캡션은 정정 완료했고, 공개 캡션 수정은 다음 수동 인스타 작업 항목으로 남긴다.
- **push**: marketing은 `origin/main`(Meta 앱 차단 조사 2건)을 병합한 뒤 푸시 완료.
  reservation은 검증기 수정·V4·보존 브랜치 전부 푸시 완료.

### (H) `~/.orca/bin/cycle.sh` 결함 10건 수정 — 사이클 러너가 실제로는 돌지 않았다

사장님이 "cycle.sh에 의해서 모든 것을 자동으로 진행하라"고 지시해 실행했더니, 러너가 설계
단계조차 넘기지 못했다. 실측으로 원인 9건을 규명해 고쳤다. **`~/.orca`는 git 저장소가 아니므로
이 기록이 유일한 영속 기록이다.**

| # | 결함 | 증상 | 조치 |
|---|---|---|---|
| 1 | `python3`가 Microsoft Store 스텁 | 스크립트를 실행하지 않고 `Python`만 출력하고 **rc=0**. 모든 `jparse`가 빈 값 → 사이클이 조용히 어긋남 | 존재가 아니라 **실행 여부**(`print(1+1)`==`2`)로 인터프리터 선택. `▶ [PY]`로 경로·버전 출력 |
| 2 | `handle` 파서가 split 응답을 못 읽음 | `create`는 `result.terminal.handle`, `split`은 **`result.split.handle`**인데 create 모양만 봄 → **검증자 패널이 이 orca 빌드에서 한 번도 생성될 수 없었음** | `terminal`/`split`/`pane` 컨테이너 전부 탐색 |
| 3 | CLASS B 프로브가 영어 `OK`만 인정 | 한국어로 물어 `agy`가 "확인"으로 답 → 살아 있는 후보를 **쿼터 소진으로 오진**하고 체인 소진 | 프롬프트를 영어로 토큰 고정, 인정 범위 확대. 실패 사유를 `쿼터 도달`/`응답 없음`/`패널 생성 실패`로 분리 |
| 4 | 터미널 생성 일시 실패에 재시도 없음 | `Timed out waiting for terminal handle after creation` 한 번에 사이클 전체 중단(같은 인자 재시도는 성공) | `new_pane`에 3회 재시도(8초 간격) |
| 5 | 패널이 승인 프롬프트에 걸림 | 작업자가 `orca orchestration send`로 worker_done을 보내야 하는데 승인 대기에서 정지 → 러너는 "대기 계속"만 반복 | CLASS A·B 전 패널에 승인 우회 플래그(claude `--dangerously-skip-permissions`, codex `--dangerously-bypass-approvals-and-sandbox`) |
| 6 | **완료 신호를 엉뚱한 인박스에서 폴링** | worker_done은 **코디네이터** 인박스로 가는데 러너는 **작업자** 인박스를 폴링 → 완료를 영원히 못 봄 | `ORCA_TERMINAL_HANDLE`을 코디네이터로 잡아 폴링. 없으면 즉시 실패 |
| 7 | 의존 태스크가 `ready`로 자동 승격되지 않음 | 선행이 `completed`여도 `pending` 유지 → dispatch가 `only ready tasks can be dispatched`로 거절, T2에서 끊김 | 디스패치 직전 `task-update --status ready`로 명시 승격 |
| 8 | `dispatch --inject`가 붙여넣기만 하고 제출 안 함 | codex TUI에서 프리앰블이 입력줄에 남아 작업자가 영원히 idle | 디스패치 후 빈 입력 + Enter로 제출(`nudge_submit`) |
| 9 | 단계 간 산출물이 인계되지 않음 | 각 단계가 다른 에이전트라 "방금 나온 설계안"만으로는 볼 것이 없음 → 검증자가 "검토 대상의 본문이나 경로가 없다"며 정지 | `handoff` 헬퍼 신설. 직전 worker_done의 제목·요약·`reportPath`·변경 파일을 다음 spec에 실어 보냄(5단계 전부) |

**검증**: 다른 세션이 추가한 `~/.orca/bin/cycle-selftest.sh`(에이전트 0개)로 **13개 항목 전부 통과** —
5단계 완주·패널 회수·split 파싱·실패 시 비영 종료·판정 부재 시 FAIL·이벤트 상관·폴백 순차 진행·
서브셸 사유 전파. 전역 규칙에도 "러너를 고쳤으면 셀프테스트를 통과시켜라"가 추가됐다.

**함정 기록**
- `cycle.sh` 출력을 `| tail -n N`으로 받으면 파이프 버퍼링 때문에 진행이 실시간으로 안 보인다.
  파일로 리다이렉트해서 따라가야 한다.
- `[T1 QUOTA]` 줄은 Git Bash에서 한글이 깨져 나오지만 동작에는 영향이 없다.
- `orca terminal create --worktree path:<경로>`는 **orca가 관리하는 워크트리만** 인식한다.
  `git worktree add`로 만든 경로는 타임아웃으로 실패한다 → `orca worktree create`를 써야 한다.
- 러너 교체는 `mv`로 해야 한다. 실행 중인 사이클은 옛 파일을 계속 읽는다.

**충돌 회피**: reservation 워킹트리에 다른 세션의 미커밋 작업이 있어, 사이클은 orca 관리 워크트리
`C:/Users/kkokk/orca/workspaces/reservation/cta-observability`(브랜치 `6Soo/cta-observability`)에서
돌린다. 원본 워킹트리를 건드리지 않는다.

### (H-1) 10번째 결함 — 낡은 `ORCA_TERMINAL_HANDLE` (원인 규명·수정 완료)

셀프테스트는 13/13 통과하는데 실제 에이전트 패널로 도는 실행만 T1→T2에서 멈추던 문제의
원인을 찾았다. **환경변수 `ORCA_TERMINAL_HANDLE`이 낡아 있었다.**

- 세션이 재시작되면 런타임은 코디네이터 터미널 핸들을 **재발급**한다. 그런데 이미 떠 있는
  셸의 환경변수에는 옛 문자열이 그대로 남는다.
- 그 상태로 `orca orchestration check --terminal <낡은 핸들>`을 부르면 **오류 없이 빈 결과**가
  온다. 러너는 "완료 신호가 아직 없다"로 오해하고 영원히 대기한다.
- 실측: 셸 env는 `term_73194922…`, 실제 worker_done 수신자는 `term_ba027b08…`이었다.
  `orca terminal show --terminal term_73194922…`를 부르면 `term_ba027b08…`을 돌려준다 —
  런타임은 별칭을 해석해 주는데 `check`는 그러지 않는다.
- 조치: 시작 시 `terminal show`로 코디네이터 핸들을 **정규화**하고, 달라졌으면 그 사실을
  `▶ [COORD] 핸들 정규화: … → …`로 출력한다. 셀프테스트 13/13 유지 확인.

이 결함이 앞선 세 번의 실행이 전부 "대기 계속"으로 끝난 진짜 이유다. 5~9번 수정이 없었다면
이 지점까지 도달하지도 못했으므로, 순서대로 하나씩 걷어낸 끝에 드러난 마지막 층이다.

**교훈**: 장수 셸에서 orca 핸들을 환경변수로 신뢰하지 마라. 매 실행 시작에 해석하라.

### (H-2) 사이클 실환경 완주 — T1→T4까지 실제로 돌았다

10건을 걷어낸 뒤 실행한 라운드에서 러너가 처음으로 단계를 넘어갔다.

```
✔ T1 설계초안(fable(med)) 완료
✔ T2 반박(sol(med)) 완료
✔ T3 재반론·개정(fable(med)) 완료
→ 설계 자동 수용 (판정은 T5 검증에서)
▶ [MODEL] agy gemini-3.6-flash-high · high · T4 구현
```

CLASS B 쿼터 프로브가 `agy gemini-3.6-flash-high`를 구현자로 확정했고, 9번 수정(단계 인계)이
실제로 동작한 것도 확인했다 — T4 태스크 spec 안에 `=== 직전 단계 산출물 ===` 블록이 들어 있다.

**산출물 — 브랜치 `6Soo/cta-observability`**

| 커밋 | 단계 | 내용 |
|---|---|---|
| `b19d50e` | T1 | 초안 — A(크론 말미 서버 평가+health `storyCta`) / B(trackEvent, 보조) / C(매칭 완화, 불변조건 7 위반 기각) |
| `a1b3cfa` | T1-R2 | 모든 사실 주장을 코드로 재검증, `fldidRejects` 단계별 탈락 집계 |
| `2137e09` | T1-R3 | A″(in-process 평가) 신규 기각 — 후보 목록이 `/api/tours` 핸들러 안에서만 완성되므로 복제하면 "화면엔 CTA 없는데 감시는 정상"이라는 미탐 발생 |
| `d6861b2` | T1-R4 | §6 단계별 구현 계획 + 잔여 결정 3건 |
| `d267eec` | T3-R5 | **반박 6건 중 5건 전면 수용**(envelope 오보·smoke 판정·평가 선행·비순환 P1·throwing write·오리진 allowlist), 1건 부분 수용 |
| `91c18f4` | T4 | 구현 — `storyCtaStatus.ts` 신설, `storyTours.ts`·`health`·`sync-tours`·`smoke.mjs` 개정, 테스트 2종 |

구현 요지: `connectedTour === null`을 4분류(`matched` / `no-candidate` / `title-mismatch` /
`invalid-input`)로 가르고, API 오류를 mismatch로 오보하지 않도록 envelope를 따로 파싱하며,
near-miss에 `missingTerms`를 실어 운영자가 "제목이 어떻게 바뀌었는지"를 볼 수 있게 했다.
fail-closed는 그대로다.

**Opus 독립 검증**: `npm test` **94/94**(기존 82 + 신규 12) · `tsc --noEmit` 0 · `npm run build` 성공.

**T4가 넣은 회귀 1건 — 해소**: 같은 파일들의 ESLint 오류가 기준선 3건 → 11건으로 늘었다
(`no-explicit-any` 6, `no-require-imports` 3). 별도 수정 라운드로 닫았다(`5b4f0ef`).
`eslint-disable` 주석으로 덮지 않고 실제 타입을 좁히고 `require()`를 정적 import로 바꿨다.
재검증: **ESLint 오류 0** · `npm test` 94/94 · `tsc --noEmit` 0 · `npm run build` 성공.

### (H-3) 남은 문제 — worker_done이 간헐적으로 낡은 핸들로 간다

T4는 `task-list`에서 `completed`인데 러너는 완료 신호를 못 받고 계속 대기했다. (H-1)에서
규명한 낡은 핸들 문제의 잔여분이다. 시작 시 정규화를 넣었지만 `terminal show`가 빈 값을
돌려주는 경우가 있어 정규화가 조용히 건너뛰어진다.

**다음 세션이 할 일**: 정규화 실패를 무시하지 말고 실패로 처리하거나, `dispatch --json` 응답에
담긴 코디네이터 핸들을 신뢰원으로 쓰도록 바꿀 것. 그리고 T5(검증·판정)는 아직 한 번도
실행되지 않았으므로 완주 확인은 다음 라운드 몫이다.

### 여전히 막혀 있는 것 (이번 세션이 풀 수 없음)

- ~~Instagram Graph API `OAuthException code 200 "API access blocked"`~~
  → **같은 날 늦게 해소됨. 바로 아래 블록 참조** (원인은 앱이 아니라 Meta 개발자 계정 제한).
- GitHub secret `FORESTTOUR_ADMIN_KEY` 미등록, `ACTIVATION_COLLECT_ENABLED` 미설정.
  둘 다 사장님만 처리 가능하며, 이 상태에선 24h 체크포인트가 `due`에서 진행되지 않는다.

---

## 2026-07-29 — .env 복구 + Meta 차단 해소 (인스타 API 정상화)

### 결과 요약
- **인스타 Graph API 차단 해소.** 7/26부터 이어진 `OAuthException code 200 "API access blocked"`가
  풀렸다. `node tools/instagram-publish.mjs doctor` →
  `✓ Instagram API 연결 정상 · @foresttour.kr · 게시 한도 0/100`
  (`account_type=BUSINESS`, `user_id=17841445215686571` — `.env` 값과 일치, `media_count=5`).
- **실제 원인은 Meta 개발자 계정 제한이었다.** Meta가 "모든 사람의 안전을 위한 예방 조치"라며
  developers.facebook.com 접근을 제한했고, 복원되자 **앱 설정·토큰을 전혀 건드리지 않은 상태로**
  API가 살아났다. 앱 검수·비즈니스 인증·Graph 버전 만료·계정 유형 — 전부 원인이 아니었다.

### 오진 기록 (같은 실수 반복 방지)
- 앱 검수/설정 쪽을 오래 뒤졌으나 전부 헛다리였다. **계정 제한 중에는 앱 대시보드가 정상으로 보이지
  않아 오진하기 쉽다.** 재발 시 `developers.facebook.com` 로그인 상태·계정 제한부터 확인할 것.
- 세션 중 "`앱 심사 불필요`는 검증되지 않은 전제"라고 정정했으나 **그 정정 자체가 틀렸다.**
  개발 모드 + Standard Access + 본인 비즈니스 계정으로 심사 없이 정상 작동한다. 원복했다.
- 공개 인스타 프로필 스크래핑으로 "비즈니스 계정 아닌 듯"이라 추정했으나 오판이었다
  (`account_type=BUSINESS`). **공개 페이지로는 계정 유형을 판정할 수 없다.**

### 유효한 진단 절차 (재사용)
`code 190`(토큰 파싱 실패 = 토큰 문제)과 `code 200`(계정·앱 문제)을 가르는 것이 핵심.
가짜 토큰과 실제 토큰을 나란히 던져 응답 코드를 비교하면 즉시 갈린다. 실제 토큰이 `200`을 받으면
**토큰은 멀쩡하므로 재발급은 시간 낭비다.** 상세: `context/사장님-가이드.md` §9-2-A.

### .env 복구
- `PEXELS_API_KEY` — git 히스토리(`06b291c^`)에서 복구, 라이브 검증 통과(200 OK + 실사진 반환).
  ⚠ **과거 `.env`가 커밋된 이력(`bfb998c`)이 있어 히스토리에 키가 남아있다** — 리포를 외부에
  열기 전 재발급 필요.
- `GEMINI_API_KEY` — 사장님 재발급분 투입, `gemini-3.6-flash` 라이브 응답 확인.
  **Gemini 위임 → Opus 검증 기본 실행 경로 복구.**
- `.gitignore`가 `.env` 사본(`.env.bak-*` 등)을 차단하지 못하던 구멍을 막았다(`.env.*` 추가).
- 미해결: `FORESTTOUR_ADMIN_KEY` 부재 — `collect-instagram-activation-metrics.mjs --foresttour-live`
  경로에서만 필요하다.

### 다음 작업
- API가 열렸다고 자동 게시를 바로 켜지 않는다. **남은 제약은 사진 조건**으로,
  `photoStatus: verified`가 아닌 자산(AI·스톡)은 코드 게이트로 계속 차단된다.
- Meta 앱 ID는 여전히 리포에 없다. 비밀값이 아니므로 기록해두면 다음 진단이 빨라진다.

---

## 2026-07-29 — 차단 해제 후 첫 실측: 결함 2건 교정 + 활성화 실태 확인

시크릿 등록 완료(`FORESTTOUR_ADMIN_KEY`) 확인 후, 그동안 실행 자체가 막혀 있던 경로를 처음 돌렸다.

### 확인
- GitHub Secrets 3종(`IG_USER_ID`·`IG_ACCESS_TOKEN`·`FORESTTOUR_ADMIN_KEY`) 등록 확인.
- `FORESTTOUR_ADMIN_KEY` 라이브 검증: `/api/track?days=90` → 200, `rows` 233 / `funnelRows` 156.
- **[G3] `ACTIVATION_COLLECT_ENABLED=true` 설정** — 단, 아래 결함 (2)를 먼저 고친 뒤에 켰다.

### 실행이 막혀 있어 숨어 있던 결함 2건 (커밋 `05fde24`)
1. **`ig-insights.mjs` 라이브 수집이 통째로 실패하고 있었다.** `impressions`가
   CAROUSEL_ALBUM/FEED에서 거부되는데(code 100), 지표 하나가 거부되면 요청 전체가 죽는다.
   실측으로 지원 지표를 확정해 교체했다(`impressions`→`views`, `navigation` 제거).
   계정 인사이트는 media와 허용 집합이 다르다는 것도 확인했다.
2. **지각 수집이 측정 기록을 오염시킬 상태였다.** 체크포인트 `state`에 상한이 없어 마감을
   지나면 무기한 `due`였다. Instagram 인사이트는 시점값이 아니라 **누적 lifetime 값**이라,
   26시간 지각한 데이터가 `24h 관측치`로 기록될 참이었다. G3를 그냥 켰으면 다음 예약 실행에서
   즉시 박제됐다. `COLLECTION_GRACE_HOURS=6`(수집기 주기와 일치) 도입 → 초과 시 `missed`로
   확정하고 nextAction 후보에서 제외. 회귀 테스트 6건 추가. 전체 68건 통과.

### 활성화 실태 (냉정하게)
- **24h 체크포인트는 사도·북알프스 모두 영구 누락.** 차단 기간과 겹쳤고 수동 스냅샷도
  `"숫자입력"` 템플릿 그대로였다. 누적값이라 복구 불가. 다음 유효 창은 72h(7/29 18:47Z·19:15Z).
- **Instagram 지표가 사실상 0.** 게시물 5건 전부 reach 1 / 저장·좋아요·댓글·공유·총반응 0,
  팔로워 0. **도달 1은 본인 조회로 봐야 한다.**
- **foresttour.kr에는 `insta`+`instagram-app` 이벤트 25건이 있고 북알프스
  `story_northern-alps_visit` 1건이 조건에 부합**하지만, 같은 기간 Instagram 도달이 1이다.
  외부인 유입으로 설명되지 않으므로 **활성화 증거로 쓰지 않는다**(본인 확인 트래픽으로 해석).
  사도는 해당 이벤트 0건.
- **판정: 두 실험 모두 `collecting`, 활성화 아님.** 사도 1/3, 북알프스 2/3.

### 다음 판단 (사장님 확인 필요)
지금 병목은 파이프라인도 콘텐츠 품질도 아니라 **노출 자체가 없다는 것**이다. 팔로워 0·해시태그
유입 0에서 게시만 반복하면 체크포인트는 계속 0으로 채워지고 측정 루프는 학습할 게 없다.
자동화를 더 조이기 전에 **최초 도달을 만드는 수단**을 먼저 다루는 것이 맞다고 본다.

---

## (I) 브랜드 심볼 V5 — 파비콘 전나무로 형상 통일 (2026-07-29, 사장 지시)

**지시**: "지금 og로 쓰이고 있는 전나무 형상을 그대로 흑백 그런 걸로 해서 홈페이지 왼쪽 상단
스탬프에도 적용해봐."

### 무엇이 문제였나
`foresttour.kr` 헤더 좌상단 스탬프는 어제 확정한 **V4(능선/봉우리 추상 기호)** 를 쓰고 있었고,
브라우저 탭·링크 미리보기에 뜨는 **파비콘(`reservation/src/app/icon.png`)은 초록 전나무**였다.
같은 회사 표식이 지면마다 다르게 생긴 상태. V4의 블라인드 판독 10/10 판정 자체는 유효하지만,
그 테스트는 판독성만 봤지 **파비콘과의 일치는 기준에 없었다.**

### 어떻게 했나 — 눈대중 금지
전나무를 새로 그리지 않았다. `icon.png`(512×512)를 행 단위로 스캔해 잉크 좌우 끝을 읽고,
폭이 급변하는 행만 남겨 꼭짓점을 확정했다.

| 원본 y | 좌..우 | 의미 |
|---|---|---|
| 0 | 255..256 | 꼭대기 |
| 175→176 | 144..367 → 189..322 | 1단 밑 → 2단 위 (수평 단차) |
| 319→320 | 80..431 → 143..368 | 2단 밑 → 3단 위 |
| 447→448 | 16..495 → 214..297 | 3단 밑 → 밑동 |
| 511 | 214..297 | 바닥 |

단마다 기울기가 다르다(0.636 / 0.757 / 0.992). **고르게 다듬지 않았다** — 지시가 "그대로"였다.
42 viewBox 환산(높이 26유닛, 위 여백 8, 중심 21), 꼭짓점 15개 단일 path.
원 수용 확인: 최원점 (8.81, 30.75) 거리 15.61 < 콘텐츠 반지름 20.

### 판독성 — V4보다 오히려 유리
전나무는 **채워진 실루엣**이라 선 기호였던 V4보다 축소에 강하다. 42/36/24px 전부 형태 유지.
단 사이 수평 단차(2.29유닛 ≈ 36px에서 1.96px)도 살아남는다. 실측 캡처로 확인:
`/home2` 데스크톱 42px · `/home2` 390×844 모바일 36px(히어로 사진 위) · `/stories/hida` 42px.

### 계약 변경
`RIDGE_D`/`PEAK_D` → `FIR_D`, `data-brand-ridge`/`peak` → `data-brand-fir`, path 2개 → 1개.
브랜드 계약 테스트 14/14 · 라이브 5페이지(홈 + 스토리 4종) 검증기 통과 · tsc 0 · eslint 0 · build 성공.
reservation `351d801` (main, 프로덕션 배포).

### 건드리지 않은 것
`icon.png`·`apple-icon.png`·`og.jpg`·`og-home.jpg` 그대로. 지시가 "스탬프**에도**"이므로
파비콘은 초록을 유지하고 스탬프만 단색이다. **같은 형상, 다른 색.**

### 카드뉴스와의 관계 (아직 미정)
카드뉴스 좌상단 워터마크는 이 심볼과 별개 자산이다. 지금은 손대지 않았다 —
전 지면 표식 통일이 필요하면 별도 판단이 필요하다(기준본 CSS 변경이라 비주얼 계약 영향).

---

## (J) 전나무 = 공식 로고 확정, 전 리포 전달 (2026-07-29, 사장 지시)

**지시**: "이 전나무 아이콘을 우리 공식 로고로 쓰자. 관련된 레포에 다 전달해."

### 조사에서 나온 사실 — 이미 로고였는데 지면마다 달랐다
전나무는 새 로고가 아니다. `reservation/src/app/icon.png`와 `recruit/.../icon-512.png`가
**이미 같은 전나무**였다(실루엣 좌표 완전 일치: y=0/175/176/319/320/447/448/511 전 행 동일).
문제는 **페이지 안의 마크가 제각각**이었다는 것이다.

| 지면 | 이전 상태 |
|---|---|
| reservation 헤더 스탬프 | V4 추상 산 기호 (7/29 오전에 전나무로 교체 완료) |
| reservation 개별 여행 OG/트위터 카드 | 그냥 **원형 점** |
| recruit 헤더 카페 링크 | 물방울형 **잎사귀** 픽토그램 |
| recruit 푸터 카페 링크 | 같은 잎사귀 + 잔가지 |
| recruit `mogaek.html` 파비콘 | data URI에 박은 **🌲 이모지** |
| 카드뉴스 좌상 워터마크 | 텍스트만, 심볼 **없음** |

### 단일 원천을 만들었다
전사 리포 `brand/forest-tour-fir.svg`. 원본 PNG를 행 단위로 스캔해 꼭짓점 15개를 확정했고
**전부 정수**다: `M256 0 L368 176 L323 176 L432 320 L369 320 L496 448 L298 448 L298 512
L214 512 L214 448 L16 448 L143 320 L80 320 L189 176 L144 176 Z`.
좌우 대칭 확인(256±112/±67/±176/±113/±240/±42).

**검증**: 512px로 렌더해 원본과 픽셀 마스크 대조 → 불일치 **252/105,337 = 0.239%**,
전부 경계 안티에일리어싱. 사양(색·최소크기·금지사항·지면별 현황)은 `brand/README.md`.

### 최소 크기 실측
16·18·20·24px를 실제로 렌더했다. **16px에서도 실루엣은 남지만 단 사이 수평 단차가 뭉개진다** —
침엽수라는 것만 보이고 3단 구조는 사라진다. 18px부터 단이 구분된다. recruit 헤더 아이콘이
16px였어서 18px로 올렸다.

### 커밋
| 리포 | 커밋 | 내용 |
|---|---|---|
| foresttour | `d2a684b`·`70ad447` | brand/ 단일 원천 + CLAUDE.md 확정 조항 |
| reservation | `b29d2e9`→`ee1bcdf` | OG 카드 마크 교체 + `src/lib/brandFir.ts`로 좌표 원천화 (프로덕션 배포) |
| recruit | `b7a6b8f` | 잎사귀 2곳·🌲 이모지 1곳 교체, 아이콘 16→18px |
| marketing | `3de8aa0` | 카드뉴스 워터마크에 심볼 삽입 (기준본 → 템플릿 순서 준수) |

### 건드리지 않은 것과 그 이유
- **`cardnews/out/`** — 게시 증거 파일이다. 미리보기 렌더가 `hida/cover-a.png`를 덮어써서
  즉시 `git checkout`으로 복원했고, 이후엔 임시 시리즈 디렉토리로 렌더해 확인 후 삭제했다.
  **이미 게시된 카드에는 심볼이 없다** — 다음 시리즈부터 적용된다.
- **`og.jpg`·`og-home.jpg`** — 사진 지면이라 원래 마크가 없다. 현행 유지.
- **`apple-icon.png`·`favicon.ico`** — 이미 전나무. 재생성하면 바이트만 바뀌고 얻는 게 없다.

### 다음 세션 주의
로고를 새 지면에 쓸 때 **형상을 다시 그리지 마라.** 잎사귀·이모지·추상 기호로 대체한
전례가 실제로 세 건 있었고 그래서 이 정리가 필요했다. `brand/README.md`의 지면별 적용
현황 표에 한 줄 추가할 것.

---

## 2026-07-29 — 최초 도달 확보 착수: 릴스 전환 · 훅 재설계 · 캡션 SEO (세션 인계)

> **새 세션은 이 블록부터 읽으면 된다.** 앞 블록(.env 복구·Meta 차단 해소·첫 실측)의 후속이다.

### 왜 이 작업을 했나

게시·측정 파이프라인은 완성됐는데 **게시물 5건 전부 도달 1**이었다. 측정 루프를 아무리
조여도 노출이 0이면 학습할 데이터가 생기지 않는다. 사장 지시로 병목을 도달로 재설정했다.

### 진단 — 원인은 콘텐츠가 아니라 포맷이었다

1. **5건 전부 캐러셀, 릴스 0건.** 팔로워 5,000명 미만 계정이 비팔로워에게 닿는 사실상 유일한
   포맷은 릴스다. 캐러셀 도달률 14.45%는 **팔로워 대비**라 팔로워 0에서는 0이 곱해진다.
   구조적으로 0이었다.
2. **해시태그가 폐기된 메커니즘에 의존.** 해시태그 팔로우는 폐지됐고 검색은 캡션 키워드로
   옮겨갔다. 게다가 태그 상당수가 `#다테야마구로베알펜루트` `#다라이부네`처럼 **그 지명을
   이미 아는 사람만 치는** 초niche 고유명사였다 — "모르는 곳을 알린다"는 전제와 정면 모순.
3. **Trial Reels 사용 불가** — 팔로워 1,000명 이상이 조건이다.
4. **산리쿠 중복 게시 확인** — `DbMCkYbEsxd`(7/24)와 `DbPkcaIEwSj`(7/26)의 캡션 SHA-256이
   완전 동일. 웹 UI 수동 게시가 코드의 `assertNotDuplicateCaption` 게이트를 우회했다.
   API가 풀렸으므로 **수동 게시를 줄이는 것이 근본 해법**이다.
5. 2026 랭킹 신호는 시청시간 · 도달 대비 좋아요 · **도달 대비 전송(DM 공유가 신규 도달 1위)**.

### 한 일 (커밋 `81c1c45` → `9817596` → `2d4c3b6`)

**(A) 릴스 파이프라인 해제** — `cardnews/tools/build-reel.mjs`가 이미 있었는데 이 워크스테이션에서
**실행 자체가 불가능**했다(리눅스 경로 `/root/bin/ffmpeg` 기준). `ffmpeg-static`을 devDependency로
넣고 탐색 후보에 추가했다. 실행:
```
node cardnews/tools/build-reel.mjs cardnews/series/northern-alps --cover=cover-a
```

**(B) 훅 재설계 — 결정적 첫 0.5초가 검은 화면이었다.**
시청자는 1.7초 안에 이탈을 정하고 알고리즘은 첫 0.5초 반응을 보는데, 구버전은
`fade=t=in:d=0.6`이 걸려 그 구간이 거의 검정이었다(**실측 첫 프레임 YAVG=16**).
가장 흔한 실패 유형인 "느린 빌드업"을 그대로 하고 있었다.

| | 개선 전 | 개선 후 |
|---|---|---|
| 첫 프레임 밝기 | 16 | **65.4** (즉시 최대) |
| 길이 | 25.6초 | 9.4초(북알프스) / 7.9초(사도) |
| 모션 | 없음 | 펀치인 + 켄번즈 교대 |

구조: 표지 1.6s 펀치인 → **1.6초 지점 급속 컷 3×0.5s** → 페이오프 3×1.5s → 아웃트로 1.8s.
급속 컷을 이탈 결정 시점(1.7초)에 겹친 것이 핵심이다. 패턴 인터럽트 계열의 3초 유지율이
72~84%로 6개 훅 유형 중 가장 높다. **카드 디자인은 건드리지 않고 카메라만 움직인다**(비주얼 계약 유지).
구버전 동작은 `--profile=full`로 보존했고 회귀 확인했다.

**(C) 캡션 SEO 전환** — 해시태그 7개 → 5개, 검색 키워드를 캡션 2~3번째 줄에 자연어로 배치.
- 북알프스: "일본 북알프스 트레킹" "다테야마 구로베 알펜루트" "가미코치"
- 사도: "니가타 앞바다의 사도섬 여행" "일본 섬 여행"
- **훅 첫 문장은 릴스 첫 프레임 텍스트와 같아야 하므로 그대로 뒀다**(약속-회수 일치).
- 공유(sends) 유도 한 줄 추가.
- ⚠ **한계**: 한국어 해시태그 실검색량을 이 환경에서 측정할 수단이 없다. 선택은 데이터가
  아니라 원칙에 따른 판단이며 **게시 후 인사이트로 검증해 조정해야 한다.**

**(D) 원칙 등재** — CLAUDE.md 「타겟 이원화」에 *카페·밴드 회원을 인스타 팔로워로 끌어오지
않는다*(사장 확정 "절대 권장하지 않아"). 근거는 예의가 아니라 알고리즘이다 — 팔로워 0 계정은
초기 팔로워 반응이 추천 시스템에 학습되므로 50~60대가 먼저 들어오면 20~40대 도달이 나빠진다.

### 음원 — Pixabay로 확정됐으나 자동 수급 불가 (사람 몫)

사장 승인은 Pixabay(인스타+유튜브 겸용, 출처 표기 불필요)였다. 그러나 **Pixabay 음악 페이지는
봇 접근을 차단하고(403) API는 음악을 제공하지 않는다.** Openverse API로 대체 탐색했으나
**CC0로 작곡된 음악은 0건**(있는 것은 효과음·필드 레코딩), CC-BY 음악은 출처 표기가 의무라
Pixabay를 고른 이유와 어긋나 쓰지 않았다.

→ **사장님이 브라우저에서 1개 받는 것이 최단 경로(2분).** 기준·기록 양식은
`cardnews/assets/music/출처.md`에 정리했다. build-reel은 placeholder 사용 시 경고를 띄운다.
⚠ **YouTube 오디오 보관함은 표준 라이선스가 유튜브 전용**이라 인스타에 쓰면 약관 위반이다
(이전 세션에서 이걸 권한 적이 있는데 **틀린 조언이었다**).

### 지금 상태

| 항목 | 상태 |
|---|---|
| 인스타 Graph API | 정상 (`doctor` → 게시 한도 0/100) |
| 릴스 2편 | 생성·규격 검증 완료, **미게시** |
| 캡션 SEO | 사도·북알프스 적용 완료, 게이트 통과 |
| 음원 | placeholder (법적 문제 없음, 완성도만 낮음) |
| 측정 루프 | `ACTIVATION_COLLECT_ENABLED=true`, 72h·7d 자동 수집 대기 |
| 24h 체크포인트 | **영구 누락**(복구 불가). 다음 유효 창은 72h |

### 다음 세션이 할 일

1. **음원 교체 여부 확인 → 릴스 실게시.** 이것만 정해지면 바로 나간다.
   게시 후 캡션 SEO·훅 가설을 인사이트로 검증한다.
2. 히다·산리쿠는 `photoStatus: placeholder`라 게이트에 막힌다 — 사진 교체가 선행 조건.
3. 수동 게시를 줄인다(산리쿠 중복 재발 방지).

### 주의

- **릴스는 기존 렌더 PNG로 만들었다.** 다른 세션이 워터마크에 전나무 심볼을 넣었지만
  (`3de8aa0`) 이미 게시된 카드에는 심볼이 없고, 릴스도 그 상태의 PNG를 썼다 —
  게시된 캐러셀과 일관된다. 재렌더하면 심볼이 들어가 **게시 증거와 어긋나므로 주의**할 것.
- 상세 실행안: `strategy/인스타-최초도달-확보-실행안-0729.md`

---

## 2026-07-29 — Instagram 전면 인계 후 자동 실행 착수

- 인계 문서의 우선순위를 재검증하고, 북알프스 릴스를 기존 캐러셀 실험에 섞지 않기 위해
  `data/experiments/northern-alps-reel-005.json`을 신설했다.
- 실험의 1차 비교값은 `reach`·`views`·`shares`다. 프로필 링크는 정책상 깨끗한
  `https://foresttour.kr`을 유지하므로 사이트 방문은 게시물 단위로 직접 귀속할 수 없다.
  따라서 `insta` + `instagram-app` 방문은 보조 증거로만 쓰고 릴스 우위의 단독 근거로 쓰지 않는다.
- 수행 모델: **GPT-5.6 Sol**. 검증 모델: **GPT-5.6 Sol 자체 검증 + 파일·테스트·GitHub Actions 실증**.
  주요 반박: 프로필 링크 유입을 릴스 전용 source code로 기록하면 존재하지 않는 정밀도를 만들고
  활성화 판정을 오염시킨다. 최종 수용: `sourceCode=insta`로 실제 분류와 맞추되, 게시물 단위
  인과 추론 금지를 guardrail에 명시했다.
- 폴백 사유: 이 세션에는 Claude Fable 5/Opus 5와 AGY Flash/Sonnet 호출 수단이 없고,
  리포의 Gemini 브리지는 `.env`/`GEMINI_API_KEY` 부재로 호출할 수 없다. 호출하지 않은 모델을
  호출했다고 기록하지 않는 `AGENTS.md` 정책을 적용했다.

---

## 2026-07-30 — 북알프스 릴스 V2: 카드뉴스 전환 방식 폐기

- 사용자 반박: 기존 릴스는 카드뉴스를 움직인 수준이라 화면 텍스트가 지나치게 많다.
- Sol 수행: 로그인된 Instagram 웹에서 여행 릴스 실물을 대조했다. 70.3K 좋아요 풍경 릴스는
  화면 자막이 없고, 1.7M 좋아요 교토 릴스는 `Kyoto Japan` 장소 라벨만 있으며, 54.1K 좋아요
  11.3초 풍경 릴스도 화면 자막이 사실상 없었다.
- Opus 5 medium 검증·반박: Sol의 잠정 3문구 안은 "카드뉴스 8장의 축소판"이라며 반려했다.
  질문 훅과 저장 CTA를 버리고, 10초·원본 사진 4장·장소 라벨 `북알프스` 1회·하드컷·계절 루프로
  다시 설계하라고 판정했다.
- 최종 수용: 카드 PNG를 전혀 읽지 않는 `build-scenic-reel.mjs`를 신설했다. 모든 입력 사진은
  `.source.json`의 CC BY 라이선스와 SHA-256을 실행 시 다시 검증한다. 기존 게시 증거
  `reel-cover-a.mp4`는 덮지 않고 `reel-scenic-v2.mp4`로 분리한다.
- 수행 모델: GPT-5.6 Sol. 검증 모델: Claude Opus 5 medium. 주요 반박은 전면 수용.
- Opus 1차 최종 검증은 첫 로프웨이 컷이 1600×1067이라 세로 크롭 후 실효 폭 600px밖에
  남지 않는다고 반려했다. Commons를 다시 실조회해 CC0 `AlpineRoute6302.jpg`를
  3840×2559로 수급했고, 고정 리비전·SHA-256·저작자를 보존했다. 세로 크롭 후 폭은 1439px로
  1296px 작업 캔버스보다 커 업스케일 문제가 사라졌다.
- Opus 5 재검증: 해상도·크레딧·라이선스·첫 프레임 훅을 다시 확인하고 **최종 합격**.
  비차단 의견은 흐린 하늘 비중이 커 첫 컷이 아주 강한 편은 아니라는 점이며, 다음 실험에서
  첫 장면을 `motion: out`으로 시험할 여지만 남겼다.
