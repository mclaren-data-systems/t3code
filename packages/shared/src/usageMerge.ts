/**
 * Merges per-environment usage summaries into the single view the page renders.
 *
 * Pure, so the de-duplication and derivation rules can be tested without a
 * connected environment.
 *
 * @module usageMerge
 */
import {
  defaultInstanceIdForDriver,
  USAGE_MERGE_COMPATIBLE_SINCE,
  USAGE_PROVIDER_DRIVERS,
  type EnvironmentId,
  type ProviderInstanceId,
  type UsageBucket,
  type UsageProviderKind,
  type UsageSource,
  type UsageSourceFingerprint,
  type UsageSummary,
} from "@t3tools/contracts";

export interface EnvironmentUsage {
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly summary: UsageSummary;
}

export interface ProviderTotals {
  readonly provider: UsageProviderKind;
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly records: number;
  readonly sessions: number;
  readonly costShare: number;
  readonly tokenShare: number;
}

/**
 * One configured provider instance's totals.
 *
 * `displayName` and `accentColor` are whatever the user configured, passed
 * through verbatim; resolving them into a label and a color is the client's
 * job, since only the client knows the brand names and the theme.
 */
export interface InstanceTotals {
  readonly instanceId: ProviderInstanceId;
  readonly provider: UsageProviderKind;
  readonly displayName: string | null;
  readonly accentColor: string | null;
  /** True when this is the provider's default instance rather than an added one. */
  readonly isDefaultInstance: boolean;
  /**
   * Position among the reported instances of this provider kind, in a stable
   * order that does not move when spending does. Clients use it to pick a
   * distinguishable shade; index 0 always keeps the provider's brand color, so
   * a single-instance setup looks untouched.
   */
  readonly shadeIndex: number;
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly records: number;
  readonly sessions: number;
  readonly costShare: number;
  readonly tokenShare: number;
}

export interface ModelTotals {
  readonly model: string;
  readonly provider: UsageProviderKind;
  /** The instance the tokens came from; one model row per instance that used it. */
  readonly instanceId: ProviderInstanceId;
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly records: number;
  /**
   * Records whose tokens are counted here but which contributed nothing to
   * `costUsd`. When it equals `records` the cost is unknown, not zero.
   */
  readonly unpricedRecords: number;
  readonly costShare: number;
}

/**
 * A model whose every record lacked rates has an unknown cost, not a zero one.
 * Clients must not present its `costUsd` as a real dollar figure.
 */
export function isModelCostUnknown(model: ModelTotals): boolean {
  return model.records > 0 && model.unpricedRecords >= model.records;
}

export interface PeriodInstanceTotals {
  readonly costUsd: number;
  readonly totalTokens: number;
}

export interface DailyTotals {
  readonly day: string;
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly byProvider: ReadonlyMap<UsageProviderKind, { costUsd: number; totalTokens: number }>;
  readonly byInstance: ReadonlyMap<ProviderInstanceId, PeriodInstanceTotals>;
}

export interface HourlyTotals {
  readonly day: string;
  readonly hourStart: string;
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly byProvider: ReadonlyMap<UsageProviderKind, { costUsd: number; totalTokens: number }>;
  readonly byInstance: ReadonlyMap<ProviderInstanceId, PeriodInstanceTotals>;
}

export interface CostQuality {
  readonly providerReportedShare: number;
  readonly modelPricedShare: number;
  readonly unpricedShare: number;
  readonly cacheSavingsUsd: number;
}

export interface UsageContractMismatch {
  readonly environmentId: EnvironmentId;
  readonly direction: "serverBehind" | "clientBehind";
  readonly contractVersion: number;
}

export interface MergedUsage {
  readonly costUsd: number;
  readonly uncachedInputTokens: number;
  readonly cachedInputTokens: number;
  readonly cacheCreationTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
  readonly totalTokens: number;
  readonly records: number;
  readonly sessions: number;
  readonly providers: readonly ProviderTotals[];
  /** One entry per provider instance that spent anything, richest first. */
  readonly instances: readonly InstanceTotals[];
  readonly models: readonly ModelTotals[];
  readonly daily: readonly DailyTotals[];
  readonly hourly: readonly HourlyTotals[];
  readonly costQuality: CostQuality;
  /** Environments whose data was dropped as a duplicate of another's. */
  readonly duplicateSources: readonly string[];
  readonly contributingEnvironments: readonly EnvironmentId[];
  readonly contractMismatches: readonly UsageContractMismatch[];
}

