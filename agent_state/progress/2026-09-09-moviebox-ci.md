# Moviebox CI migration — 2026-09-09

Ben authorized moving repositories with September Linux Actions minutes to
moviebox. This change selects a repository-scoped ephemeral runner. Every job
gets a fresh Ubuntu 24.04 VM (4 vCPU / 16 GiB), with Docker and sudo isolated
inside the VM. Workflow events, check names, permissions and deployment guards
are preserved. The host controller retains the GitHub registration credential;
job VMs receive only a short-lived registration token and runner credentials.
See .github/MOVIEBOX.md for operation and rollback.

YAML semantic comparison and actionlint pass. The local ./init.sh was attempted but the selected existing Hermes interpreter
has no pytest; no global Hermes environment was modified. CI checks on PR #26
provide runtime evidence for this workflow-only change. The upstream-only Docker
matrix keeps amd64 and arm64 targets; ARM emulation is explicitly configured in
the x64 build VM. Existing upstream repository guards are unchanged. This does
not change the Harbor provider feature status or release tags.
