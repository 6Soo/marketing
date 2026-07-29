# 핸드오프 — ig-insights 무효 메트릭 수정·측정 루프 복구 (2026-07-29)

> 새 세션 인수인계용. 이 세션(설계→적대적 검토→재반론→구현→테스트)의 프로젝트 관련 결정과
> 상태를 전부 수록한다. 설계 원문(`.omc/reports/T1·T3`)은 gitignore 대상이라 요지를 여기 옮겼다.

## 배경 (장애)

`node tools/ig-insights.mjs collect --live`가 전면 중단됐었다. 원인:
`getMediaInsights()`의 메트릭 목록에 든 `impressions`가 FEED(CAROUSEL_ALBUM) 미디어에서
HTTP 400 (`code 100 · "The Media Insights API does not support the impressions metric for this
media product type."`)을 반환. 실측으로 `reach·saved·likes·comments·shares·views·
total_interactions·profile_visits`는 전부 OK, `impressions`만 실패임이 확인됐다.

## 확정 설계 (T1 → 적대적 검토 FAIL → T3 재반론·개정으로 확정)

### A. 메트릭 목록
- `MEDIA_METRICS = ['reach','saved','likes','comments','shares','views']` 고정 상수.
  bulk 요청과 fallback이 이 상수를 공유한다(목록 이원화 방지).
- `impressions` 제거(400 원인), `views` 추가(impressions의 공식 대체 지표).
- `views` 유지 근거: ① 메트릭 단위 fallback 채택으로 "미소비 메트릭 +1 = 전체 사망 위험"
  전제가 소멸 ② 인사이트는 소급 수집 불가한 시계열 — 오늘 안 걷으면 영구 결손이므로 미래
  하류 채택 대비 축적. 보존 지점은 `data/insights/<date>.json` raw 스냅샷.
- `total_interactions`·`profile_visits` 미채택(하류 미소비 + 실사용 계획 없음).

### B. .env 로더
- `IG_ENV_FILE` 환경변수 오버라이드 추가(instagram-publish.mjs와 동일 패턴 + 정규식 이스케이프).
- `process.env` 직접 값 최우선 → 미설정 시 리포 루트 `.env` — 하위호환 완전 유지.
- 워크트리에는 `.env`가 없으므로 `IG_ENV_FILE=<메인 체크아웃>/.env`로 실행.
  override 경로가 잘못돼도 기본 `.env`로 재fallback하지 않는다(의도된 fail-closed).

### C. 메트릭 재노후화 생존 설계 (핵심 개정 지점)
- **bulk 우선(평상시 1배) → bulk 실패 시에만 `MEDIA_METRICS` 개별 호출을
  `Promise.allSettled`로 병합**(장애일 최대 미디어당 1+6회). 오류 문구 파싱 없음.
- 실패 메트릭은 **부재**로 남기고 `metricErrors`에 기록. `insightsFallback: true` 병기.
- 전 메트릭 실패면 빈 성공으로 위장하지 않고 throw → 미디어 단위 격리
  (`{ media, insights: null, insightsError }`)로 기록 후 다음 미디어 진행.
- **전멸 가드**: live에서 전 미디어 격리 시 파일 저장 후 `process.exitCode = 1`.
  부분 성공이면 exit 0 — "메트릭 하나가 낡아도 수집 전체가 죽지 않는다"의 구현.
- **stderr 진단**: metricErrors·insightsError는 JSON과 동시에 stderr 출력(워크플로에서
  스냅샷 JSON이 커밋·업로드되지 않아 stderr가 유일한 진단 근거). `safeGraphError()`가
  토큰 미포함을 보장.
- **불변 원칙 준수**: 받지 못한 값은 만들지 않는다. 0 채움 금지. 단 정확한 문구 —
  insight 지표는 실패 시 부재로 남고, likes/comments만 `media.like_count/comments_count`의
  **관측값**(실제 0 포함)으로 하류가 fallback하며, 둘 다 없으면 하류는 오류를 낸다(fail-closed).

### 적대적 검토 반박 5건 처리 결과
1. views 미소비 모순 → 지적 수용, 결론은 views 유지(위 근거 + 보존 경로 명시).
2. "0이 생기지 않는다" 문구 오류 → 수용·정정, 3케이스를 필수 테스트로 승격(T-3).
3. 미디어 단위 격리만으로는 메트릭 노후화 미방어 → 전면 수용, 메트릭 단위 fallback으로 교체.
4. insightsError가 진단 근거로 안 남음 → 수용, stderr 출력 수용기준화(T-5).
5. IG_ENV_FILE 하위호환 → 반례 없음, 원안 유지.

## 구현 상태 (이 커밋에 포함)

- `tools/ig-insights.mjs` — 위 A·B·C 전부 구현. `getAccountInsights()`·dry-run 경로 무변경.
- `tools/ig-insights.test.mjs` — 신규, 수용 테스트 T-1~T-7 6건
  (fallback 부분 생존 / 합성 0 금지 / 하류 null 계약 3케이스 / 전멸 가드 / stderr 무토큰 /
  IG_ENV_FILE 하위호환 / views 보존).
- `package.json` — `test:instagram`에 신규 테스트 파일 추가.
- **검증: `npm run test:instagram` 69건 전건 통과**(기존 63 + 신규 6, 2026-07-29 실행).

## 남은 작업 (다음 세션)

1. **라이브 재검증 (최우선)**: `.env` 있는 메인 체크아웃에서
   `node tools/ig-insights.mjs collect --live` 실행 — 실 Graph API로 400 해소와
   스냅샷 저장(views 포함)을 확인. 이 세션 워크트리에는 `.env`가 없어 미수행.
2. **테스트 오염 수정**: `ig-insights.test.mjs`의 T-4가 `collectInsights(true)`를 실경로로
   호출해 **가짜 스냅샷을 리포 `data/insights/`에 쓴다**(계정 id가 테스트 상수 9876543210).
   이번에 오염 파일 2개(07-28·07-29)를 삭제했지만, 테스트를 돌릴 때마다 재생성된다.
   `collectInsights`에 출력 디렉토리 주입(파라미터 또는 env)을 추가해 tmpdir로 돌리는 수정 권장.
   가짜 수치가 실데이터로 오인될 수 있어 "확인하지 않은 값 금지" 원칙과 충돌하는 상태다.
3. views의 하류 채택 여부 미결 — `collect-instagram-activation-metrics.mjs`의
   `extractInstagramMetrics()`에 views 매핑을 추가할지는 별도 판단(현재는 스냅샷 축적만).

## 수행 주체 표기

설계·재반론 Fable(워커) · 적대적 검토 별도 워커 · 구현 별도 워커 · 검증은 로컬 테스트 69건
(라이브 API 검증은 미수행 — 위 1번).
