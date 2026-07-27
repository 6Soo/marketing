# Linux Agent / Orca 이전 최종 인계서

업데이트: 2026-07-27 (Asia/Seoul)

> Linux 세션 시작 프롬프트 없이도 복구할 수 있도록 이번 채팅의 요청, 결정, 실행 결과,
> Git 체크포인트, 외부 상태, 실패와 안전선을 한 문서에 모았다.

## 1. 중단 상태

- 사용자 최종 지시: 모든 작업을 중단하고 Linux agent 환경으로 이전한다.
- 확인한 Orca run은 모두 `stopped`, `failed`, `completed` 중 하나다. 실행 중 상태는 없었다.
- 이번 채팅에서 생성한 foresttour Orca run:
  - `run-20260727-053735-bc13fb28`
  - 최종 상태: `stopped`
  - `coordinatorTerminal: null`
  - task/worker 실행: 없음
  - fallback: 없음
  - provider token usage: 없음
- 위 run은 생성 때 coordinator terminal handle을 받지 못해 `queued`에 머물렀고,
  완료라고 보고하지 않았다. 이후 사용자 중단 지시에 따라 명시적으로 정지했다.
- Linux 이전 중 worker, 자동화, 외부 게시를 자동 재시작하지 않는다.

## 2. 저장소와 Git 상태

### marketing

- Windows 경로: `D:\OneDrive\문서\AX\marketing`
- 원격: `https://github.com/6Soo/marketing/`
- 현재 브랜치: `Master`
- 인계 작성 전 원격 추적 상태: `Master...origin/Master`
- 인계 작성 전 HEAD: `9d05fb8` (`chore: ignore local agent runtime state`)
- GitHub CLI:
  - `gh 2.96.0`
  - 계정 `6Soo` 인증 확인
  - token value는 기록하지 않음
- 이번 인계 커밋에는 이 문서만 포함한다.
- 다음 미추적 파일은 다른 작업이므로 보존하고 stage하지 않는다.
  - `strategy/인스타-자동업로드-측정루프-설계-0727.md`
- `.omc/`, `.codex-remote-attachments/`는 비소유 런타임 상태이며 커밋 금지다.

### foresttour

- 기본 Windows 저장소: `D:\OneDrive\문서\AX\foresttour`
- 현재 별도 작업 브랜치:
  `codex/band-spam-cleanup-2026-07-26`
- 위 브랜치에는 BAND 정리·전환 관련 별도 체크포인트가 있으며 이번 인계 작업에서 수정하지 않았다.
- 이번 채팅에서 작업한 Codex worktree:
  `C:\Users\kkokk\.codex\worktrees\1b29\foresttour`
- worktree는 `28c9c94`에서 시작한 detached HEAD였고 다음 커밋을 만들었다.
  - `da9eaa9` — 신규회원 안내 자산 선별 검증
  - `6a8b8ce` — 사장님 가이드 운영 안전 검증
  - `9d8208c` — 신규회원 7일 안착 게시 전 초안
  - `78373ee` — 모바일 카페 읽기 전용 점검 차단 기록
  - `a3f8112` — Linux Orca migration handoff
- Linux 이전 전 이 detached 체인을 별도 보존 브랜치로 push해야 한다.

## 3. 이번 채팅의 최초 요청과 확정 범위

대상은 `m.cafe.daum.net/sixsungwon` 다음 카페다.

최초 요청:

1. 저장소의 `AGENTS.md`, `CLAUDE.md`, `LOG.md`, 인계 문서를 끝까지 읽는다.
2. Git 상태와 원격 인계 브랜치를 확인한다.
3. marketing 인계의 카페 시니어 점진 개편, 신규회원 7일 안착,
   예약 전환 맥락과 대조한다.
4. 첫 실행은 신규회원 안내 자산과 사장님 가이드를 다른 작업과 분리해 선별 검증한다.
5. 모바일 기존 회원 경험, 메뉴명, 댓글, 전화 습관을 보존한다.
6. 실제 다음 카페 게시·쪽지·외부 전송, 게시판·권한 판단은 사용자 승인 전 하지 않는다.
7. 단위 작업마다 검증하고 체크포인트 커밋을 남긴다.

확정된 운영 원칙:

