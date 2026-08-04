# HANDOFF-NAVER-BLOG.md — 네이버 블로그 단일 인계서

> 이 문서는 `foresttour.kr` 자사 블로그가 아니라 **네이버 블로그 채널**의 정본입니다.
> 자사 블로그는 `HANDOFF-BLOG.md`, 변하지 않는 마케팅 원칙은 `CLAUDE.md`,
> 설계·성공 기준은 `strategy/naver-블로그-자동화-0731.md`를 봅니다.
>
> 최종 갱신: 2026-08-04

## 1. 목표와 편집 컨셉

네이버 블로그가 Instagram 없이도 다음 역할을 맡게 합니다.

- 네이버 검색에서 처음 여행지를 발견하는 입구
- 실제 현지 사진과 공식 자료가 결합된 읽을거리
- 시간이 지나도 다시 찾을 수 있는 글 주소와 카테고리 아카이브
- `foresttour.kr`의 전체 기록으로 이어지는 연결
- 정확히 일치하는 공개 일정만 안내하는 저압력 전환

모든 글은 **여행지 자체와 사진이 주인공**입니다. 기본 형식은 `사진 → 짧은 글`을 반복하는 개인
여행 블로그 문법이고, 현재 기준은 사진 9장과 문단 9개가 정확히 번갈아 나오는 구조입니다.
감각·빛·바람·소리·장면의 순서로 독자가 현장에 있는 듯 읽히게 쓰되, 확인되지 않은 직접 방문이나
직접 촬영을 1인칭 사실로 주장하지 않습니다.

여행지 소개 뒤에는 독자가 실제로 혼자 찾아갈 수 있을 만큼 교통·동선·예약 정보를 줍니다.
선박·환승·권역 분리·마지막 버스·날씨 같은 실제 조건을 빠짐없이 보여줘 준비의 수고가 사실에서
자연스럽게 드러나게 하고, 마지막에 정확히 일치하는 공개 상품을 낮은 압력으로 비교 안내합니다.

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
작성 경로로 쓰지 않습니다. 따라서 종료된 API를 가장하지 않고, 운영자가 로그인한 브라우저의
보이는 SmartEditor에서 직접 작성합니다. 사용자 본인 확인이 필요한 로그인·2차 인증·CAPTCHA는
우회하지 않고, 공개는 화면 검수와 명시적 승인 범위 안에서만 수행합니다. 무인 대량 발행은 하지
않습니다.

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

현재 브라우저 운영 계약:

- 브라우저 감사·작성은 운영자가 로그인한 보이는 브라우저에서 직접 수행합니다.
- 매번 새 화면과 공개 URL을 확인하고, 아래 §7의 과거 PID·창 ID는 재사용하지 않습니다.
- 사용자는 이 세션에서 브라우저 전체 조작과 AhnLab 알림의 `허용` 선택을 명시적으로 승인했습니다.
  실제 선택 실패는 승인 부족이 아니라 관리자 보호 창의 무결성 경계 때문이었습니다.
- 변경 뒤에는 새 접근성 트리와 정확한 공개 URL에서 결과를 재검증합니다.
- 로그인·2차 인증·CAPTCHA는 우회하지 않습니다. 로그인 프로필의 쿠키·토큰·QR 이미지는 저장소에
  기록하지 않습니다.
- 사용자가 브라우저를 조작하는 상황에서는 입력을 보내지 않고, 운영자 확인이 끝난 뒤에만 다음
  단계를 진행합니다.
- `tools/naver-blog-content.mjs`의 `agent-browser` 경로는 패키지 검증용 이전 구현으로 남아 있지만,
  현재 기본 프로필은 로그아웃 상태이고 사진·글 교차 배치도 자동 보장하지 않습니다. 세토우치와
  야쿠시마 발행에는 이 경로를 그대로 사용하지 않습니다.

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

표준 `prepare` 경로에서는 placeholder 사진인 `hida`, `sanriku`를 차단하고,
`northern-alps`는 상세 여행 정보가 없어 차단합니다. `northern-alps`는 별도 사진 중심 편집으로
이미 공개됐으며, 세토우치·야쿠시마는 §7과 `naver-blog/drafts/`의 수동 발행 대기본을 사용합니다.

## 6. 사람 검수 지점

