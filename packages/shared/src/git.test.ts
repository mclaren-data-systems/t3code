import type { VcsStatusRemoteResult, VcsStatusResult } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  applyGitStatusStreamEvent,
  applyWorktreeBranchPrefix,
  buildTemporaryWorktreeBranchName,
  buildWorktreeBranchName,
  isTemporaryWorktreeBranch,
  normalizeGitRemoteUrl,
  normalizeWorktreeBranchPrefix,
  parseGitHubRepositoryNameWithOwnerFromRemoteUrl,
  DEFAULT_WORKTREE_BRANCH_PREFIX,
} from "./git.ts";

describe("normalizeGitRemoteUrl", () => {
  it("canonicalizes equivalent GitHub remotes across protocol variants", () => {
    expect(normalizeGitRemoteUrl("git@github.com:T3Tools/T3Code.git")).toBe(
      "github.com/t3tools/t3code",
    );
    expect(normalizeGitRemoteUrl("https://github.com/T3Tools/T3Code.git")).toBe(
      "github.com/t3tools/t3code",
    );
    expect(normalizeGitRemoteUrl("ssh://git@github.com/T3Tools/T3Code")).toBe(
      "github.com/t3tools/t3code",
    );
  });

  it("preserves nested group paths for providers like GitLab", () => {
    expect(normalizeGitRemoteUrl("git@gitlab.com:T3Tools/platform/T3Code.git")).toBe(
      "gitlab.com/t3tools/platform/t3code",
    );
    expect(normalizeGitRemoteUrl("https://gitlab.com/T3Tools/platform/T3Code.git")).toBe(
      "gitlab.com/t3tools/platform/t3code",
    );
  });

  it("drops explicit ports from URL-shaped remotes", () => {
    expect(normalizeGitRemoteUrl("https://gitlab.company.com:8443/team/project.git")).toBe(
      "gitlab.company.com/team/project",
    );
    expect(normalizeGitRemoteUrl("ssh://git@gitlab.company.com:2222/team/project.git")).toBe(
      "gitlab.company.com/team/project",
    );
  });

  it("normalizes SCP-like remotes with non-git SSH users", () => {
    expect(normalizeGitRemoteUrl("gitlab@gitlab.example.com:group/project.git")).toBe(
      "gitlab.example.com/group/project",
    );
    expect(normalizeGitRemoteUrl("deploy@bitbucket.org:workspace/repo.git")).toBe(
      "bitbucket.org/workspace/repo",
    );
  });
});

describe("parseGitHubRepositoryNameWithOwnerFromRemoteUrl", () => {
  it("extracts the owner and repository from common GitHub remote shapes", () => {
    expect(
      parseGitHubRepositoryNameWithOwnerFromRemoteUrl("git@github.com:T3Tools/T3Code.git"),
    ).toBe("T3Tools/T3Code");
    expect(
      parseGitHubRepositoryNameWithOwnerFromRemoteUrl("https://github.com/T3Tools/T3Code.git"),
    ).toBe("T3Tools/T3Code");
  });
});

