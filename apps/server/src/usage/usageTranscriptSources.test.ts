import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import { ServerSettings } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { resolveUsageTranscriptSources } from "./usageTranscriptSources.ts";

const decodeServerSettings = Schema.decodeUnknownSync(ServerSettings);

/**
 * Every instance in these settings carries an explicit `homePath`: the default
 * resolvers fall back to the real `os.homedir()`, which would make assertions
 * depend on the machine running them.
 */
function settingsWith(input: {
  readonly claudeHome: string;
  readonly codexHome: string;
  readonly providerInstances?: Record<string, unknown>;
}): ServerSettings {
  return decodeServerSettings({
    providers: {
      claudeAgent: { homePath: input.claudeHome },
      codex: { homePath: input.codexHome },
    },
    ...(input.providerInstances ? { providerInstances: input.providerInstances } : {}),
  });
}

it.layer(NodeServices.layer)("usageTranscriptSources", (it) => {
  describe("resolveUsageTranscriptSources", () => {
    it.effect("reports one Claude and one Codex source for a default-only setup", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-solo-" });

        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({
            claudeHome: path.join(home, "claude"),
            codexHome: path.join(home, "codex"),
          }),
        );

        assert.deepStrictEqual(sources, [
          { provider: "claude", dir: path.join(home, "claude", "projects") },
          { provider: "codex", dir: path.join(home, "codex", "sessions") },
        ]);
      }).pipe(Effect.scoped),
    );

    it.effect("prefers the nested projects dir a default Claude install writes", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-nested-" });
        const nested = path.join(home, ".claude", "projects");
        yield* fileSystem.makeDirectory(nested, { recursive: true });

        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({ claudeHome: home, codexHome: path.join(home, "codex") }),
        );

        assert.strictEqual(sources[0]?.dir, nested);
      }).pipe(Effect.scoped),
    );

    it.effect("scans every configured Claude instance, default slot first", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-multi-" });

        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({
            claudeHome: path.join(home, "claude"),
            codexHome: path.join(home, "codex"),
            providerInstances: {
              claudeAgent_work: {
                driver: "claudeAgent",
                config: { homePath: path.join(home, "claude-work") },
              },
              codex_personal: {
                driver: "codex",
                config: { homePath: path.join(home, "codex-personal") },
              },
            },
          }),
        );

        assert.deepStrictEqual(sources, [
          { provider: "claude", dir: path.join(home, "claude", "projects") },
          { provider: "claude", dir: path.join(home, "claude-work", "projects") },
          { provider: "codex", dir: path.join(home, "codex", "sessions") },
          { provider: "codex", dir: path.join(home, "codex-personal", "sessions") },
        ]);
      }).pipe(Effect.scoped),
    );

    it.effect("keeps scanning an instance that is currently disabled", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-off-" });

        // Usage is a record of tokens already spent; switching a provider off
        // must not retroactively erase them from the dashboard.
        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({
            claudeHome: path.join(home, "claude"),
            codexHome: path.join(home, "codex"),
            providerInstances: {
              claudeAgent_retired: {
                driver: "claudeAgent",
                enabled: false,
                config: { homePath: path.join(home, "claude-retired") },
              },
            },
          }),
        );

        assert.deepStrictEqual(
          sources.map((source) => source.dir),
          [
            path.join(home, "claude", "projects"),
            path.join(home, "claude-retired", "projects"),
            path.join(home, "codex", "sessions"),
          ],
        );
      }).pipe(Effect.scoped),
    );

    it.effect("walks a shared config directory once", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-shared-" });
        const shared = path.join(home, "claude");

        // Two presets over one config dir is a supported setup; nothing else
        // de-duplicates inside a single environment, so a second walk here
        // would double every token it reads.
        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({
            claudeHome: shared,
            codexHome: path.join(home, "codex"),
            providerInstances: {
              claudeAgent_preset: { driver: "claudeAgent", config: { homePath: shared } },
            },
          }),
        );

        assert.deepStrictEqual(
          sources.map((source) => source.dir),
          [path.join(shared, "projects"), path.join(home, "codex", "sessions")],
        );
      }).pipe(Effect.scoped),
    );

    it.effect("lets an explicit default-slot entry replace the legacy blob", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-claim-" });

        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({
            claudeHome: path.join(home, "legacy"),
            codexHome: path.join(home, "codex"),
            providerInstances: {
              claudeAgent: {
                driver: "claudeAgent",
                config: { homePath: path.join(home, "explicit") },
              },
            },
          }),
        );

        assert.deepStrictEqual(
          sources.map((source) => source.dir),
          [path.join(home, "explicit", "projects"), path.join(home, "codex", "sessions")],
        );
      }).pipe(Effect.scoped),
    );

    it.effect("skips an instance whose config cannot be decoded", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-bad-" });

        // One unreadable envelope must not zero out the whole usage page.
        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({
            claudeHome: path.join(home, "claude"),
            codexHome: path.join(home, "codex"),
            providerInstances: {
              claudeAgent_broken: { driver: "claudeAgent", config: { homePath: 42 } },
            },
          }),
        );

        assert.deepStrictEqual(
          sources.map((source) => source.dir),
          [path.join(home, "claude", "projects"), path.join(home, "codex", "sessions")],
        );
      }).pipe(Effect.scoped),
    );
  });
});
