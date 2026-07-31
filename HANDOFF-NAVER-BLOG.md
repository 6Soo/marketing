# HANDOFF-NAVER-BLOG.md — 네이버 블로그 단일 인계서

> 이 문서는 `foresttour.kr` 자사 블로그가 아니라 **네이버 블로그 채널**의 정본입니다.
> 자사 블로그는 `HANDOFF-BLOG.md`, 변하지 않는 마케팅 원칙은 `CLAUDE.md`,
> 설계·성공 기준은 `strategy/naver-블로그-자동화-0731.md`를 봅니다.
>
> 최종 갱신: 2026-07-31

## 1. 목표와 편집 컨셉

네이버 블로그가 Instagram 없이도 다음 역할을 맡게 합니다.

- 네이버 검색에서 처음 여행지를 발견하는 입구
- 실제 현지 사진과 공식 자료가 결합된 읽을거리
- 시간이 지나도 다시 찾을 수 있는 글 주소와 카테고리 아카이브
- `foresttour.kr`의 전체 기록으로 이어지는 연결
- 정확히 일치하는 공개 일정만 안내하는 저압력 전환

모든 글은 `여행지 발견 → 장소의 역사와 생활 → 들어가는 법 → 현지 이동 → 직접 준비하는
동선 → 예약 전 확인사항 → 준비가 복잡해지는 지점 → 정확히 일치하는 상품 연결` 순서를
따릅니다. 독자가 실제로 혼자 찾아갈 수 있을 만큼 정보를 주되, 선박·환승·권역 분리·마지막
버스·날씨 같은 실제 조건을 빠짐없이 보여줘 준비의 수고가 사실에서 자연스럽게 드러나게 합니다.

핵심 정보를 일부러 빼서 혼자 가기 어렵게 만들거나 불편을 과장하는 방식은 금지합니다. 공개
예약 화면에서 같은 여행지와 동선이 확인되는 상품이 없으면 상품 링크를 붙이지 않습니다.
정본 데이터와 게이트는 `naver-blog/travel-guides.json`에 있습니다.

Instagram 릴스의 비팔로워 추천 도달, DM, 팔로우 관계를 동일하게 복제한다고 주장하지 않습니다.
네이버 검색 노출도 게시 성공만으로 확정하지 않고 D+3·D+7 실측으로 판정합니다.

## 2. 왜 “완전 무인 API 발행”이 아닌가

공식 상태:

- 로그인 방식 블로그 글쓰기 API: **2020-05-06 종료**
  - https://developers.naver.com/notice/article/7527
- 블로그앱 글쓰기 URL Scheme: **2022-12-23 종료**
  - https://developers.naver.com/docs/utils/blogapp/
- 현재 지원되는 외부 연동: URL과 제목을 넘겨 사용자가 작성 화면에서 글을 완성하는
  **블로그 공유하기**
  - https://developers.naver.com/docs/share/share/
- 블로그 운영정책은 네이버의 사전 허락 없이 자동화 수단으로 기계적인 패턴 글을
  반복 게재하는 행위를 제한 대상으로 명시
  - https://notice.naver.com/api/v1/file/download/122

공식 공유 화면은 실제 확인 결과 부가 설명이 500자로 제한된 링크 스크랩 화면이라 장문 원고
작성 경로로 쓰지 않습니다. 따라서 종료된 API를 가장하지 않고, 로그인된 WSL의 보이는
SmartEditor에 **검증된 원고와 사진을 초안으로 배치**합니다. 로그인·CAPTCHA는 사람이 처리하고,
임시저장·공개는 화면 검수 뒤 명시적으로 수행합니다. 무인 대량 발행은 하지 않습니다.

## 3. 구조

```text
blog/published/stories.json             ← 검증된 여행지 이야기
naver-blog/travel-guides.json           ← 상세 교통·동선·체크리스트·상품 연결 상태
        ↓ naver-blog:prepare
_stage/naver-blog/<slug>/
  package.json                          ← 두 원천 digest·중복 키·검증 앵커
  post.txt                              ← 네이버 장문 원고
  upload-manifest.json                  ← 업로드 순서·SHA-256·출처
  images/                               ← 검증된 현지 사진
        ↓ 로그인된 WSL agent-browser + SmartEditor
네이버 편집 초안                           ← 자동 배치, 저장·공개 안 함
        ↓ 사람 최종 검수·명시적 저장/공개
        ↓ naver-blog:verify --record
naver-blog/published.json               ← 공개 URL·blogId·logNo·검증 시각
```

`_stage/`는 gitignore 대상입니다. 인증정보, 쿠키, QR 코드, 임시 원고, 내려받은 이미지가
git에 들어가지 않습니다.

## 4. 운영 명령

```bash
# 어떤 원고가 네이버용으로 안전한지 확인
npm run naver-blog:list

# 사도 요약 원고·현지 사진 4장·업로드 manifest 생성
npm run naver-blog:prepare -- --slug=sado --download-images

# 원고·상세 여행 정보 digest, 사진 권리·출처, 태그 재검증
npm run naver-blog:validate -- \
  --package=_stage/naver-blog/sado/package.json

# 로그인된 WSL 전용 브라우저에서 SmartEditor 열기
npm run naver-blog:open -- \
  --package=_stage/naver-blog/sado/package.json \
  --blog-id=<blogId> \
  --open

# 새 SmartEditor 탭에 제목·문단·사진을 배치하되 저장·발행하지 않음
npm run naver-blog:stage -- \
  --package=_stage/naver-blog/sado/package.json \
  --manifest=_stage/naver-blog/sado/upload-manifest.json \
  --blog-id=<blogId> \
  --stage

# 사람이 공개한 뒤 실제 URL과 제목·원문 링크·본문 제목 2개를 브라우저로 재확인
npm run naver-blog:verify -- \
  --package=_stage/naver-blog/sado/package.json \
  --url=https://blog.naver.com/<blogId>/<logNo> \
  --record

# 회귀 테스트
npm run test:naver-blog
```

