# Linux agent migration handoff — marketing

> Standalone continuation context. A Linux agent should resume from this document without relying on the chat prompt. It records the session decisions, completed implementation, evidence, blockers, and exact next actions. Production secrets are intentionally excluded.

Updated: 2026-07-27, Asia/Seoul. 사실 정정 반영: 2026-07-28(브랜치명, 24h 도래, 워크플로 실패,
출처 링크 수, `/stories/sado`, CTA 취약점, 사도 사진 결함 — §1·§6·§7). 목표·불변조건·완료 게이트는
변경하지 않았다. User instruction at handoff: stop all work, prepare a Linux agent migration handoff, push it, and do not start new workers or publish anything during migration.

## 0. 최종 정본

이 세션의 중심은 BAND나 다음 카페 개편이 아니다. 사용자가 직접 바로잡은 대상은
**Instagram 회원이 콘텐츠를 보고 자연스럽게 방문하는 `foresttour.kr`**이다.

하나의 편집 책임 아래 다음 흐름을 연결한다.

1. Instagram 카드뉴스·릴스·스토리에서 지역·풍경·문화의 정보 격차를 열어
   “이런 일본이 있었어?”라는 발견을 만든다.
2. 상품 설명 없이도 그곳에 가고 싶은 욕구를 만든다.
3. `foresttour.kr/stories/<slug>`가 Instagram 표지 질문을 즉시 회수하고,
   위치·이유·계절·걷는 감각·교통 단절·짐 이동·예약과 언어 같은 깊이를 제공한다.
4. 현지 체류 대장과 숲길여행의 방식으로 신뢰를 만든다.
5. 같은 지역의 실제 공개 일정이 검증될 때만 낮은 압력의 예약 연결을 보여 준다.
6. 착륙 → 본문 → 다음 여행지 → 일정 선택을 익명 계측하고,
   부분 수집으로 성과를 추정하지 않는다.

Instagram 카드뉴스 관리, Instagram 홍보, `foresttour.kr` 착륙 콘텐츠는 따로 맡기지 않는다.
콘텐츠 약속, slug, 메타데이터, 사진·사실 출처, 최초 유입 표식, 실제 일정 연결,
측정 계약을 한 여행지 편집 단위로 관리한다.

다음 카페는 50~60대 기존 관계 자산이며 별도 시니어 개선 과제다.
BAND 정리 브랜치도 별도 과제다. 두 채널의 기록은 삭제하지 않지만,
20~40대 Instagram 신규 유입의 착륙지나 현재 최종 goal로 바꾸지 않는다.
Instagram 신규 방문자를 카페 가입으로 먼저 보내지 않는다.

현재는 사용자의 마지막 명령에 따라 모든 작업이 중단됐다.
이 문서와 보존 브랜치를 GitHub에 올리는 행위만 마지막 명령으로 허용됐다.
Linux agent는 이 문서를 읽었다는 이유만으로 실행·게시·배포를 재개하지 않는다.

## 0-A. 이번 채팅 전체 지시 연대기

소스 스레드: `019f9d86-503b-7f13-8a26-04bc0c8a9ddd`.

1. 최초 위임은 `foresttour.kr` 작업이었다. 저장소의 `AGENTS.md`, `CLAUDE.md`, `LOG.md`,
   기존 인계서를 끝까지 읽고 Git 상태와 원격 인계 브랜치를 확인한 뒤,
   marketing 인계의 완료·부분완료·미완료·불변 규칙과 대조해 자연스러운 발견 퍼널과
   예약 전환 맥락에서 가장 먼저 안전한 작업을 수행하라는 내용이었다.
2. 시스템 재부팅 후에는 Git/worktree를 비파괴 점검하고 같은 `foresttour.kr` 작업을
   계속하라는 재개 지시가 있었다.
3. 작업이 BAND 쪽으로 흐르자 사용자가
   “foresttour.kr 작업을 하라고 지시했는데 왜 밴드 작업을 하고 있지?”라고 정정했다.
   BAND를 주 목표로 해석하는 것은 명백히 잘못이다.
4. 사용자는 승인 질문을 반복하지 말고 자동으로 개선하며 최종 goal을 설정하라고 했다.
   goal이 잘못되면 사용자가 goal 자체만 고칠 수 있도록 매우 구체적이어야 한다고 했다.
5. 저장소에 원래 더 길고 자세한 goal이 있었으므로 찾아 복원·보완하라고 했다.
6. 전체 브랜치를 정리하라고 했다. 분산된 worktree/브랜치/체크포인트를 잃지 않고
   원격 보존하는 것이 중요하다.
