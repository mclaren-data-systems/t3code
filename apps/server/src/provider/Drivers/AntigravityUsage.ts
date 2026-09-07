/**
 * AntigravityUsage - Antigravity's usage history as a usage source.
 *
 * Antigravity keeps conversations in SQLite databases under its data
 * directories and each instance's profile. Parsed databases stay in memory
 * while a database and its WAL keep the same `(size, mtime, ctime)`, so a
 * warm scan decodes only what changed.
 *
 * @module provider/Drivers/AntigravityUsage
 */

import { type AntigravitySettings, UsageReadError } from "@t3tools/contracts";
import { expandHomePath } from "@t3tools/provider-core/server/pathExpansion";
import * as ProviderHost from "@t3tools/provider-core/server/ProviderHost";
import {
  type ProviderUsageInstance,
  type ProviderUsageReader,
  type ProviderUsageScan,
  type ProviderUsageSourceInstance,
  usageSourceInstance,
} from "@t3tools/provider-core/server/usage";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import { resolveAntigravityInstanceDirectories } from "../antigravityAuthSupport.ts";
import { makeAntigravityUsageCache, readAntigravityUsage } from "./antigravityUsageReader.ts";

export class AntigravityUsage extends Context.Service<
  AntigravityUsage,
  {
    /** Every Antigravity store: the data directories and each configured instance's profile. */
    readonly scan: (input: {
      readonly instances: ReadonlyArray<ProviderUsageInstance<AntigravitySettings>>;
      readonly windowStartMs: number;
    }) => Effect.Effect<ReadonlyArray<ProviderUsageScan>, UsageReadError>;
  }
>()("t3/provider/Drivers/AntigravityUsage") {}

const make = Effect.gen(function* () {
  const crypto = yield* Crypto.Crypto;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const host = yield* ProviderHost.ProviderHost;
  const hostEnvironment = yield* HostProcess.Environment;
  const cache = makeAntigravityUsageCache();

  /** `ANTIGRAVITY_DATA_DIR` (comma-separated) or the defaults, canonicalized. */
  const dataRoots = Effect.gen(function* () {
    const home = yield* HostProcess.HomeDirectory;
    const configured = hostEnvironment["ANTIGRAVITY_DATA_DIR"]
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const defaults = [
      ...["antigravity", "antigravity-cli", "antigravity-ide", "antigravity-backup"].map((name) =>
        path.join(home, ".gemini", name),
      ),
      path.join(home, ".config", "antigravity"),
    ];
    const canonical = new Set<string>();
    for (const root of configured?.length ? configured : defaults) {
      const resolved = path.resolve(expandHomePath(root, home));
      canonical.add(
        yield* fileSystem.realPath(resolved).pipe(Effect.orElseSucceed(() => resolved)),
      );
    }
    return [...canonical];
  });

  const scan: AntigravityUsage["Service"]["scan"] = Effect.fn("AntigravityUsage.scan")(function* ({
    instances,
    windowStartMs,
  }) {
    const roots = yield* dataRoots;
    // Only a profile directory belongs to one instance; the shared data roots
    // report under the provider's default instance on the client.
    const instanceByRoot = new Map<string, ProviderUsageSourceInstance>();
    // Only configured instances have a profile; the implicit default never ran.
    for (const instance of instances.filter((instance) => instance.configured)) {
      const { instanceId } = instance;
      const directories = yield* resolveAntigravityInstanceDirectories(
        host.paths.stateDir,
        instanceId,
      ).pipe(
        Effect.provideService(Crypto.Crypto, crypto),
        Effect.provideService(Path.Path, path),
        Effect.mapError(
          (cause) =>
            new UsageReadError({
              reason: "scanFailed",
              detail: "Antigravity profile directory could not be resolved.",
              cause,
            }),
        ),
      );
      const root = path.join(directories.profile, "antigravity-acp");
      roots.push(root);
      instanceByRoot.set(root, usageSourceInstance(instance));
    }
    const conversationDirs = new Set<string>();
    const instanceByDir = new Map<string, ProviderUsageSourceInstance>();
    for (const root of roots) {
      const resolvedRoot = yield* fileSystem.realPath(root).pipe(Effect.orElseSucceed(() => root));
      const nested = path.join(resolvedRoot, "conversations");
      const dir = (yield* fileSystem
        .exists(nested)
        .pipe(Effect.catchCause(() => Effect.succeed(false))))
        ? nested
        : resolvedRoot;
      const canonical = yield* fileSystem.realPath(dir).pipe(Effect.orElseSucceed(() => dir));
      if (conversationDirs.has(canonical)) continue;
      conversationDirs.add(canonical);
      const instance = instanceByRoot.get(root);
      if (instance) instanceByDir.set(canonical, instance);
    }
    const result = yield* readAntigravityUsage([...conversationDirs], windowStartMs, cache).pipe(
      Effect.provideService(FileSystem.FileSystem, fileSystem),
      Effect.provideService(Path.Path, path),
    );
    const scanned: ProviderUsageScan[] = [];
    for (const dir of conversationDirs) {
      const exists = yield* fileSystem
        .exists(dir)
        .pipe(Effect.catchCause(() => Effect.succeed(false)));
      const failed = result.errors.some(
        (error) => error === dir || error.startsWith(`${dir}${path.sep}`),
      );
      const instance = instanceByDir.get(dir);
      scanned.push({
        dir,
        ...(instance ? { instance } : {}),
        files: !exists && !failed ? null : result.files.filter((file) => file.root === dir),
        status: failed ? "partial" : "ok",
        ...(failed ? { message: "Some Antigravity history could not be read." } : {}),
      });
    }
    return scanned;
  });

  return AntigravityUsage.of({ scan });
});

export const layer = Layer.effect(AntigravityUsage, make);

export const antigravityUsageReader: ProviderUsageReader<AntigravitySettings, AntigravityUsage> = {
  kind: "scan",
  provider: "antigravity",
  scan: ({ instances, windowStartMs }) =>
    AntigravityUsage.pipe(Effect.flatMap((usage) => usage.scan({ instances, windowStartMs }))),
};
