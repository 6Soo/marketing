# Instagram ↔ foresttour.kr 콘텐츠 연결 규칙

기준일: 2026-07-26

대상: 20~40대 Instagram 신규 방문자

목적: 여행지 콘텐츠에서 생긴 관심을 같은 이야기의 웹 기록으로 자연스럽게 이어 주고,
정확히 연결되는 공개 모집 일정이 있을 때만 예약으로 안내한다.

## 1. 하나의 편집 단위

카드뉴스, 릴스, 스토리, foresttour.kr 페이지를 별도 캠페인으로 만들지 않는다.
한 여행지 기록마다 다음 항목을 함께 확정한다.

| 항목 | 필수 값 |
|---|---|
| 시리즈 | `나만 몰랐던 일본 · 00N` |
| 지역 | 독자가 알아볼 수 있는 고유명사 |
| 핵심 질문 | Instagram 표지와 웹 첫 화면에서 같은 의미 |
| 콘텐츠 slug | 영문 소문자·숫자·하이픈, 공개 후 변경 금지 |
| 사실 근거 | 공식 자료 우선, 게시 전 교차 확인 |
| 사진 상태 | `verified` 또는 `placeholder`; 대역은 실제 현지처럼 표현 금지 |
| 웹 canonical/OG | 콘텐츠별 고유 title·description·canonical·대표 이미지 |
| 연결 일정 | 공개 예약 화면에서 같은 지역·일정이 확인될 때만 연결 |
| 유입 표식 | 프로필·스토리·릴스·캐러셀 규칙에 따라 `from` 유지 |
| 측정 단계 | 착륙, 본문 도달, 발견 목록 이동, 연결 일정 선택 |

## 2. 채널별 링크

### 프로필

- 표시 URL: `https://foresttour.kr/`
- 이유: 프로필에는 깨끗한 대표 주소를 유지한다.
- 계측: Instagram 인앱 환경과 referrer로 `insta`를 보완한다.
- 홈은 첫 여행지 카드에서 동일 주제의 웹 기록으로 이어야 한다.

### 캐러셀

- 피드 캡션 URL은 클릭 경로로 보지 않는다.
- 문구: `카드에 다 담지 못한 이야기는 프로필 링크에서 이어집니다.`
- 운영 표식: 홈을 거쳐 들어온 경우 `insta`; 공유 가능한 별도 링크가 필요한 지면은
  `?from=insta-carousel-<source-alias>`.

### 스토리 링크 스티커

- 직접 링크:
  `https://foresttour.kr/stories/<slug>?from=insta-story-<source-alias>`
- 카드 표지와 같은 질문 또는 같은 장면의 첫 화면으로 연결한다.

### 릴스

- 프로필 유도는 깨끗한 대표 주소를 사용한다.
- 광고·DM·외부 공유처럼 클릭 가능한 링크를 별도로 쓸 때:
  `https://foresttour.kr/stories/<slug>?from=insta-reel-<source-alias>`

`from` 값은 영문·숫자·하이픈만 사용하고 24자를 넘기지 않는다.
콘텐츠 slug가 길면 짧고 충돌하지 않는 `source-alias`를 별도로 정한다.
문자열을 기계적으로 조립하지 말고 시리즈 `meta.landing.sources`의 최종 값을 게시 전에 검사한다.
내부 페이지와 reserve 상세로 이동할 때 최초 값을 다른 출처로 덮어쓰지 않는다.

## 3. 내용과 예약의 진실 계약

- Instagram 표지의 질문은 웹 첫 본문에서 바로 답한다.
- 카드에 없는 깊이—위치, 이유, 계절, 걸을 때의 감각, 인접 장소—를 웹에서 제공한다.
- 대역 이미지는 페이지와 이미지 설명에서 `실제 현지 사진 아님`을 밝힌다.
- 공개 모집 일정이 없으면 예약 버튼을 만들지 않는다.
- Instagram 캡션에도 `다음 출발 확인`, 출발월, 박수 등 확인되지 않은 약속을 쓰지 않는다.
- 일정이 생기면 지역명·출발일·상세 본문·예약 화면이 모두 일치하는지 확인한 뒤 연결한다.
- 마감되거나 사라진 일정 때문에 여행지 기록 자체가 깨져서는 안 된다.

## 4. 산리쿠 002 기준 상태

| 항목 | 현재 상태 |
|---|---|
| Instagram 원문 | 실게시 기록 있음. 현재 파일은 대역 사진 재게시를 차단함 |
| 사진 | Pexels 분위기 대역, `photoStatus: placeholder` |
| 웹 slug | `sanriku` |
| canonical | `https://foresttour.kr/stories/sanriku` |
| 핵심 질문 | 열차가 바다 위에서 속도를 늦추는 이유 |
| 웹의 첫 답 | 오사와 교량의 바다 관람 정차 맥락과 이와테현 공식 출처 |
| 공개 모집 일정 | 없음. 일정 CTA 금지 |
| 로컬 구현 | reservation 커밋 `d9455e8`; 외부 배포 전 |

운영 링크:

- 프로필: `https://foresttour.kr/`
- 캐러셀 식별 링크:
  `https://foresttour.kr/stories/sanriku?from=insta-carousel-sanriku`
- 스토리:
  `https://foresttour.kr/stories/sanriku?from=insta-story-sanriku`