7. goal을 매우 구체적이고 상세하게 자동 설정하고 실행하라고 다시 지시했다.
8. 잘못된 goal이 복원되자 사용자는 핵심을
   “여기는 Instagram 회원이 자연스럽게 방문하게 되는 곳”이라고 재확정했다.
9. 사용자는 Instagram 카드뉴스 관리와 Instagram 홍보까지 같은 책임자가 맡는 편이
   통일성에 더 좋은지 물었다. 현재 정본은 “그렇다”이며,
   Instagram과 사이트를 한 편집 단위로 관리한다.
10. 사용자는 이전의 분절·승인 대기 지시를 폐기하고 스스로 모든 것을 진행하라고 했다.
11. 반복 중지에 대해 “그냥 다 하라니까 왜 자꾸 중지하느냐”고 재차 자동 진행 의사를 밝혔다.
    이 자율성은 사실을 만들거나 secret을 노출하거나 서로 다른 과제를 섞는 권한은 아니다.
12. 이후 사용자는 모든 작업을 중단하고 Linux 환경 이전 handoff를 시작하라고 했다.
13. 현재 marketing 세션에서는 모든 작업 중단, Linux agent handoff, Git push,
    새 세션에 프롬프트를 넣지 않아도 정보가 손실되지 않도록 채팅의 모든 내용을
    인계서에 기록하라고 최종 명령했다.
14. 마지막 정정으로 인계 문서를 제품 중립적인 Linux agent 문서로 정리하라고 했다.

우선순위 해석:

- 가장 최근의 중단·handoff·push 명령이 현재 실행 범위다.
- 중단 이전에 재개할 persistent goal은 §0의 Instagram → `foresttour.kr` 통합 퍼널이다.
- BAND/카페 작업 결과는 역사적 감사 자료로만 보존한다.
- “승인 묻지 말고 자동 진행”은 재개 후 범위 내 로컬 작업을 스스로 수행하라는 뜻이다.
  현재 중단 명령을 무시하거나 새 공개 게시를 만들라는 뜻은 아니다.

## 1. Repository and safety

- Repository: `6Soo/marketing`; branch: **`main`**; remote: `https://github.com/6Soo/marketing/`.
  - 2026-07-28 확인: 이 문서가 처음 적었던 `Master`는 존재하지 않는다(`origin/Master` 없음).
    기본 브랜치는 `origin/HEAD -> origin/main`이므로 `main`으로 정정한다. §7 재개 절차도 함께 정정됨.
- Handoff series before the final cleanup:
  `1c32f59`, `2752e73`, `39e9972`, `1acf949`, `03bb01a`, `f3f2159`.
- Relevant implementation history: `9d05fb8`, `2158b65`, `b52ac72`, `abf69a6`, `363cea3`.
- The worktree has an untracked design artifact under `strategy/` (filename contains Korean text); preserve it, but do not stage it without review.
- `.omc/` and `.codex-remote-attachments/` are local/non-owned state and are ignored by `.gitignore`; never commit or transmit them.
- Never use destructive Git commands. Do not infer, print, copy, or transmit production secrets.

### foresttour audit branch

- Repository: `6Soo/foresttour`.
- Main Windows checkout: `D:\OneDrive\문서\AX\foresttour`.
- The unrelated BAND branch `codex/band-spam-cleanup-2026-07-26` remains untouched.
- A detached five-commit cafe detour was preserved for audit at
  `origin/codex/linux-agent-handoff-2026-07-27`.
- Preserved SHA:
  `755a1fd96e66a5867f190306c45f1fd4beb344ce`.
- Commits: `da9eaa9`, `6a8b8ce`, `9d8208c`, `78373ee`, `a3f8112`.
- This branch is not the active `foresttour.kr` goal. Do not merge or resume it automatically.

## 2. Standing project instructions

Before resuming, read `AGENTS.md`, `CLAUDE.md`, the bottom/latest session handoff in `LOG.md`, then this file and relevant `strategy/`/`docs/` material. Google Workspace, if used, must authenticate as `kkokkohero6@gmail.com`; GitHub access is the `6Soo` organization account. Claude-only remote scheduling is not portable to Linux; use ordinary Linux tooling or GitHub Actions.

## 3. Persistent Goal and status

