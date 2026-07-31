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
네이버 검색 노출도 게시 성공만으로 확정하지 않고 D+3·D+7·D+28 실측으로 판정합니다.

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
naver-blog/growth-plan.json             ← 검색 의도·글별 독립 질문·발행 게이트
naver-blog/support-drafts.json           ← 지원 글의 독립 장문 원고·공식 출처·내부 링크
naver-blog/photos/<support-slug>/        ← 지원 글 전용 사진·고정 리비전·SHA-256
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
        ↓ D+3·D+7·D+28 집계
naver-blog/observations.json            ← 노출·조회·검색 유입·자사 링크 클릭 집계
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
  --open --user-approved

# 새 SmartEditor 탭에 제목·문단·사진을 배치하되 저장·발행하지 않음
npm run naver-blog:stage -- \
  --package=_stage/naver-blog/sado/package.json \
  --manifest=_stage/naver-blog/sado/upload-manifest.json \
  --blog-id=<blogId> \
  --stage --user-approved

# 사람이 공개한 뒤 실제 URL과 제목·원문 링크·본문 제목 2개를 브라우저로 재확인
npm run naver-blog:verify -- \
  --package=_stage/naver-blog/sado/package.json \
  --url=https://blog.naver.com/<blogId>/<logNo> \
  --user-approved --record

# 회귀 테스트
npm run test:naver-blog

# 검색 의도·콘텐츠 중복·발행 속도·측정 계약 확인과 현재 상태 보고
npm run naver-blog:growth:validate
npm run naver-blog:growth:report

# 검색 지원 글의 공식 출처·사진 바이트·본문 중복률·내부 링크 계약 확인
npm run naver-blog:support:analyze
npm run naver-blog:support:validate

# 브라우저를 열지 않는 로컬 미리보기. 기둥 글 공개 전에는 발행 패키지를 만들지 않음
npm run naver-blog:support:preview -- --slug=sado-access

# 기둥 글 공개 URL이 published.json에서 검증된 뒤에만 지원 글 package·원고·사진 manifest 생성
# 현재는 기둥 글 공개 기록이 없어 의도적으로 실패함
npm run naver-blog:support:prepare -- --slug=sado-access

# 지원 글도 생성 뒤에는 기둥 글과 같은 validate → stage → verify 계약을 사용
npm run naver-blog:validate -- \
  --package=_stage/naver-blog/sado-access/package.json

# 아래 stage·verify는 실행 직전 사용자 허락과 --user-approved가 반드시 필요함
npm run naver-blog:stage -- \
  --package=_stage/naver-blog/sado-access/package.json \
  --manifest=_stage/naver-blog/sado-access/upload-manifest.json \
  --blog-id=<blogId> --stage --user-approved

npm run naver-blog:verify -- \
  --package=_stage/naver-blog/sado-access/package.json \
  --url=https://blog.naver.com/<blogId>/<logNo> \
  --user-approved --record

# 사람이 지원 글을 공개하고 verify --record가 공개 URL을 기록한 같은 변경에서
# growth-plan.json의 해당 support article.status를 published로 바꾼 뒤 두 계약을 다시 확인
npm run naver-blog:support:validate
npm run naver-blog:growth:validate

# 공개 URL 검증 뒤에만 집계 관측 기록
npm run naver-blog:growth:record -- \
  --slug=sado --checkpoint=D+3 \
  --observed-at=2026-08-03T09:00:00+09:00 \
  --target-query-found=true --rank-band=11-20 \
  --post-views=0 --search-inflows=0 --foresttour-clicks=0 \
  --record
