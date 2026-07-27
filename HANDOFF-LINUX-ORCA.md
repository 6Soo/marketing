# Linux Agent / Orca 이전 최종 인계서

업데이트: 2026-07-27 (Asia/Seoul)

> Linux 세션 시작 프롬프트 없이도 복구할 수 있도록 이번 채팅의 요청, 결정, 실행 결과,
> Git 체크포인트, 외부 상태, 실패와 안전선을 한 문서에 모았다.

## 0. 최종 정본 — Linux agent가 가장 먼저 이해할 것

### 최종 목적

이 세션의 최종 중심은 BAND나 다음 카페 개편이 아니다. 사용자가 직접 바로잡은 대상은
**Instagram 회원이 콘텐츠를 보고 자연스럽게 방문하는 `foresttour.kr`**이다.

하나의 편집 책임 아래 다음 흐름을 연결한다.

1. Instagram 카드뉴스·릴스·스토리에서 지역·풍경·문화의 정보 격차를 열어
   “이런 일본이 있었어?”라는 발견을 만든다.
2. 상품 설명 없이도 그곳에 가고 싶은 욕구를 만든다.
3. `foresttour.kr/stories/<slug>`가 Instagram의 표지 질문을 즉시 회수하고,
   위치·이유·계절·걷는 감각·교통 단절·짐 이동·예약과 언어 같은 깊이를 제공한다.
4. 현지 체류 대장과 숲길여행의 방식으로 신뢰를 만든다.
5. 같은 지역의 실제 공개 일정이 검증될 때만 낮은 압력의 예약 연결을 보여 준다.
6. 착륙 → 본문 → 다음 여행지 → 일정 선택을 익명 계측하고, 부분 수집으로 성과를 추정하지 않는다.

Instagram 카드뉴스 관리, Instagram 홍보, `foresttour.kr` 착륙 콘텐츠는 따로 맡기지 않는다.
사용자는 “네가 모두 맡는 것이 통일성에 더 좋을까?”라고 물은 뒤, 별도 승인·분절 지시를 폐기하고
에이전트가 전체 흐름을 스스로 관리하라고 확정했다. 따라서 재개 시 콘텐츠 약속, slug, 메타데이터,
사진·사실 출처, 최초 유입 표식, 실제 일정 연결, 측정 계약을 한 편집 단위로 관리한다.

### 현재 상태

- 사용자의 마지막 명령에 따라 **모든 작업은 중단 상태**다.
- 이 문서와 보존 브랜치를 GitHub에 올리는 행위만 이번 마지막 명령으로 명시적으로 승인됐다.
- Linux agent는 이 문서를 읽었다는 이유만으로 실행·게시·배포를 재개하지 않는다.
- 사용자가 재개를 지시하면 이 문서의 목표를 새로 추측하거나 BAND/카페 goal로 복원하지 않고,
  위 자연 발견 퍼널을 정본으로 사용한다.
- 공개 게시·프로필 수정·Story 게시·사이트 배포·secret 변경은 재개 작업의 결과물일 수 있으나,
  현재 중단 상태에서는 실행하지 않는다.

### 기존 고객 채널의 위치

- 다음 카페는 50~60대 기존 관계 자산이며 별도 시니어 개선 과제다.
- BAND 정리 브랜치도 별도 과제다.
- 두 채널의 기록은 삭제하지 않지만, 20~40대 Instagram 신규 유입의 착륙지나 현재 최종 goal로
  바꾸지 않는다.
- Instagram 신규 방문자를 카페 가입으로 먼저 보내지 않는다.

## 0-A. 이번 채팅 전체 지시 연대기와 해석

소스 스레드: `019f9d86-503b-7f13-8a26-04bc0c8a9ddd`.

1. 최초 위임은 `foresttour.kr` 작업이었다. 저장소의 `AGENTS.md`, `CLAUDE.md`, `LOG.md`,
   기존 인계서를 끝까지 읽고 Git 상태와 원격 인계 브랜치를 확인한 뒤,
   marketing 인계의 완료·부분완료·미완료·불변 규칙과 대조해 자연스러운 발견 퍼널과
   예약 전환 맥락에서 가장 먼저 안전한 작업을 수행하라는 내용이었다.
2. 시스템 재부팅 후에는 Git/worktree를 비파괴 점검하고 같은 `foresttour.kr` 작업을
   계속하라는 재개 지시가 있었다.
3. 작업이 BAND 쪽으로 흐르자 사용자가
   “foresttour.kr 작업을 하라고 지시했는데 왜 밴드 작업을 하고 있지?”라고 정정했다.
   이 시점부터 BAND를 주 목표로 해석하는 것은 명백히 잘못이다.
