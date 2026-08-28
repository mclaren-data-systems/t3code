import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import { ProviderInstanceId, ServerSettings } from "@t3tools/contracts";
import { HostProcessEnvironment } from "@t3tools/shared/hostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { resolveUsageTranscriptSources } from "./usageTranscriptSources.ts";

const decodeServerSettings = Schema.decodeUnknownSync(ServerSettings);

/**
 * Grok exposes no per-instance home, so it always contributes exactly one
 * source. Pinning `GROK_HOME` keeps that source inside the test's temp
 * directory instead of the real `~/.grok` of whichever machine runs the suite.
 */
const withGrokHome = (grokHome: string) =>
  Effect.provideService(HostProcessEnvironment, { GROK_HOME: grokHome });

const grokSource = (sessionsDir: string) => ({
  provider: "grok" as const,
  dir: sessionsDir,
  instanceId: ProviderInstanceId.make("grok"),
  displayName: null,
  accentColor: null,
  fileName: "updates.jsonl",
});

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
    it.effect("reports one source per provider for a default-only setup", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-solo-" });
        const grokHome = path.join(home, "grok");

        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({
            claudeHome: path.join(home, "claude"),
            codexHome: path.join(home, "codex"),
          }),
        ).pipe(withGrokHome(grokHome));

        assert.deepStrictEqual(sources, [
          {
            provider: "claude",
            dir: path.join(home, "claude", "projects"),
            instanceId: ProviderInstanceId.make("claudeAgent"),
            displayName: null,
            accentColor: null,
          },
          {
            provider: "codex",
            dir: path.join(home, "codex", "sessions"),
            instanceId: ProviderInstanceId.make("codex"),
            displayName: null,
            accentColor: null,
          },
          grokSource(path.join(grokHome, "sessions")),
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
        ).pipe(withGrokHome(path.join(home, "grok")));

        assert.strictEqual(sources[0]?.dir, nested);
      }).pipe(Effect.scoped),
    );

    it.effect("scans every configured Claude instance, default slot first", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-multi-" });
        const grokHome = path.join(home, "grok");

        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({
            claudeHome: path.join(home, "claude"),
            codexHome: path.join(home, "codex"),
            providerInstances: {
              claudeAgent_work: {
                driver: "claudeAgent",
                displayName: "Claude Work",
                accentColor: "#112233",
                config: { homePath: path.join(home, "claude-work") },
              },
              codex_personal: {
                driver: "codex",
                config: { homePath: path.join(home, "codex-personal") },
              },
            },
          }),
        ).pipe(withGrokHome(grokHome));

        assert.deepStrictEqual(sources, [
          {
            provider: "claude",
            dir: path.join(home, "claude", "projects"),
            instanceId: ProviderInstanceId.make("claudeAgent"),
            displayName: null,
            accentColor: null,
          },
          {
            provider: "claude",
            dir: path.join(home, "claude-work", "projects"),
            instanceId: ProviderInstanceId.make("claudeAgent_work"),
            // The instance's own name and color travel with it, so the
            // dashboard can label two Claude accounts apart.
            displayName: "Claude Work",
            accentColor: "#112233",
          },
          {
            provider: "codex",
            dir: path.join(home, "codex", "sessions"),
            instanceId: ProviderInstanceId.make("codex"),
            displayName: null,
            accentColor: null,
          },
          {
            provider: "codex",
            dir: path.join(home, "codex-personal", "sessions"),
            instanceId: ProviderInstanceId.make("codex_personal"),
            displayName: null,
            accentColor: null,
          },
          grokSource(path.join(grokHome, "sessions")),
        ]);
      }).pipe(Effect.scoped),
    );

    it.effect("keeps scanning an instance that is currently disabled", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-off-" });
        const grokHome = path.join(home, "grok");

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
        ).pipe(withGrokHome(grokHome));

        assert.deepStrictEqual(
          sources.map((source) => source.dir),
          [
            path.join(home, "claude", "projects"),
            path.join(home, "claude-retired", "projects"),
            path.join(home, "codex", "sessions"),
            path.join(grokHome, "sessions"),
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
        const grokHome = path.join(home, "grok");

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
        ).pipe(withGrokHome(grokHome));

        assert.deepStrictEqual(
          sources.map((source) => [source.dir, source.instanceId]),
          [
            // The first instance to reach the directory owns its usage: the
            // transcripts underneath carry nothing that tells the two apart.
            [path.join(shared, "projects"), "claudeAgent"],
            [path.join(home, "codex", "sessions"), "codex"],
            [path.join(grokHome, "sessions"), "grok"],
          ],
        );
      }).pipe(Effect.scoped),
    );

    it.effect("lets an explicit default-slot entry replace the legacy blob", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-claim-" });
        const grokHome = path.join(home, "grok");

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
        ).pipe(withGrokHome(grokHome));

        assert.deepStrictEqual(
          sources.map((source) => source.dir),
          [
            path.join(home, "explicit", "projects"),
            path.join(home, "codex", "sessions"),
            path.join(grokHome, "sessions"),
          ],
        );
      }).pipe(Effect.scoped),
    );

    it.effect("skips an instance whose config cannot be decoded", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3code-usage-bad-" });
        const grokHome = path.join(home, "grok");

        // One unreadable envelope must not zero out the whole usage page.
        const sources = yield* resolveUsageTranscriptSources(
          settingsWith({
            claudeHome: path.join(home, "claude"),
            codexHome: path.join(home, "codex"),
            providerInstances: {
              claudeAgent_broken: { driver: "claudeAgent", config: { homePath: 42 } },
            },
          }),
        ).pipe(withGrokHome(grokHome));

        assert.deepStrictEqual(
          sources.map((source) => source.dir),
          [
            path.join(home, "claude", "projects"),
            path.join(home, "codex", "sessions"),
            path.join(grokHome, "sessions"),
          ],
        );
      }).pipe(Effect.scoped),
    );
  });
});