/**
 * Two sources are the same physical transcript directory only when host,
 * provider, path and filesystem identity all agree.
 *
 * `volumeId` is what stops two machines that happen to share a hostname and a
 * home path, which is every Mac in a fleet, from collapsing into one source and
 * having one of them silently dropped.
 */
function fingerprintKey(fingerprint: UsageSourceFingerprint): string {
  return [
    fingerprint.hostId,
    fingerprint.provider,
    fingerprint.resolvedHomePath,
    fingerprint.volumeId,
  ].join(" ");
}

function bucketsForSource(summary: UsageSummary, source: UsageSource): readonly UsageBucket[] {
  const providerSources = summary.sources.filter(
    (entry) => entry.fingerprint.provider === source.fingerprint.provider,
  );
  return summary.buckets.filter(
    (bucket) =>
      bucket.provider === source.fingerprint.provider &&
      (bucket.sourcePath === source.fingerprint.resolvedHomePath ||
        (bucket.sourcePath === undefined && providerSources.length === 1)),
  );
}

function bucketKey(bucket: UsageBucket): string {
  return JSON.stringify([bucket.day, bucket.hourStart ?? null, bucket.provider, bucket.model]);
}

/**
 * Decides which environment owns each physical transcript directory.
 *
 * Several environments on one machine (worktree servers, for instance) resolve
 * the same provider home and would otherwise double count every token. The
 * Complete scans claim a fingerprint ahead of partial scans, then the most
 * recently read scan wins within each status. A newer partial scan can still
 * contribute cells absent from an older complete scan. Environment ids break
 * ties so the result is stable when summaries have the same read time.
 */
function claimSources(environments: readonly EnvironmentUsage[]): {
  readonly ownerByFingerprint: ReadonlyMap<string, EnvironmentId>;
  readonly supplementalBucketsByEnvironment: ReadonlyMap<EnvironmentId, ReadonlySet<UsageBucket>>;
  readonly sessionsByFingerprint: ReadonlyMap<string, number>;
  readonly duplicates: readonly string[];
} {
  const ownerByFingerprint = new Map<string, EnvironmentId>();
  const ownerScanByFingerprint = new Map<
    string,
    { environment: EnvironmentUsage; source: UsageSource }
  >();
  const seenBucketKeysByFingerprint = new Map<string, Set<string>>();
  const supplementalBucketsByEnvironment = new Map<EnvironmentId, Set<UsageBucket>>();
  const sessionsByFingerprint = new Map<string, number>();
  const duplicates: string[] = [];

  const ordered = [...environments].sort(
    (a, b) =>
      (Date.parse(b.summary.readAt) || 0) - (Date.parse(a.summary.readAt) || 0) ||
      a.environmentId.localeCompare(b.environmentId),
  );

  // A complete scan takes precedence over a newer partial scan of the same
  // directory. Partial history still contributes when no complete copy exists.
  for (const status of ["ok", "partial", "failed"] as const) {
    for (const environment of ordered) {
      for (const source of environment.summary.sources) {
        if (source.status !== status) continue;
        const key = fingerprintKey(source.fingerprint);
        if (ownerByFingerprint.has(key)) {
          duplicates.push(`${environment.label}: ${source.fingerprint.resolvedHomePath}`);
          continue;
        }
        ownerByFingerprint.set(key, environment.environmentId);
        ownerScanByFingerprint.set(key, { environment, source });
        sessionsByFingerprint.set(key, source.distinctSessions);
      }
    }
  }

  // A newer partial scan may contain usage recorded after an older complete
  // scan. Keep cells absent from the complete scan. Aggregated cells do not
  // reveal enough to reconcile overlapping records without double counting.
  for (const environment of ordered) {
    for (const source of environment.summary.sources) {
      if (source.status !== "partial") continue;
      const key = fingerprintKey(source.fingerprint);
      const owner = ownerScanByFingerprint.get(key);
      if (
        owner?.source.status !== "ok" ||
        Date.parse(environment.summary.readAt) <= Date.parse(owner.environment.summary.readAt)
      ) {
        continue;
      }
      let seen = seenBucketKeysByFingerprint.get(key);
      if (seen === undefined) {
        seen = new Set(bucketsForSource(owner.environment.summary, owner.source).map(bucketKey));
        seenBucketKeysByFingerprint.set(key, seen);
      }
      const supplemental =
        supplementalBucketsByEnvironment.get(environment.environmentId) ?? new Set<UsageBucket>();
      let added = false;
      for (const bucket of bucketsForSource(environment.summary, source)) {
        const cell = bucketKey(bucket);
        if (seen.has(cell)) continue;
        seen.add(cell);
        supplemental.add(bucket);
        added = true;
      }
      if (!added) continue;
      supplementalBucketsByEnvironment.set(environment.environmentId, supplemental);
      sessionsByFingerprint.set(
        key,
        Math.max(sessionsByFingerprint.get(key) ?? 0, source.distinctSessions),
      );
    }
  }

  return {
    ownerByFingerprint,
    supplementalBucketsByEnvironment,
    sessionsByFingerprint,
    duplicates,
  };
}

