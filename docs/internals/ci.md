# CI quality gates

> For maintainers. Using T3 Code? See [docs/user](../user/).

> **Fork note:** this fork runs a reduced workflow set — every workflow here uses standard
> GitHub-hosted runners and no credentials beyond the automatic `GITHUB_TOKEN`. See
> [FORK.md](../../FORK.md) entry 14 for what was removed from upstream and why.

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs three jobs on pull requests and
pushes to `main`:

- **Check**: `vp check` (format and lint; this repo sets `typeCheck: false` in its lint options),
  then `vpr typecheck` for the workspace type check. The same job
  builds the desktop pipeline (`vp run build:desktop`) and verifies the preload bundle exists and
  still exports its expected symbols.
- **Test**: `vp run test` across the workspace.
- **Release Smoke**: exercises release-only workflow steps through `scripts/release-smoke.ts`, so
  release breakage surfaces on PRs rather than at tag time.

The **Mobile Native Static Analysis** job upstream runs here too, on macOS — this fork drops it
(it targets no mobile app, and the Blacksmith macOS runner is unavailable to it).

[`.github/workflows/desktop-artifacts.yml`](../../.github/workflows/desktop-artifacts.yml) builds
macOS (`arm64` and `x64`), Linux (`x64`), and Windows (`x64`) desktop artifacts on every push to
`main`, plus on manual dispatch. Artifacts are **unsigned** and uploaded as workflow artifacts
(14-day retention); nothing is published to a GitHub Release.

[`.github/workflows/issue-labels.yml`](../../.github/workflows/issue-labels.yml) keeps the labels the
issue forms apply (`bug`, `enhancement`, `needs-triage`) in sync.

Upstream's `release.yml` (tag-driven signed release + npm publish) and `deploy-relay.yml` are not
present in this fork. See [Release Checklist](../operations/release.md) for what they do upstream.
