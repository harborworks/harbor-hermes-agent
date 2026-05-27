# 2026-05-27 SQLite Trigram Fallback

## Summary

Investigated `hw@ben-devbox` gateway startup showing:

- `SQLite session store unavailable, falling back to JSONL: no such tokenizer: trigram`
- `No messaging platforms enabled`
- `hermes gateway restart` continuing to run in the foreground

## Diagnosis

- The installed Hermes venv uses Python `sqlite3` linked against SQLite
  `3.31.1` on Ubuntu 20.04.
- That SQLite build has FTS5 but does not support `tokenize='trigram'`.
- Hermes treated the optional trigram FTS table as required during state DB
  initialization, which disabled the full SQLite session store.
- `hermes gateway restart` falls back to `run_gateway()` when no service is
  installed, so the apparent hang is the foreground gateway process.

## Changes

- `hermes_state.py`
  - Added `_ensure_trigram_fts()` to make trigram FTS optional.
  - Old SQLite builds now keep the main SQLite session store and use CJK LIKE
    fallback when trigram FTS is unavailable.
- `tests/test_hermes_state.py`
  - Added regression coverage for a SQLite build without trigram tokenizer.
- `hermes_cli/gateway.py`
  - Added a clear foreground-mode message before manual `gateway restart`
    falls through to `run_gateway()`.
- `agent_state/features/harbor-skinny-fork.json`
  - Recorded diagnosis, verification, and next action.

## Verification

- `.venv/bin/python -m pytest tests/test_hermes_state.py::TestSessionLifecycle::test_sqlite_store_works_without_trigram_tokenizer tests/test_hermes_state.py::TestCJKSearchFallback::test_cjk_trigram_preserves_boolean_operators tests/test_hermes_state.py::TestCJKSearchFallback::test_cjk_or_combined_short_tokens_returns_results tests/test_hermes_state.py::TestCJKSearchFallback::test_mixed_cjk_english_query -q`
  - 4 passed.
- `./init.sh`
  - 55 passed.

## Next Step

Review and merge the PR, tag `v2026.5.16.harbor3`, then update the hosted
Harbor installer to install that tag.

## Blockers

None.
