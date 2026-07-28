# 2026-07-28 — Upstream replay onto v2026.7.20 (0.19.0)

Re-based the Harbor fork from upstream `v2026.5.16` (0.14.0) to `v2026.7.20`
(0.19.0), following the Upstream Replay Checklist in `docs/harbor-fork.md`.

Driver: HAR-1469 / HAR-1470. The `harness-state-mirror` Hermes plugin requires
`turn_id` and `api_request_id` on the `post_llm_call` / `post_api_request`
observer hooks. Hermes 0.14.0 has no turn-correlation subsystem at all, so the
plugin's compatibility gate (`>=0.18,<0.20`) correctly refused to load. The
upgrade — not a widened gate — is the fix.

## Replayed

Seven Harbor commits replayed onto `v2026.7.20`:

| Commit | Result |
| --- | --- |
| `d85d675` chore: add Harbor fork harness | clean |
| `b4bb149` feat: add Harbor Engine provider | conflicts in auth/inventory/main/models |
| `01e67c7` chore: point installer at Harbor fork | conflict (comment) |
| `d78a1c9` fix: route Harbor web tools through Engine auth | conflicts in web_tools/tavily/tests |
| `cd55b97` fix: limit Harbor model picker surfaces | conflict — patch obsolete |
| `2a3182d` chore: skip PyPI publish in Harbor fork | clean |
| `2cfb677` fix: tolerate sqlite without trigram tokenizer | superseded upstream |

Harbor delta shrank from 1331 to ~1200 insertions.

## Conflict resolutions

Per checklist rule 4 (preserve upstream unless the conflict is directly in
Harbor auth / provider / catalog / Engine / managed-mode code):

- **`auth.py`** — added only the `harbor` ProviderConfig, the harbor token
  branch, and the harbor aliases. Did **not** re-add `google-gemini-cli`;
  upstream removed it, and it only appeared in Harbor's diff as adjacent
  context. Kept upstream's `get_env_value_prefer_dotenv` (renamed from
  `get_env_value`).
- **`models.py`** — kept upstream's `CANONICAL_PROVIDERS` list verbatim and
  inserted the single Harbor entry after `lmstudio`. Kept upstream's new
  provider-group machinery (`PROVIDER_GROUPS`, `group_providers`) alongside
  Harbor's `visible_canonical_providers()`.
- **`main.py`** — dropped Harbor's copy of the active-provider block: upstream
  relocated and reworked that code (provider groups, config-driven
  exclusions). Re-applied Harbor's intent at upstream's new location by
  sourcing the picker from `visible_canonical_providers()`.
- **`inventory.py`** — kept all of upstream's `explicit_only` filtering and the
  richer `_append_unconfigured_rows` signature; layered Harbor's
  `_filter_visible_rows` on top rather than replacing.
- **`commands.py`** — **dropped** `cd55b97`'s payload. Upstream removed the
  inline `/model ` completion path entirely (`_model_completions` no longer
  exists; `/model ` now opens the picker). The patch targeted deleted code.
  Harbor-only visibility is still enforced on the real surfaces.
- **`hermes_state.py`** — **dropped** `2cfb677`'s sqlite payload. Upstream
  v2026.7.20 implements the same protection natively and more thoroughly
  (`_is_trigram_unavailable_error`, `_warn_trigram_unavailable`,
  `_trigram_available`, handling `no such tokenizer: trigram`). Only the
  unrelated gateway foreground-restart message from that commit was carried
  forward.

## Integration defects found and fixed

Three real problems surfaced only after the replay, all committed in
`fix: reconcile Harbor provider surfaces with upstream v2026.7.20`:

1. **MoA leaked into the Harbor-only picker.** Upstream prepends a virtual
   "Mixture of Agents" row *after* the point where `_filter_visible_rows` ran,
   so it bypassed the filter. Filter now runs last.
2. **User-defined / custom providers were being stripped.** Harbor's filter
   keyed on canonical slugs only; custom rows carry none, so they were dropped.
   Upstream's aggregator-dedup and custom-endpoint handling both depend on
   those rows surviving. Filter now preserves `is_user_defined` rows.
3. **Tavily bypassed upstream's env-resolution invariant.** Upstream asserts
   every web provider resolves keys via `get_provider_env`. Harbor's Engine-auth
   patch read `os.getenv` directly. Now reads the config-aware layer first and
   falls back to the Engine token.

## Verification

- `./init.sh` — 183 tests passed, 0 failed.
- `scripts/harbor-engine-smoke.sh` — 200 from `engine.harborworks.ai`
  (`claude-sonnet-4.6` via bedrock, `stop_reason: end_turn`).
- Harbor suites + model catalog + providers + api-key providers:
  **377 passed**.
- `tests/hermes_cli/test_inventory.py`: **44/44 pass** with
  `HARBOR_SHOW_ALL_PROVIDERS=1`. With Harbor visibility on (the default), 22
  fail because those upstream tests assert the full provider universe, which
  is exactly what the fork overrides. The old fork had the same class of
  failure; the difference now is that disabling the override reproduces
  upstream exactly, which was not previously true.

### harness-state-mirror plugin (the reason for the upgrade)

Plugin installed **unmodified** — no version-gate bypass:

| Hook | Registered |
| --- | --- |
| `on_session_start` | yes |
| `post_llm_call` | yes |
| `post_tool_call` | yes |
| `post_api_request` | yes |
| `on_session_finalize` | yes |
| `on_session_end` | yes |

Live tool-using session mirrored (capture endpoint):

| Stream | 0.14.0 | 0.19.0 re-based |
| --- | --- | --- |
| session create | 1 | 1 |
| messages | **0** | **2** (user + assistant) |
| tool_events | 1 | 1 |
| usage_events | **0** | **2** (real token counts, `turn_id` + `request_id` populated) |
| session events | 2 | 2 |

The two streams that were structurally impossible on 0.14.0 now land.

## Follow-ups (not done here)

- Upstream added `model_catalog.excluded_providers`, a config-driven provider
  hiding mechanism. Harbor's `visible_canonical_providers()` patch predates it
  and does roughly the same thing by hand. Worth evaluating whether the fork's
  catalog delta can be replaced by config — that is a design decision, not a
  replay decision.
- The 22 default-mode `test_inventory.py` failures are intended fork behaviour
  but are not marked as such. Consider an xfail marker or a Harbor-specific
  conftest so the signal is not lost in noise.