/** Sources this environment owns after fingerprint claims, plus their buckets. */
function ownedContribution(
  environment: EnvironmentUsage,
  ownerByFingerprint: ReadonlyMap<string, EnvironmentId>,
  supplementalBuckets: ReadonlySet<UsageBucket>,
  sessionsByFingerprint: ReadonlyMap<string, number>,
): {
  readonly buckets: readonly UsageBucket[];
  readonly sessionsByProvider: ReadonlyMap<UsageProviderKind, number>;
  readonly sessionsByInstance: ReadonlyMap<ProviderInstanceId, number>;
  readonly identities: ReadonlyMap<ProviderInstanceId, InstanceIdentity>;
} {
  const ownedProviders = new Set<UsageProviderKind>();
  const ownedSources = new Set<string>();
  const sessionsByProvider = new Map<UsageProviderKind, number>();
  const sessionsByInstance = new Map<ProviderInstanceId, number>();
  const identities = new Map<ProviderInstanceId, InstanceIdentity>();
  for (const source of environment.summary.sources) {
    if (source.status === "missing") continue;
    const key = fingerprintKey(source.fingerprint);
    if (ownerByFingerprint.get(key) === environment.environmentId) {
      const provider = source.fingerprint.provider;
      ownedProviders.add(provider);
      ownedSources.add(`${provider}\u0000${source.fingerprint.resolvedHomePath}`);
      // Distinct within a directory. Summing per-bucket session counts instead
      // would count a session once per day and model it spans.
      const sessions = sessionsByFingerprint.get(key) ?? source.distinctSessions;
      sessionsByProvider.set(provider, (sessionsByProvider.get(provider) ?? 0) + sessions);
      const instanceId = sourceInstanceId(source);
      sessionsByInstance.set(instanceId, (sessionsByInstance.get(instanceId) ?? 0) + sessions);
      if (!identities.has(instanceId)) {
        identities.set(instanceId, {
          provider,
          displayName: source.displayName ?? null,
          accentColor: source.accentColor ?? null,
        });
      }
    }
  }
  return {
    buckets: environment.summary.buckets.filter(
      (bucket) =>
        supplementalBuckets.has(bucket) ||
        (bucket.sourcePath === undefined
          ? ownedProviders.has(bucket.provider)
          : ownedSources.has(`${bucket.provider}\u0000${bucket.sourcePath}`)),
    ),
    sessionsByProvider,
    sessionsByInstance,
    identities,
  };
}

interface InstanceIdentity {
  readonly provider: UsageProviderKind;
  readonly displayName: string | null;
  readonly accentColor: string | null;
}

