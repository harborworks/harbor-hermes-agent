# Harbor Works Harness Upstream Intake

This codebase is the Harbor Works Harness. It began from upstream
`NousResearch/hermes-agent`, but Harbor Works is now the product owner and
source of truth.

Upstream Hermes is still useful. Do not ignore it. But do not replay every
upstream release wholesale. For each upstream release, an agent reviews the
changes and decides what is relevant to Harbor Works.

## Naming

- User-facing product name: **Harbor Works**.
- Intended harness/repo name: `harbor-works-harness`.
- Keep proper technical names such as Harbor Engine, Harbor Works CLI, `hw`,
  `~/.hw`, `harborworks` org/domain, and `HARBOR_*` env vars.
- Do not shorten the product to "Harbor" or "Works" in user-facing text.
- Historical file paths and package names may still contain `hermes` until an
  explicit rename task changes them.

## Upstream Intake Checklist

1. Fetch upstream:

```bash
git fetch upstream --tags
```

2. Identify the upstream release or commit range to review.

3. Create a review branch from current Harbor Works `main`, not from the
   upstream tag:

```bash
git fetch origin
git checkout -b codex/upstream-intake-<version> origin/main
```

4. Review upstream release notes, commits, and changed files. Prioritize:

- security fixes
- protocol/API compatibility
- desktop stability and packaging fixes
- provider, auth, model, tool, and gateway behavior relevant to Harbor Works
- tests that reveal real regressions in Harbor Works surfaces

5. Decide per upstream change:

- accept and port
- accept with Harbor Works-specific adaptation
- defer with reason
- reject as not relevant

6. Port accepted changes deliberately. Prefer small commits grouped by concern.

7. Run local verification:

```bash
./init.sh
```

8. If Harbor Engine/provider/auth/catalog code changed, run:

```bash
scripts/harbor-engine-smoke.sh
```

9. Record the review in a dated handoff under `agent_state/progress/` with:

- upstream version/range reviewed
- accepted changes
- rejected or deferred changes
- rationale
- files changed
- verification evidence
- next action

## Auth Rule

Harbor Works managed mode uses the long-lived credential written by `hw` under
`~/.hw/credentials.json`, or a named profile under `~/.hw/profiles/`.

Do not copy that token into `~/.hermes/.env`, `~/.hermes/config.yaml`, checked-in
fixtures, test output, logs, or handoff files.

## Engine Smoke

The smoke script defaults to:

```text
https://engine.harborworks.ai
```

It reads:

```text
~/.hw/credentials.json
```

and sends a minimal Anthropic-compatible request to:

```text
/anthropic/v1/messages
```

Set `HARBOR_ENGINE_BASE_URL`, `HARBOR_HW_CREDENTIALS`, or
`HARBOR_ENGINE_TOKEN` to override defaults for local debugging.