- 카페가 원본이고 회원을 다른 곳으로 이전하지 않는다.
- 예약 도우미는 큰 글씨 보기와 신청 편의를 위한 보조 경로다.
- 댓글과 전화 신청은 계속 유효하다.
- 기존 모바일 메뉴명과 최신글·댓글 흐름을 임의로 바꾸지 않는다.
- 신규회원은 가입 후 7일 동안 카페 → 여행 글 → 날짜·난이도·준비물 →
  댓글/전화/예약 도우미 중 편한 신청 경로를 이해하도록 돕는다.
- 실제 게시 위치, 공지 고정, 메뉴·게시판·권한 변경은 별도 승인 대상이다.

## 4. foresttour에서 완료한 로컬 작업

### 신규회원 자산 검증

검토한 자산:

- `cafe-kit/공지-큰글씨안내.txt`
- `cafe-kit/모집글-템플릿.txt`
- `cafe-kit/대문.html`
- `docs/사장님-가이드.md`

결론:

- 공지와 모집글은 “카페·댓글·전화는 그대로”를 명시해 기존 회원 보호 기준을 충족한다.
- 예약 도우미를 유일한 신청 방식으로 강제하면 안 된다.
- 기존 자산에는 가입 직후부터 첫 신청까지의 7일 흐름이 명시적으로 고정되지 않았다.
- 대문 HTML은 다음카페 신규 HTML 아이템 제한 때문에 실제 적용 판단을 보류했다.

작성 문서:

- `docs/카페-신규회원-안내자산-선별검증-2026-07-26.md`
- `docs/카페-사장님가이드-운영안전-선별검증-2026-07-26.md`
- `docs/카페-신규회원-7일안착-게시전초안-2026-07-26.md`
- `docs/카페-모바일-읽기전용점검-차단기록-2026-07-26.md`
- `docs/ORCA_LINUX_HANDOFF_2026-07-27.md`

모든 문서는 `git diff --check`로 검증했고 각각 체크포인트 커밋을 남겼다.

## 5. 모바일 카페 브라우저 경위

### 자동 접근

- Codex 인앱 브라우저에서
  `https://m.cafe.daum.net/sixsungwon` 읽기 전용 접근을 시도했다.
- 브라우저 정책이 해당 URL 자동 제어를 차단했다.
- 이후 사용자가 “우회해서 접속”을 요청했지만 정책 우회는 실행하지 않았다.
- 사용자가 Chrome/Edge 계열 브라우저에서 페이지가 정상적으로 열린 캡처를 제공했다.
- Chrome 연결로 동일 URL 자동 제어를 다시 시도했으나 같은 URL 단위 정책 차단이 발생했다.
- 결론: 카페 사이트 장애나 사람의 브라우저 접속 실패가 아니다.
  Codex browser automation 표면의 URL 정책 제한이다.

### 사용자 캡처에서 확인한 실제 화면

- 주소: `https://m.cafe.daum.net/sixsungwon/_rec`
- 카페명: `숲길따라 감성여행`
- 상단 탭: `게시판`, `최신글`, `이미지`
- `가입하기` 버튼 노출
- 최신글 목록과 댓글 수가 정상 노출
- 카페 내부 배너에 “지금 가장 인기 있는 여행지는 어디일까요?” 문구와
  “인기글 보기” 동선 노출
- 사람의 브라우저에서는 정상 접속됨을 확인했다.
- 자동 제어 차단을 사이트 미접속으로 표현하면 안 된다.

## 6. 외부 실행 이력과 현재 권한선

이번 foresttour 카페 작업에서는 다음을 수행하지 않았다.

- 다음 카페 게시·수정·삭제·공지 고정
- 댓글·쪽지·알림·전화·이메일 발송
- 메뉴·게시판·가입 질문·권한 변경
- 카페 파일 업로드
- 계정·보안·결제·개인정보 변경

이전 요청의 승인선은 Linux 환경에서도 유지한다.
화면 열람이 가능해져도 게시·쪽지·외부 전송 직전에는 대상과 내용을 다시 확인한다.

## 7. marketing 현재 운영 상태

### 공개 Instagram

- 운영 계정: `@foresttour.kr`
- 사도: `https://www.instagram.com/p/DbRD-fWkyUL/`
- 북알프스: `https://www.instagram.com/p/DbRGuL5kwEU/`
- 프로필 링크:
  `https://foresttour.kr/?utm_source=ig&utm_medium=social&utm_content=link_in_bio`