기본 WSL 브라우저 계약:

- session: `naver-blog-wsl`
- profile: `~/.agent-browser/profiles/naver-blog`
- 다른 BAND/Instagram 프로필이나 현재 Windows Edge 창을 사용하지 않음
- 계정 ID는 저장소에 쓰지 않고 `NAVER_BLOG_ID` 또는 `--blog-id=`로만 전달
- 다른 위치가 필요하면 `NAVER_BLOG_BROWSER_PROFILE` 또는 `--profile=` 사용
- 기본은 `--headed=true`; 사용자에게 보이지 않는 브라우저로 초안을 만들지 않음
- 로그인·2차 인증·CAPTCHA는 우회하지 않음

## 5. 공개 게이트

다음 하나라도 어기면 패키지를 만들거나 공개 기록을 남기지 않습니다.

- `photoStatus !== verified`
- 현지 촬영 고지, 재사용 라이선스, 저작자, 원문 URL 누락
- 이미지 캡션이 본문에 없거나 업로드 순서가 1부터 연속되지 않음
- 원고 600자 미만, HTML 포함, Instagram 의존 문구 또는 불안 과장 문구 포함
- `access`, `transport`, `plan`, `checklist`, `complexity` 여행 정보 구간 누락
- 여행 정보 확인일·공식 출처·변경 가능성 고지 누락
- 원본에 `connectedTour`가 없는데 상품 링크를 추가함
- 태그 3~10개 규칙 위반
- `foresttour.kr` 전체 기록 링크 누락
- 원본 digest·패키지 digest·멱등 키 불일치
- 네이버 외 공개 URL 또는 blogId/logNo 파싱 실패
- 공개 화면에서 제목·원문 링크·실용 정보 제목·사진 캡션/원문 중 하나라도 누락
- 같은 slug 또는 같은 공개 URL의 중복 기록

placeholder 사진인 `hida`, `sanriku`는 차단합니다. `northern-alps`는 검증 사진은 있지만 상세
여행 정보가 없어 차단합니다. 현재 준비 가능한 원고는 `sado` 한 편입니다.

## 6. 사람 검수 지점

1. QR 또는 정상 로그인으로 WSL 전용 프로필 세션을 만듭니다.
2. `naver-blog:stage`가 새 SmartEditor 탭에 제목·문단·사진을 배치합니다.
3. `post.txt` 및 `upload-manifest.json`과 화면을 대조합니다.
4. 공개 전에 미리보기에서 모바일 줄바꿈, 외부 링크, 사진 출처, 일정 문구를 확인합니다.
5. 최초 글은 사람이 공개합니다. CLI의 `open`과 `stage`는 저장·공개 버튼을 누르지 않습니다.
6. 공개 URL을 `naver-blog:verify --record`로 실측한 뒤에만 완료로 기록합니다.

## 7. 현재 상태

- WSL `agent-browser` 전용 프로필에서 정상 로그인했고, 현재 보이는 WSL Chrome의 SmartEditor가
  열려 있습니다. 현재 Windows Edge는 사용하지 않았습니다.
- 사도 장문 원고 5,534자, SmartEditor 문단 113개, 현지 사진 4장을 편집 화면에 배치했습니다.
- 제목·원문 링크·실용 정보 제목과 공식 링크·사진 캡션/원문으로 구성한 검증 앵커 27개가
  모두 통과했습니다.
- 편집 화면의 저장 카운트는 0입니다. 실제 임시저장·공개 URL은 아직 없습니다.

## 8. 모델 교차검증 기록

- 저추론 수행: **AGY Gemini 3.6 Flash high** — 초기 실패 모드·최소 CLI 계약 초안.
- 구현·최종 판단: **GPT-5.6 Sol medium** — 공식 원문, 실제 파일, 테스트와 보이는 WSL
  SmartEditor로 재검증.
- 고추론 검증: **Claude Fable 5 medium** — 직전 실제 파일 검토에서 사진 없는 중간 절 뒤의
  이미지 오연결과 headless 기본값을 P1로 반박했고 둘 다 수정했습니다.
- 주요 수용:
  - 여행지 이야기와 최신 교통 정보를 분리한 두 원천 digest
  - 독립 여행에 충분한 정보를 주고 실제 조율 비용만 드러내는 편집 계약
  - slug+원본 digest+여행 정보 digest+콘텐츠 digest 멱등 키
  - 공개 성공과 D+3/D+7 검색 노출을 분리
  - WSL 전용 프로필·headed 기본값·사람 로그인·사람 공개
  - HTTPS의 정확한 네이버 공개 글 경로, 계정 ID, 사진 캡션과 원문까지 공개 검증
- 주요 기각/교정:
  - Flash의 “사람처럼 보이는 랜덤 지연” 제안은 자동화 탐지 회피로 읽힐 수 있어 사용하지 않음.
  - Fable의 검색 알고리즘 명칭 주장은 순수 텍스트 보고만으로 확정하지 않고 운영 계약에서 제외.
  - 공식 공유 화면은 지원 API이지만 실측상 500자 링크 스크랩이므로 장문 작성 경로에서는 제외.
- 폴백 사유: `tools/gemini.mjs`는 `GEMINI_API_KEY`가 없어 실패했으나,
  사용 가능한 공식 AGY CLI의 `gemini-3.6-flash-high`가 실제 응답해 지정 기본 모델을 수행했습니다.
  최신 컨셉 반영 때는 별도 신규 Fable 호출 수단이 없어 직전 Fable 반박을 파일·테스트·브라우저로
  재대조했습니다.