describe("isTemporaryWorktreeBranch", () => {
  it("matches the generated temporary worktree refName format", () => {
    expect(
      isTemporaryWorktreeBranch(
        buildTemporaryWorktreeBranchName((byteLength) => {
          expect(byteLength).toBe(4);
          return "DEADBEEF";
        }),
      ),
    ).toBe(true);
  });

  it("matches generated temporary worktree refs", () => {
    expect(isTemporaryWorktreeBranch(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/t3-deadbeef`)).toBe(true);
    expect(isTemporaryWorktreeBranch(` ${DEFAULT_WORKTREE_BRANCH_PREFIX}/t3-deadbeef `)).toBe(true);
    expect(isTemporaryWorktreeBranch(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/T3-DEADBEEF`)).toBe(true);
  });

  it("normalizes a UUID-shaped random callback to the canonical 8-hex form", () => {
    expect(buildTemporaryWorktreeBranchName(() => "f4ae4e0e-f971-4d48-b4f2-9cf0aa54ab12")).toBe(
      `${DEFAULT_WORKTREE_BRANCH_PREFIX}/t3-f4ae4e0e`,
    );
  });

  it("matches unmarked and UUID-shaped refs from builds that predate the marker", () => {
    expect(isTemporaryWorktreeBranch(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/deadbeef`)).toBe(true);
    expect(
      isTemporaryWorktreeBranch(
        `${DEFAULT_WORKTREE_BRANCH_PREFIX}/f4ae4e0e-f971-4d48-b4f2-9cf0aa54ab12`,
      ),
    ).toBe(true);
  });

  it("rejects UUID-shaped refs that are not RFC 4122 v4", () => {
    // version nibble is not 4
    expect(
      isTemporaryWorktreeBranch(
        `${DEFAULT_WORKTREE_BRANCH_PREFIX}/f4ae4e0e-f971-1d48-b4f2-9cf0aa54ab12`,
      ),
    ).toBe(false);
    // variant nibble is not [89ab]
    expect(
      isTemporaryWorktreeBranch(
        `${DEFAULT_WORKTREE_BRANCH_PREFIX}/f4ae4e0e-f971-4d48-c4f2-9cf0aa54ab12`,
      ),
    ).toBe(false);
  });

  it("rejects non-temporary refName names", () => {
    expect(isTemporaryWorktreeBranch(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/feature/demo`)).toBe(false);
    expect(isTemporaryWorktreeBranch("main")).toBe(false);
    expect(isTemporaryWorktreeBranch(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/t3-deadbeef-extra`)).toBe(
      false,
    );
  });

  it("matches marked refs under a configured prefix, and the default alongside it", () => {
    expect(isTemporaryWorktreeBranch("theo/t3-deadbeef", "theo")).toBe(true);
    // A placeholder minted before the prefix changed stays eligible for rename.
    expect(isTemporaryWorktreeBranch(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/t3-deadbeef`, "theo")).toBe(
      true,
    );
    expect(isTemporaryWorktreeBranch("julius/t3-deadbeef", "theo")).toBe(false);
  });

  it("matches marked refs under a multi-segment prefix", () => {
    expect(isTemporaryWorktreeBranch("theo/wip/t3-deadbeef", "theo/wip")).toBe(true);
    expect(isTemporaryWorktreeBranch("theo/t3-deadbeef", "theo/wip")).toBe(false);
  });

  it("leaves a hand-written branch under the configured prefix alone", () => {
    // The marker is what separates a placeholder from a branch someone named:
    // `deadbeef` is eight hex characters and a name a person plausibly picks.
    expect(isTemporaryWorktreeBranch("theo/deadbeef", "theo")).toBe(false);
    expect(isTemporaryWorktreeBranch("theo/cafebabe", "theo")).toBe(false);
    expect(isTemporaryWorktreeBranch("theo/f4ae4e0e-f971-4d48-b4f2-9cf0aa54ab12", "theo")).toBe(
      false,
    );
  });
});

describe("normalizeWorktreeBranchPrefix", () => {
  it("sanitizes a configured prefix into a refName fragment", () => {
    expect(normalizeWorktreeBranchPrefix("Theo's Branches")).toBe("theos-branches");
    expect(normalizeWorktreeBranchPrefix("  theo/wip  ")).toBe("theo/wip");
    expect(normalizeWorktreeBranchPrefix("theo//wip/")).toBe("theo/wip");
  });

  it("falls back to the default when nothing usable survives", () => {
    for (const value of ["", "   ", "///", "---", null, undefined]) {
      expect(normalizeWorktreeBranchPrefix(value)).toBe(DEFAULT_WORKTREE_BRANCH_PREFIX);
    }
  });
});

