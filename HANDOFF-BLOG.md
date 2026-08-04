# HANDOFF-BLOG.md — foresttour.kr 블로그 단일 인계서

> 공개 원고, foresttour.kr 반영, 검색 발견, 익명 계측의 정본입니다.
> 변하지 않는 편집 원칙은 `CLAUDE.md`, 설계와 완료 기준은
> `strategy/foresttour-블로그-자동화-0731.md`, 최신 실행 증거는 `LOG.md` 맨 아래를 봅니다.
>
> 최종 갱신: 2026-07-31

## 1. 목표와 역할 경계

foresttour.kr 안에서 Instagram 계정이나 게시물을 보지 않아도
**발견 → 이해 → 신뢰 → 관련 기록 → 정확한 공개 일정**이 이어지게 합니다.

블로그가 대체하는 역할:

- 여행지 질문과 시각적 첫인상
- 공식 자료에 근거한 이해와 사진 출처·권리 고지
- 저장 가능한 고유 URL과 검색·RSS 재발견
- 관련 글 회유와 일정 연결
- 익명 퍼널 측정

블로그가 동일하게 대체하지 못하는 역할:

- Instagram 탐색·릴스의 비팔로워 추천 도달
- 좋아요·댓글·공유가 만드는 사회적 증거
- DM 대화와 플랫폼 안의 팔로우 관계

따라서 “Instagram 폐기”가 아니라 **Instagram 의존 제거**가 완료 기준입니다.

## 2. 현재 구조

```text
cardnews/series/<series>
        ↓ blog:draft (초안 골격만 생성)
blog/drafts/<slug>.json
        ↓ 사람 검수 + 명시적 --publish
blog/published/stories.json  ← 공개 원고 단일 원천
        ↓ GitHub main raw URL, 1시간 재검증
foresttour.kr /stories · /stories/<slug> · 홈 발견 카드
        ↘ 원격 실패 시 예약 리포의 마지막 정상 스냅샷
```

- 마케팅 리포: 공개 원고·초안/검증/승격 도구 소유
- 예약 리포: 렌더·SEO·RSS·사이트맵·robots·익명 계측 소유
- 런타임 원격 주소:
  `https://raw.githubusercontent.com/6Soo/marketing/main/blog/published/stories.json`
- 원격 응답은 HTTPS, 5초, 1MB, 엄격한 스키마를 모두 통과해야 사용합니다.
- 자동 커밋 봇은 없습니다. 예약 리포가 PII 저장소이므로 공개 원고 봇이 그 리포를 수정하지 않습니다.

## 3. 운영 명령

```bash
# 현재 공개본 검증
npm run blog:validate
npm run test:blog

# 기존 카드 시리즈에서 로컬 초안 골격 생성
npm run blog:draft -- --series=northern-alps --slug=new-slug

# 사람이 초안을 완성한 뒤 공개본 승격
npm run blog:publish -- --draft=blog/drafts/new-slug.json --publish
```

`blog:drafts/`는 gitignore 대상입니다. `--publish` 없는 승격은 실패합니다.

## 4. 공개 게이트

다음 하나라도 어기면 공개 파일 전체를 거부합니다.

- slug·canonical·featuredOrder 중복
- 공개/수정 시각, 소개, 본문 3개 절, 공식 출처 3개, 검색어 3개 미만
- 관련 글 slug 불일치
- verified 사진의 촬영지·저작자·라이선스·원문 URL 누락
- placeholder 사진의 “실제 사진 아님” 고지 누락
- 공개 예약 데이터와 정확히 맞지 않는 상품 연결
- Instagram을 읽어야만 이해되는 문장

## 5. 공개 지면과 측정

- `/stories`: Blog JSON-LD, RSS 링크, 전체 여행지 기록
- `/stories/<slug>`: BlogPosting JSON-LD, 공개/수정일, 고유 OG 이미지, 공식 출처
- `/stories/feed.xml`: RSS 2.0
- `/sitemap.xml`: 홈·목록·글 canonical과 대표 이미지
- `/robots.txt`: 절대 sitemap URL
- 홈: 같은 원고의 요약 카드
- `/admin/traffic`: 목록 선택 → 본문 → 맥락 → 관련 글 → 일정 선택을 글별 집계
- 검색 출처: Google·네이버·다음·Bing 자연검색을 별도 집계

개인 식별자·쿠키·원시 사용자 에이전트는 저장하지 않습니다. 날짜 × 출처 × 사건 × 기기 대분류의
횟수만 저장합니다.

브라우저는 전체 referrer URL을 서버에 보내지 않습니다. 클라이언트에서 검색·채널 대분류로
축약한 `from`만 보내며, 경로·쿼리·회원 식별 가능 문자열은 저장하지 않습니다. referrer가
제거된 검색 방문은 `direct`에 섞일 수 있고 이를 검색으로 추정 보정하지 않습니다.

## 6. 배포·검증

예약 리포:

```bash
npm test
npx tsc --noEmit --incremental false
npx eslint <변경한 TS/TSX/JS 파일>
npm run build
node scripts/verify-foresttour-discovery.mjs \
  --base-url=http://127.0.0.1:3100 --home-path=/home2
```