1. 정상 로그인 또는 사용자가 승인하는 QR 로그인으로 네이버 세션을 만듭니다.
2. 운영자가 새 SmartEditor 탭을 열고 제목을 입력합니다.
3. `naver-blog/drafts/`의 원고와 로컬 이미지 9장을 `사진 → 글` 순서로 정확히 교차 배치합니다.
4. 공개 전에 미리보기에서 모바일 줄바꿈, 외부 링크, 최소 사진 권리표시, 일정 문구를 확인합니다.
5. 공개 설정과 주제·카테고리·태그를 화면에서 확인한 뒤 승인 범위 안에서 발행합니다.
6. 새 접근성 트리와 공개 URL을 실측한 뒤에만 `published.json`에 완료 기록을 남깁니다.

## 7. 현재 상태

### 공개 완료

- 블로그 이름: **숲길따라 감성여행**
- 사도: https://blog.naver.com/kkokko_hero/224364700027
  - 사진별 출처·원문 반복을 없애고 마지막 최소 권리표시 한 줄만 유지했습니다.
  - `published.json`과 `growth-plan.json`에 공개·검증 상태를 기록했습니다.
- 북알프스: https://blog.naver.com/kkokko_hero/224364780223
  - 제목: `일본 북알프스 여행 | 무로도·구로베댐·가미코지`
  - 공개 화면에서 사진 9장과 문단 9개의 정확한 교차 구조, 상품 링크, 최소 권리표시를 확인했습니다.
  - 실제 태그에는 입력 중 합쳐진 `다테야마알펜루트미쿠리가이케`가 하나 더 남아 있습니다.
- 두 글 모두 직접 방문·직접 촬영을 사실로 단정하지 않고 현재형·감각 묘사로 현장감을 냈습니다.

### 발행 대기 — 공개 URL 없음

1. **세토우치**: `naver-blog/drafts/2026-08-04-setouchi.md`
   - `세토우치 예술섬 여행 | 나오시마·테시마·이누지마·구라시키`
   - 2026-09-18 출발 상품 `fNRs`, Commons 사진 9장, 사진·글 9쌍
   - 로컬: `_stage/naver-blog/setouchi/`
   - Windows: `C:\Users\kkokk\Desktop\setouchi-blog`
2. **야쿠시마**: `naver-blog/drafts/2026-08-04-yakushima.md`
   - `야쿠시마 여행 | 시라타니 원시숲·조몬스기·폭포`
   - 2026-11-27 출발 상품 `fNhN`, Commons 사진 9장, 사진·글 9쌍
   - 로컬: `_stage/naver-blog/yakushima/`
   - Windows: `C:\Users\kkokk\Desktop\yakushima-blog`

두 추적 문서에는 복사용 원고 전문, 공식 사실 원문, 사진별 Commons URL과 SHA-256을 남겼습니다.
이미지 바이트는 `_stage/` 정책에 따라 Git에 넣지 않았지만 위 두 로컬 위치에 모두 존재함을
2026-08-04에 다시 확인했습니다. **세토우치·야쿠시마는 아직 발행되지 않았으므로 `published.json`에
기록하지 않습니다.**

### 인증·브라우저 상태

- Windows Edge의 AhnLab Safe Transaction 인터넷 연결 탐지 창이 최상위 입력을 막았습니다.
  운영자가 직접 `허용`을 선택할 수 없는 상태였고, 보안창을 우회하지 않았습니다.
- 정상 Edge를 종료하고 프로필을 임시 복제해 원격 디버깅과 WSL CDP 연결을 시험했지만,
  `NID_AUT`·`NID_SES`가 Cookie DB에 영속되지 않아 복제 프로필은 네이버 로그인 화면으로 갔습니다.
- QR 로그인 화면을 여러 번 띄웠으나 사용자 확인 전에 모두 만료됐습니다. QR 번호와 이미지는
  재사용할 수 없습니다.
- 임시 프로필과 QR 이미지는 휴지통으로 이동했고, 임시 CDP relay/tunnel 스크립트는 삭제했습니다.
  원본 Edge 프로필은 덮어쓰지 않았습니다. Edge는 `--restore-last-session`으로 다시 열어 Gmail과
  기존 탭이 복원된 것을 확인했습니다.
