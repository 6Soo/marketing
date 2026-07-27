# Linux agent migration handoff — marketing

> This document is the standalone continuation context. A Linux agent should be able to resume without relying on the chat prompt. It records decisions, completed work, evidence, blockers, and the exact next actions. Do not copy secrets into this file.

Updated: 2026-07-27, Asia/Seoul. User instruction at handoff: stop all work, prepare Linux agent migration handoff, and push it. Do not start workers or publish anything during migration.

## 1. Repository and safety

- Repository: `6Soo/marketing`; branch: `Master`; remote: `https://github.com/6Soo/marketing/`.
- Latest pushed commit before this handoff: `9d05fb8 chore: ignore local agent runtime state`.
- Relevant history: `2158b65 chore: add activation workflow commands`, `b52ac72 fix: allow manual snapshot when collection is disabled`, `abf69a6 feat: support Instagram UI activation snapshots`, `363cea3 docs: record Northern Alps Instagram launch`.
- The worktree has an untracked design artifact under `strategy/` (filename contains Korean text and is shown by `git status`); preserve it, but do not stage it without review.
- `.omc/` and `.codex-remote-attachments/` are local/non-owned state and are ignored by `.gitignore`; never commit or transmit them.
- Never use destructive Git commands. Do not infer, print, copy, or transmit production secrets.

## 2. Standing instructions

Read in this order before resuming: `AGENTS.md`, `CLAUDE.md`, the bottom/latest session handoff in `LOG.md`, then this file and relevant `strategy/`/`docs/` material. The project requires the global `orca-agent-orchestrator` policy for substantive software work: classify risk, start a background Run, report the actual downstream role/model/result/fallback/usage, and do not wait in the front conversation. During this handoff, the user explicitly requested a full stop, so do not start Orca workers until the user resumes work.

OAuth/operations account context: Google Workspace, if ever used, must be `kkokkohero6@gmail.com`; GitHub access is the `6Soo` organization account. Claude-only remote scheduling is not portable to Linux; use Orca/Linux tooling or GitHub Actions.

## 3. Persistent Goal and status

Goal: improve the Instagram card-news automatic upload pipeline to an operational level and establish/verify a repeatable measurement loop for activating travel-promotion content and the `@foresttour.kr` account.

Goal status at stop: `blocked`, not complete. The blocker was repeated across multiple turns: `FORESTTOUR_ADMIN_KEY` is absent and 24-hour checkpoints had not yet become due at the last observed time. The goal must be resumed—not recreated—after an external state change or user secret registration. Do not mark it complete merely because tests pass.

## 4. User/session decisions captured

- User asked to resume two contexts: `foresttour.kr` natural discovery/booking funnel follow-up and `m.cafe.daum.net/sixsungwon`; the active thread became the Instagram activation goal.
- User explicitly asked for Instagram card auto-upload improvement and successful account activation through travel-destination promotion.
- Public Instagram posts already exist and must not be duplicated:
  - Sado: `https://www.instagram.com/p/DbRD-fWkyUL/`
  - Northern Alps: `https://www.instagram.com/p/DbRGuL5kwEU/`
- Do not publish a Story before a complete 24-hour checkpoint. A Story link sticker is a mobile/manual step; no documented API parameter was assumed.
- New authority, secret changes, public publishing, or external transmission require explicit user approval.

## 5. Completed implementation (pushed)

1. `tools/ingest-instagram-publish-result.mjs`
   - accepts `graph-api` or `instagram-ui` source, validates the source, and deduplicates by source/permalink;
   - CLI supports `--source=instagram-ui` for a manual UI result file.
2. `tools/collect-instagram-activation-metrics.mjs`
   - accepts `--instagram-source=graph-api|instagram-ui` so a UI snapshot can fill the Instagram source group without pretending it came from Graph API.
3. `.github/workflows/instagram-activation-checkpoints.yml`
   - manual `workflow_dispatch` accepts optional checked-in `instagram_snapshot_path`;
   - a supplied snapshot bypasses the automatic-collection-disabled guard, records it as `instagram-ui`, and still keeps foresttour collection gated by `ACTIVATION_COLLECT_ENABLED` and its secret;
   - scheduled runs still fail closed when a due checkpoint has no collection path.
