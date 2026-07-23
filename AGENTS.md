# AGENTS.md — 에이전트 진입점 (marketing)

> **어느 에이전트로 열든(Antigravity·Cursor·Claude 등) 가장 먼저 이 파일을 읽으세요.**
> Claude Code는 `CLAUDE.md`를 자동 로드하지만 Antigravity 등은 자동 로드하지 않습니다 —
> 그래서 이 파일이 공통 진입점입니다.

## 0. 먼저 읽을 순서
1. **CLAUDE.md** (리포 루트) — 회사 컨텍스트·마케팅 원칙·모델 정책.
2. **LOG.md** 맨 아래 "세션 핸드오프" 블록 — 최신 세션이 한 일 / 배포·런타임 상태 / 미결 / 함정 / 부트스트랩.
3. (있으면) 하위 `docs/`, `learning/`.

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