- 북알프스 첫 게시 `DbRFfObk56K`는 캐시된 마지막 장 오류를 발견해
  수정본 검증 후 삭제했다.
- 최종 북알프스 퍼머링크는 `DbRGuL5kwEU`다.

### 측정과 Story

- 사도와 북알프스 0h 체크포인트는 기록됐다.
- 0h의 좋아요·댓글·저장·공유·프로필 방문·팔로우는 확인 가능한 범위에서 0이었다.
- 조회수·도달은 미산출이라 추정하지 않았다.
- 사도 Story 자산:
  `cardnews/out/sado/story/01-discovery-link.jpg`
- 성공 판정은 단순 게시가 아니라 소유자 외 유기적 반응과
  `story_*_visit` 귀속이 함께 있어야 한다.
- 완전한 체크포인트만 학습하며 부분 수집으로 성과를 추정하지 않는다.

### GitHub Actions / API

- GitHub secrets에 `IG_USER_ID`, `IG_ACCESS_TOKEN`이 있다.
- `FORESTTOUR_ADMIN_KEY`와 `ACTIVATION_COLLECT_ENABLED`는 없다.
- secret 값은 문서·로그·채팅에 기록하거나 추정하지 않는다.
- Meta Graph API는
  `OAuthException code 200: API access blocked` 상태다.
- API 실패 시 로그인된 공식 Instagram 웹 UI가 검증된 게시 폴백이었다.
- foresttour production에는 admin key가 존재하지만 값을 복사·추정하지 않는다.

### 테스트

- 마지막 기록 기준 `npm run test:instagram`: 41/41 통과.
- 북알프스 8장 1080×1350 렌더, JPEG 변환, 출처·라이선스 검증,
  실게시 순서 검증이 완료됐다.
- 북알프스 Vercel production:
  `dpl_96otr4Y6fTjRD5QfQ7CyUoUtigpB` READY.
- 공개 스토리:
  `https://foresttour.kr/stories/northern-alps`

## 8. 현재 미완료·블로커

1. 사도 24h 기준:
   `2026-07-27T18:47:02.033Z`
2. 북알프스 24h 기준:
   `2026-07-27T19:15:31.598Z`
3. Instagram UI의 24h 실측값을 기록해야 한다.
4. 운영자가 안전하게 `FORESTTOUR_ADMIN_KEY`를 GitHub secret에 등록해야 한다.
5. 두 측정 소스가 준비된 후에만
   `ACTIVATION_COLLECT_ENABLED=true`를 설정한다.
6. 사도 24h가 `recorded`이고 Story 준비 게이트가 통과한 뒤에만
   모바일에서 링크 스티커를 추가해 Story 게시를 검토한다.
7. Meta Graph API app access 차단을 해결하지 않으면 API 자동 게시·Insights 수집은 불가하다.
8. 카페의 실제 메뉴명·공지 위치·댓글 동선 자동 검증은 browser automation 정책 때문에 미완료다.

## 9. 보존 중인 별도 설계 문서

`strategy/인스타-자동업로드-측정루프-설계-0727.md`는 이번 인계 작성 전부터
미추적 상태였고, 다른 작업 가능성이 있어 이번 커밋에서 제외한다.

문서가 다루는 핵심:

- Graph API와 Instagram UI의 이중 게시 경로
- 수동 Instagram snapshot을 체크포인트 워크플로에 주입
- 완전 체크포인트만 학습
- `organicInteractions`는 자동 파생하지 않고 수동 실측을 권고
- `FORESTTOUR_ADMIN_KEY`, `ACTIVATION_COLLECT_ENABLED`,
  Graph API 복구는 사용자 게이트
- 신규 공개 게시 전 사도·북알프스 due 체크포인트 기록

Linux에서 이 문서를 stage하거나 구현하기 전 소유자와 범위를 확인한다.

## 10. Linux 환경 부트스트랩

### marketing

```bash
git clone https://github.com/6Soo/marketing.git
cd marketing
git fetch --all --prune
git checkout Master
git pull --ff-only
git status --short --branch
```