- 강제 종료 과정에서 세션 전용 네이버 쿠키가 사라졌을 가능성이 큽니다. 다음 세션은 **네이버가
  로그아웃됐다고 가정**하고 새 창·새 접근성 트리로 확인해야 합니다.
- 이전 기록의 Edge/StSess PID와 window ID는 모두 과거 관측값이므로 사용하지 않습니다.
- 채팅에 전달된 인증 문자열은 민감정보 가능성 때문에 파일·로그·커밋에 저장하지 않았습니다.

### 다음 세션의 정확한 순서

1. `git pull --ff-only` 후 이 문서와 `LOG.md` 마지막 블록을 읽습니다.
2. 운영자가 현재 Edge/AhnLab 창과 로그인 상태를 직접 확인합니다.
3. 네이버 로그인 여부를 확인합니다. 재인증·2차 인증·CAPTCHA가 필요하면 우회하지 않습니다.
4. 인증되면 세토우치를 사진·글 9쌍으로 발행하고 공개 URL·모바일 구조·상품 링크를 검증한 뒤
   `published.json`에 기록합니다.
5. 곧바로 야쿠시마를 같은 방식으로 발행·검증·기록합니다.
6. `npm run test:naver-blog`, `npm run naver-blog:growth:validate`, `git diff --check`를 실행하고
   관련 변경만 커밋·푸시합니다.
7. 사도·북알프스의 D+3·D+7·D+28 검색 관측은 별도 미결입니다. 관측 전 값을 0으로 쓰지 않습니다.

사도 지원 글 `sado-access`는 기둥 글 공개 기록이 생겼으므로 다음 세션에서 현재 정본으로
`naver-blog:support:validate`와 `naver-blog:support:prepare`를 다시 실행할 수 있습니다.
`sado-transport`와 `sado-itinerary`는 여전히 `research-required`입니다.

## 8. 모델 교차검증 기록

### 이번 세션(2026-08-01~08-04)

- 수행·최종 판단: **GPT-5.6 Sol medium**
- 검증: **GPT-5.6 Sol medium 자체 반박 + 실제 파일·공개 URL·접근성 트리·테스트**
- 주요 반박:
  - 현장형 문체를 직접 방문·직접 촬영 주장으로 바꾸면 근거 없는 사실이 됩니다.
  - AhnLab 버튼이 눌리지 않은 상태를 사용자 미승인으로 기록하면 안 됩니다. 승인은 있었고,
    관리자 보호 경계가 실제 차단 원인이었습니다.
  - 세토우치·야쿠시마는 원고와 사진만 준비됐으며 공개 URL이 없으므로 발행 완료로 기록할 수 없습니다.
  - `_stage/`만 남기면 세션 이동 때 원고·출처·해시가 Git으로 전달되지 않습니다.
- 최종 수용:
  - 감각·현재형은 유지하되 직접 방문·촬영 단정은 쓰지 않습니다.
  - 사진별 출처 블록은 없애고 본문 마지막 최소 권리표시 한 줄만 둡니다.
  - 두 대기 원고 전문과 사진 원천·SHA-256은 `naver-blog/drafts/`에 추적 문서로 보존합니다.
  - 공개 여부는 네이버 공개 URL과 접근성 트리로만 판정합니다.
- 폴백 사유: 현재 워커 지침이 다른 모델·CLI로 재위임하지 말라고 명시하므로 Fable 5, Opus 5,
  AGY Gemini를 새로 호출하지 않았습니다. 호출하지 않은 모델을 검증 모델로 기록하지 않습니다.

### 이전 설계·구현 기록

- 초기 자동화는 AGY Gemini 3.6 Flash high가 실패 모드·최소 CLI 계약을 초안하고, Claude Fable 5
  medium이 사진 오연결과 headed 기본값을 반박했으며, GPT-5.6 Sol medium이 구현·최종 확정했습니다.
- 여행지 이야기와 최신 교통 정보의 두 원천 digest, 과장 없는 상품 연결, 공개 성공과 검색 노출의
  분리, 정확한 네이버 URL 파싱, 공개 전후 수명주기 게이트는 유지합니다.
- Flash의 탐지 회피로 읽힐 수 있는 랜덤 지연 제안과 공식 원문에 어긋난 미니라이너 운임 보고는
  기각했습니다. 세부 이력은 `LOG.md`의 2026-07-31 블록에 있습니다.
