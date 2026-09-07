# AUR packaging

This directory maintains the [`t3code-bin`](https://aur.archlinux.org/packages/t3code-bin) and
[`t3code-nightly-bin`](https://aur.archlinux.org/packages/t3code-nightly-bin) packages. Both
repackage the official x86_64 AppImage from GitHub Releases.

## Publishing

> **Fork note:** `.github/workflows/publish-aur.yml` is **not present in this fork** — it needs
> the `AUR_SSH_PRIVATE_KEY` secret and a Blacksmith runner, and the `release.yml` that calls it
> is not present here either. The `packaging/aur/` sources below are kept byte-identical to
> upstream; `scripts/release.sh` can still be run manually. See [FORK.md](../../FORK.md) entry 14.

The release workflow calls `.github/workflows/publish-aur.yml` after publishing a GitHub release;
the workflow can also be run manually for a specific tag. It selects the stable or nightly
package, then updates its version and checksums, builds it, regenerates `.SRCINFO`, and pushes it
to the AUR.

To validate a release on Arch Linux:

```bash
sudo pacman -Syu --needed base-devel github-cli jq namcap
GH_TOKEN=$(gh auth token) RELEASE_TAG=v0.0.33 \
  packaging/aur/scripts/release.sh
```