4. `package.json`
   - added `npm run activation:ingest` and `npm run activation:collect`.
5. `.gitignore`
   - added `.omc/` and `.codex-remote-attachments/` protections.

Last verification: `npm run test:instagram` passed 41/41 tests. Tests cover publish validation, source collection, checkpoint coverage, learning gates, Story readiness, token non-disclosure, and workflow behavior.

## 6. External/runtime evidence at stop

- GitHub Actions secrets present (names only): `IG_ACCESS_TOKEN`, `IG_USER_ID`.
- Missing: `FORESTTOUR_ADMIN_KEY`; no `ACTIVATION_COLLECT_ENABLED` repository variable was present.
- Meta Graph API calls were blocked with `OAuthException code 200: API access blocked`; do not retry as if successful or fabricate metrics.
- Production `foresttour.kr/api/health` previously exposed only `adminKey: true` (presence, not value). Never derive the key from it. No local/Vercel env value was available.
- 0h records for Sado and Northern Alps are present. At the last check (2026-07-27 around 05:55 KST), 24h was still upcoming:
  - Sado due `2026-07-27T18:47:02.033Z` UTC = 2026-07-28 03:47 KST;
  - Northern Alps due `2026-07-27T19:15:31.598Z` UTC = 2026-07-28 04:15 KST.
- Last reports showed both experiments `collecting`, with 24h missing source groups `graph-api or instagram-ui` and `foresttour-admin`.
- Latest Instagram UI snapshot metrics observed at 0h were all zero/unknown where UI showed no value; do not infer success from zeros.

## 7. Orca state at stop

- An initial Run `run-20260727-052507-520750ae` was stopped after its coordinator/worker stalled in design metadata handling.
- A replacement Run `run-20260727-054538-280529d5` was also stopped after its design agent completed inspection and reached the user-required secret boundary. Its last role was `design.primary`, Claude Opus High; no implementation worker or external publish was authorized.
- Orca runtime later returned `runtime_unavailable`; do not assume any terminal remains active. Confirm after Linux Orca starts.
- The previous Goal was marked `blocked` by the goal state tool after the same missing-secret/checkpoint condition repeated; do not recreate or replace it.

## 8. Linux resume procedure (only after user resumes)

```bash
git fetch origin
git switch Master
git pull --ff-only origin Master
git status --short
git show --stat --oneline 9d05fb8
cat AGENTS.md
cat CLAUDE.md
tail -n 200 LOG.md
cat HANDOFF-LINUX-ORCA.md
npm run test:instagram
npm run activation:status -- --experiment=sado-003
npm run activation:status -- --experiment=northern-alps-004
gh secret list --repo 6Soo/marketing
gh variable list --repo 6Soo/marketing
```

Then configure Linux Orca and apply `orca-agent-orchestrator` for substantive work. Do not start a new Goal; resume the existing blocked Goal. Only after the owner securely creates a fresh GitHub Actions secret named `FORESTTOUR_ADMIN_KEY` (value never sent in chat) may the owner enable `ACTIVATION_COLLECT_ENABLED=true`.

At a due checkpoint:

1. Collect Instagram via Graph API if it is working; otherwise use a checked-in, user-provided UI snapshot with `workflow_dispatch` input `instagram_snapshot_path` or `npm run activation:collect -- --instagram-source=instagram-ui`.
2. Collect foresttour via the admin endpoint using the GitHub secret; never log the key.
3. Verify both source groups are present and run `npm run activation:learn`.
4. Only when `story:ready` passes for the complete 24h contract may the owner perform the mobile Story link-sticker action.
5. Keep later 72h/7d checkpoints and learning records; do not claim account activation without organic interaction and Instagram-attributed Story visits.

## 9. Safe invariants and handoff boundaries

- No public Instagram post/Story, secret creation, secret rotation, or external message was performed in this session.
- Do not use `/api/health` as a key-retrieval mechanism.
- Do not treat a partial checkpoint as learnable or activated; both measurement source groups are required.
- Preserve all untracked user artifacts. Before any commit, review `git diff` and `git status`; never stage the ignored runtime directories.
- If a new authority or user choice is needed, stop and ask the user; do not silently broaden scope.
