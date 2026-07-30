# HANDOFF-INSTAGRAM.md — Instagram 채널 단일 인계서

> **이 리포의 Instagram 관련 전부를 한 문서에 모았다.** 새 세션·새 에이전트는 이것부터 읽는다.
> 원칙은 `CLAUDE.md`, 모델 배분은 `AGENTS.md §0-A`, 상세 근거는 `LOG.md`,
> 세션별 진행은 `HANDOFF-2026-07-29.md`에 있고 **이 문서는 채널 전체의 지도**다.
>
> 최종 갱신: 2026-07-29 · 이 문서의 모든 수치는 **실측**이다(파일 직접 읽기 / 도구 직접 실행 /
> `gh` API 조회). 확인하지 못한 것은 "확인 못함"으로 적었다. 추정치는 없다.

---

## 1. 한 장 요약 — 지금 어디에 서 있나

**파이프라인은 다 만들어졌고 전부 동작한다. 막힌 것은 기술이 아니라 도달이다.**

| | 상태 |
|---|---|
| 계정 | `@foresttour.kr` · BUSINESS · 게시물 5 · **팔로워 0** |
| Graph API | ✅ 정상 (2026-07-29 확인, 게시 한도 0/100) |
| 게시 파이프라인 | ✅ 캐러셀·릴스 both 구현 |
| 측정 루프 | ✅ 가동 중 (크론 6시간마다, 마지막 실행 성공) |
| GitHub 시크릿 | ✅ 3종 전부 등록 |
| **도달** | ❌ **게시물 5건 전부 reach = 1 (사실상 본인 조회)** |
| **저장·좋아요·댓글·공유** | ❌ **전부 0** |

진단(2026-07-29): 원인은 콘텐츠가 아니라 **포맷**이다. 5건 전부 캐러셀이고 릴스가 0건인데,
팔로워 5,000 미만 계정이 비팔로워에게 닿는 사실상 유일한 포맷이 릴스다.
캐러셀 도달률 14.45%는 **팔로워 대비** 수치라 팔로워 0에서는 0이 곱해진다 — 구조적으로 0이다.
→ 전문: `strategy/인스타-최초도달-확보-실행안-0729.md`

**막고 있던 두 블로커는 이 세션에서 둘 다 처리됐다.** §9 참조.

---

## 2. 계정·게시물 실측

### 2-1. 계정

```
@foresttour.kr · account_type=BUSINESS · media_count=5 · 게시 한도 0/100
user_id=17841445215686571
```
출처: `CLAUDE.md:167-168`, `LOG.md:851-852` (2026-07-29 Graph API 직접 조회)

프로필 링크는 **깨끗한 `https://foresttour.kr`** 그대로 둔다. `?from=` 표식을 붙이지 않는다
(사장 지적 2026-07-22: 지저분함). 서버가 리퍼러로 인스타/유튜브/밴드를 자동 분류한다.

### 2-2. 공개 게시물 5건 — 전부 캐러셀

출처: `data/insights/2026-07-28.json` (Graph API 스냅샷)

| # | permalink | 시리즈 | 게시 시각(UTC) | reach | views | saved/likes/comments/shares |
|---|---|---|---|---:|---:|---|
| 1 | `/p/DbRGuL5kwEU/` | 북알프스 004 | 2026-07-26T19:08:10 | 1 | 1 | 0 / 0 / 0 / 0 |
| 2 | `/p/DbRD-fWkyUL/` | 사도 003 | 2026-07-26T18:44:10 | 1 | 2 | 0 / 0 / 0 / 0 |
| 3 | `/p/DbPkcaIEwSj/` | 산리쿠 | 2026-07-26T04:49:24 | 1 | 1 | 0 / 0 / 0 / 0 |
| 4 | `/p/DbMh7tHj_H3/` | 히다 | 2026-07-25T00:29:57 | 1 | 2 | 0 / 0 / 0 / 0 |
| 5 | `/p/DbMCkYbEsxd/` | 산리쿠 **(중복)** | 2026-07-24T19:55:54 | 1 | 1 | 0 / 0 / 0 / 0 |

계정 레벨 reach 시계열: `2026-07-27` = 0, `2026-07-28` = 1.

**삭제된 게시물 1건**: `/p/DbRFfObk56K/` — 북알프스 첫 업로드. 마지막 장이 낡은 캐시본
("다섯 가지 단서")이라 삭제하고 현재 게시물로 대체.
출처: `data/publish-records/northern-alps-004.json:27-31`