Goal: operate the Instagram card-news/reel/Story pipeline and `foresttour.kr` travel stories
as one coherent discovery system so 20–40-year-old visitors naturally move from
destination discovery to desire, understanding, trust, and—only when a matching public
departure exists—reservation. Establish a repeatable, evidence-based measurement loop for
activating the `@foresttour.kr` account without turning destination content into a product ad.

Goal status at stop: `blocked`, not complete. The repeated blocker is that `FORESTTOUR_ADMIN_KEY` is absent and the 24-hour checkpoints had not yet become due at the last observed time. Resume the existing Goal after an external state change or user secret registration; do not recreate or replace it. Do not mark it complete merely because tests pass.

### Invariants

1. The destination—not price, itinerary, nights, departure date, or trip leader—is the content protagonist.
2. The visual reference is `cardnews/나만몰랐던일본-001-히다.html`: full-bleed real photography,
   lower gradient scrim, white typography, and field-note grammar.
3. Actual course/local photography is preferred. AI or stock stand-ins remain `placeholder`,
   must be disclosed, and cannot be republished as verified local photography.
4. The Instagram cover question and the first web answer must carry the same meaning.
5. Each public slug is stable and has unique canonical/OG metadata.
6. The profile presents a clean `foresttour.kr` destination while surface-specific links
   preserve the first source marker through internal navigation.
7. No schedule CTA, departure month, duration, or “next departure” promise exists unless
   the same destination and schedule are visible in the public reservation system.
8. Instagram newcomers do not land on cafe membership as the first step.
9. Only complete measurement checkpoints are learnable. Unshown reach, views, interaction,
   and conversion values are never inferred.
10. Secrets, tokens, admin keys, and PII never enter documentation, logs, Git, or chat.
11. BAND/cafe branch changes are not mixed into this Goal.

### Required output for one destination editing unit

- series number, destination, and core question;
- official facts and photo-by-photo rights/provenance/local-status evidence;
- Instagram carousel/reel/Story assets and publishable caption;
- save-oriented next action without unsupported promises;
- `foresttour.kr/stories/<slug>` content, canonical, OG, and representative image;
- profile/carousel/story/reel links and first-source markers;
- verified public-schedule connection or an explicit null state;
- landing, body, next-discovery, and schedule-selection measurement events;
- 0h/24h/72h/7d evidence and checkpoint completeness;
- render, mobile, accessibility, links, console, and fail-closed verification.

### Completion gates

Do not complete the Goal until all are true:

1. At least one new destination unit with verified local photography is coherent across
   Instagram, web story, links, and measurement.
2. Publishing is reproducible through a restored API path or a verified UI fallback.
3. JPEG assets, manifest, fingerprint, caption, and permalink share one execution record.
4. The landing page passes 390px mobile, canonical, OG, sources, navigation, and CTA fail-closed checks.
5. A real matching schedule correctly shows a CTA, while missing/mismatched schedules hide it.
6. A 24h checkpoint contains both Instagram and foresttour source groups.
7. Tests prove partial checkpoints cannot train or activate the account.
8. Initial activation is claimed only after non-owner organic interaction and
   Instagram-attributed visits are observed.
9. Scheduled publishing stays disabled until three manual production reviews pass.
10. Tests, `git diff --check`, Git state, and production evidence are recorded.

## 4. User/session decisions captured

- The conversation covered `foresttour.kr` natural discovery/booking-funnel follow-up and
  a mistaken detour into `m.cafe.daum.net/sixsungwon`. The cafe detour is preserved only
  as audit history; the active persistent Goal is Instagram activation and the
  `foresttour.kr` discovery funnel.
- The user asked for Instagram card auto-upload improvement and successful account activation through travel-destination promotion.
- Public Instagram posts already exist and must not be duplicated:
  - Sado: `https://www.instagram.com/p/DbRD-fWkyUL/`
  - Northern Alps: `https://www.instagram.com/p/DbRGuL5kwEU/`
- Do not publish a Story before a complete 24-hour checkpoint. A Story link sticker is a mobile/manual step; no undocumented API parameter was assumed.
- Earlier instructions gated external publishing and secret changes; the user later rejected
  repeated approval pauses and asked the agent to progress autonomously within scope.
  The current stop instruction overrides both for now: do local handoff work only and do not
  publish, deploy, message, or change secrets until the user resumes.
- The user supplied a screenshot showing a failed “Instagram activation checkpoints” workflow: discovery failed, learning succeeded, checkpoint-status skipped. This led to the fail-closed and partial-source-preservation work described below.

