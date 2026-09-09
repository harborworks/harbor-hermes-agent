# Linux Actions runners

Linux jobs use a repository-scoped moviebox runner selected by
`[self-hosted, Linux, X64, moviebox, harbor-hermes-agent]`. Each job receives a new Ubuntu 24.04 KVM VM,
4 vCPU, 16 GiB RAM and a 120 GiB sparse disk. Its Docker daemon and sudo access
are confined to that VM. The controller registers a single-job ephemeral runner
and discards the writable VM disk after execution. No host directories or Docker
socket are shared; host networking policy blocks private/LAN/Tailscale destinations.

The base image supplies Git, Node 22, Yarn classic, Python 3.12, Docker/Compose/
Buildx, AWS CLI v2, gh, build tools and common native libraries. Workflow setup
actions select the project's requested runtime versions. GitHub caches/artifacts
remain remote; local caches and credentials disappear with the VM. The runner
registration credential stays on the host controller, outside build VMs.

One job runs at a time for this repository; further jobs queue. The full fleet
has CPU/memory caps to reserve moviebox capacity for its existing services.
Workflow events, check names, permissions, environments and deployment/release
conditions are preserved. macOS jobs remain hosted. Manual deploy/release jobs
are not dispatched merely to test this migration.

Operation and recovery source is maintained in the private shared agent workspace
under `agents/shared/ci/fleet`. The host service is
`moviebox-ci@harbor-hermes-agent.service`. Stop it when idle to pause the runner;
start it to resume. If registration fails after GitHub credential revocation or
expiry, renew the root-only controller credential using the agent-secrets pattern.
Do not put a personal/admin token into a workflow or VM.

Rollback: revert the migration PR through normal review, returning Linux jobs to
hosted runner labels (and the original architecture matrix where applicable).
Hosted quota or budget must be available before relying on that fallback.