4. 사용자는 승인 질문을 반복하지 말고 자동으로 개선하며 최종 goal을 설정하라고 했다.
   goal이 잘못되면 사용자가 goal 자체만 고칠 수 있도록 구체적이어야 한다고 했다.
5. 저장소에 원래 더 길고 자세한 goal이 있었으므로 찾아 복원·보완하라고 했다.
6. 전체 브랜치를 정리하라고 했다. 이 요구 때문에 분산된 worktree/브랜치/체크포인트를
   잃지 않고 원격 보존하는 것이 중요하다.
7. goal을 매우 구체적이고 상세하게 자동 설정하고 실행하라고 다시 지시했다.
8. 잘못된 goal이 복원되자 사용자는 핵심을
   “여기는 Instagram 회원이 자연스럽게 방문하게 되는 곳”이라고 재확정했다.
9. 사용자는 Instagram 카드뉴스 관리와 Instagram 홍보까지 같은 책임자가 맡는 편이
   통일성에 더 좋은지 물었다. 현재 정본은 “그렇다”이며, Instagram과 사이트를 한 편집 단위로
   관리한다.
10. 사용자는 이전의 분절·승인 대기 지시를 폐기하고 스스로 모든 것을 진행하라고 했다.
11. 반복 중지에 대해 “그냥 다 하라니까 왜 자꾸 중지하느냐”고 재차 자동 진행 의사를 밝혔다.
    다만 이 자율성은 사실을 만들거나 secret을 노출하거나 서로 다른 과제를 섞는 권한은 아니다.
12. 전역 `orca-agent-orchestrator` 정책을 적용하라고 했다. substantive 작업은 정책에 따라
    downstream 역할을 사용하고 실제 모델·역할·결과·fallback·provider usage를 보고해야 한다.
13. 이후 사용자는 모든 작업을 중단하고 Linux Orca 환경 이전 handoff를 시작하라고 했다.
    stop은 새 worker를 시작하지 않고 직접 처리했다.
14. 현재 marketing 세션에서는 기존 AGENTS 지침을 새 지침으로 교체했고,
    다시 “모든 작업 중단, Linux agent 환경 handoff, Git push, 새 세션에 프롬프트를 넣지 않아도
    정보가 손실되지 않도록 채팅의 모든 내용을 인계서에 기록”하라고 최종 명령했다.

우선순위 해석:

- 가장 최근의 중단·handoff·push 명령이 현재 실행 범위다.
- 중단 이전에 재개할 persistent goal은 §0의 Instagram → `foresttour.kr` 통합 퍼널이다.
- BAND/카페 작업 결과는 역사적 감사 자료로만 보존한다.
- “승인 묻지 말고 자동 진행”은 재개 후 합법적·비밀 비노출·범위 내 작업을 스스로 수행하라는 뜻이다.
  현재 중단 명령을 무시하거나 새 공개 게시를 만들라는 뜻이 아니다.

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
- 이전 Linux Orca handoff 중 추가로 중단 확인한 run:
  - `run-20260727-102102-6d1128e8` — orcastration, `stopped`
  - `run-20260727-082855-203f865b` — foresttour, `stopped`
  - `run-20260727-052649-5f1f8150` — cost-desktop-migration, `stopped`
  - `run-20260727-082713-f8ecac34` — cost-desktop-migration, `stopped`
- 당시와 이번 최종 전수검사 모두 비종료 run 0건,
  `coordinator.ps1`/`supervisor.ps1` 프로세스 0건이었다.
- Orca desktop runtime이 없는 상태에서 일부 terminal/task cleanup RPC는
  `runtime_unavailable`을 반환했지만, run state는 terminal `stopped`이고 관련 프로세스는 없었다.
- Linux 이전 중 worker, 자동화, 외부 게시를 자동 재시작하지 않는다.

## 2. 저장소와 Git 상태

### marketing

- Windows 경로: `D:\OneDrive\문서\AX\marketing`
- 원격: `https://github.com/6Soo/marketing/`
- 현재 브랜치: `Master`
- 인계 작성 전 원격 추적 상태: `Master...origin/Master`
- 초판 인계 전 HEAD: `9d05fb8` (`chore: ignore local agent runtime state`)
- 원격에 올라간 인계 초판: `1c32f59` (`docs: add complete Linux agent migration handoff`)
- 현재 문서는 초판 이후 발견된 잘못된 카페 중심 복원과 이번 채팅 전체 정정을 반영하는 최종 보완본이다.
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
- detached 체인은 원격 감사 브랜치
  `origin/codex/linux-agent-handoff-2026-07-27`에
  `a3f811284e30ba65eee1574c4fcb09ca76e1af72`로 보존됐다.