### Mistaken cafe detour retained for audit

The following local-only documents were committed on the foresttour audit branch:

- `docs/카페-신규회원-안내자산-선별검증-2026-07-26.md`
- `docs/카페-사장님가이드-운영안전-선별검증-2026-07-26.md`
- `docs/카페-신규회원-7일안착-게시전초안-2026-07-26.md`
- `docs/카페-모바일-읽기전용점검-차단기록-2026-07-26.md`
- `docs/LINUX_AGENT_HANDOFF_2026-07-27.md`

That work checked newcomer guidance, the owner guide, a seven-day onboarding draft,
and a read-only mobile cafe inspection. Automated browser control was blocked by a URL-level
policy, while a user-provided browser screenshot showed the cafe itself worked normally at
`https://m.cafe.daum.net/sixsungwon/_rec`. The screen showed the cafe name,
`게시판/최신글/이미지`, `가입하기`, recent posts/comments, and an internal popular-post banner.
Do not report the automation restriction as a site outage.

No cafe post, edit, deletion, pinned notice, comment, message, email, phone action,
menu/board/join-question/permission change, upload, account/security/payment/PII change,
or external transmission was performed.

### Supplemental chronology of the mistaken cafe detour

This chronology preserves the cafe detour without overriding the full-thread chronology in §0-A.

1. A later, mistaken task restoration targeted `m.cafe.daum.net/sixsungwon`. It required reading each repository’s `AGENTS.md`, `CLAUDE.md`, `LOG.md`, and migration handoffs before acting; checking Git and remote branches; comparing the senior-friendly gradual cafe redesign, seven-day newcomer settling flow, and booking-conversion context; and validating newcomer guidance assets and the owner guide separately from concurrent work.
2. Existing mobile-member behavior had to remain intact: current menu names, latest-post flow, comments, and telephone booking habits. Real cafe posts, messages, uploads, menu changes, board changes, permission decisions, or other external transmission were prohibited without explicit approval. Each local unit required validation and a checkpoint commit.
3. After a system reboot, the user instructed the agent to inspect Git/worktree state non-destructively and resume.
4. Automated browser control reported a URL-policy block. The user correctly objected that the site itself opened normally and supplied a screenshot. The correct conclusion is that human browser access worked while the automation surface was blocked; never describe the cafe as unavailable.
5. The user asked to resume work in parallel, then superseded that request by ordering all work stopped and requesting a Linux migration handoff and Git push. The stop instruction remains authoritative until the user explicitly resumes.
6. The user’s latest instruction requires all implementation-runtime-specific material to be removed from documentation. The handoff therefore preserves business context, evidence, Git recovery, and safety boundaries without preserving those runtime instructions.

### Cafe screenshot and read-only evidence

- User-provided URL: `https://m.cafe.daum.net/sixsungwon`
- Screenshot URL: `https://m.cafe.daum.net/sixsungwon/_rec`
- Cafe name: `숲길따라 감성여행`
- Visible tabs: `게시판`, `최신글`, `이미지`
- A `가입하기` button, current latest-post list, and comment counts were visible.
- The banner displayed “지금 가장 인기 있는 여행지는 어디일까요?” and an “인기글 보기” route.
- The screenshot demonstrates that the mobile cafe opened successfully in the user’s browser.
- No bypass, raw browser-control workaround, cafe mutation, comment, message, or upload was performed.

### Cafe-local artifacts preserved in foresttour

The audit branch `codex/linux-agent-handoff-2026-07-27` preserves these commits:

- `da9eaa9` — newcomer guidance asset validation
- `6a8b8ce` — owner-guide operating-safety validation
- `9d8208c` — seven-day newcomer onboarding pre-publication draft
- `78373ee` — mobile cafe read-only audit block record
- `a3f8112` — initial Linux migration handoff checkpoint

Relevant documents on that branch:

- `docs/카페-신규회원-안내자산-선별검증-2026-07-26.md`
- `docs/카페-사장님가이드-운영안전-선별검증-2026-07-26.md`
- `docs/카페-신규회원-7일안착-게시전초안-2026-07-26.md`
- `docs/카페-모바일-읽기전용점검-차단기록-2026-07-26.md`
- `docs/LINUX_AGENT_HANDOFF_2026-07-27.md`

These cafe artifacts are audit/recovery material, not the active Instagram-to-`foresttour.kr` Goal. Do not redirect new Instagram visitors to cafe signup or restore the cafe work as the primary goal.

