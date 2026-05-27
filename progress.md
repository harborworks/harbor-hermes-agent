# Harbor Hermes Progress

This file is a stable index. Routine evidence and handoffs belong in dated
files under `agent_state/progress/`.

## State Files

- Feature index: `feature_list.json`
- Active feature: `agent_state/features/harbor-skinny-fork.json`
- Session handoffs: `agent_state/progress/*.md`

## Current Focus

Active feature: `harbor-skinny-fork`

Maintain a minimal Harbor patch series on top of upstream Hermes Agent tags.
The first Harbor version is `v2026.5.16.harbor1`, based on upstream
`v2026.5.16`.

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
