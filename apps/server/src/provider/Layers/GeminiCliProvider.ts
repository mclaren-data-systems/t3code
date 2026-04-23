import type {
  GenericProviderSettings,
  ModelCapabilities,
  ServerProvider,
  ServerProviderModel,
  ServerSettingsError,
} from "@t3tools/contracts";
import { MODEL_OPTIONS_BY_PROVIDER } from "@t3tools/contracts";
import { Effect, Equal, Layer, Option, Result, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { resolveGeminiSpawnPlan } from "../../geminiCliServerManager.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { makeManagedServerProvider } from "../makeManagedServerProvider.ts";
import {
  buildServerProvider,
  collectStreamAsString,
  DEFAULT_TIMEOUT_MS,
  detailFromResult,
  isCommandMissingCause,
  parseGenericCliVersion,
  providerModelsFromSettings,
  type CommandResult,
} from "../providerSnapshot.ts";
import { GeminiCliProvider } from "../Services/GeminiCliProvider.ts";

const PROVIDER = "geminiCli" as const;
const EMPTY_CAPABILITIES: ModelCapabilities = {
  reasoningEffortLevels: [],
  supportsFastMode: false,
  supportsThinkingToggle: false,
  contextWindowOptions: [],
  promptInjectedEffortLevels: [],
};

const BUILT_IN_GEMINI_MODELS: ReadonlyArray<ServerProviderModel> =
  MODEL_OPTIONS_BY_PROVIDER.geminiCli.map((option) => ({
    slug: option.slug,
    name: option.name,
    isCustom: false,
    capabilities: EMPTY_CAPABILITIES,
  }));

function getGeminiModelsForSettings(
  geminiSettings: Pick<GenericProviderSettings, "customModels">,
): ReadonlyArray<ServerProviderModel> {
  return providerModelsFromSettings(
    BUILT_IN_GEMINI_MODELS,
    PROVIDER,
    geminiSettings.customModels,
    EMPTY_CAPABILITIES,
  );
}

function resolveGeminiProbeBinary(geminiSettings: GenericProviderSettings): string {
  const configured = geminiSettings.binaryPath.trim();
  return configured || "gemini";
}

const runGeminiCommand = (binaryPath: string, args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const spawnPlan = resolveGeminiSpawnPlan({
      binaryPath,
      args,
      cwd: process.cwd(),
      env: process.env,
    });
    const command = ChildProcess.make(spawnPlan.command, [...spawnPlan.args], {
      cwd: spawnPlan.options.cwd,
      env: spawnPlan.options.env,
      shell: spawnPlan.options.shell,
    });

    const child = yield* spawner.spawn(command);
    const [stdout, stderr, exitCode] = yield* Effect.all(
      [
        collectStreamAsString(child.stdout),
        collectStreamAsString(child.stderr),
        child.exitCode.pipe(Effect.map(Number)),
      ],
      { concurrency: "unbounded" },
    );

    return { stdout, stderr, code: exitCode } satisfies CommandResult;
  }).pipe(Effect.scoped);

function buildInitialGeminiProviderSnapshot(
  geminiSettings: GenericProviderSettings,
): ServerProvider {
  const checkedAt = new Date().toISOString();
  const models = getGeminiModelsForSettings(geminiSettings);

  if (!geminiSettings.enabled) {
    return buildServerProvider({
      provider: PROVIDER,
      enabled: false,
      checkedAt,
      models,
      probe: {
        installed: false,
        version: null,
        status: "warning",
        auth: { status: "unknown" },
        message: "Gemini CLI is disabled in T3 Code settings.",
      },
    });
  }

  return buildServerProvider({
    provider: PROVIDER,
    enabled: true,
    checkedAt,
    models,
    probe: {
      installed: true,
      version: null,
      status: "warning",
      auth: { status: "unknown" },
      message: "Checking Gemini CLI availability...",
    },
  });
}

