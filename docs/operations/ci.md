# CI quality gates

This fork runs a reduced workflow set: everything here uses standard GitHub-hosted
runners and no credentials beyond the automatic `GITHUB_TOKEN`. See
[FORK.md](../../FORK.md) section F for what was removed from upstream and why.

- `.github/workflows/ci.yml` runs `vp check` (lint + typecheck), `vpr typecheck`, the desktop build pipeline, and `vp run test` on pull requests and pushes to `main`.
- `.github/workflows/desktop-artifacts.yml` builds macOS (`arm64` and `x64`), Linux (`x64`), and Windows (`x64`) desktop artifacts on every push to `main`, plus on manual dispatch. Artifacts are **unsigned** and uploaded as workflow artifacts (14-day retention); nothing is published to a GitHub Release.
- `.github/workflows/issue-labels.yml` keeps the labels the issue forms apply (`bug`, `enhancement`, `needs-triage`) in sync.
- Upstream's `release.yml` (tag-driven signed release + npm publish) and `deploy-relay.yml` are not present in this fork — see [Release Checklist](./release.md) for what they do upstream.
