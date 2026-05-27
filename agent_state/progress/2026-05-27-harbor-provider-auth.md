# 2026-05-27 Harbor Provider Auth

## Summary

Merged the initial harness PR before touching code, then added the first skinny
Harbor code patch on `codex/harbor-provider-auth`.

## Decisions

- Keep Harbor as a regular Hermes API-key provider so upstream runtime plumbing
  and Anthropic URL mode detection stay intact.
- Special-case Harbor secret resolution to read the long-lived Harbor Works
  credential from `~/.hw` instead of `~/.hermes/.env`.
- Allow `HARBOR_ENGINE_TOKEN` only as an explicit process-env override for
  local development and smoke tests. The Harbor path does not call Hermes
  `get_env_value`, so it does not read a copied token from `~/.hermes/.env`.
- Normalize `HARBOR_ENGINE_BASE_URL` to end in `/anthropic` so callers can set
  either `https://engine.harborworks.ai` or the full Anthropic-compatible
  base URL.
- Keep the Harbor model picker catalog intentionally small:
-  `claude-sonnet-4.6` and `claude-opus-4.7`.
- Hide non-Harbor providers from picker/inventory surfaces by default without
  deleting upstream provider registry code.

## Files Changed

- `hermes_cli/auth.py`
  - Added the `harbor` provider entry.
  - Added `~/.hw` credential resolution with profile/path overrides.
  - Added Harbor Engine base URL normalization.
- `hermes_cli/models.py`
  - Added Harbor provider picker entry and supported model catalog.
  - Added Harbor aliases.
- `tests/hermes_cli/test_harbor_provider.py`
  - Added regression coverage for provider registration, credential source,
    model catalog, alias resolution, and runtime provider resolution.
- `agent_state/features/harbor-skinny-fork.json`
  - Updated state and evidence for the code patch.

## Verification

- `scripts/run_tests.sh tests/hermes_cli/test_harbor_provider.py`
  - 8 passed.
- `scripts/run_tests.sh tests/hermes_cli/test_harbor_provider.py tests/hermes_cli/test_runtime_provider_resolution.py tests/hermes_cli/test_api_key_providers.py`
  - 291 passed.
- Hermes runtime smoke:
  - Resolved `resolve_runtime_provider(requested="harbor")`.
  - Read `/Users/jbencook/.hw/credentials.json`.
  - Posted to `https://stage-engine.harborworks.ai/anthropic/v1/messages`.
  - Response model: `claude-sonnet-4.6`.
  - Response text: `2 + 2 = **4**`.
- `scripts/harbor-engine-smoke.sh`
  - Passed against stage Engine using `~/.hw/credentials.json`.
- `./init.sh`
  - Passed with 55 tests.

## Blockers

None.

## Next Step

Open the Harbor provider/auth/catalog PR for review. After it is reviewed and
merged, tag `v2026.5.16.harbor1`, then update `harbor-agents` install script to
install from that tag.