### Unified editorial direction

The persistent business direction is a unified Instagram → `foresttour.kr` discovery funnel:

1. Card news, reels, or Stories create curiosity about a specific region, landscape, or culture.
2. `foresttour.kr/stories/<slug>` immediately answers the cover question and adds location, season, walking feel, transport gaps, baggage movement, booking, and language context.
3. Local-stay experience and the company’s travel method establish trust.
4. A low-pressure booking connection appears only when a real matching itinerary is verified.
5. Landing, article depth, next-story movement, and itinerary selection are measured anonymously; incomplete checkpoints are never treated as proof of success.

Instagram creative, promotion, landing-page promise, slug, metadata, photo/fact provenance, itinerary connection, and measurement contract should be managed as one editorial unit. BAND cleanup and cafe modernization remain separate historical workstreams.

## 5. Completed implementation (pushed)

1. `tools/ingest-instagram-publish-result.mjs`
   - accepts `graph-api` or `instagram-ui`, validates the source, and deduplicates by source/permalink;
   - CLI supports `--source=instagram-ui` for a manual UI result file.
2. `tools/collect-instagram-activation-metrics.mjs`
   - accepts `--instagram-source=graph-api|instagram-ui`, so a UI snapshot fills the Instagram source group without pretending it came from the API.
3. `.github/workflows/instagram-activation-checkpoints.yml`
   - manual dispatch accepts optional checked-in `instagram_snapshot_path`;
   - a supplied snapshot bypasses the automatic-collection-disabled guard, records it as `instagram-ui`, and still gates foresttour collection on `ACTIVATION_COLLECT_ENABLED` and its secret;
   - scheduled runs fail closed when a due checkpoint has no collection path.
4. `package.json`
   - added `npm run activation:ingest` and `npm run activation:collect`.
5. `.gitignore`
   - protects `.omc/` and `.codex-remote-attachments/` from accidental commits.

Last verification: `npm run test:instagram` passed 41/41. Tests cover publish validation, source collection, checkpoint coverage, learning gates, Story readiness, token non-disclosure, and workflow behavior.

## 6. External/runtime evidence at stop

- Operating Instagram account: `@foresttour.kr`.
- Public posts that must not be duplicated:
  - Sado: `https://www.instagram.com/p/DbRD-fWkyUL/`
  - Northern Alps: `https://www.instagram.com/p/DbRGuL5kwEU/`
- Profile destination:
  `https://foresttour.kr/?utm_source=ig&utm_medium=social&utm_content=link_in_bio`.
- The first Northern Alps upload `DbRFfObk56K` had a stale final card, so the corrected
  eight-card post was verified first and the bad duplicate was removed.
- Public Northern Alps story:
  `https://foresttour.kr/stories/northern-alps`.
- Production deployment `dpl_96otr4Y6fTjRD5QfQ7CyUoUtigpB` was READY and passed
  390×844 mobile, canonical, metadata, source links, home discovery card,
  CTA, overflow, and console checks.
  - 2026-07-28 확인: 위의 "eight source links"는 사진 고정 리비전 8건 기준이었다.
    현재 `/stories/northern-alps`는 **총 14개 출처**(공식 자료 6 + 사진 8)를 렌더한다.
    기준 수치를 14로 갱신한다.
- Public Sado story: `https://foresttour.kr/stories/sado`.
  - 2026-07-28 확인: 이 문서는 사도를 IG 게시물·Story 에셋으로만 기록했으나, 사도는 지금
    canonical·OG·공식 출처 4건을 갖춘 정식 스토리 페이지이며 홈 발견 카드에서 연결된다.
    연결된 공개 일정이 없으므로 CTA는 올바르게 숨김 상태다(fail-closed 정상).
- The exact active product `fNod` is shown only when runtime verification succeeds;
  API failure, delay, or mismatch hides the CTA.
  - 2026-07-28 확인 — 알려진 취약점: `fNod` CTA 노출이 상품 제목의 부분 문자열 매칭
    (`알펜루트`·`가미코지`·`노리쿠라`)에 의존한다. 카페 원문 제목이 바뀌면 CTA가 조용히 사라진다.
- Hida and Sanriku captions were corrected to remove unsupported duration/month/departure
  promises and disclose AI/stock stand-ins. Their placeholder assets remain blocked from republishing.
