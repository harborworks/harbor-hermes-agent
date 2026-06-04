# 2026-06-04 Harbor Works Desktop v0.15.2 Handoff

## Current Objective

- Goal: merge PR #16, then parallelize follow-up Harbor Works desktop tasks in
  separate worktrees and sessions.
- Branch: `codex/harbor-desktop-v0152`
- PR: https://github.com/harborworks/harbor-hermes-agent/pull/16
- Current status: PR is open, pushed, and ready for review/merge.

## Completed

- Folded desktop package metadata to `0.15.2`.
- Scoped desktop provider/model setup to Harbor Works and OpenAI Codex.
- Added Harbor Works CLI install/auth handling in app.
- Added OpenAI Codex / ChatGPT sign-in surface back to desktop.
- Restored desktop `/model` command behavior for authenticated model switching.
- Pointed CLI/desktop update messaging and paths at Harbor Works where
  applicable.
- Replaced app icons with the new Harbor Works lighthouse mark from
  `~/code/harbor-landing-page`.
- Renamed the packaged desktop identity to Harbor Works:
  `CFBundleDisplayName`, `CFBundleExecutable`, `CFBundleName`, bundle id
  `com.harborworks.desktop`, app/window/menu title, About/update labels, and
  first-screen intro.
- Installed `/Applications/Harbor Works.app` locally and removed
  `/Applications/Hermes.app`.
- Updated PR #16 body with current verification notes.

## Verification Evidence

| Check | Command / Method | Result |
|---|---|---|
| Electron script syntax | `node --check apps/desktop/electron/main.cjs apps/desktop/electron/hardening.cjs apps/desktop/scripts/after-pack.cjs apps/desktop/scripts/set-exe-identity.cjs` | Passed |
| Desktop renderer/type build | `npm run build --workspace apps/desktop` | Passed |
| Local macOS package | `CSC_IDENTITY_AUTO_DISCOVERY=false npm run builder --workspace apps/desktop -- --dir -c.mac.identity=null` | Passed |
| Packaged app smoke | `HERMES_DESKTOP_SKIP_BUILD=1 npm run test:desktop:existing --workspace apps/desktop` | Passed |
| Runtime app identity | Computer Use on `Harbor Works` | App path `/Applications/Harbor Works.app`, bundle id `com.harborworks.desktop`, window/menu title `Harbor Works` |
| Dock icon proof | `/Users/jbencook/Desktop/harbor-works-open-proof-20260604-0844.png` | Dock shows Harbor Works lighthouse icon while app is running |
| Auth/model smoke | Desktop chat prompt `What model are you running?` | Response: `I'm running gpt-5.5 via openai-codex in this session.` |
| Harness validation | `node /Users/jbencook/.hw/skills/732c1fe4-60fd-48da-9837-fe9439468809/harness-creator/scripts/validate-harness.mjs --target /Users/jbencook/.codex/worktrees/2bc7/harbor-hermes-agent` | Passed, 100/100 |
| Local venv repair | `uv sync --extra dev` | Passed; installed pytest/dev extras into this worktree `.venv` |
| Harness init | `./init.sh` | Passed; `tests/hermes_cli/test_config.py` completed with 88 passed |

## Files Changed In This Harness Update

- `AGENTS.md`
- `feature_list.json`
- `progress.md`
- `agent_state/features/harbor-desktop-v0152.json`
- `agent_state/progress/2026-06-04-harbor-desktop-v0152.md`
- `session-handoff.md`

## Local Environment Note

`./init.sh` initially failed because this worktree's `.venv` existed but did
not include `pytest`, so `scripts/run_tests.sh` selected it and failed before
test collection. `uv sync --extra dev` repaired the local `.venv`; no repo files
were changed by that environment repair.

## Decisions

- `AGENTS.md` now includes a short parallel-worktree protocol.
- The active feature is now `harbor-desktop-v0152`; the May skinny-fork state
  is now marked superseded and remains available only for historical context.
- Future parallel tasks should each get their own worktree, branch, feature
  file, and dated handoff to avoid merge conflicts.
- Harbor Works is now the product source of truth. This is a hard eject from
  Hermes as the product base, while still allowing selective upstream intake.
- For every upstream Hermes release, an agent should review the release and
  decide which changes are relevant to `harbor-works-harness`; wholesale replay
  is not the default process.
- User-facing naming should consistently use **Harbor Works**. Do not shorten
  the product to "Harbor" or "Works" except for established technical names
  such as Harbor Engine, Harbor Works CLI, `hw`, `~/.hw`, `harborworks`, and
  `HARBOR_*` identifiers.

## Blockers / Risks

- None blocking PR #16.
- PR #16 should be merged before starting follow-up branches so worktrees begin
  from the Harbor Works desktop baseline.
- Future repo/path/package renames to `harbor-works-harness` are not part of
  this harness-only decision update.

## Recommended Next Step

1. Merge PR #16.
2. Update local `main`.
3. Create one worktree per independent next task:

```bash
git fetch origin
git worktree add ../harbor-works-harness-<task-slug> -b codex/<task-slug> origin/main
```

4. In each new session, read `AGENTS.md`, `progress.md`,
   `feature_list.json`, the relevant feature file, and this handoff before
   editing.
