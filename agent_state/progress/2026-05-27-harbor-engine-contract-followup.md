# 2026-05-27 Harbor Engine Contract Follow-up

## Summary

Updated PR #2 after reviewing the latest `~/code/harbor-engine` remote main.

## Engine Contract Checked

- Fetched `harbor-engine` `origin/main` and reviewed commit
  `88b413193c68c990b029cb3367219c4a68a3b44f`.
- `origin/main:internal/proxy/models.go` lists chat aliases for Sonnet and
  Opus only. Kimi is no longer in the Harbor chat catalog.
- Harbor Engine settings now use the `HARBOR_ENGINE_*` naming convention.

## Changes

- Default Harbor provider base URL now targets
  `https://engine.harborworks.ai/anthropic`.
- Harbor env-token override is now `HARBOR_ENGINE_TOKEN`.
- Harbor catalog now exposes only `claude-sonnet-4.6` and
  `claude-opus-4.7`.
- Picker/inventory/provider-list surfaces now default to Harbor only via a
  small visible-provider overlay. Upstream provider registry code remains
  present for explicit/debug paths.
- Renamed the smoke script to `scripts/harbor-engine-smoke.sh`.
- The smoke script now fails if Harbor Engine returns an error JSON response.

## Verification

- `scripts/run_tests.sh tests/hermes_cli/test_harbor_provider.py`
  - 9 passed.
- `scripts/run_tests.sh tests/hermes_cli/test_harbor_provider.py tests/hermes_cli/test_runtime_provider_resolution.py tests/hermes_cli/test_api_key_providers.py`
  - 292 passed.
- `./init.sh`
  - 55 passed.
- `HARBOR_ENGINE_BASE_URL=https://stage-engine.harborworks.ai scripts/harbor-engine-smoke.sh`
  - Passed and returned `2 + 2 = **4**`.

## Notes

- `scripts/harbor-engine-smoke.sh` with the prod default currently fails DNS
  resolution for `engine.harborworks.ai`; this is expected while the prod Engine
  host is still being brought up.

## Next Step

Review and merge PR #2. After merge, tag `v2026.5.16.harbor1`, then update
`harbor-agents` to install from the tag.
