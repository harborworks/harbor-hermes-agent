# 2026-05-27 Harbor Fork Harness

## Objective

Establish the first restartable harness for the skinny Harbor fork of Hermes
Agent. The fork starts from upstream tag `v2026.5.16`, and the first Harbor
version is `v2026.5.16.harbor1`.

## Verification Evidence

- Harness files were created on branch `codex/v2026.5.16-harbor1-harness`.
- `AGENTS.md` now contains a Harbor fork overlay with auth, Engine, versioning,
  replay, and verification rules.
- `docs/harbor-fork.md` documents the upstream tag replay workflow.
- `scripts/harbor-engine-smoke.sh` reads the long-lived Harbor token from
  `~/.hw/credentials.json` and calls stage Engine without printing the token.
- Created private GitHub repository `harborworks/harbor-hermes-agent`; local
  remotes are `origin` for Harbor and `upstream` for Nous.
- Opened PR #1 for review before tagging:
  `https://github.com/harborworks/harbor-hermes-agent/pull/1`.
- Harness validation passed at 100/100.
- `./init.sh` passed. It ran `bash -n init.sh` and
  `scripts/run_tests.sh tests/hermes_cli/test_config.py`, with 55 tests passed.
- `scripts/harbor-engine-smoke.sh` passed against
  `https://stage-engine.harborworks.ai`; response model was
  `claude-sonnet-4.6` and answered `2 + 2 = 4`.

## Files Changed

- `AGENTS.md`
- `feature_list.json`
- `progress.md`
- `agent_state/features/harbor-skinny-fork.json`
- `agent_state/progress/2026-05-27-initial-handoff.md`
- `init.sh`
- `docs/harbor-fork.md`
- `scripts/harbor-engine-smoke.sh`
- `CLAUDE.md`
- `.cursor/rules/agents.mdc`

## Blockers

- None currently.

## Next Step

Implement the smallest Harbor provider/auth/catalog patch that uses `~/.hw`
credentials and verifies against `https://stage-engine.harborworks.ai`.