function isDefaultInstance(instanceId: ProviderInstanceId, provider: UsageProviderKind): boolean {
  return instanceId === defaultInstanceIdForDriver(USAGE_PROVIDER_DRIVERS[provider]);
}

/**
 * The instance a source reports under. A source that names none — an older
 * server, or a directory not configured per instance — is the provider's
 * default instance, which is what a single-account setup has always shown.
 */
function sourceInstanceId(source: UsageSource): ProviderInstanceId {
  return (
    source.instanceId ??
    defaultInstanceIdForDriver(USAGE_PROVIDER_DRIVERS[source.fingerprint.provider])
  );
}

/**
 * Resolves each bucket of one summary to the instance of the source it came
 * from, through the `sourcePath` the server stamps on it. A bucket with no
 * path (an older server) belongs to the provider's only source, or failing
 * that to the provider's default instance.
 */
function bucketInstanceResolver(
  summary: UsageSummary,
): (bucket: UsageBucket) => ProviderInstanceId {
  const byPath = new Map<string, ProviderInstanceId>();
  const soleByProvider = new Map<UsageProviderKind, ProviderInstanceId | null>();
  for (const source of summary.sources) {
    const provider = source.fingerprint.provider;
    const instanceId = sourceInstanceId(source);
    byPath.set(`${provider}\u0000${source.fingerprint.resolvedHomePath}`, instanceId);
    soleByProvider.set(provider, soleByProvider.has(provider) ? null : instanceId);
  }
  return (bucket) =>
    (bucket.sourcePath === undefined
      ? soleByProvider.get(bucket.provider)
      : byPath.get(`${bucket.provider}\u0000${bucket.sourcePath}`)) ??
    defaultInstanceIdForDriver(USAGE_PROVIDER_DRIVERS[bucket.provider]);
}

/**
 * Assigns each instance a shade slot within its provider kind: the default
 * instance first, then the rest by id. Deliberately independent of spending, so
 * a quiet week does not repaint the chart.
 */
function shadeIndexes(
  identities: ReadonlyMap<ProviderInstanceId, InstanceIdentity>,
): ReadonlyMap<ProviderInstanceId, number> {
  const byProvider = new Map<UsageProviderKind, ProviderInstanceId[]>();
  for (const [instanceId, identity] of identities) {
    const siblings = byProvider.get(identity.provider);
    if (siblings === undefined) byProvider.set(identity.provider, [instanceId]);
    else siblings.push(instanceId);
  }

  const indexes = new Map<ProviderInstanceId, number>();
  for (const [provider, instanceIds] of byProvider) {
    // .sort() on the array we just built, not .toSorted(): Hermes, which runs
    // the mobile client, does not ship the ES2023 method.
    const ordered = instanceIds.sort((a, b) => {
      const defaultDelta =
        Number(isDefaultInstance(b, provider)) - Number(isDefaultInstance(a, provider));
      return defaultDelta || a.localeCompare(b);
    });
    ordered.forEach((instanceId, index) => indexes.set(instanceId, index));
  }
  return indexes;
}

function bucketTokens(bucket: UsageBucket): number {
  // reasoningTokens is a subset of outputTokens and must not be added again.
  return (
    bucket.totals.uncachedInputTokens +
    bucket.totals.cachedInputTokens +
    bucket.totals.cacheCreationTokens +
    bucket.totals.outputTokens
  );
}

export function isCompatibleUsageContractVersion(version: number, expected: number): boolean {
  return version >= USAGE_MERGE_COMPATIBLE_SINCE && version <= expected;
}

const EMPTY_MERGED: MergedUsage = {
  costUsd: 0,
  uncachedInputTokens: 0,
  cachedInputTokens: 0,
  cacheCreationTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
  records: 0,
  sessions: 0,
  providers: [],
  instances: [],
  models: [],
  daily: [],
  hourly: [],
  costQuality: {
    providerReportedShare: 0,
    modelPricedShare: 0,
    unpricedShare: 0,
    cacheSavingsUsd: 0,
  },
  duplicateSources: [],
  contributingEnvironments: [],
  contractMismatches: [],
};

