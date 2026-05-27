# Harbor Hermes Fork

This repo is a skinny Harbor fork of upstream `NousResearch/hermes-agent`.
Harbor changes should stay narrow enough to replay onto each new upstream tag
without turning every release into a merge project.

## Versioning

Harbor release tags use:

```text
<upstream-tag>.harbor<num>
```

Example:

```text
v2026.5.16.harbor1
```

Increment `<num>` when Harbor ships another patch on the same upstream tag.
When upstream ships a newer tag, reset the base to that tag and start with
`.harbor1` again.

## Remote Convention

Use `upstream` for `NousResearch/hermes-agent` and `origin` for the Harbor fork
once the Harbor remote exists. If this checkout was cloned from upstream first,
rename remotes before pushing Harbor branches:

```bash
git remote rename origin upstream
git remote add origin git@github.com:harborworks/hermes-agent.git
```

## Upstream Replay Checklist

1. Fetch upstream tags:

```bash
git fetch upstream --tags
```

2. Create a fresh branch from the new upstream tag:

```bash
git checkout -b harbor/v2026.5.16.harbor1 v2026.5.16
```

3. Replay Harbor patches from the prior Harbor tag or patch branch:

```bash
git cherry-pick <harbor-commit-1> <harbor-commit-2>
```

4. Resolve conflicts by preserving upstream behavior unless the conflict is
   directly in Harbor auth, provider, catalog, Engine, or managed-mode code.

5. Run local verification:

```bash
./init.sh
```

6. If Harbor Engine/provider/auth/catalog code changed, run the stage Engine
   smoke:

```bash
scripts/harbor-stage-engine-smoke.sh
```

7. Record the exact evidence in a dated file under `agent_state/progress/`.

8. Tag the Harbor release:

```bash
git tag v2026.5.16.harbor1
```

## Auth Rule

Harbor managed mode uses the long-lived credential written by `hw` under
`~/.hw/credentials.json`, or a named profile under `~/.hw/profiles/`.

Do not copy that token into `~/.hermes/.env`, `~/.hermes/config.yaml`, checked-in
fixtures, test output, logs, or handoff files.

## Stage Engine Smoke

The smoke script defaults to:

```text
https://stage-engine.harborworks.ai
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
`HARBOR_MODEL_PROXY_TOKEN` to override defaults for local debugging.
