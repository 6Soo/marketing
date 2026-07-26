# Codex 데스크톱 이전 인계서 — 2026-07-26 16:55 KST

> **데스크톱 시작문:** `AGENTS.md → CLAUDE.md → LOG.md 맨 아래 → docs/CODEX_DESKTOP_MIGRATION_HANDOFF_2026-07-26.md`를
> 순서대로 끝까지 읽고, `git status --short --branch`와 아래 미완료 테스트부터 재개하세요.

## 1. 목표와 현재 최우선 지시

지속 목표는 숲길여행 인스타그램의 콘텐츠·자동화 파이프라인 장기 개선이다. 매 실행마다 현재 상태와
안전장치를 감사하고, 실제 게시 전 사진 권리·중복·라이브 자산·사용자 의도를 확인하며 가장 큰
자동화 또는 콘텐츠 품질 공백을 구현·검증·커밋·푸시한다.

현재 최우선 지시는 노트북 CPU/RAM 포화로 새 실질 작업을 중단하고 데스크톱으로 무손실 이전하는 것이다.
새 브라우징·장시간 테스트·OCR·대량 LLM 호출은 시작하지 않았다. 사용자가 함께 적은 `cost 프로젝트`
도메인 규칙(카드 이벤트, OTA N:M, 2025년 이전 제외, Agoda, SQLite, 워크북·CSV)은 이 저장소가
`marketing`이므로 적용할 대상 코드가 없었다. 워크북·CSV는 생성하지 않았다.

## 2. 완료

- 커밋 `27531297f67669c24be7fcb381a408ab296a4aae`
  (`feat: redesign Instagram content and publishing safety`)을
  `codex/instagram-evidence-safety`에 푸시했다.
- 카드뉴스 고정 기준본을 MVP 기록으로 낮추고 `evidence-v2` 디자인으로 개편했다.
- 2026 포맷 조사와 캐러셀 폐기 조건, Trial Reel·원본 사진·스토리·Collab·검색형 기록 대안을
  `strategy/인스타그램-포맷-실험-0726.md`에 기록했다.
- 동일 캡션 재게시 차단, 중복 검사 실패 시 실패 폐쇄, 첫 공개 JPEG 확인, 갱신 토큰 로그 노출 제거를
  구현했다.
- 안전성 자동 테스트 3건은 커밋 전 통과했다.
- 산리쿠 대표 3장(표지·사진 내지·요약)을 1080×1350으로 렌더해 시각 검토했다.
- 원격 조사 당시 `instagram-assets` 브랜치가 없어 Actions 자산 배포 성공 이력은 없음을 확인했다.
- 이번 세션 실제 Instagram 게시·메일·외부 메시지·PR 생성은 없었다.

## 3. 부분 완료 — 현재 커밋해야 할 WIP

Windows Edge가 PNG를 만든 뒤 종료하지 않아 전체 렌더가 멈추는 문제를 해결 중이다.

- `cardnews/tools/chrome-capture.mjs` 신규:
  - 브라우저를 비동기로 실행
  - PNG 서명·IHDR·기대 크기·파일 크기 안정화를 확인
  - 캡처 뒤 종료하지 않으면 정확한 자식 PID 트리만 정리
- `cardnews/tools/render.mjs` 수정:
  - 동기 `execFileSync` 대신 위 캡처 실행기를 사용
  - 카드별 1080×1350과 파일 크기를 로그로 남김
- `tests/fixtures/fake-screenshot-browser.mjs`, `tests/chrome-capture.test.mjs` 신규:
  - PNG 생성 뒤 끝나지 않는 브라우저를 재현

첫 테스트는 1×1 fixture가 68바이트인데 실행기의 최소 크기가 1,024바이트라 실패했고 테스트 프로세스가
종료되지 않았다. 직접 시작한 Node PID `2776`, `18508`, `25556`만 종료했다. 이후 실행기에
`minBytes` 옵션과 `taskkill` 실패 시 자식 직접 종료 폴백을 추가했지만, CPU/RAM 이전 지시 때문에
재테스트하지 않았다. 이 WIP는 동작 확정 상태가 아니다.

## 4. 미완료와 판단 대기