- 이 체인은 감사·복구용이며 §0의 최종 goal로 자동 재개하지 않는다.

### orcastration

- Windows 경로: `D:\OneDrive\문서\AX\orcastration`
- 원격: `https://github.com/6Soo/orcastration`
- 브랜치/HEAD: `codex/orca-agent-orchestrator` / `0f9dcde`
- 기존 추적 수정 10개와 미추적 Linux handoff가 있으며 이 marketing 작업에서 stage하지 않았다.
- 로컬 Linux Orca 인계서:
  `LINUX_ORCA_MIGRATION_HANDOFF_2026-07-27.md`
- SHA-256:
  `8FA341DC91C2BAB5724EAB0752B81C39C7B3C5788C170853CAFBE1DF5FB8F623`
- 이 파일에는 Windows 전용 `powershell.exe`, `Start-Process`, `%APPDATA%`, mutex,
  Orca desktop runtime 의존성을 Linux process group/XDG 경로로 이식하는 계약과
  중단 run 감사표가 있다.
- orcastration dirty worktree는 다른 작업이므로 이 세션에서 커밋·푸시하지 않는다.
  Linux로 옮길 때 해시를 대조해 별도 보존한다.

## 3. 잘못 복원된 카페 작업 범위 — 역사적 기록, 최종 goal 아님

아래 범위는 다른 지시가 섞이면서 실행된 카페 작업이다. 결과와 체크포인트는 보존하지만,
사용자가 “여기는 Instagram 회원이 자연스럽게 방문하는 곳”이라고 바로잡았으므로
현재 `foresttour.kr` persistent goal로 사용하지 않는다.

당시 잘못 적용된 요청:

1. 저장소의 `AGENTS.md`, `CLAUDE.md`, `LOG.md`, 인계 문서를 끝까지 읽는다.
2. Git 상태와 원격 인계 브랜치를 확인한다.
3. marketing 인계의 카페 시니어 점진 개편, 신규회원 7일 안착,
   예약 전환 맥락과 대조한다.
4. 첫 실행은 신규회원 안내 자산과 사장님 가이드를 다른 작업과 분리해 선별 검증한다.
5. 모바일 기존 회원 경험, 메뉴명, 댓글, 전화 습관을 보존한다.
6. 실제 다음 카페 게시·쪽지·외부 전송, 게시판·권한 판단은 사용자 승인 전 하지 않는다.
7. 단위 작업마다 검증하고 체크포인트 커밋을 남긴다.

카페 과제 내부에서만 유효한 운영 원칙:

- 카페가 원본이고 회원을 다른 곳으로 이전하지 않는다.
- 예약 도우미는 큰 글씨 보기와 신청 편의를 위한 보조 경로다.
- 댓글과 전화 신청은 계속 유효하다.
- 기존 모바일 메뉴명과 최신글·댓글 흐름을 임의로 바꾸지 않는다.
- 신규회원은 가입 후 7일 동안 카페 → 여행 글 → 날짜·난이도·준비물 →
  댓글/전화/예약 도우미 중 편한 신청 경로를 이해하도록 돕는다.
- 실제 게시 위치, 공지 고정, 메뉴·게시판·권한 변경은 별도 승인 대상이다.

## 4. foresttour에서 완료한 카페 로컬 작업 — 자동 재개 금지

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

권한 이력은 다음처럼 해석한다.

- 초기 위임은 외부 게시·전송·배포 전 보고를 요구했다.
- 이후 사용자는 승인 질문 때문에 작업이 반복 중단되는 것을 명시적으로 반려하고,
  범위 안의 개선은 스스로 끝까지 진행하라고 했다.
- 현재 최종 지시는 모든 실행 중단이며, handoff 문서와 Git push만 명시적으로 허용했다.
- 따라서 Linux agent는 단순한 로컬 조사·구현·검증을 불필요한 승인 질문으로 멈추지 않되,
  현재 중단 상태에서 외부 게시·배포·secret 변경을 선행하지 않는다.
- 재개 후 공개 변경의 권한은 그때의 최신 사용자 지시와 플랫폼 안전 경계를 따른다.

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

## 7-A. 재개할 상세 persistent goal과 완료 정의

### Goal

`@foresttour.kr`의 Instagram 카드뉴스·릴스·스토리와 `foresttour.kr` 여행지 기록을
하나의 운영 체계로 관리해, 20~40대가 낯선 일본 지역을 자연스럽게 발견하고,
상품 압박 없이 여행 욕구와 이해·신뢰를 형성한 뒤, 실제 공개 일정이 있을 때만 예약으로
전환되는 반복 가능하고 측정 가능한 퍼널을 완성한다.

