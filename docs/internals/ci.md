# CI quality gates

> For maintainers. Using T3 Code? See [docs/user](../user/).

> **Fork note:** this fork runs a reduced workflow set — every workflow here uses standard
> GitHub-hosted runners and no credentials beyond the automatic `GITHUB_TOKEN`. See
> [FORK.md](../../FORK.md) entry 14 for what was removed from upstream and why.

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs these quality gates on pull requests
and pushes to `main`:

- **Check**: `vp check` (format and lint; this repo sets `typeCheck: false` in its lint options),
  then `vpr typecheck` for the workspace type check. The same job
  builds the desktop pipeline (`vp run build:desktop`) and verifies the preload bundle exists and
  uses only imports that Electron's sandbox can load. The verifier parses imports, then executes the
  trusted artifact with controlled bridge stubs to confirm that its required APIs are callable.
- **Test**: `vp run test` across every package except `t3` (apps/server), in parallel.
- **Test Server**: `t3` (apps/server) alone, sharded across three runners because it sets
  `fileParallelism: false`. One shard also publishes the thread-transfer budget report and uploads
  the `thread-transfer-results` artifact that `thread-transfer-report.yml` picks up.
- **Rust**: `cargo fmt --check` and `cargo test` for `native/resource-monitor`, split out so the
  Rust toolchain install stays off the critical path of Check and Test.
- **Release Smoke**: exercises release-only workflow steps through `scripts/release-smoke.ts`, so
  release breakage surfaces on PRs rather than at tag time.

Upstream's **Mobile Native Static Analysis** job (and the **Mobile Native Changes** gate that exists
only to boot it) runs on macOS — this fork drops both: it targets no mobile app, and the Blacksmith
macOS runner is unavailable to it.

Upstream's manual `windows-tests.yml` lane (a `workflow_dispatch`-only Windows test run) is not
present in this fork either: it runs on a Blacksmith Windows runner, and nothing in the suite passes
on Windows yet, so it is not a quality gate.

[`.github/workflows/desktop-artifacts.yml`](../../.github/workflows/desktop-artifacts.yml) builds
macOS (`arm64` and `x64`), Linux (`x64`), and Windows (`x64`) desktop artifacts on every push to
`main`, plus on manual dispatch. Artifacts are **unsigned**, uploaded as workflow artifacts
(14-day retention), and published as a GitHub **prerelease** tagged `desktop-dev-<run number>` —
a development build, never marked latest. The workflow prunes older `desktop-dev-*` releases,
keeping only the current one plus two.

[`.github/workflows/issue-labels.yml`](../../.github/workflows/issue-labels.yml) keeps the labels the
issue forms apply (`bug`, `enhancement`, `needs-triage`) in sync.

[`.github/workflows/thread-transfer-report.yml`](../../.github/workflows/thread-transfer-report.yml)
runs after **CI** completes on a pull request and comments the thread-transfer budget diff. It reads
the `thread-transfer-results` artifact the **Test Server** job uploads, and loads its publisher
script from the default branch so pull-request code never executes with the write-capable
`workflow_run` token.

Upstream's `release.yml` (tag-driven signed release + npm publish) and `deploy-relay.yml` are not
present in this fork. See [Release Checklist](../operations/release.md) for what they do upstream.
Upstream's `web-preview.yml` (Vercel preview deploys — needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID`) and `mobile-fingerprint-check.yml` (flags PRs that break mobile OTA reach) are
not present either: the first needs credentials this fork lacks, and the second guards a store/EAS
release process this fork does not run. Upstream's `publish-aur.yml` (pushes the `t3code-bin` /
`t3code-nightly-bin` AUR packages — needs `AUR_SSH_PRIVATE_KEY`) is likewise absent: it is a
`workflow_call` target of the `release.yml` this fork does not keep. See
[packaging/aur/README.md](../../packaging/aur/README.md).

Upstream's `desktop-macos-preview.yml` (an unsigned macOS DMG per pull request labelled
`preview:mac`) is also absent. It needs no credentials, but it runs on Blacksmith macOS runners and
would duplicate, per labelled pull request, artifacts `desktop-artifacts.yml` already publishes on
every push to `main`.