- 릴스:
  `https://foresttour.kr/stories/sanriku?from=insta-reel-sanriku`

현재 캡션은 공개 모집 일정이 없다는 사실에 맞춰 `다음 출발` 약속을 제거했다.
기존 실게시 캡션을 외부에서 고치는 일과 사이트 배포는 각각 실행 직전 별도 경계로 취급한다.

## 5. 히다 001 기준 상태

| 항목 | 현재 상태 |
|---|---|
| Instagram 원문 | 실게시 기록 있음. 외부 게시물은 아직 수정하지 않음 |
| 사진 | 생성형 AI 연출 자산, `photoStatus: placeholder` |
| 웹 slug | `hida` |
| canonical | `https://foresttour.kr/stories/hida` |
| 핵심 질문 | 가이드북엔 없는 진짜 일본을 찾는다면 |
| 웹의 첫 연결 | 같은 질문을 첫 화면에서 회수한 뒤 다카야마·시라카와고·게로의 이유로 확장 |
| 지리 경계 | 고카야마는 도야마현이며 히다 지역이 아님을 명시 |
| 공개 모집 일정 | 없음. 일정 CTA·출발월·박수 약속 금지 |
| 로컬 구현 | reservation 커밋 `a1b51a3`; 외부 배포 전 |

운영 링크:

- 프로필: `https://foresttour.kr/`
- 캐러셀 식별 링크:
  `https://foresttour.kr/stories/hida?from=insta-carousel-hida`
- 스토리:
  `https://foresttour.kr/stories/hida?from=insta-story-hida`
- 릴스:
  `https://foresttour.kr/stories/hida?from=insta-reel-hida`

현재 로컬 캡션과 카드 원본에서는 `3박 4일·10월·다음 출발` 약속을 제거했다.
AI 이미지에는 실제 현지 사진이 아니라는 고지가 필요하며, 검증된 현지 촬영 원본으로
교체되기 전에는 새 게시·재게시할 수 없다. 기존 실게시 캡션 정정과 사이트 배포는
각각 실행 직전 별도 외부 경계로 취급한다.

## 6. 게시 전 확인

1. 카드·릴스의 핵심 질문을 웹 첫 화면이 같은 말로 이어받는가?
2. 공식 출처와 사진 권리·현지 여부가 확인됐는가?
3. 모바일 390px에서 제목·고지·첫 이미지가 잘리고 넘치지 않는가?
4. 프로필, 스토리, 릴스 링크의 slug와 `from`이 규칙에 맞는가?
5. 공개 일정이 없을 때 예약 약속이 완전히 빠졌는가?
6. 공개 일정이 있을 때 상세와 예약의 여행·출발일이 정확히 같은가?
7. 고유 metadata/OG, 뒤로가기, 이미지 로딩, 콘솔 오류를 확인했는가?
8. PII·토큰·계정 시크릿이 변경 파일과 로그에 없는가?
9. production의 해당 slug가 200이고 OG가 정상인 것을 확인한 뒤에만 외부 캡션과 링크를 수정하는가?

한 항목이라도 실패하면 게시·배포하지 않고 해당 편집 단위 안에서 먼저 바로잡는다.

## 7. 2026-07-26 공개 운영 반영 결과

- foresttour.kr 프로덕션은 홈·히다·산리쿠·여행지별 OG를 포함한 6개 URL 검증을 통과했다.
- Instagram 프로필 링크는 화면에 `foresttour.kr`로 보이고, 실제 목적지는
  `https://foresttour.kr/?utm_source=ig&utm_medium=social&utm_content=link_in_bio`다.
- 프로필 소개는 여행상품 판매보다 여행지 기록을 먼저 설명하고, 링크가 Instagram에서 보던
  이야기를 이어 읽는 곳임을 알리는 3줄 구조로 변경했다.
- 대표 프로필 링크를 실제로 눌러 foresttour.kr 홈 도착, canonical, 콘솔 오류 0,
  히다·산리쿠 내부 링크의 `from=insta` 보존을 확인했다.
- 공개 게시물 교정 완료:
  - 히다 `DbMh7tHj_H3`: `3박 4일`과 잘못된 도호쿠 태그 제거, AI 연출 고지 추가.
  - 산리쿠 `DbPkcaIEwSj`: 확인되지 않은 다음 출발 제거, 참고 이미지 고지 추가.
  - 산리쿠 `DbMCkYbEsxd`: 확인되지 않은 10월·4박 5일 제거, 참고 이미지 고지 추가.
- 세 게시물 모두 캡션의 다음 행동을 `프로필 링크의 <여행지> 기록에서 이어집니다`로 통일했다.
- 히다·산리쿠 로컬 캡션 원본에도 공개 고지를 동기화했다.
- ~~Graph API는 현재 `OAuthException code 200: API access blocked` 상태다.~~
  **2026-07-29 해소** — 원인은 Meta 개발자 계정 제한이었고, 계정 복원으로 앱·토큰 변경 없이 풀렸다.
  `doctor` 실측 `✓ 연결 정상 · @foresttour.kr · 게시 한도 0/100`.
  **단, 자동 게시 재개 조건은 그대로다** — API가 열렸다고 바로 올리지 않는다.
  `photoStatus: verified`를 먼저 충족해야 하며, placeholder(AI·스톡) 자산은 여전히 코드 게이트로 차단된다.