1. 수정된 `chrome-capture` 단위 테스트 재실행 및 프로세스 잔존 확인.
2. 산리쿠 9장 전체 렌더, 모든 PNG 1080×1350 확인, 표지·중간·마지막 시각 검토.
3. 렌더 WIP가 통과하면 일반 게시 안전 테스트와 `git diff --check` 재실행.
4. 산리쿠 실제 현지 원본과 상업 이용 권리 문서 수급. 현재 `photoStatus: placeholder`이므로 실게시 금지.
5. GitHub Actions UI에서 workflow 활성 상태, `IG_USER_ID`·`IG_ACCESS_TOKEN` Secrets, 토큰 만료일 확인.
6. 첫 `instagram-assets` 배포와 공개 JPEG GET은 사람 승인과 검증된 사진 이후에만 수행.
7. Trial Reel은 Content Publishing API 자동화 지원이 확인되지 않았으므로 앱 기반 제한 실험 여부 판단 필요.

## 5. 외부 연결·자동화 실제 상태

- GitHub 원격: `https://github.com/6Soo/marketing`.
- 브랜치: `codex/instagram-evidence-safety`, 추적 원격 동일.
- 기존 HEAD와 원격 HEAD는 모두 `27531297f67669c24be7fcb381a408ab296a4aae`.
- 예약 트리거는 YAML에서 비활성, `publish_live=false`가 기본이다.
- GitHub Actions UI 상태와 Secrets는 확인하지 못했다.
- 공개 자산용 `instagram-assets` 브랜치는 직전 원격 감사에서 없었다.
- Meta API 라이브 호출과 실제 게시 없음.
- 새 브라우저 탭이나 자동화 브라우저 세션은 시작하지 않았다.
- 렌더 테스트가 만든 Node 프로세스만 종료했다. 사용자 Edge 프로세스(15:35 시작)는 건드리지 않았다.
- 서브에이전트는 생성하지 않았다.

## 6. Git과 파일 상태

인계서 작성 직전:

```text
branch: codex/instagram-evidence-safety
HEAD:   27531297f67669c24be7fcb381a408ab296a4aae
remote: origin/codex/instagram-evidence-safety와 동일
M  cardnews/tools/render.mjs
?? cardnews/tools/chrome-capture.mjs
?? tests/chrome-capture.test.mjs
?? tests/fixtures/fake-screenshot-browser.mjs
```

이 인계서와 LOG 블록도 이후 WIP 커밋에 포함한다. 첨부파일·비밀정보·생성 PNG는 stage하지 않는다.
테스트 임시 파일 `C:\Users\kkokk\AppData\Local\Temp\chrome-capture-18508.png`은 삭제했다.
Git에 넣지 못하는 첨부파일은 없다. `.env`와 토큰은 읽거나 출력하거나 stage하지 않았다.

## 7. 실행한 테스트

- 통과:
  - `node --test tests/instagram-publish-safety.test.mjs` — 3/3
  - 관련 게시 도구 구문 검사
  - `git diff --check`
  - `evidence-v2` 대표 3장 렌더·육안 검토
- 실패/중단:
  - `node --test tests/chrome-capture.test.mjs tests/instagram-publish-safety.test.mjs`
  - 첫 테스트가 68바이트 fixture/1,024바이트 최소값 불일치로 6.1초 후 실패하고 프로세스가 남음.
  - 명령을 중단하고 직접 시작한 Node만 종료. 그 뒤 `minBytes: 32`와 종료 폴백을 수정했으나 미실행.
- 미실행 이유: 사용자의 CPU/RAM 포화 및 데스크톱 이전 최우선 지시.

## 8. 데스크톱에서 첫 5개 실행 순서

1. 필수 문서 4개를 읽고 `git status --short --branch`, `git log -2`, WIP diff를 확인한다.
2. `node --test tests/chrome-capture.test.mjs`만 실행하고, 종료 직후 fake browser Node가 남지 않았는지 확인한다.
3. 통과하면 `node cardnews/tools/render.mjs cardnews/series/sanriku`로 9장 전체 렌더를 한 번만 실행한다.
4. 9장 파일 수·PNG 1080×1350을 검사하고 대표 3장을 시각 검토한 뒤 생성 PNG의 커밋 포함 여부를 판단한다.
5. 전체 안전 테스트·구문 검사·`git diff --check` 후 보완 커밋을 만들고 같은 codex 브랜치에 푸시한다.