```

기본 WSL 브라우저 계약:

- session: `naver-blog-wsl`
- profile: `~/.agent-browser/profiles/naver-blog`
- 다른 BAND/Instagram 프로필이나 현재 Windows Edge 창을 사용하지 않음
- 계정 ID는 저장소에 쓰지 않고 `NAVER_BLOG_ID` 또는 `--blog-id=`로만 전달
- 다른 위치가 필요하면 `NAVER_BLOG_BROWSER_PROFILE` 또는 `--profile=` 사용
- 기본은 `--headed=true`; 사용자에게 보이지 않는 브라우저로 초안을 만들지 않음
- 로그인·2차 인증·CAPTCHA는 우회하지 않음
- 사용자가 마우스를 쓰는 동안에는 `open`, `stage`, `verify`를 포함해 보이는 브라우저에 어떤
  입력도 보내지 않음. 실행 직전에 사용자의 명시적 허락을 받고 `--user-approved`를 함께 명시함

## 5. 공개 게이트

다음 하나라도 어기면 패키지를 만들거나 공개 기록을 남기지 않습니다.

- `photoStatus !== verified`
- 현지 촬영 고지, 재사용 라이선스, 저작자, 원문 URL 누락
- 이미지 캡션이 본문에 없거나 업로드 순서가 1부터 연속되지 않음
- 원고 600자 미만, HTML 포함, Instagram 의존 문구 또는 불안 과장 문구 포함
- 제목 40자 초과, 대표 검색어 또는 동명 여행지 구분어가 제목·첫 문단에서 누락
- `access`, `transport`, `plan`, `checklist`, `complexity` 여행 정보 구간 누락
- 여행 정보 확인일·공식 출처·변경 가능성 고지 누락
- 원본에 `connectedTour`가 없는데 상품 링크를 추가함
- 태그 3~10개 규칙 위반
- `foresttour.kr` 전체 기록 링크 누락
- 원본 digest·패키지 digest·멱등 키 불일치
- 네이버 외 공개 URL 또는 blogId/logNo 파싱 실패
- 공개 화면에서 제목·원문 링크·실용 정보 제목·사진 캡션/원문 중 하나라도 누락
- 같은 slug 또는 같은 공개 URL의 중복 기록
- 지원 글이 신규 공식 출처 2개·독립 검증 사진 2장·본문 중복률 25% 이하를 입증하지 못함
- 지원 글 사진이 CC BY-SA이거나 장변 2700px 미만, 고정 Commons 리비전·실제 파일 SHA-256 불일치,
  기둥 글 또는 다른 지원 글의 사진 재사용
- 지원 글의 기둥 네이버 글 공개 URL이 아직 `published.json`에서 검증되지 않음
- 업로드 manifest의 이미지 순서·안전한 상대 경로·SHA-256·바이트 수·캡션·원문 URL이 패키지와
  실제 파일 중 하나라도 다름
- 공개 URL 검증 전 성과값 기록, D+3·D+7·D+28 외 체크포인트 또는 개인 단위 데이터 기록

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
  열려 있습니다. 이 화면은 사용자의 마우스를 방해하지 않도록 더 이상 조작하지 않습니다.
- 보이는 편집 화면에는 이전 제목과 이전 본문이 들어간 미저장 초안이 남아 있습니다. 저장 카운트는
  0이고 실제 임시저장·공개 URL도 없습니다. 화면 초안은 현재 로컬 정본이 아닙니다.
- 로컬 패키지는 `일본 니가타 사도섬 여행 | 가는 법·금산·슈쿠네기 2박 3일 동선`으로 갱신했습니다.
  첫 문단에서도 일본·니가타를 명시해 여수 사도·신안 12사도와 검색 의도를 분리합니다.
- `사도섬 여행`의 동명 지역 충돌은 확인했지만 검색량은 확인하지 못했습니다. 검색량을 추정하지
  않고 `relative-volume-unverified`로 유지합니다.
- 사도 기둥 글과 가는 법·섬 내 교통·2박 3일의 지원 글 3편을 계획했습니다. `sado-access`는
  4,935자 독립 원고, 공식 출처 7개(기둥 글에 없던 신규 6개), CC BY 현지 사진 2장까지 확보했고
  기둥 글과 5어절 중복률은 1.3%로 실측되어 `draft-ready`입니다.
- `sado-access`는 정보·사진 준비가 끝났어도 기둥 글 공개 URL이 없으므로 로컬 미리보기만 만들고
  `support:prepare`부터 실패-폐쇄로 차단합니다. 기둥 글 공개 뒤 생성되는 지원 글 패키지는 공통
  `validate → stage → verify` 흐름을 사용하며, manifest와 실제 이미지 파일도 브라우저 입력 전에
  SHA-256으로 다시 확인합니다. 지원 글 공개 기록이 생긴 뒤에는 성장 계획의 해당 글 상태가
  `published`여야 두 계약을 함께 통과합니다. `sado-transport`와 `sado-itinerary`는 아직
  `research-required`입니다.
- 화면 재배치·저장·공개는 사용자가 마우스 사용을 멈추고 명시적으로 허락한 뒤에만 진행합니다.

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
- 최신 `sado-access` 지원 글은 GPT-5.6 Sol medium이 수행·최종 확정하고 AGY Gemini 3.6 Flash
  high가 읽기 전용 검증했습니다. Flash의 미니라이너 `1,300엔` 보고는 공식 원문과 달라 기각했고,
  변동 운임을 본문에 고정하지 않았습니다. Fable 5와 Opus 5는 현재 런타임에 없어 호출하지 않았습니다.
- 지원 글 공통 패키지 연결도 **GPT-5.6 Sol medium**이 구현·최종 판정하고 **AGY Gemini 3.6
  Flash high**가 두 차례 읽기 전용 반박 검토했습니다. 1차 Flash는 P0/P1/P2 없음으로 봤지만,
  Sol이 공개 후 `published.json`과 growth-plan 상태를 동시에 만족하지 못하는 수명주기 충돌을
  추가로 찾아 수정했습니다. 수정 뒤 2차 Flash는 P0/P1 없음으로 판정했고 Sol이 실제 파일과
  네이버 30/30 회귀 테스트로 재확인했습니다. AGY 모델 목록에 Fable 5와 Opus 5가 없어 지정
  고추론 상대 모델은 호출하지 못했으며, Opus 4.6을 Opus 5로 가장하지 않았습니다.
