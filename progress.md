# Harbor Hermes Progress

This file is a stable index. Routine evidence and handoffs belong in dated
files under `agent_state/progress/`.

## State Files

- Feature index: `feature_list.json`
- Active feature: `agent_state/features/harbor-desktop-v0152.json`
- Session handoffs: `agent_state/progress/*.md`

## Current Focus

Active feature: `harbor-desktop-v0152`

Bring the Harbor Works desktop fork onto Hermes `0.15.2`, keep the app branded
as Harbor Works, and prepare PR #16 for merge. After merge, start follow-up work
in separate worktrees, one branch per task.

## Startup Checklist

1. Read `AGENTS.md`.
2. Read `feature_list.json`.
3. Read the active feature file under `agent_state/features/`.
4. Read the latest relevant handoff under `agent_state/progress/`.
5. Check `git status --short --branch`.

## Verification

Run:

```bash
./init.sh
```

For Harbor Engine integration changes, also run:

```bash
scripts/harbor-engine-smoke.sh
```

Record any failure or environment blocker in a dated handoff.
