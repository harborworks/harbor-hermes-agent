# Harbor Works Harness Progress

This file is a stable index. Routine evidence and handoffs belong in dated
files under `agent_state/progress/`.

## State Files

- Feature index: `feature_list.json`
- Active feature: `agent_state/features/harbor-desktop-v0152.json`
- Session handoffs: `agent_state/progress/*.md`

## Current Focus

Active feature: `harbor-desktop-v0152`

Bring the Harbor Works desktop app onto selected relevant Hermes `0.15.2`
changes, keep the app branded as Harbor Works, and prepare PR #16 for merge.
After merge, start follow-up work in separate worktrees, one branch per task.

Strategic decision: Harbor Works Harness is a hard eject from Hermes as product
source of truth. For each upstream Hermes release, an agent reviews the release
and ports only changes that matter for `harbor-works-harness`.

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
