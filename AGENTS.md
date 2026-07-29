# AGENTS.md — 에이전트 진입점 (marketing)

> **어느 에이전트로 열든(Antigravity·Cursor·Claude 등) 가장 먼저 이 파일을 읽으세요.**
> Claude Code는 `CLAUDE.md`를 자동 로드하지만 Antigravity 등은 자동 로드하지 않습니다 —
> 그래서 이 파일이 공통 진입점입니다.

## 0. 먼저 읽을 순서
1. **CLAUDE.md** (리포 루트) — 회사 컨텍스트·마케팅 원칙.
2. **§0-A 모델 라우팅 지침**(바로 아래) — 어느 모델이 무엇을 맡는지의 정본.
3. 채널별 단일 인계서 — BAND는 **HANDOFF-BAND.md**, Instagram은 **HANDOFF-INSTAGRAM.md**.
4. **LOG.md** 맨 아래 "세션 핸드오프" 블록 — 최신 세션이 한 일 / 배포·런타임 상태 / 미결 / 함정 / 부트스트랩.
5. (있으면) 하위 `docs/`, `learning/`.

## 0-A. 모델 교차검증·폴백 정책 (사장 지시 2026-07-29)

이 절은 `CLAUDE.md`의 기존 모델 역할 분담보다 최신인 운영 지시다. 에이전트 제품마다 모델명과
호출 가능 범위가 다르므로, **호출하지 못한 모델을 호출했다고 기록하거나 다른 모델을 같은 모델인
것처럼 가장하지 않는다.** 현재 세션에서 지원하지 않는 모델은 명시된 다음 폴백으로 넘기고,
실제로 사용한 생성·검증 모델과 한계는 결과에 기록한다.

1. **고추론·설계·검증·자율판단**
   - 기본: **Claude Fable 5 medium ↔ GPT-5.6 Sol medium**
   - 절차: 한 모델이 초안을 판단 → 다른 모델이 독립 검증·반박 → 원 판단 모델이 반박을
     수용·기각하고 근거를 남김 → 최종 확정.
   - Fable 5 한도 도달 또는 호출 불가 시 **Claude Opus 5**가 Fable 역할을 대체한다.
2. **저추론·쓰기·웹검색·구현**
   - 기본: **AGY Gemini 3.6 Flash high**
   - 폴백: **AGY Claude Sonnet 4.6 → GPT-5.6 Luna low**
   - 수행 결과는 1번의 고추론 검증 절차를 거친 뒤 확정한다.
3. **사용자 판단이 필요해 보이는 영역**
   - 곧바로 사용자에게 묻지 않는다. 먼저 **Claude Fable 5 medium ↔ GPT-5.6 Sol medium**이
     각각 진행 가능성·위험·되돌릴 수 있는 대안을 판단하고 검증·반박·수용한다.
   - Fable 호출 불가 시 위 규칙대로 Opus 5가 대체한다.
   - 두 판단을 거쳐도 권한·외부 인증·비가역 영향·핵심 선택 때문에 안전하게 진행할 수 없을 때만
     사용자에게 필요한 최소 질문을 한다.
4. **검증 기록**
   - 산출물 또는 운영 로그에 `수행 모델`, `검증 모델`, `주요 반박`, `최종 수용/기각`,
     `폴백 사유`를 간결하게 남긴다.
   - API·UI·파일·git 접근이 없는 순수 텍스트 모델의 보고는 증거가 아니다. 담당 에이전트가
     실제 파일, 테스트, 브라우저 화면 또는 공식 원문으로 재검증한다.

## 0-B. WSL 브라우저 실행 규칙 (사장 지시 2026-07-29)

- BAND를 포함한 브라우저 감사·조작은 **WSL 안에서 실행한 Orca computer-use CLI**로 수행한다.
- `ORCA_CLI_COMMAND`가 있으면 그 값을 사용하고, 없으면 현재 computer-use 스킬의 실행 파일
  선택 규칙을 따른다. WSL CLI가 로그인된 Windows Edge 창을 제어하는 구성은 허용한다.
- 브라우저 조작 전 `status`·`computer capabilities`를 확인하고, 변경 뒤에는 새 접근성 트리와
  공개 URL로 결과를 재검증한다.
- 로그인 만료·2차 인증·CAPTCHA·권한 부족은 우회하지 않는다.

## 1. MCP 설정 — Antigravity 동등 구성
이 프로젝트의 Claude 세션이 쓴 MCP 서버:
- **GitHub**(PR·이슈·코드) — 공식 `github/github-mcp-server`.
- **Gmail · Google Drive · Google Calendar** — 구글 공식 Google Workspace MCP 또는 `aaronsb/google-workspace-mcp`.
- **Figma**(디자인 작업 시).
- **claude-code-remote**(send_later·트리거·PR 활동 구독) — **Claude 전용, 이식 불가**(§3).

**Antigravity 설정 위치**: 설정 파일 `~/.gemini/antigravity/mcp_config.json`, 또는 IDE 에이전트 패널
`···` → **MCP Servers → View raw config**. 형식(`mcpServers`): 로컬 서버는 `command`/`args`/`env`,
원격 서버는 `serverUrl`/`headers`.
```json
{
  "mcpServers": {
    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"], "env": { "GITHUB_TOKEN": "<토큰>" } },
    "google-workspace": { "command": "uvx", "args": ["google-workspace-mcp"], "env": { "GOOGLE_OAUTH_CLIENT_ID": "...", "GOOGLE_OAUTH_CLIENT_SECRET": "..." } }
  }
}
```
**OAuth 인증 계정**: Gmail·Drive·Calendar는 반드시 **kkokkohero6@gmail.com**(운영 계정 — 메일함·시트·드라이브 소유)로
인증. GitHub는 **6Soo** 조직 접근 권한이 있는 계정.

**설정 안 하면**: 코드 작업(편집·빌드·git)은 되지만 **메일/드라이브/캘린더는 수동**이 됩니다. 이 세션이 만든
메일 초안(있다면)은 **Gmail 임시보관함(Drafts)** 에 있고, 자동 발송은 하지 않습니다.

## 2. Gemini/GLM 브리지 (이 리포의 모델 위임 실체)
CLAUDE.md "모델 역할 분담"의 실체는 `tools/gemini.mjs`(기본 `gemini-3.6-flash`) ·
`tools/llm-bridge.mjs --provider=glm`. 순수 텍스트 API라 파일·git 접근이 없어, Claude 세션에서는
저비용 sonnet 래퍼가 이들을 호출·적용한다. **Antigravity/Cursor에서는 이 위임 구조가 그대로
넘어가지 않으므로**, 그 에이전트의 기본 모델이 직접 수행하면 된다(키만 있으면 브리지 스크립트 자체는 실행 가능).

## 3. 에이전트 차이 — Claude 전용 기능은 안 넘어감
- **서브에이전트 병렬 위임**(Opus가 sonnet+gemini 래퍼를 띄우는 구조): Claude 전용. 다른 에이전트는 직접 수행.
- **claude-code-remote**(send_later 예약·PR 구독·트리거): Claude 세션 바인딩. 대체 = OS 크론 / GitHub Actions.
- **Artifact 렌더·SendUserFile**: Claude UI 전용 전달 방식.
→ 요약: **코드/문서 작업은 어느 에이전트든 이어받을 수 있으나, 조율·자동화·전달 계층은 다시 구성해야 함.**