describe("applyWorktreeBranchPrefix", () => {
  it("re-namespaces a placeholder minted under the default prefix", () => {
    expect(applyWorktreeBranchPrefix(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/t3-deadbeef`, "theo")).toBe(
      "theo/t3-deadbeef",
    );
    expect(
      applyWorktreeBranchPrefix(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/t3-deadbeef`, "theo/wip"),
    ).toBe("theo/wip/t3-deadbeef");
  });

  it("normalizes a pre-marker placeholder to the marked form", () => {
    expect(applyWorktreeBranchPrefix(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/deadbeef`, "theo")).toBe(
      "theo/t3-deadbeef",
    );
    expect(
      applyWorktreeBranchPrefix(
        `${DEFAULT_WORKTREE_BRANCH_PREFIX}/f4ae4e0e-f971-4d48-b4f2-9cf0aa54ab12`,
        "theo",
      ),
    ).toBe("theo/t3-f4ae4e0e-f971-4d48-b4f2-9cf0aa54ab12");
  });

  it("leaves a branch the user named untouched", () => {
    expect(applyWorktreeBranchPrefix("feature/demo", "theo")).toBe("feature/demo");
    expect(applyWorktreeBranchPrefix("main", "theo")).toBe("main");
    expect(applyWorktreeBranchPrefix("theo/deadbeef", "theo")).toBe("theo/deadbeef");
  });

  it("is a no-op on an already-marked placeholder under the default prefix", () => {
    const branch = `${DEFAULT_WORKTREE_BRANCH_PREFIX}/t3-deadbeef`;
    expect(applyWorktreeBranchPrefix(branch, "")).toBe(branch);
    expect(applyWorktreeBranchPrefix(branch)).toBe(branch);
  });
});

describe("buildWorktreeBranchName", () => {
  it("namespaces a generated description under the configured prefix", () => {
    expect(buildWorktreeBranchName("Fix login redirect", "theo")).toBe("theo/fix-login-redirect");
    expect(buildWorktreeBranchName("Fix login redirect")).toBe(
      `${DEFAULT_WORKTREE_BRANCH_PREFIX}/fix-login-redirect`,
    );
  });

  it("does not double up a prefix the model echoed back", () => {
    expect(buildWorktreeBranchName("theo/fix-login-redirect", "theo")).toBe(
      "theo/fix-login-redirect",
    );
    expect(
      buildWorktreeBranchName(`${DEFAULT_WORKTREE_BRANCH_PREFIX}/fix-login-redirect`, "theo"),
    ).toBe("theo/fix-login-redirect");
  });

  it("strips refs/heads/ and quoting before sanitizing", () => {
    expect(buildWorktreeBranchName('"refs/heads/Fix Login"', "theo")).toBe("theo/fix-login");
  });

  it("falls back to update when nothing usable survives", () => {
    expect(buildWorktreeBranchName("///", "theo")).toBe("theo/update");
  });
});

describe("applyGitStatusStreamEvent", () => {
  it("treats a remote-only update as a repository when local state is missing", () => {
    const remote: VcsStatusRemoteResult = {
      hasUpstream: true,
      aheadCount: 2,
      behindCount: 1,
      pr: null,
    };

    expect(applyGitStatusStreamEvent(null, { _tag: "remoteUpdated", remote })).toEqual({
      isRepo: true,
      hasPrimaryRemote: false,
      isDefaultRef: false,
      refName: null,
      hasWorkingTreeChanges: false,
      workingTree: { files: [], insertions: 0, deletions: 0 },
      hasUpstream: true,
      aheadCount: 2,
      behindCount: 1,
      pr: null,
    });
  });

  it("preserves local-only fields when applying a remote update", () => {
    const current: VcsStatusResult = {
      isRepo: true,
      sourceControlProvider: {
        kind: "github",
        name: "GitHub",
        baseUrl: "https://github.com",
      },
      hasPrimaryRemote: true,
      isDefaultRef: false,
      refName: "feature/demo",
      hasWorkingTreeChanges: true,
      workingTree: {
        files: [{ path: "src/demo.ts", insertions: 1, deletions: 0 }],
        insertions: 1,
        deletions: 0,
      },
      hasUpstream: false,
      aheadCount: 0,
      behindCount: 0,
      pr: null,
    };

    const remote: VcsStatusRemoteResult = {
      hasUpstream: true,
      aheadCount: 2,
      behindCount: 1,
      pr: null,
    };

    expect(applyGitStatusStreamEvent(current, { _tag: "remoteUpdated", remote })).toEqual({
      ...current,
      hasUpstream: true,
      aheadCount: 2,
      behindCount: 1,
      pr: null,
    });
  });
});