export const checkGeminiCliProviderStatus = Effect.fn("checkGeminiCliProviderStatus")(
  function* (): Effect.fn.Return<
    ServerProvider,
    ServerSettingsError,
    ChildProcessSpawner.ChildProcessSpawner | ServerSettingsService
  > {
    const geminiSettings = yield* Effect.service(ServerSettingsService).pipe(
      Effect.flatMap((service) => service.getSettings),
      Effect.map((settings) => settings.providers.geminiCli),
    );
    const checkedAt = new Date().toISOString();
    const models = getGeminiModelsForSettings(geminiSettings);

    if (!geminiSettings.enabled) {
      return buildServerProvider({
        provider: PROVIDER,
        enabled: false,
        checkedAt,
        models,
        probe: {
          installed: false,
          version: null,
          status: "warning",
          auth: { status: "unknown" },
          message: "Gemini CLI is disabled in T3 Code settings.",
        },
      });
    }

    const binaryPath = resolveGeminiProbeBinary(geminiSettings);
    const versionProbe = yield* runGeminiCommand(binaryPath, ["--version"]).pipe(
      Effect.timeoutOption(DEFAULT_TIMEOUT_MS),
      Effect.result,
    );

    if (Result.isFailure(versionProbe)) {
      const error = versionProbe.failure;
      return buildServerProvider({
        provider: PROVIDER,
        enabled: geminiSettings.enabled,
        checkedAt,
        models,
        probe: {
          installed: !isCommandMissingCause(error),
          version: null,
          status: "error",
          auth: { status: "unknown" },
          message: isCommandMissingCause(error)
            ? "Gemini CLI (`gemini`) is not installed or not on PATH."
            : `Failed to execute Gemini CLI health check: ${error instanceof Error ? error.message : String(error)}.`,
        },
      });
    }

    if (Option.isNone(versionProbe.success)) {
      return buildServerProvider({
        provider: PROVIDER,
        enabled: geminiSettings.enabled,
        checkedAt,
        models,
        probe: {
          installed: true,
          version: null,
          status: "error",
          auth: { status: "unknown" },
          message: "Gemini CLI is installed but failed to run. Timed out while running command.",
        },
      });
    }

    const version = versionProbe.success.value;
    const parsedVersion = parseGenericCliVersion(`${version.stdout}\n${version.stderr}`);
    if (version.code !== 0) {
      const detail = detailFromResult(version);
      return buildServerProvider({
        provider: PROVIDER,
        enabled: geminiSettings.enabled,
        checkedAt,
        models,
        probe: {
          installed: true,
          version: parsedVersion,
          status: "error",
          auth: { status: "unknown" },
          message: detail
            ? `Gemini CLI is installed but failed to run. ${detail}`
            : "Gemini CLI is installed but failed to run.",
        },
      });
    }

    return buildServerProvider({
      provider: PROVIDER,
      enabled: geminiSettings.enabled,
      checkedAt,
      models,
      probe: {
        installed: true,
        version: parsedVersion,
        status: "ready",
        auth: { status: "unknown" },
      },
    });
  },
);

export const GeminiCliProviderLive = Layer.effect(
  GeminiCliProvider,
  Effect.gen(function* () {
    const serverSettings = yield* ServerSettingsService;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

    const checkProvider = checkGeminiCliProviderStatus().pipe(
      Effect.provideService(ServerSettingsService, serverSettings),
      Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
    );

    return yield* makeManagedServerProvider<GenericProviderSettings>({
      getSettings: serverSettings.getSettings.pipe(
        Effect.map((settings) => settings.providers.geminiCli),
        Effect.orDie,
      ),
      streamSettings: serverSettings.streamChanges.pipe(
        Stream.map((settings) => settings.providers.geminiCli),
      ),
      haveSettingsChanged: (previous, next) => !Equal.equals(previous, next),
      initialSnapshot: buildInitialGeminiProviderSnapshot,
      checkProvider,
    });
  }),
);