/**
 * Merges every connected environment's summary.
 *
 * `expectedContractVersion` guards against incompatible server code: rather
 * than blocking the page, its data is excluded and the mismatch direction is
 * reported so the UI can identify which side needs updating. Versions in
 * [{@link USAGE_MERGE_COMPATIBLE_SINCE}, expected] still merge, so an additive
 * provider expansion does not drop Claude/Codex totals from older servers.
 */
export function mergeUsage(
  environments: readonly EnvironmentUsage[],
  expectedContractVersion: number,
): MergedUsage {
  if (environments.length === 0) return EMPTY_MERGED;

  const current: EnvironmentUsage[] = [];
  const contractMismatches: UsageContractMismatch[] = [];
  for (const environment of environments) {
    if (
      isCompatibleUsageContractVersion(environment.summary.contractVersion, expectedContractVersion)
    ) {
      current.push(environment);
    } else {
      contractMismatches.push({
        environmentId: environment.environmentId,
        direction:
          environment.summary.contractVersion < expectedContractVersion
            ? "serverBehind"
            : "clientBehind",
        contractVersion: environment.summary.contractVersion,
      });
    }
  }

  const {
    ownerByFingerprint,
    supplementalBucketsByEnvironment,
    sessionsByFingerprint,
    duplicates,
  } = claimSources(current);

  let costUsd = 0;
  let uncachedInputTokens = 0;
  let cachedInputTokens = 0;
  let cacheCreationTokens = 0;
  let outputTokens = 0;
  let reasoningTokens = 0;
  let records = 0;
  let sessions = 0;
  let cacheSavingsUsd = 0;
  let providerReportedRecords = 0;
  let unpricedRecords = 0;

  const providerAccumulator = new Map<
    UsageProviderKind,
    { costUsd: number; totalTokens: number; records: number; sessions: number }
  >();
  const instanceAccumulator = new Map<
    ProviderInstanceId,
    { costUsd: number; totalTokens: number; records: number; sessions: number }
  >();
  const identities = new Map<ProviderInstanceId, InstanceIdentity>();
  const modelAccumulator = new Map<
    string,
    {
      model: string;
      provider: UsageProviderKind;
      instanceId: ProviderInstanceId;
      costUsd: number;
      totalTokens: number;
      records: number;
      unpricedRecords: number;
    }
  >();
  const dailyAccumulator = new Map<
    string,
    {
      costUsd: number;
      totalTokens: number;
      byProvider: Map<UsageProviderKind, { costUsd: number; totalTokens: number }>;
      byInstance: Map<ProviderInstanceId, { costUsd: number; totalTokens: number }>;
    }
  >();
  const hourlyAccumulator = new Map<
    string,
    {
      day: string;
      hourStart: string;
      costUsd: number;
      totalTokens: number;
      byProvider: Map<UsageProviderKind, { costUsd: number; totalTokens: number }>;
      byInstance: Map<ProviderInstanceId, { costUsd: number; totalTokens: number }>;
    }
  >();
  const contributingEnvironments: EnvironmentId[] = [];

  for (const environment of current) {
    const {
      buckets,
      sessionsByProvider,
      sessionsByInstance,
      identities: ownedIdentities,
    } = ownedContribution(
      environment,
      ownerByFingerprint,
      supplementalBucketsByEnvironment.get(environment.environmentId) ?? new Set(),
      sessionsByFingerprint,
    );
    if (buckets.length > 0) contributingEnvironments.push(environment.environmentId);
    const resolveInstance = bucketInstanceResolver(environment.summary);

    for (const [instanceId, identity] of ownedIdentities) {
      if (!identities.has(instanceId)) identities.set(instanceId, identity);
    }
    for (const [instanceId, instanceSessions] of sessionsByInstance) {
      if (instanceSessions === 0) continue;
      const instance = instanceAccumulator.get(instanceId) ?? {
        costUsd: 0,
        totalTokens: 0,
        records: 0,
        sessions: 0,
      };
      instance.sessions += instanceSessions;
      instanceAccumulator.set(instanceId, instance);
    }

    for (const [providerKind, providerSessions] of sessionsByProvider) {
      sessions += providerSessions;
      if (providerSessions === 0) continue;
      const provider = providerAccumulator.get(providerKind) ?? {
        costUsd: 0,
        totalTokens: 0,
        records: 0,
        sessions: 0,
      };
      provider.sessions += providerSessions;
      providerAccumulator.set(providerKind, provider);
    }

    for (const bucket of buckets) {
      const tokens = bucketTokens(bucket);

      costUsd += bucket.costUsd;
      cacheSavingsUsd += bucket.cacheSavingsUsd;
      uncachedInputTokens += bucket.totals.uncachedInputTokens;
      cachedInputTokens += bucket.totals.cachedInputTokens;
      cacheCreationTokens += bucket.totals.cacheCreationTokens;
      outputTokens += bucket.totals.outputTokens;
      reasoningTokens += bucket.totals.reasoningTokens;
      records += bucket.records;
      unpricedRecords += bucket.unpricedRecords;
      if (bucket.costSource === "providerReported") providerReportedRecords += bucket.records;

      const provider = providerAccumulator.get(bucket.provider) ?? {
        costUsd: 0,
        totalTokens: 0,
        records: 0,
        sessions: 0,
      };
      provider.costUsd += bucket.costUsd;
      provider.totalTokens += tokens;
      provider.records += bucket.records;
      providerAccumulator.set(bucket.provider, provider);

      const instanceId = resolveInstance(bucket);
      const instance = instanceAccumulator.get(instanceId) ?? {
        costUsd: 0,
        totalTokens: 0,
        records: 0,
        sessions: 0,
      };
      instance.costUsd += bucket.costUsd;
      instance.totalTokens += tokens;
      instance.records += bucket.records;
      instanceAccumulator.set(instanceId, instance);
      if (!identities.has(instanceId)) {
        // A bucket whose source went unowned (or an older server with no
        // instance on its sources) still needs a row: name it by provider.
        identities.set(instanceId, {
          provider: bucket.provider,
          displayName: null,
          accentColor: null,
        });
      }

      const modelKey = `${instanceId}\u0000${bucket.model}`;
      const model = modelAccumulator.get(modelKey) ?? {
        model: bucket.model,
        provider: bucket.provider,
        instanceId,
        costUsd: 0,
        totalTokens: 0,
        records: 0,
        unpricedRecords: 0,
      };
      model.costUsd += bucket.costUsd;
      model.totalTokens += tokens;
      model.records += bucket.records;
      model.unpricedRecords += bucket.unpricedRecords;
      modelAccumulator.set(modelKey, model);

      const day = dailyAccumulator.get(bucket.day) ?? {
        costUsd: 0,
        totalTokens: 0,
        byProvider: new Map<UsageProviderKind, { costUsd: number; totalTokens: number }>(),
        byInstance: new Map<ProviderInstanceId, { costUsd: number; totalTokens: number }>(),
      };
      day.costUsd += bucket.costUsd;
      day.totalTokens += tokens;
      const dayProvider = day.byProvider.get(bucket.provider) ?? { costUsd: 0, totalTokens: 0 };
      dayProvider.costUsd += bucket.costUsd;
      dayProvider.totalTokens += tokens;
      day.byProvider.set(bucket.provider, dayProvider);
      const dayInstance = day.byInstance.get(instanceId) ?? { costUsd: 0, totalTokens: 0 };
      dayInstance.costUsd += bucket.costUsd;
      dayInstance.totalTokens += tokens;
      day.byInstance.set(instanceId, dayInstance);
      dailyAccumulator.set(bucket.day, day);

      if (bucket.hourStart !== undefined) {
        const hour = hourlyAccumulator.get(bucket.hourStart) ?? {
          day: bucket.day,
          hourStart: bucket.hourStart,
          costUsd: 0,
          totalTokens: 0,
          byProvider: new Map<UsageProviderKind, { costUsd: number; totalTokens: number }>(),
          byInstance: new Map<ProviderInstanceId, { costUsd: number; totalTokens: number }>(),
        };
        hour.costUsd += bucket.costUsd;
        hour.totalTokens += tokens;
        const hourProvider = hour.byProvider.get(bucket.provider) ?? {
          costUsd: 0,
          totalTokens: 0,
        };
        hourProvider.costUsd += bucket.costUsd;
        hourProvider.totalTokens += tokens;
        hour.byProvider.set(bucket.provider, hourProvider);
        const hourInstance = hour.byInstance.get(instanceId) ?? { costUsd: 0, totalTokens: 0 };
        hourInstance.costUsd += bucket.costUsd;
        hourInstance.totalTokens += tokens;
        hour.byInstance.set(instanceId, hourInstance);
        hourlyAccumulator.set(bucket.hourStart, hour);
      }
    }
  }

  const totalTokens = uncachedInputTokens + cachedInputTokens + cacheCreationTokens + outputTokens;

  const providers: ProviderTotals[] = [...providerAccumulator.entries()]
    .map(([provider, totals]) => ({
      provider,
      costUsd: totals.costUsd,
      totalTokens: totals.totalTokens,
      records: totals.records,
      sessions: totals.sessions,
      costShare: costUsd === 0 ? 0 : totals.costUsd / costUsd,
      tokenShare: totalTokens === 0 ? 0 : totals.totalTokens / totalTokens,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  // Shades are assigned over the instances the report will actually draw, so
  // the numbering has no gaps a legend would have to explain.
  const reportedIdentities = new Map<ProviderInstanceId, InstanceIdentity>();
  for (const instanceId of instanceAccumulator.keys()) {
    const identity = identities.get(instanceId);
    if (identity !== undefined) reportedIdentities.set(instanceId, identity);
  }
  const shades = shadeIndexes(reportedIdentities);

  const instances: InstanceTotals[] = [...instanceAccumulator.entries()]
    .flatMap(([instanceId, totals]) => {
      const identity = reportedIdentities.get(instanceId);
      if (identity === undefined) return [];
      return [
        {
          instanceId,
          provider: identity.provider,
          displayName: identity.displayName,
          accentColor: identity.accentColor,
          isDefaultInstance: isDefaultInstance(instanceId, identity.provider),
          shadeIndex: shades.get(instanceId) ?? 0,
          costUsd: totals.costUsd,
          totalTokens: totals.totalTokens,
          records: totals.records,
          sessions: totals.sessions,
          costShare: costUsd === 0 ? 0 : totals.costUsd / costUsd,
          tokenShare: totalTokens === 0 ? 0 : totals.totalTokens / totalTokens,
        } satisfies InstanceTotals,
      ];
    })
    .sort((a, b) => b.costUsd - a.costUsd || a.instanceId.localeCompare(b.instanceId));

  const models: ModelTotals[] = [...modelAccumulator.values()]
    .map((totals) => ({
      model: totals.model,
      provider: totals.provider,
      instanceId: totals.instanceId,
      costUsd: totals.costUsd,
      totalTokens: totals.totalTokens,
      records: totals.records,
      unpricedRecords: totals.unpricedRecords,
      costShare: costUsd === 0 ? 0 : totals.costUsd / costUsd,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || b.totalTokens - a.totalTokens);

  const daily: DailyTotals[] = [...dailyAccumulator.entries()]
    .map(([day, totals]) => ({
      day,
      costUsd: totals.costUsd,
      totalTokens: totals.totalTokens,
      byProvider: totals.byProvider,
      byInstance: totals.byInstance,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const hourly: HourlyTotals[] = [...hourlyAccumulator.values()].sort((a, b) =>
    a.hourStart.localeCompare(b.hourStart),
  );

  return {
    costUsd,
    uncachedInputTokens,
    cachedInputTokens,
    cacheCreationTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    records,
    sessions,
    providers,
    instances,
    models,
    daily,
    hourly,
    costQuality: {
      providerReportedShare: records === 0 ? 0 : providerReportedRecords / records,
      unpricedShare: records === 0 ? 0 : unpricedRecords / records,
      modelPricedShare:
        records === 0 ? 0 : (records - providerReportedRecords - unpricedRecords) / records,
      cacheSavingsUsd,
    },
    duplicateSources: duplicates,
    contributingEnvironments,
    contractMismatches,
  };
}