### 불변 규칙

1. 콘텐츠의 주인공은 상품이 아니라 여행지 자체다.
2. 카드 안에 가격·예약 링크·박수·대장명·출발일·일정 순서를 넣지 않는다.
3. 기준 디자인은 `cardnews/나만몰랐던일본-001-히다.html`의 풀블리드 실사진,
   하단 스크림, 흰 글씨, 필드노트 문법이다.
4. 사진은 실제 코스/현지 촬영 원본이 우선이다. Pexels·AI 대역은 `placeholder`로 밝히고
   검증된 현지 사진처럼 새 게시하지 않는다.
5. Instagram 표지 질문과 웹 첫 답은 같은 의미여야 한다.
6. 콘텐츠 slug는 공개 후 안정적으로 유지하고 canonical/OG를 여행지별로 고유하게 둔다.
7. 프로필은 깨끗한 `foresttour.kr` 표시를 유지한다. 지면별 링크는 규칙에 맞는 source/UTM을 쓰고,
   내부 이동에서 최초 출처를 덮어쓰지 않는다.
8. 공개 예약 화면에서 같은 지역·일정이 확인되지 않으면 일정 CTA, 출발월, 박수,
   “다음 출발” 약속을 만들지 않는다.
9. Instagram 신규 방문자를 다음 카페 가입으로 먼저 보내지 않는다.
10. 완전한 측정 체크포인트만 학습한다. 보이지 않는 수치, 조회수, organic interaction,
    foresttour 전환을 추정하지 않는다.
11. secret·토큰·admin key·PII를 문서, 로그, Git, 채팅에 남기지 않는다.
12. BAND/카페 브랜치의 변경을 이 goal에 섞지 않는다.

### 한 여행지 편집 단위의 필수 산출물

- 시리즈 번호, 지역, 핵심 질문
- 공식 사실 근거와 사진별 권리·출처·현지 여부
- Instagram 카드/릴스/Story 자산과 게시용 캡션
- 저장 유도와 과장 없는 다음 행동
- `foresttour.kr/stories/<slug>` 본문, canonical, OG, 대표 이미지
- profile/carousel/story/reel의 최종 링크와 최초 유입 표식
- 실제 공개 일정 연결 상태(`connectedTour` 또는 명시적 null)
- 착륙·본문·다음 탐색·일정 선택 이벤트
- 0h/24h/72h/7d 측정과 완전성 판정
- 렌더·모바일·접근성·링크·콘솔·API fail-closed 검증

### 완료 조건

다음이 모두 충족되기 전에는 goal을 완료로 표시하지 않는다.

1. 검증된 현지 사진을 쓴 최소 1개 신규 여행지 편집 단위가 카드/웹/링크/측정까지 동일 맥락으로 완성된다.
2. Instagram 게시 경로가 Graph API 복구 또는 검증된 UI fallback으로 재현 가능하다.
3. 공개 자산 JPEG, manifest, 지문, caption, permalink가 동일 실행 기록으로 연결된다.
4. foresttour landing이 모바일 390px에서 canonical·OG·본문·출처·내부 이동·CTA fail-closed를 통과한다.
5. 실제 공개 일정 유무에 따라 CTA가 정확히 보이거나 숨는다.
6. Instagram과 foresttour 두 source group이 모두 있는 24h 체크포인트가 기록된다.
7. 부분 체크포인트가 학습·활성화 판정에 사용되지 않는 테스트가 유지된다.
8. 소유자 외 organic interaction과 Instagram 귀속 방문이 실제로 관측될 때만 초기 활성화 증거로 판정한다.
9. 자동/수동 게시 3회 운영 검수 전에는 예약 스케줄을 켜지 않는다.
10. 관련 테스트, `git diff --check`, Git 상태, 배포/게시 결과의 실증 기록이 남는다.

### 완료·부분완료·미완료

완료:

- Instagram UI 실게시 fallback과 북알프스 최종 퍼머링크 검증.
- 공개 자산 배포·JPEG/SHA 검증, UI 결과 ingest, 측정 source 구분.
- foresttour 북알프스 story와 활성 상품 CTA fail-closed 검증.
- 0h 기록, 완전 체크포인트 계약, Story 준비 게이트, 41개 테스트.
- 히다·산리쿠의 잘못된 일정 약속 교정과 placeholder 재게시 차단.

부분완료:

- Graph API 자동 게시 코드는 있으나 Meta app access가 차단돼 운영 성공하지 못했다.
- Instagram 측정은 UI snapshot 주입이 가능하지만 24h 완전 체크포인트는 아직 없다.
- foresttour 운영에는 admin key가 있으나 marketing Actions secret 연결은 없다.
- Story 후속 자산은 있으나 24h 게이트와 모바일 링크 스티커 게시가 남았다.

미완료:

- `FORESTTOUR_ADMIN_KEY`의 안전한 GitHub secret 등록.
- 두 source group을 갖춘 24h/72h/7d 수집과 학습.
- Meta Graph API app access 복구.
- 검증된 현지 원본 사진을 사용한 다음 편집 단위.
- 수동 검수 3회 후 자동 예약 게시 여부 판단.

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
git checkout master
git pull --ff-only
git status --short --branch
git log --oneline -8

# 카페 오진 경로의 감사 기록이 필요할 때만 읽기 전용으로 확인
git log --oneline codex/linux-agent-handoff-2026-07-27 -8
```

읽기 순서:

1. `CLAUDE.md`
2. `HANDOFF.md`
3. `LOG.md`
4. `docs/CODEX_DESKTOP_MIGRATION_HANDOFF_2026-07-26.md`
5. marketing의 `context/인스타그램-foresttour-콘텐츠-연결-규칙-2026-07-26.md`
6. 카페 오진 경위를 감사해야 할 때만
   `codex/linux-agent-handoff-2026-07-27`의 `docs/ORCA_LINUX_HANDOFF_2026-07-27.md`

## 11. Linux Orca 운영 규칙

- substantive software work는 `orca-agent-orchestrator`로 시작한다.
- 새 substantive 요청은 background run을 만들고 즉시 `runId`를 보고한다.
- 사용자의 후속 요구 변경은 active run에 steering으로 전달한다.
- stop 요청은 현재 Codex turn에서 직접 처리하고 새 worker를 시작하지 않는다.
- 실제 downstream model, 역할, 결과, fallback, provider token usage를 보고한다.
- AGY가 usage를 제공하지 않으면 `미제공`으로 기록한다.
- 사용량 일부가 없으면 “총 확인 가능 토큰”이라고만 표시한다.
- hidden chain-of-thought는 노출하지 않고 공개용 rationale만 기록한다.

Windows handoff 시점의 기본 full workflow 기록(실행 전 Linux `orchestrator.yaml`을 정본으로 재확인):

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

아래는 사용자가 작업 재개를 지시한 뒤에만 실행한다.

1. 두 저장소를 clone/fetch하고 Git 상태·원격 커밋을 확인한다.
2. 이 문서와 각 저장소의 최신 LOG를 대조한다.
3. 모든 기존 변경과 미추적 파일의 소유 범위를 먼저 확인한다.
4. §0과 §7-A를 active goal로 사용하고 BAND/카페 goal을 자동 복원하지 않는다.
5. due 시간이 지났다면 Instagram UI 수치를 읽기 전용으로 수집한다.
   현재 stop 상태에서는 외부 게시·수정을 실행하지 않는다.
6. secret 값 없이 가능한 상태·테스트를 먼저 검증한다.
7. `FORESTTOUR_ADMIN_KEY`는 운영자가 안전하게 등록한 사실만 확인하며 값을 읽거나 복사하지 않는다.
8. 두 측정 source가 준비된 뒤에만 수집 변수를 활성화한다.
9. 다음 편집 단위는 검증된 현지 사진·공식 사실·웹 landing·측정 계약을 함께 준비한다.
10. 단위 작업마다 검증하고 체크포인트 커밋을 남긴다.

## 13. 하지 말아야 할 일

- secrets, 토큰, admin key를 채팅·로그·문서에 기록
- 미추적 전략 문서를 범위 확인 없이 stage
- `.omc/`, `.codex-remote-attachments/` 커밋
- Graph API 실패를 게시 성공으로 보고
- 부분 체크포인트로 성과 추정
- placeholder/AI/Pexels 대역 사진을 검증된 현지 사진처럼 새 게시
- BAND/카페 작업을 Instagram → foresttour.kr 최종 goal로 복원
- Instagram 신규 방문자를 다음 카페 가입으로 우선 유도
- browser automation 차단을 사이트 접속 장애로 오인
- detached foresttour 체크포인트를 push 전에 잃어버림

## 14. 인계 완료 조건

- 이 문서가 marketing `Master` 원격에 push됨
- foresttour detached 체크포인트가
  `codex/linux-agent-handoff-2026-07-27` 원격 브랜치에 push됨
- 두 저장소의 push SHA를 최종 보고
- 실행 중 Orca run이 없음을 유지
- 외부 게시·secret 변경·새 worker 시작 없음