공개 배포 뒤에는 기본값으로 다시 실행합니다.

```bash
npm run verify:foresttour
```

예상 결과는 홈, 목록, 글 4편, OG 4장, 홈 OG, RSS, sitemap, robots의 **14개 URL 통과**입니다.

원격 원고 폴백은 Vercel 로그에 `[foresttour-blog] 번들 정상본 사용` 경고를 남깁니다.

2026-07-31 프로덕션 기준 예약 앱 `a1f8951`, Vercel 배포
`dpl_GLUZcQURhQqvKVRRsRYAc9kDKWpQ`가 `READY`이며 공개 14개 URL이 통과했습니다.
Google Search Console 확인 파일은
`https://foresttour.kr/google812722b9e5c1b794.html`에 영구 유지합니다.

### 긴급 글 내리기

권리·사실 문제로 글을 내려야 할 때는 마케팅 원격 JSON에서만 삭제하지 않습니다. 원격 장애 시
번들 글이 되살아날 수 있기 때문입니다.

1. 마케팅 공개본에서 slug를 제거
2. 예약 리포의 `src/content/foresttour-blog.json`에서도 같은 slug를 제거
3. 예약 앱을 배포
4. 글 404, 목록·홈·RSS·sitemap 제거를 공개 URL에서 확인

새 글 추가는 마케팅 리포만으로 가능하지만, **긴급 삭제는 앱 번들 동시 배포**가 계약입니다.

## 7. 외부 검색 콘솔 상태

코드와 공개 URL만으로 크롤링 가능 상태는 만들 수 있지만 색인 결과를 보장할 수는 없습니다.

- Google Search Console: 운영 계정에서 `https://foresttour.kr/` URL 접두어 속성 소유 확인 완료.
  `sitemap.xml`은 **성공·발견 6페이지**, `stories/feed.xml`은 **성공·발견 5페이지**입니다.
- 네이버 서치어드바이저: 로그인 화면까지 확인했으나 로그인 세션이 없어 중단했습니다.
  운영자가 네이버 로그인한 뒤 사이트 소유 확인과 sitemap/RSS 제출을 해야 합니다.
- 공통 후속: 색인 수·검색 노출·검색 유입 퍼널을 4주 단위로 확인합니다.

로그인 만료·2차 인증·CAPTCHA는 우회하지 않습니다.

현재 마케팅 리포는 공개이고 과거 커밋의 Pexels 키가 2026-07-31에도 HTTP 200으로 살아 있음을
확인했습니다. 새 코드가 키를 다시 노출한 것은 아니지만 이미 공개된 자격정보이므로 Pexels에서
키를 재발급하고 기존 키를 폐기해야 합니다. git 히스토리 재작성보다 **키 폐기**가 선행입니다.

## 8. 다음 편집 단위

새 글을 늘리기 전에 히다·산리쿠의 placeholder 사진을 검증된 현지 사진으로 교체하는 것이
우선입니다. 새 지역은 카드 시리즈의 사실 검증을 재사용할 수 있지만, 초안 생성 결과를 사실로
간주하지 않습니다.

## 9. 2026-08-04 현재 화면·트래픽 계약

- `/admin/traffic`의 foresttour.kr 지표는 홈 유입부터 예약 완료까지 하나의 여정으로 읽는다.
  `홈 도착 → 여행 기록 → 일정 확인 → 예약 페이지 → 예약 시작 → 예약 완료` 순서이며,
  세부 퍼널은 기본 화면에서 접어 분산을 줄였다.
- `예약 완료`를 누르면 같은 조회 기간의 실제 완료 예약 목록을 펼친다. 이름·여행·인원·생성 시각·
  상태만 관리자 인증 아래 표시하며 연락처·주민번호·여권 등 민감정보는 포함하지 않는다.
- 사진 위 안내 문구와 라이선스 문자열은 공개 화면에 표시하지 않는다. 공개 화면에는
  `출처 · 촬영자/제공처`만 남기고, 권리 검증에 필요한 라이선스 데이터는 내부 공개 게이트용
  메타데이터로 유지한다.
- 홈 대표 문구의 의도된 줄은 `당신이 아는` / `일본의 다음 장`이다. 한국어 본문은 단어 중간을
  억지로 끊지 않고 제목은 균형 있게, 문단은 자연스럽게 줄바꿈한다.
- 관련 예약 앱 커밋: `a274892`(트래픽 통합), `670a1e2`(사진 안내 제거),
  `2bb1c15`(출처만 노출), `8e83480`(한국어 줄바꿈 개선). 기반 보안·셀프서비스 변경은
  `7ef04af`다.
- 최종 코드 검증은 테스트 88/88, TypeScript, 변경 파일 ESLint, 프로덕션 빌드를 통과했다.
  자동 브라우저의 공유 프로필 잠금과 로컬 주소 입력 IME 문제로 마지막 줄바꿈 변경의 로컬
  화면 재확인은 완료하지 못했으므로, 다음 UI 작업 때 실제 모바일 폭에서 한 번 더 확인한다.