읽기 순서:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `LOG.md` 맨 아래 최신 세션 핸드오프
4. `HANDOFF-LINUX-ORCA.md`
5. 작업에 필요한 `context/`, `strategy/`, `learning/`

검증:

```bash
npm ci
npm run test:instagram
npm run activation:status -- --experiment=sado-003
npm run activation:status -- --experiment=northern-alps-004
gh auth status
gh secret list --repo 6Soo/marketing
gh variable list --repo 6Soo/marketing
```

### foresttour

```bash
git clone https://github.com/6Soo/foresttour.git
cd foresttour
git fetch --all --prune
git checkout codex/linux-agent-handoff-2026-07-27
git status --short --branch
git log --oneline -8
```

읽기 순서:

1. `CLAUDE.md`
2. `HANDOFF.md`
3. `LOG.md`
4. `docs/CODEX_DESKTOP_MIGRATION_HANDOFF_2026-07-26.md`
5. `docs/ORCA_LINUX_HANDOFF_2026-07-27.md`
6. 위 §4의 카페 검증 문서

## 11. Linux Orca 운영 규칙

- substantive software work는 `orca-agent-orchestrator`로 시작한다.
- 새 substantive 요청은 background run을 만들고 즉시 `runId`를 보고한다.
- 사용자의 후속 요구 변경은 active run에 steering으로 전달한다.
- stop 요청은 현재 Codex turn에서 직접 처리하고 새 worker를 시작하지 않는다.
- 실제 downstream model, 역할, 결과, fallback, provider token usage를 보고한다.
- AGY가 usage를 제공하지 않으면 `미제공`으로 기록한다.
- 사용량 일부가 없으면 “총 확인 가능 토큰”이라고만 표시한다.
- hidden chain-of-thought는 노출하지 않고 공개용 rationale만 기록한다.

기본 full workflow:

- 설계: Claude Opus High
- 설계 검증: GPT-5.6 Sol High
- 반박: Claude Fable High, 불가 시 Opus
- 구현: AGY Gemini 3.6 Flash High
- 구현 fallback: GPT-5.6 Terra Low → GPT-5.6 Sol Low
- 결과 검토: Claude Opus High + 별도 GPT-5.6 Sol High
- 중재: Claude Fable High, 불가 시 GPT-5.6 Sol High
- 구현 병렬 한도: 3
- 설계/검토 worker 총 한도: 4

## 12. Linux 첫 재개 순서

1. 두 저장소를 clone/fetch하고 Git 상태·원격 커밋을 확인한다.
2. 이 문서와 각 저장소의 최신 LOG를 대조한다.
3. 모든 기존 변경과 미추적 파일의 소유 범위를 먼저 확인한다.
4. due 시간이 지났다면 Instagram UI 수치를 읽기 전용으로 수집하되,
   외부 게시·수정은 새 승인 없이는 하지 않는다.
5. secret 값 없이 가능한 상태·테스트만 검증한다.
6. `FORESTTOUR_ADMIN_KEY`가 운영자에 의해 안전하게 등록된 후에만
   수집 변수를 활성화한다.
7. 카페 작업은 기존 메뉴·댓글·전화 습관 보존을 acceptance criterion으로 고정한다.
8. 단위 작업마다 검증하고 체크포인트 커밋을 남긴다.

## 13. 하지 말아야 할 일

- secrets, 토큰, admin key를 채팅·로그·문서에 기록
- 미추적 전략 문서를 범위 확인 없이 stage
- `.omc/`, `.codex-remote-attachments/` 커밋
- Graph API 실패를 게시 성공으로 보고
- 부분 체크포인트로 성과 추정
- placeholder/AI/Pexels 대역 사진을 검증된 현지 사진처럼 새 게시
- 카페 게시·쪽지·외부 전송·메뉴·권한 변경을 승인 없이 실행
- browser automation 차단을 사이트 접속 장애로 오인
- detached foresttour 체크포인트를 push 전에 잃어버림

## 14. 인계 완료 조건

- 이 문서가 marketing `Master` 원격에 push됨
- foresttour detached 체크포인트가
  `codex/linux-agent-handoff-2026-07-27` 원격 브랜치에 push됨
- 두 저장소의 push SHA를 최종 보고
- 실행 중 Orca run이 없음을 유지
- 외부 게시·secret 변경·새 worker 시작 없음
