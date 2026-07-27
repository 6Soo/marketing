# Linux agent migration handoff — marketing

> Standalone continuation context. A Linux agent should resume from this document without relying on the chat prompt. It records the session decisions, completed implementation, evidence, blockers, and exact next actions. Production secrets are intentionally excluded.

Updated: 2026-07-27, Asia/Seoul. User instruction at handoff: stop all work, prepare a Linux agent migration handoff, push it, and do not start new workers or publish anything during migration.

## 1. Repository and safety

- Repository: `6Soo/marketing`; branch: `Master`; remote: `https://github.com/6Soo/marketing/`.
- Latest pushed commit before this handoff: `9d05fb8 chore: ignore local agent runtime state`.
- This handoff is the next documentation commit. Relevant history: `2158b65`, `b52ac72`, `abf69a6`, `363cea3`.
- The worktree has an untracked design artifact under `strategy/` (filename contains Korean text); preserve it, but do not stage it without review.
- `.omc/` and `.codex-remote-attachments/` are local/non-owned state and are ignored by `.gitignore`; never commit or transmit them.
- Never use destructive Git commands. Do not infer, print, copy, or transmit production secrets.

## 2. Standing project instructions

Before resuming, read `AGENTS.md`, `CLAUDE.md`, the bottom/latest session handoff in `LOG.md`, then this file and relevant `strategy/`/`docs/` material. Google Workspace, if used, must authenticate as `kkokkohero6@gmail.com`; GitHub access is the `6Soo` organization account. Claude-only remote scheduling is not portable to Linux; use ordinary Linux tooling or GitHub Actions.

## 3. Persistent Goal and status

Goal: improve the Instagram card-news automatic upload pipeline to an operational level and establish/verify a repeatable measurement loop for activating travel-promotion content and the `@foresttour.kr` account.

Goal status at stop: `blocked`, not complete. The repeated blocker is that `FORESTTOUR_ADMIN_KEY` is absent and the 24-hour checkpoints had not yet become due at the last observed time. Resume the existing Goal after an external state change or user secret registration; do not recreate or replace it. Do not mark it complete merely because tests pass.

## 4. User/session decisions captured

- The conversation covered two related contexts: `foresttour.kr` natural discovery/booking-funnel follow-up and `m.cafe.daum.net/sixsungwon`; the active thread became the Instagram activation Goal.
- The user asked for Instagram card auto-upload improvement and successful account activation through travel-destination promotion.
- Public Instagram posts already exist and must not be duplicated:
  - Sado: `https://www.instagram.com/p/DbRD-fWkyUL/`
  - Northern Alps: `https://www.instagram.com/p/DbRGuL5kwEU/`
- Do not publish a Story before a complete 24-hour checkpoint. A Story link sticker is a mobile/manual step; no undocumented API parameter was assumed.
- New authority, secret changes, public publishing, or external transmission require explicit user approval.
- The user supplied a screenshot showing a failed “Instagram activation checkpoints” workflow: discovery failed, learning succeeded, checkpoint-status skipped. This led to the fail-closed and partial-source-preservation work described below.

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

- GitHub secret names present: `IG_ACCESS_TOKEN`, `IG_USER_ID`.
- Missing: `FORESTTOUR_ADMIN_KEY`; no `ACTIVATION_COLLECT_ENABLED` repository variable was present.
- Meta API calls were blocked with `OAuthException code 200: API access blocked`; do not retry as if successful or fabricate metrics.
- Production `foresttour.kr/api/health` previously exposed only `adminKey: true` (presence, not value). Never derive the key from it. No local/deployment environment value was available.
- 0h records for Sado and Northern Alps are present. At the last check (2026-07-27 around 05:55 KST), 24h was still upcoming:
  - Sado due `2026-07-27T18:47:02.033Z` UTC = 2026-07-28 03:47 KST;
  - Northern Alps due `2026-07-27T19:15:31.598Z` UTC = 2026-07-28 04:15 KST.
- Last reports showed both experiments `collecting`, with 24h missing source groups `graph-api or instagram-ui` and `foresttour-admin`.
- Last observed 0h UI metrics were zero/unknown where the UI showed no value; do not infer success from zeros.

## 7. Linux resume procedure (only after the user resumes)

```bash
git fetch origin
git switch Master
git pull --ff-only origin Master
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
- Do not use `/api/health` as a key-retrieval mechanism.
- Do not treat a partial checkpoint as learnable or activated; both measurement source groups are required.
- Preserve all untracked user artifacts. Before any commit, review `git diff` and `git status`; never stage ignored runtime directories.
- If new authority or a major user choice is needed, stop and ask the user; do not silently broaden scope.