- GitHub secret names present: `IG_ACCESS_TOKEN`, `IG_USER_ID`.
- Missing: `FORESTTOUR_ADMIN_KEY`; no `ACTIVATION_COLLECT_ENABLED` repository variable was present.
- Meta API calls were blocked with `OAuthException code 200: API access blocked`; do not retry as if successful or fabricate metrics.
- Production `foresttour.kr/api/health` previously exposed only `adminKey: true` (presence, not value). Never derive the key from it. No local/deployment environment value was available.
- 0h records for Sado and Northern Alps are present. At the 2026-07-27 check (around 05:55 KST), 24h was still upcoming:
  - Sado due `2026-07-27T18:47:02.033Z` UTC = 2026-07-28 03:47 KST;
  - Northern Alps due `2026-07-27T19:15:31.598Z` UTC = 2026-07-28 04:15 KST.
  - **2026-07-28 확인: "24h가 아직 미도래"라는 서술은 정정한다. 두 기한 모두 이미 지났다.**
    현재 두 실험 모두 24h 상태는 `due`이고 records는 0이다.
    **시간이 더 흘러도 자동으로 `recorded`가 되지 않는다** — 수집 경로(Instagram API 또는
    체크인된 UI 스냅샷 + `FORESTTOUR_ADMIN_KEY`)가 실행돼야만 기록된다.
- Last reports showed both experiments `collecting`, with 24h missing source groups `graph-api or instagram-ui` and `foresttour-admin`.
- 2026-07-28 확인 — 워크플로 실패: `instagram-activation-checkpoints` 예약 실행이
  07-27 19:50, 07-28 03:30 두 건 연속 실패했다. 이는 설계된 fail-closed이며 장애가 아니다.
  다만 `Determine due checkpoint` 스텝이 리포트 도구의 exit 2에서 죽어 안내 스텝
  (`Refuse silent checkpoint miss`)에 도달하지 못하던 결함이 있었고, 커밋 `4e3f76c`로 수정됐다.
- 2026-07-28 확인 — 알려진 결함(사도 사진): `cardnews/series/sado`는 `photoStatus: 'verified'`인데
  `node tools/validate-cardnews-sources.mjs cardnews/series/sado`는 실패한다
  (표지가 `03-kitazawa.jpg`를 재사용 → 중복). 실게시 게이트가 `photoStatus`만 보고 검증기를
  돌리지 않는 구멍이 있다.
- Last observed 0h UI metrics were zero/unknown where the UI showed no value; do not infer success from zeros.
- Sado Story follow-up asset:
  `cardnews/out/sado/story/01-discovery-link.jpg`.
- Account activation requires both non-owner organic response and Instagram-attributed
  `story_*_visit`; a permalink alone is not activation evidence.

## 7. Linux resume procedure (only after the user resumes)

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git status --short
git show --stat --oneline 9d05fb8
cat AGENTS.md
cat CLAUDE.md
tail -n 200 LOG.md
cat HANDOFF-LINUX-AGENT.md
npm run test:instagram
npm run activation:status -- --experiment=sado-003
npm run activation:status -- --experiment=northern-alps-004
gh secret list --repo 6Soo/marketing
gh variable list --repo 6Soo/marketing
```

Do not start a new Goal; resume the existing blocked Goal. Only after the owner securely creates a fresh GitHub Actions secret named `FORESTTOUR_ADMIN_KEY` (value never sent in chat) may the owner enable `ACTIVATION_COLLECT_ENABLED=true`.

At a due checkpoint:

1. Collect Instagram via the API if it works; otherwise use a checked-in, user-provided UI snapshot with `workflow_dispatch` input `instagram_snapshot_path` or `npm run activation:collect -- --instagram-source=instagram-ui`.
2. Collect foresttour using the GitHub secret; never log the key.
3. Verify both source groups and run `npm run activation:learn`.
4. Only when `story:ready` passes for the complete 24h contract may the owner perform the mobile Story link-sticker action.
5. Keep later 72h/7d records; do not claim activation without organic interaction and Instagram-attributed Story visits.

## 8. Safe invariants and handoff boundaries

- No public Instagram post/Story, secret creation, secret rotation, or external message was performed in this session.
- No cafe post, comment, message, upload, menu/board change, permission change, telephone call, or email was performed.
- Do not use `/api/health` as a key-retrieval mechanism.
- Do not treat a partial checkpoint as learnable or activated; both measurement source groups are required.
- Preserve all untracked user artifacts. Before any commit, review `git diff` and `git status`; never stage ignored runtime directories.
- If new authority or a major user choice is needed, stop and ask the user; do not silently broaden scope.