**중복 게시 결함(#3 · #5)**: 산리쿠 두 건의 **캡션 SHA-256이 완전히 동일**하다. 코드에는
중복 방지 게이트(`assertNotDuplicateCaption`, 최근 25건 대조)가 있으나 **웹 UI 수동 게시가
그 게이트를 우회**했다. 중복 콘텐츠는 추천 시스템에서 불리하다. → 수동 게시를 줄이는 것이 근본 해법.

---

## 3. 파이프라인 지도 — 도구 스크립트

### 3-1. 게시 (`tools/`)

| 파일 | 역할 | 사용법 | 필요 환경변수 | 테스트 |
|---|---|---|---|:-:|
| `instagram-publish.mjs` | **Graph API 게시 본체.** 캐러셀·릴스 양쪽 지원. **기본이 드라이런**이고 `--publish`가 있어야 실제 게시 | `doctor` / `carousel --images=URL1,URL2 --caption-file=…` / `reel --video=URL --caption-file=…` / `limit` / `refresh-token --write-env` | `IG_USER_ID`, `IG_ACCESS_TOKEN` (+`IG_ENV_FILE`·`GRAPH_API_VERSION`·`GRAPH_HOST` 선택) | ✅ |
| `cardnews/tools/daily-publish.mjs` | **캐러셀 오케스트레이터.** 렌더→JPEG→공개 스테이징→게시→0h 기록 | `--series=… [--publish --experiment=… --stage-only --validate-live --channels=ig]` | `PUBLIC_DIR`, `PUBLIC_BASE_URL`, `IG_USER_ID`, `IG_ACCESS_TOKEN` | ✅ |
| `validate-public-jpegs.mjs` | 게시 전 로컬↔공개 URL **바이트 일치** 검증 | `--dir=… --base-url=…` | — | — |

⚠ **Graph API는 로컬 파일을 받지 않는다.** 캐러셀은 `--images=URL…`, 릴스는 `--video=URL`로
**공개 접근 가능한 URL**을 요구한다. 그래서 `PUBLIC_DIR`에 스테이징하고 `PUBLIC_BASE_URL`로
게시하는 구조다. 이 두 값 없이는 게시가 불가능하다.

### 3-2. 측정·학습 (`tools/`)

| 파일 | 역할 | 사용법 | 테스트 |
|---|---|---|:-:|
| `ig-insights.mjs` | 계정·미디어 Insights 수집 | `collect\|account\|media <mediaId> [--live]` | — |
| `record-instagram-activation.mjs` | 체크포인트 레코드 원자적 기록 + 인덱스 갱신 | `--experiment= --checkpoint= --source= --<metric>=<value>…` | ✅ |
| `collect-instagram-activation-metrics.mjs` | 스냅샷→활성화 지표 추출 | `--experiment= --checkpoint= [--instagram-source=graph-api\|instagram-ui] [--foresttour-live]` | ✅ |
| `instagram-activation-report.mjs` | 커버리지·다음 액션 판정 (**유예 6시간 로직**) | `--experiment= [--json]` · **exit 2 = 체크포인트 도래 신호** | ✅ |
| `instagram-activation-learn.mjs` | 완료된 체크포인트만으로 실험 간 학습 | `--experiment=` 등 | ✅ |
| `list-instagram-activation-experiments.mjs` | 게시된 체크포인트가 있는 실험 목록 | `[--experiment=] [--json]` | ✅ |
| `ingest-instagram-publish-result.mjs` | 게시 결과 JSON 흡수 (`graph-api`/`instagram-ui` 구분) | 옵션 기반 | ✅ |
| `analyzer.mjs` | Insights 스냅샷 → 주간 리포트·훅 랭킹 | `[analyze\|report\|hooks]` | — |

### 3-3. 스토리·검증 (`tools/`)

| 파일 | 역할 | 테스트 |
|---|---|:-:|
| `build-instagram-story.mjs` | `photoStatus: verified` 시리즈에서 Story manifest·이미지 생성 | ✅ |
| `verify-instagram-story-ready.mjs` | Story 자산 규격(1080×1920 JPEG) + **24h 체크포인트 게이트** 검증 | ✅ |
| `verify-publish-record.mjs` | 실행기록 계약(스키마·지문 상태) 검증 — 모듈 전용 | ✅ |
| `verify-series-connected-tour.mjs` | `connectedTour` 계약(fail-closed, 상품 링크 일치) — 모듈 전용 | ✅ |
| `validate-cardnews-sources.mjs` | 사진 출처·라이선스·바이트 정합성. **`photoStatus: verified` 강제** | — |

### 3-4. 제작 (`cardnews/tools/`)

| 파일 | 역할 | 사용법 |
|---|---|---|
| `render.mjs` | `cards.mjs` → 1080×1350 PNG (Chromium 헤드리스) | `<시리즈 폴더> [--only=카드id]` |
| `template.mjs` | 기준본 CSS·구조 **단일 원천** (디자인은 여기서만 바뀐다) | 모듈 전용 |
| `build-reel.mjs` | 카드 PNG → 릴스 mp4 (1080×1920 H.264+AAC) | `<시리즈> --cover=cover-a [--music= --profile=reach\|full]` |
| `gen-music.mjs` | placeholder 배경음 합성 (코드 합성물) | `[출력.wav] [길이초=36]` |
| `build-record.mjs` | 검토용 기록 HTML (base64 임베드) | `<시리즈> <사진폴더> <출력.html>` |

### 3-5. 사진·소재 조달

| 파일 | 역할 | 주의 |
|---|---|---|
| `import-commons-image.mjs` | Wikimedia Commons 원본 + 출처·라이선스 근거 다운로드 | **게시용 1순위 경로** |
| `stock-photo.mjs` | Pexels 검색 | ⚠ **내부 시안·목업 전용.** 산출물에 쓰면 `placeholder`로 4중 게이트에 차단됨 |
| `gen-image.mjs` | AI 생성 이미지 | ⚠ 동일 — 재게시 불가 |

### 3-6. 타 채널 변환 (인스타 콘텐츠 재사용)

`cafe-publish.mjs`(다음카페용 존댓말·큰글씨) · `band-publish.mjs`(네이버 밴드 요일별).
둘 다 `gemini.mjs` 경유 → `GEMINI_API_KEY` 간접 필요.

---

## 4. 자동화 — GitHub Actions

### 4-1. `instagram-activation-checkpoints.yml` — **유일하게 예약 실행되는 워크플로**

```yaml
on:
  workflow_dispatch:   # inputs: experiment, instagram_snapshot_path
  schedule:
    - cron: '15 */6 * * *'    # UTC 00:15 / 06:15 / 12:15 / 18:15
                              # KST 09:15 / 15:15 / 21:15 / 03:15
```

흐름: `discover`(실험 목록 + `test:instagram` 검증) → `checkpoint-status`(due 판정 → Insights
수집 → 지표 기록 → 커밋·푸시. 자동 수집이 꺼져 있으면 **명시적 실패**로 중단) → `learn`.

참조 secret: `IG_USER_ID` · `IG_ACCESS_TOKEN` · `FORESTTOUR_ADMIN_KEY`
참조 variable: `vars.ACTIVATION_COLLECT_ENABLED`

**실행 이력** (`gh run list`, 2026-07-29 조회):

| 시각(UTC) | 결과 |
|---|---|
| 2026-07-29T03:33 | ✅ **success** |
| 2026-07-28T19:49 | ❌ failure |
| 2026-07-28T14:32 | ❌ failure |
| 2026-07-28T08:48 | ❌ failure |
| 2026-07-28T03:30 | ❌ failure |
| 2026-07-27T19:50 | ❌ failure |

연속 실패 5건은 **설계된 fail-closed**였다(수집 경로가 없는데 조용히 넘어가지 않는다).
`FORESTTOUR_ADMIN_KEY` 등록 + `ACTIVATION_COLLECT_ENABLED=true` 이후 **7/29 03:33에 처음 성공**했다.
→ 측정 루프는 지금 살아 있다.

### 4-2. `daily-cardnews.yml` — **예약 실행이 걸려 있지 않다**

`on:`에 `workflow_dispatch`만 있고 **`schedule:` 항목이 없다.** 파일 주석에 cron 시각이 적혀
있으나 그건 복구 예정 메모다:

> `# 공개 JPEG 배포와 운영 계정 검증 전에는 예약 실행하지 않는다.`
> `# 준비 완료 후 schedule을 복구하고 각 단계의 실제 산출물을 먼저 3회 수동 검수한다.`

입력: `step`(full/sense/publish/analyze/strategy) · `series` · `publish_live`(bool) ·
`preflight_only`(bool) · `experiment`
잡: `sense` → `publish`(렌더·JPEG·`instagram-assets` 브랜치로 공개 배포·**캐러셀 게시**·0h 기록·
카페/밴드 콘텐츠 생성) → `analyze` → `strategy`
secret: `IG_USER_ID` · `IG_ACCESS_TOKEN` · `GEMINI_API_KEY` / variable: `vars.LOOP_SENSE_ENABLED`

⚠ **이 워크플로의 publish 잡은 캐러셀 전용이다**(`daily-publish.mjs` 호출). **릴스 게시 경로가 아니다.**

### 4-3. `instagram-story-followup.yml` — 수동 전용

입력: `experiment`(기본 `sado-003`) · `series` · `manifest`. 예약 없음. `permissions: contents: read`.
Story 자산 재빌드 → **24h 체크포인트 게이트 검증** → 모바일 업로드용 패키지를 아티팩트로 업로드.
(Story 링크 스티커는 API로 못 붙인다 — 모바일 수동 단계다.)

### 4-3-A. `instagram-reel-publish.yml` — **릴스 전용 (2026-07-29 신설)**

수동 디스패치 전용, 예약 없음. **기본값이 `preflight`라 실수로 디스패치해도 아무것도 게시되지 않는다.**

| mode | 하는 일 |
|---|---|
| `preflight` | 러너에서 Graph 자격이 동작하는지만 확인. **자산 배포도 게시도 없음** |
| `verify` | 자산을 `instagram-assets`에 공개 배포 + REELS 컨테이너 생성·폴링. **게시 안 함** |
| `publish` | 실게시. `experiment` 입력 **필수**(측정에 연결되지 않는 게시를 만들지 않기 위해) |

입력: `series`(northern-alps / sado) · `mode` · `experiment`
자격 확인을 자산 배포보다 **먼저** 두었고(캐러셀 경로와 같은 순서), 공개 URL을 우리가 먼저 받아
로컬과 **SHA-256을 대조**한 뒤에만 Meta에 넘긴다.

```bash
# 1단계 — 러너 자격 확인 (게시 0건)
gh workflow run instagram-reel-publish.yml --repo 6Soo/marketing \
  -f series=northern-alps -f mode=preflight
# 2단계 — Meta가 raw URL을 소화하는지 확인 (게시 0건)
gh workflow run instagram-reel-publish.yml --repo 6Soo/marketing \
  -f series=northern-alps -f mode=verify
# 3단계 — 실게시 (사장 결정 후)
gh workflow run instagram-reel-publish.yml --repo 6Soo/marketing \
  -f series=northern-alps -f mode=publish -f experiment=<릴스실험ID>
```

**실행 이력** (2026-07-29):

| run | mode | 결과 |
|---|---|---|
| `30437191779` | preflight | ✅ 러너 Graph 자격 실증 · 게시 한도 사용 0 |
| `30437257592` | verify | ✅ Meta가 raw URL 소화 확인 · `container_id=18068450156507190` · **게시 안 함** |
| `30437313…` | preflight | ✅ 게시 한도 사용 **0 유지** — 게시가 새지 않았음 확인 |

⚠ **`mode=publish`는 아직 한 번도 실행하지 않았다.** 실게시는 사장 결정 사항이다.

### 4-4. GitHub 시크릿·변수 현황 (`gh` 조회, 값 아님 이름만)

| 이름 | 종류 | 등록 시각(UTC) |
|---|---|---|
| `IG_USER_ID` | secret | 2026-07-26T19:11:41 |
| `IG_ACCESS_TOKEN` | secret | 2026-07-26T19:11:42 |
| `FORESTTOUR_ADMIN_KEY` | secret | 2026-07-28T21:02:01 |
| `ACTIVATION_COLLECT_ENABLED` = `true` | variable | 2026-07-28T21:14:27 |

---

## 5. 측정 루프 — 실험별 현재 상태

`node tools/instagram-activation-report.mjs --experiment=<id> --json` 직접 실행 결과
(2026-07-30T00:36 UTC 기준).

### `sado-003`
- permalink `https://www.instagram.com/p/DbRD-fWkyUL/` · publishedAt `2026-07-26T18:47:02.033Z`
- **activation.status = `collecting`** (publishedPermalink ✓ / organicInteraction ✗ / instagramAttributedStoryVisit ✗)

| 체크포인트 | 상태 | 기한(UTC) | 관측 |
|---|---|---|---:|
| 0h | **recorded** | — | 3건 |
| 24h | **missed** ❌ | 2026-07-27T18:47:02 | 0건 |
| 72h | **recorded** ✅ | 2026-07-29T18:47:02 | 5건 |
| 7d | upcoming | 2026-08-02T18:47:02 | — |

### `northern-alps-004`
- permalink `https://www.instagram.com/p/DbRGuL5kwEU/` · publishedAt `2026-07-26T19:15:31.598Z`
- **activation.status = `collecting`** (동일 패턴)

| 체크포인트 | 상태 | 기한(UTC) | 관측 |
|---|---|---|---:|
| 0h | **recorded** | — | 2건 |
| 24h | **missed** ❌ | 2026-07-27T19:15:31 | 0건 |
| 72h | **recorded** ✅ | 2026-07-29T19:15:31 | 4건 |
| 7d | upcoming | 2026-08-02T19:15:31 | — |

두 실험 모두 `latestMetrics`의 likes/comments/saves/shares/organicInteractions/profileVisits/follows = 0.

### 5-1. ⚠ 24h는 영구 복구 불가

Meta 개발자 계정 차단 기간과 겹쳤고, **Instagram Insights는 누적 lifetime 값**이라 지각 수집이
불가능하다. 26시간 뒤에 받은 숫자를 `24h 관측치`로 기록하면 거짓이 박제된다.
그래서 `COLLECTION_GRACE_HOURS = 6`(`tools/instagram-activation-report.mjs:20`)을 도입해
유예를 넘기면 `missed`로 확정하고 수집 후보에서 제외한다. 72h는 아래 복구 절차로 수집했고,
**다음 유효 창은 7d다.**

### 5-2. ✅ 72h 체크포인트 장애 및 유예 내 복구 완료

| | 기한(UTC) | 유예 만료(UTC) | 유예 안에 도는 크론 |
|---|---|---|---|
| sado-003 | 2026-07-29T18:47 | 2026-07-30T00:47 | **`00:15Z` 단 1회** |
| northern-alps-004 | 2026-07-29T19:15 | 2026-07-30T01:15 | **`00:15Z` 단 1회** |

정기 실행 `30485400588`은 FEED/CAROUSEL에 지원되지 않는 `profile_visits,follows`를 요청해
Graph API code 100으로 실패했다. 미디어 유형별 메트릭을 분리했으며, 이어 발견된 워크플로
조건식 오류도 실제 스냅샷 파일 존재 여부를 셸에서 검증하도록 고쳤다.

- 사도 복구 실행 `30503086785`: 전체 성공, Graph API·foresttour 기록 저장
- 북알프스 복구 실행 `30503139708`: 전체 성공, Graph API·foresttour 기록 저장
- 로컬 보고서 재검증: 두 실험 모두 72h `recorded`, missing source group 없음
- 회귀 테스트: `npm run test:instagram` 74/74 통과

두 실행은 각각 00:47Z·01:15Z 유예 만료 전에 끝났다. 다음 자동 관측 대상은
2026-08-02의 7d 체크포인트다.

---

## 6. 시리즈 자산 현황

| 시리즈 | 번호 | 지역 | `photoStatus` | 카드 | `connectedTour` | 게시 가능? |
|---|---|---|---|---:|---|---|
| `hida` | 001 | 히다 | **`placeholder`** (AI 생성) | 7 | — | ❌ 게이트 차단 |
| `sanriku` | 002 | 산리쿠 | **`placeholder`** (Pexels 대역) | 9 | — | ❌ 게이트 차단 |
| `sado` | 003 | 사도 | ✅ `verified` (Commons) | 7 | `null` (fail-closed 정상) | ✅ |
| `northern-alps` | 004 | 북알프스 | ✅ `verified` (Commons) | 8 | `productId: "fNod"` | ✅ |

### `cardnews/out/` 실제 산출물

| 시리즈 | PNG | 스테이징 JPEG | 기타 |
|---|---:|---:|---|
| hida | 7 | 14 (2세대) | — |
| sanriku | 9 (표지 3안 포함) | 9 | `reel-cover-a.mp4` |
| sado | 7 | **0** ⚠ | `reel-cover-a.mp4`, `story/01-discovery-link.jpg`, `story/manifest.json` |
| northern-alps | 8 | 8 | `reel-cover-a.mp4`, `reel-hook-strip.jpg`, `_caption-northern-alps.txt`, `_manifest-northern-alps.json` |

⚠ 사도는 스테이징 JPEG가 보존되지 않았다(`data/publish-records/sado-003.json`의 gaps에 기록됨).

### 릴스 산출물 (2026-07-29 재빌드, 실측 검증)

| | 북알프스 004 | 사도 003 |
|---|---|---|
| 길이 | 9.40초 | 7.90초 |
| 해상도·코덱 | 1080×1920 · h264 High · yuv420p · 30fps | 동일 |
| 오디오 | AAC LC 44.1kHz stereo 131kbps | 동일 |
| 크기 | 5.58MB | 2.80MB |
| 첫 프레임 밝기(YAVG) | **65.4** | 95.6 |
| 볼륨 | mean −18.8dB / peak −1.2dB | −19.1 / −1.2 |
| 음원 | ✅ Pixabay 실트랙 | ✅ 동일 |

훅 구조: 페이드인 없음(0프레임부터 최대 밝기) → 표지 펀치인 1.6초 → **1.6초 지점 급속 컷 3연발**
(패턴 인터럽트, 이탈 결정 시점 1.7초와 겹침) → 켄번즈 페이오프 → 아웃트로.
`--profile=reach`(기본) / `--profile=full`(구버전 보존).

---

## 7. 콘텐츠 원칙 — 어디에 적혀 있나

전문은 `CLAUDE.md`. 인스타에 직접 걸리는 것만 추린다.

1. **제0원칙 — 여행상품이 아니라 여행지를 소개한다.** 주인공은 그 땅이지 일정·박수·대장명·가격이 아니다.
2. **비주얼 계약** — 기준본 `cardnews/나만몰랐던일본-001-히다.html`의 CSS·구조를 복사해 내용만 바꾼다.
   새 디자인을 창작하지 않는다. 전 카드 풀블리드 실사진 + 하단 스크림 + 흰 글씨.
3. **사진 소싱은 화면 기준이 출처보다 먼저다**(2026-07-28 개정). 장변 2700px↑, 하단 1/3 비움,
   상단 좌우 비움. 통과한 것 중 ① Commons PD·CC0·CC BY(**CC BY-SA 제외**) → ② 대장 원본 → ③ 없으면 만들지 않는다.
4. **카페·밴드 회원을 인스타 팔로워로 끌어오지 않는다**(사장 확정 2026-07-29). 이유는 예의가 아니라
   알고리즘이다 — 팔로워 0 계정은 초기 팔로워 반응이 추천 시스템에 학습된다. 50~60대가 먼저 들어오면
   **정작 닿아야 할 20~40대 도달이 나빠진다.**
5. **저장이 유일 지표**, 마지막 장은 CTA가 아니라 저장 유도. 2026 랭킹 신호는 시청시간 · 도달 대비
   좋아요 · **도달 대비 전송(sends)** 이고 sends 가중치가 가장 크다 → 공유 유도 한 줄이 캡션에 들어간다.
6. **Instagram ↔ foresttour.kr은 한 편집 단위**다. 인스타 표지 질문과 `foresttour.kr/stories/<slug>`의
   첫 답이 같은 의미를 가져야 한다. 규칙: `context/인스타그램-foresttour-콘텐츠-연결-규칙-2026-07-26.md`

### 관련 문서 색인

| 경로 | 요지 |
|---|---|
| `strategy/인스타-최초도달-확보-실행안-0729.md` | **도달 0 진단·실행안. 지금 가장 중요한 문서.** |
| `strategy/인스타-자동업로드-측정루프-설계-0727.md` | 자동 업로드·측정 루프 설계서 |
| `strategy/인스타그램-전체-검토-개선-0726.md` | 0726 시점 전체 검토 |
| `learning/학습-09-인스타-여행마케팅.md` | 콘텐츠→상품 연결을 광고 냄새 없이 (조사 3건 종합 + 디자인 스펙) |
| `learning/학습-10-릴스vs캐러셀-음악-저장전략.md` | 정적 카드뉴스에서 음악은 훅이 아니다 |
| `cardnews/docs/훅-독트린.md` | 헤드라인 훅 공학 |
| `cardnews/docs/인스타-자동게시-음악.md` | 캐러셀+음악 자동화는 사양상 불가 → 릴스로 굽는 근거 |
| `cardnews/docs/commons-대체가능성-실조회-0728.md` | placeholder 시리즈의 Commons 대체 가능성 판정 |
| `cardnews/docs/다음-편집단위-후보-3건-0728.md` | 다음 여행지 후보 3건 |
| `context/인스타-활성화-24h-스냅샷-작성가이드.md` | API 불가 시 사장이 화면 숫자를 손으로 옮기는 절차 |
| `context/사장님-가이드.md` §9-2 | API 연결 상태·심사 불필요 확인 + §9-2-A 재발 시 진단 절차 |

---

## 8. 데이터 파일 지도

| 경로 | 내용 | 현재 상태 |
|---|---|---|
| `data/insights/2026-07-28.json` | Insights 전체 스냅샷(계정 + 미디어 5건) | 실측값 보유 |
| `data/experiments/{sado-003,northern-alps-004}.json` | 실험 정의(가설·체크포인트 스키마·guardrails) | — |
| `data/activation/<exp>/` | 체크포인트 레코드 + `index.json` | 0h만 기록됨 |
| `data/publish-records/{sado-003,northern-alps-004}.json` | 게시 실행기록 | `provenance.kind: "backfill"`(소급 생성) |
| `data/instagram-ui/<exp>-24h.json` | 사장 수기 입력용 24h 템플릿 | ⚠ `"숫자입력"` 플레이스홀더 그대로 |
| `data/performance.json` | 훅 공식 6종 성과 집계 | ⚠ 전부 0 · `lastUpdated: null` (미가동) |
| `data/calendar.json` | 채널별 발행 빈도 설정 | ⚠ `queue`·`history` 비어 있음 (미가동) |
| `data/series-queue.json` | 코스북 소재 큐 | 산리쿠 in-progress, 나머지 pending |

---

## 9. 미해결 — 우선순위 순

### ★ (1) 릴스 실게시 — **자산은 준비 끝. 실행 환경만 남았다**

| 블로커 | 상태 |
|---|---|
| ① 음원 트랙 | ✅ **해소** (2026-07-29). Pixabay `Reflected Light` 확보·SHA-256 검증·라이선스 캡처 보관 |
| ② 릴스 실게시 결정 | ✅ **자연 해소** — 음원이 들어왔으므로 "placeholder로 먼저 낼지"라는 선택 자체가 사라짐 |
| ③ 실행 환경 | ❌ **리눅스 체크아웃에 `.env` 없음** — 아래 참조 |

`node tools/instagram-publish.mjs doctor` → `Instagram API 자격정보가 없습니다.`
`IG_ACCESS_TOKEN` · `IG_USER_ID` · `PUBLIC_BASE_URL` · `PUBLIC_DIR` 전부 미설정.
`.env`는 Windows 체크아웃에만 있고 `.gitignore`가 막으므로 git으로 넘어오지 않는다.

#### ⚠ 정정 — "이 머신에서는 게시가 불가능하다"는 **틀렸다** (Fable 반박 검증 2026-07-29)

로컬 직접 실행은 불가하지만 **GitHub Actions 경로가 열려 있다.** 실측 근거:

| 고리 | 실측 |
|---|---|
| 시크릿 | `IG_ACCESS_TOKEN`·`IG_USER_ID` GitHub에 등록됨(§4-4) — 워크플로 env로 주입 가능 |
| 트리거 권한 | `gh auth status` → 계정 `6Soo`, 스코프에 `repo`·`workflow` 포함 |
| 릴스 게시 코드 | `tools/instagram-publish.mjs`의 `reel` 명령. 자격을 `process.env` 우선으로 읽음 |
| 공개 호스팅 | **리포가 PUBLIC**(`gh repo view` → `"visibility":"PUBLIC"`). `daily-cardnews.yml`이 자산을 orphan 브랜치 `instagram-assets`에 올리고 `raw.githubusercontent.com/<repo>/<고정SHA>/…`로 서빙한다 |
| mp4 raw 접근 | 실측 `curl -I` → **HTTP 200 · content-length 5,577,664** |

**남은 것은 단 하나 — 릴스를 게시하는 워크플로가 아직 없다.**
`daily-cardnews.yml`의 publish 잡은 `daily-publish.mjs`(캐러셀 전용)만 호출한다.
릴스 스텝을 담은 워크플로 1개를 커밋·푸시하면 이 머신에서 디스패치만으로 게시가 완결된다.

#### ✅ 미검증 고리 2개 — **2026-07-29 둘 다 실증으로 닫혔다 (게시 0건)**

**1. Actions 러너에서의 Graph 자격** — `mode=preflight` 실행 `30437191779`:
```
✓ Instagram API 연결 정상 · @foresttour.kr · 게시 한도 사용 0
```
그전까지 `doctor` 성공 기록은 `.env`가 있는 Windows 머신 기준이었다. **이제 러너에서 실증됐다.**

**2. Meta가 `raw.githubusercontent.com`의 mp4를 소화하는가** — `mode=verify` 실행 `30437257592`:
```
content-type: application/octet-stream
VIDEO_URL: https://raw.githubusercontent.com/6Soo/marketing/d9508146…/instagram/reel-30437257592-1/reel.mp4
✓ 릴스 컨테이너 검증 통과 · container_id=18068450156507190
  Meta가 video_url을 실제로 내려받아 처리를 마쳤습니다. 게시하지 않았습니다.
```
`content-type`이 `application/octet-stream`인데도 **Meta가 정상적으로 내려받아 처리를 완료했다**
(컨테이너 생성 → `FINISHED`까지 약 34초). 로컬↔공개 URL SHA-256 대조도 통과했다.

이것이 중요한 이유: `data/activation/*/`의 0h 기록이 전부 `"source": "instagram-ui"`다 —
**기존 캐러셀 5건은 전부 웹 UI 수동 게시**였고(Meta 차단 기간과 겹침), 워크플로의
raw URL → Graph API 경로는 **한 번도 성공한 적이 없었다.** 이제 성공한다는 것이 확인됐다.

**게시가 새지 않았음 확인**: 검증 직후 `preflight` 재실행 → `게시 한도 사용 0` (변동 없음).
미발행 컨테이너는 만료되며 공개 게시물로 남지 않는다.

> **→ 릴스 게시 경로는 마지막 `media_publish` 호출 하나만 남았다.**
> `mode=publish` 디스패치 한 번이면 게시된다. **그 한 번이 사장님 결정이다.**

**코드 공백**: `assertNotDuplicateCaption`(최근 25건 캡션 대조)은 **carousel 분기에서만 호출된다.**
reel 분기에는 없다. 릴스 게시 경로를 만들 때 이식해야 한다.
※ 이번에 만든 릴스 캡션 2건은 수동으로 지문 대조를 마쳤다(§9-1-B).

### 9-1-B. 릴스 캡션 — 신설 (2026-07-29)

릴스는 캐러셀과 **다른 게시물**이므로 캡션을 따로 둔다. 같은 캡션을 재사용하면 산리쿠 중복
사고와 같은 불이익을 받는다.

| 파일 | SHA-256 |
|---|---|
| `cardnews/out/sado/_caption-reel-sado.txt` | `a67796a99ab9…d27091` |
| `cardnews/out/northern-alps/_caption-reel-northern-alps.txt` | `e24ffd183ee7…44a0e` |

두 지문 모두 `data/publish-records/*.json`의 기존 게시 지문 및 캐러셀 캡션 파일과 **전부 다르다**
(수동 대조 완료 — reel 분기에 자동 게이트가 없기 때문).
첫 줄은 릴스 첫 프레임 문안과 일치시켰다(약속-회수 일치). 해시태그 5개·검색 키워드 앞배치·
저장 및 공유 유도·음원 크레딧 포함.

### ★ (2) 사도 크레딧 결함 — **2026-07-29 새로 발견. 릴스 게시의 선결 조건이었다**

`HANDOFF-2026-07-29.md` §4-(3)은 "공개 캡션이 `Tensaibuta`를 크레딧하는데 그 사진이 게시물에
없다. 로컬 `캡션.md`는 이미 교정됨"이라고 적었다. **그 '교정'이 다른 틀린 크레딧으로 바뀐 것이었다.**

git 증거로 확정:

| | 실측 |
|---|---|
| `cardnews/out/sado/cover-a.png` 마지막 렌더 | `70e9a25` · **2026-07-26 23:45** |
| 표지를 `01-kitazawa-terrace.jpg`(Indiana jo, CC0)로 교체 | `0b6bec1` · **2026-07-29 03:55** |
| `0b6bec1`이 `cardnews/out/sado/`를 건드렸나 | **아니다** (photos/·cards.mjs·캡션.md만 변경) |

즉 `0b6bec1`은 **소스 정의만** 바꾸고 재렌더는 하지 않았다(게시 증거 보호 — 의도된 결정이며
커밋 메시지에도 명시돼 있다). 그런데 캡션은 새 표지 기준으로 고쳤다.
결과: **렌더된 PNG에 없는 사진(Indiana jo)을 캡션이 크레딧한다.** Tensaibuta 결함과 같은 클래스다.

- 렌더된 사도 자산의 실제 저작자 = **ccfarmer**(표지 = 옛 `03-kitazawa.jpg` 재사용 + 3장 카드) ·
  **amaknow** · **rhodnite** · **JH0WJF** — 4인
- 로컬 `cardnews/series/sado/캡션.md:22`가 크레딧하는 사람 = 위 4인 + **Indiana jo** — 5인

**처리**: 릴스 캡션에서 Indiana jo를 제외했다(위 §9-1-B). 재렌더로 맞추는 대안은 택하지 않았다 —
게시 증거를 덮게 되고, 현재 템플릿에는 전나무 로고가 들어가 있어 **"다음 시리즈부터 적용"**
원칙(`CLAUDE.md` 비주얼 계약 3)과도 어긋난다.

**남은 것 두 가지**:
1. `cardnews/series/sado/캡션.md`는 여전히 Indiana jo를 크레딧한다. 재렌더 전까지는 이 파일이
   **렌더 자산과 불일치**함을 알고 써야 한다. 캐러셀을 다시 낼 일이 생기면 그때 정합을 맞춘다.
2. **공개된 캐러셀 게시물**(`/p/DbRD-fWkyUL/`)의 캡션은 여전히 `Tensaibuta`를 크레딧한다.
   **공개 캡션 편집은 수동 작업**이다.

※ **북알프스는 무결하다.** 사진 8장 → 저작자 5인(663highland·Raita Futo·くろふね·Σ64·Paul Keller)이
`cardnews/photos/northern-alps/출처.md`와 캡션에서 정확히 일치함을 전수 대조로 확인했다.

### (3) CTA 관측성 브랜치 — ⚠ **유실 위험**
`reservation` 리포의 `cta-observability` @ `9e79b69`. `src/lib/storyCtaStatus.ts` 신설
(스토리 CTA 상태 판정 + 36시간 staleness). 테스트 94/94 · tsc 0 · ESLint 0 · build 성공은
확인됐으나 독립 검증 판정을 못 받았다.
**2026-07-29 확인: 이 브랜치는 원격(`origin`)에 없다.** `git ls-remote --heads` 결과 0건.
Windows 머신 `C:/Users/kkokk/orca/workspaces/reservation/cta-observability`에만 있고 **미푸시**다.
→ 그 머신이 정리되면 사라진다. **먼저 푸시해 보존할 것.**

### (4) placeholder 시리즈 2건 (히다 001 · 산리쿠 002)
`photoStatus: placeholder`라 게이트에 막힌다. 릴스도 못 만든다. 사진 교체가 선행 조건.
Commons 대체 가능성 판정은 `cardnews/docs/commons-대체가능성-실조회-0728.md`.

### (5) 이미 게시된 카드뉴스에 공식 로고(전나무)가 없다
`cardnews/out/`은 게시 증거라 재렌더로 덮지 않았다. **다음 시리즈부터 자동 적용**되므로 급하지 않다.
맞출지 여부는 사장님 판단.

### (6) 24h 체크포인트 영구 누락 (사도·북알프스 둘 다)
복구 불가. §5-1 참조. **72h를 놓치지 않는 것이 지금 할 수 있는 최선**이다(§5-2).

### (7) 미가동 집계
`data/performance.json`(훅별 성과)·`data/calendar.json`(발행 이력)이 비어 있다.
도달이 0이라 학습할 데이터 자체가 없는 것이 근본 원인 — 도달이 생기면 자연히 채워진다.

---

## 10. 함정 목록 — 같은 실수 반복 방지

1. **`cardnews/out/`에 카드 PNG를 재렌더하지 마라.** 게시 증거다. 확인이 필요하면
   `cardnews/series/_임시이름`으로 복사해 렌더하고 지운다. ⚠ `render.mjs`가
   `repoRoot = resolve(dir,'..','..','..')`로 계산하므로 **리포 루트 기준 깊이 3**이어야 한다.
   Chrome 스크린샷은 비동기 기록이라 렌더 직후 곧바로 읽으면 "파일 없음"이 난다.
2. **게시 증거는 줄바꿈이 바뀌면 지문이 깨진다.** `.gitattributes`가 `cardnews/out/**` ·
   `cardnews/photos/**` · `data/publish-records/**`를 `-text`로 막고 있다. **풀지 마라.**
3. **릴스는 로고 삽입 이전의 렌더 PNG로 만들어졌다.** 좌상 워터마크가 원형 RECORD 스탬프이고
   전나무 심볼이 없다 — **이미 게시된 캐러셀과 일관**되므로 정상이다. 릴스를 재빌드하려고
   카드를 재렌더하면 심볼이 들어가 게시 증거와 어긋난다.
4. **인스타 지표 이름을 추측으로 쓰지 마라.** `impressions`·`navigation`은 CAROUSEL_ALBUM에서
   거부되고(code 100), **지표 하나가 거부되면 요청 전체가 실패한다.** 확정 목록은
   `tools/ig-insights.mjs` 주석에. 계정 인사이트는 미디어와 허용 집합이 다르다.
5. **Graph API가 막히면 앱 설정부터 뒤지지 마라.** 2026-07-26~29의
   `OAuthException code 200 "API access blocked"`의 실제 원인은 **Meta 개발자 계정 제한**이었다.
   `developers.facebook.com` 로그인 상태·계정 제한부터 확인한다. 진단 절차는
   `context/사장님-가이드.md` §9-2-A. ※ 앱 심사·비즈니스 인증은 **불필요**함이 실측 확인됐다.
6. **부분 체크포인트를 학습에 쓰지 마라.** 두 소스 그룹(인스타 + foresttour)이 모두 있어야
   학습 가능하다. 안 보이는 값을 추정하지 않는다.
7. **`git 히스토리에 Pexels 키가 남아 있다**(`bfb998c`). 리포를 외부에 열기 전 재발급 필수.
8. **PII 금지** — 회원 실명·연락처·주민번호는 이 리포에 절대 기재하지 않는다. 닉네임은 PII 아님.
9. **`.omc/`, `.codex-remote-attachments/`는 비소유다.** 커밋·전송 금지.
10. **다른 에이전트·도구의 보고를 그대로 믿지 마라.** "치명적 결함"이라는 반박이 실은 경로
    문자열을 잘못 읽은 것이었던 전례가 있다. 파일:줄로 확인한다.
11. ⚠ **`/home/kkokk/AX/marketing` 리눅스 체크아웃은 손상된 복사본이었다**(2026-07-29 복구 완료).
    추적 파일 133건 CRLF 뒤집힘 + `reel-cover-a.mp4` 0바이트 + `node_modules` 바이너리 전부 0바이트.
    **같은 증상이 보이면 `git status`에 대량 변경이 뜨는지, `git diff --ignore-cr-at-eol`이
    비는지부터 확인하라.** 비면 순수 줄바꿈 사고이므로 `git restore .`로 복구된다.
12. ⚠ **이 체크아웃에서 여러 세션이 동시에 작업 중일 수 있다**(2026-07-29 실측: claude 프로세스 3개,
    커밋이 14초 간격으로 교차). **`git add .`를 쓰지 말고 파일을 하나씩 지정해 담아라.**
    남의 미완성 작업이 내 커밋에 섞인다.

---

## 11. 이 세션(2026-07-29)이 한 일

| 커밋 | 내용 |
|---|---|
| `f7014af` | Pixabay 실음원 확보 — 블로커 ① 해소. SHA-256 검증, 라이선스 캡처, **Content ID 주의 신규 기록** |
| `014ee5e` | `AGENTS.md §0-A` 모델 라우팅 지침 등재 + `CLAUDE.md` 포인터 |
| `fcafa6f` | 사도·북알프스 릴스를 실음원으로 재빌드 + 규격 실측 검증 |

그 밖에 커밋 없이 한 일:
- **체크아웃 손상 복구** — `git restore` + `npm` 재설치. `npm run test:instagram` **68/68 통과**로 확인.
- **워크플로·시크릿 실조회 검증** — `daily-cardnews.yml`에 schedule이 없다는 사실,
  체크포인트 워크플로가 7/29 03:33에 처음 성공했다는 사실을 `gh`로 확인.
- **72h 크론 기회가 1회뿐이라는 위험** 발견(§5-2).
- **CTA 관측성 브랜치가 원격에 없다는 사실** 확인(§9-3).

### ⚠ 음원의 새 주의사항 — `Content ID Registered`

Pixabay 라이선스 화면에 `Content ID Registered` 배지가 있고, 업로더가 직접 "유튜브 채널이
수익화된 경우 Pixabay Content ID 라이선스 증명서로 클레임에 이의를 제기하라"고 안내한다.
**인스타는 무관.** 유튜브 채널을 열면 업로드 후 클레임이 붙을 수 있고 증명서로 푸는 절차가 필요하다.
"한 번 구워 양쪽에 쓴다"는 성립하되 **유튜브 쪽이 무마찰은 아니다.**

---

## 12. 다음 세션이 할 일 — 순서대로

1. ~~**72h 체크포인트 워크플로 복구 및 기록 확인**~~ — ✅ **완료** (§5-2).
   두 실험 모두 Graph API·foresttour 소스를 유예 내 저장했고, 다음 대상은 7d다.
2. ~~릴스 게시 워크플로 작성~~ — ✅ **완료** (`instagram-reel-publish.yml`, §4-3-A).
   `--verify-only` 모드와 릴스 분기의 게이트 공백 2건(중복 캡션·지문 형식)도 함께 메웠다.
3. ~~게시 전 사전 검증 2건~~ — ✅ **완료** (§9-1). 러너 자격·Meta의 raw URL 소화 둘 다 실증.
   게시 한도 사용 0으로 게시가 새지 않았음도 확인했다.
4. **릴스 실게시 — 남은 것은 이 한 번의 디스패치뿐이다.** 사장 결정 사항.
   **북알프스 먼저 한 편**을 권한다: 캡션이 무결하고
   첫 프레임 밝기(65.4)가 확인됐다. 캐러셀 2편 동시 게시는 도달 0이라 아무것도 가르쳐주지
   못했고, 릴스는 처음으로 신호가 생길 기회라 변수를 분리하는 값이 크다. ※ 데이터가 아니라 판단이다.
5. **릴스용 실험 파일 신설** — `data/experiments/`에는 캐러셀 실험 2건뿐이다.
   같은 실험 ID에 릴스 permalink를 섞으면 측정이 오염된다.
6. **CTA 관측성 브랜치 푸시**(§9-3) — 유실 위험이 있으므로 병합 여부와 무관하게 먼저 보존.
7. 사도 공개 캐러셀 캡션 크레딧 수동 교정(§9-2).
8. 릴스 게시 후 72h·7d 인사이트로 **해시태그·훅 가설 검증** → `data/performance.json` 가동.
9. placeholder 2건(히다·산리쿠) 사진 교체 또는 새 편집 단위 착수
   (`cardnews/docs/다음-편집단위-후보-3건-0728.md`). 착수 전 Commons 실조회로 **가용 사진 수를 셀 것**
   (파일 수는 지표가 아니다 — 도호쿠 단풍 250장 중 가용 1장이었던 실측 전례).

---

*이 문서의 사실 검증: Opus 5(설계·최종 확정) ↔ Fable 5(반박 검증) 상호 검증 — `AGENTS.md` §0-A 절차.
GPT 5.6 Sol 측 교차검증은 이 환경에 브리지가 없어 **미수행**이다. 인벤토리 수집은 저추론 레인
위임(AGY Flash 3.6 불가 → Sonnet 대체) 후 Opus가 `gh`·파일 실조회로 재검증했다.*
