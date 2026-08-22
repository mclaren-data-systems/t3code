/**
 * usageTranscriptSources — the transcript directories one usage scan walks.
 *
 * Every configured provider instance whose CLI leaves readable transcripts
 * contributes a directory, not only the default instance. A second Claude or
 * Codex account is a second place tokens get spent, and a scan that ignores it
 * under-reports without saying so.
 *
 * Each source carries the instance it came from, so the scan can key buckets by
 * instance and the dashboard can report two accounts of one provider apart.
 *
 * Two rules the scan depends on:
 *
 *   - Disabled instances still count. Usage records tokens already spent;
 *     turning a provider off must not retroactively rewrite history.
 *   - Instances resolving to one directory are walked once. Sharing a config
 *     directory between presets is a supported setup, and nothing else
 *     de-duplicates within a single environment — the client's duplicate
 *     fingerprint drop only runs *across* environments.
 *
 * @module usage/usageTranscriptSources
 */
import {
  ClaudeSettings,
  CodexSettings,
  defaultInstanceIdForDriver,
  ProviderDriverKind,
  type ProviderInstanceId,
  type ServerSettings,
  type UsageProviderKind,
} from "@t3tools/contracts";
import { isHostWindows } from "@t3tools/shared/hostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { resolveClaudeHomePath } from "../provider/Drivers/ClaudeHome.ts";
import { resolveCodexHomeLayout } from "../provider/Drivers/CodexHomeLayout.ts";

export interface UsageTranscriptSource {
  readonly provider: UsageProviderKind;
  /** Absolute transcript directory, exactly as the scan will walk it. */
  readonly dir: string;
  readonly instanceId: ProviderInstanceId;
  /** Configured name and accent color, passed through for the dashboard. */
  readonly displayName: string | null;
  readonly accentColor: string | null;
}

const CLAUDE_DRIVER = ProviderDriverKind.make("claudeAgent");
const CODEX_DRIVER = ProviderDriverKind.make("codex");

const decodeClaudeSettings = Schema.decodeUnknownEffect(ClaudeSettings);
const decodeCodexSettings = Schema.decodeUnknownEffect(CodexSettings);

/**
 * Claude's config dir is the home itself when overridden, but a default
 * install nests transcripts under `~/.claude/projects`. Probe both.
 */
const resolveClaudeTranscriptDir = Effect.fn("resolveClaudeTranscriptDir")(function* (
  homePath: string,
): Effect.fn.Return<string, never, FileSystem.FileSystem | Path.Path> {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const nested = path.join(homePath, ".claude", "projects");
  const nestedExists = yield* fileSystem
    .exists(nested)
    .pipe(Effect.catchCause(() => Effect.succeed(false)));
  return nestedExists ? nested : path.join(homePath, "projects");
});

interface DriverInstanceConfig {
  readonly instanceId: ProviderInstanceId;
  readonly displayName: string | null;
  readonly accentColor: string | null;
  readonly config: unknown;
}

/**
 * Opaque configs for one driver, default slot first so a single-instance
 * environment reports exactly the source it always did.
 *
 * Mirrors the registry's own merge: an explicit `providerInstances` entry owns
 * its id, and the legacy `providers.<kind>` blob fills the default slot only
 * when nothing has claimed it.
 */
function instanceConfigsForDriver(
  settings: ServerSettings,
  driver: ProviderDriverKind,
): ReadonlyArray<DriverInstanceConfig> {
  const defaultInstanceId = defaultInstanceIdForDriver(driver);
  const instances = settings.providerInstances;
  const claimed = instances[defaultInstanceId];
  const configs: Array<DriverInstanceConfig> = [];

  if (claimed === undefined) {
    // Access is dynamic (the driver kind is a branded string) but constrained
    // to the built-in kinds this module names. The legacy blob carries no
    // presentation, so the default slot falls back to the driver's own.
    const legacy = (settings.providers as Record<string, unknown>)[driver];
    if (legacy !== undefined) {
      configs.push({
        instanceId: defaultInstanceId,
        displayName: null,
        accentColor: null,
        config: legacy,
      });
    }
  } else if (claimed.driver === driver) {
    configs.push({
      instanceId: defaultInstanceId,
      displayName: claimed.displayName ?? null,
      accentColor: claimed.accentColor ?? null,
      config: claimed.config ?? {},
    });
  }

  for (const [instanceId, entry] of Object.entries(instances).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (instanceId === defaultInstanceId || entry.driver !== driver) continue;
    configs.push({
      instanceId: instanceId as ProviderInstanceId,
      displayName: entry.displayName ?? null,
      accentColor: entry.accentColor ?? null,
      config: entry.config ?? {},
    });
  }

  return configs;
}

/**
 * Enumerate every transcript directory this environment should scan, Claude
 * instances before Codex ones and default instances before custom ones.
 *
 * An instance whose config fails to decode is logged and skipped rather than
 * failing the whole scan: one bad envelope must not zero out the usage page.
 */
export const resolveUsageTranscriptSources = Effect.fn("resolveUsageTranscriptSources")(function* (
  settings: ServerSettings,
): Effect.fn.Return<
  ReadonlyArray<UsageTranscriptSource>,
  never,
  FileSystem.FileSystem | Path.Path
> {
  const path = yield* Path.Path;
  const hostIsWindows = yield* isHostWindows;
  const sources: Array<UsageTranscriptSource> = [];
  const seen = new Set<string>();

  const add = (provider: UsageProviderKind, dir: string, instance: DriverInstanceConfig) => {
    // Windows paths are case-insensitive, so two instances configured with
    // different casing name one directory and would otherwise double count.
    // The instance that got there first owns the directory's usage; the
    // transcripts underneath carry nothing that could tell them apart.
    const key = hostIsWindows ? dir.toLowerCase() : dir;
    if (seen.has(key)) return;
    seen.add(key);
    sources.push({
      provider,
      dir,
      instanceId: instance.instanceId,
      displayName: instance.displayName,
      accentColor: instance.accentColor,
    });
  };

  for (const instance of instanceConfigsForDriver(settings, CLAUDE_DRIVER)) {
    const decoded = yield* decodeClaudeSettings(instance.config).pipe(Effect.result);
    if (decoded._tag === "Failure") {
      yield* Effect.logWarning("Skipping Claude instance with undecodable config in usage scan", {
        instanceId: instance.instanceId,
      });
      continue;
    }
    const homePath = yield* resolveClaudeHomePath(decoded.success);
    add("claude", yield* resolveClaudeTranscriptDir(homePath), instance);
  }

  for (const instance of instanceConfigsForDriver(settings, CODEX_DRIVER)) {
    const decoded = yield* decodeCodexSettings(instance.config).pipe(Effect.result);
    if (decoded._tag === "Failure") {
      yield* Effect.logWarning("Skipping Codex instance with undecodable config in usage scan", {
        instanceId: instance.instanceId,
      });
      continue;
    }
    const layout = yield* resolveCodexHomeLayout(decoded.success);
    add("codex", path.join(layout.sharedHomePath, "sessions"), instance);
  }

  return sources;
});
