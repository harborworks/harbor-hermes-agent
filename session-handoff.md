# Session Handoff

## Current Objective

- Goal: merge Harbor Works desktop PR #16, then split follow-up work across
  separate worktrees and sessions.
- Branch: `codex/harbor-desktop-v0152`
- PR: https://github.com/harborworks/harbor-hermes-agent/pull/16
- Status: PR is open, pushed, locally verified, and ready for review/merge.
- Product decision: Harbor Works is the source of truth. Upstream Hermes is now
  reviewed for selective intake each release, not replayed wholesale.
- Naming decision: use **Harbor Works** for user-facing brand references. The
  intended harness/repo name is `harbor-works-harness`.

## Active State

- Feature index: `feature_list.json`
- Active feature: `agent_state/features/harbor-desktop-v0152.json`
- Latest detailed handoff:
  `agent_state/progress/2026-06-04-harbor-desktop-v0152.md`

## Verification Evidence

See the latest detailed handoff for the full table. Highlights:

- `npm run build --workspace apps/desktop` passed.
- `CSC_IDENTITY_AUTO_DISCOVERY=false npm run builder --workspace apps/desktop -- --dir -c.mac.identity=null` passed.
- `HERMES_DESKTOP_SKIP_BUILD=1 npm run test:desktop:existing --workspace apps/desktop` passed.
- Computer Use verified `/Applications/Harbor Works.app`, bundle id
  `com.harborworks.desktop`, Harbor Works Dock icon, and an authenticated
  OpenAI Codex model response.
- Harness validator passed at 100/100.
- `uv sync --extra dev` repaired this worktree's local `.venv` after
  `./init.sh` initially failed on missing `pytest`.
- `./init.sh` passed after the venv repair with 88 tests passed in
  `tests/hermes_cli/test_config.py`.

## Parallel Worktree Plan

After PR #16 merges:

```bash
git fetch origin
git worktree add ../harbor-works-harness-<task-slug> -b codex/<task-slug> origin/main
```

Use one branch/worktree/session per independent task. Each session should own
its own feature file under `agent_state/features/` and dated handoff under
`agent_state/progress/`.

## Next Session Startup

1. Read `AGENTS.md`.
2. Read `progress.md` and `feature_list.json`.
3. Read `agent_state/features/harbor-desktop-v0152.json`.
4. Read `agent_state/progress/2026-06-04-harbor-desktop-v0152.md`.
5. Check `git status --short --branch`.

## Recommended Next Step

Merge PR #16, update `main`, then create separate worktrees for the next batch
of tasks.
