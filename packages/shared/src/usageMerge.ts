/**
 * Merges per-environment usage summaries into the single view the page renders.
 *
 * The unit the report groups by is the **provider instance**, not the provider
 * kind: two Claude accounts are two places tokens get spent and get their own
 * series, rows, and columns. An environment running one instance per provider —
 * which is most of them — sees exactly what it saw before, one entry per kind.
 *
 * Pure, so the de-duplication and derivation rules can be tested without a
 * connected environment.
 *
 * @module usageMerge
 */
import {
  defaultInstanceIdForDriver,
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
  readonly instanceId: ProviderInstanceId;
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly records: number;
  readonly costShare: number;
}

export interface PeriodInstanceTotals {
  readonly costUsd: number;
  readonly totalTokens: number;
}

export interface DailyTotals {
  readonly day: string;
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly byInstance: ReadonlyMap<ProviderInstanceId, PeriodInstanceTotals>;
}

export interface HourlyTotals {
  readonly day: string;
  readonly hourStart: string;
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly byInstance: ReadonlyMap<ProviderInstanceId, PeriodInstanceTotals>;
}

export interface CostQuality {
  readonly providerReportedShare: number;
  readonly modelPricedShare: number;
  readonly unpricedShare: number;
  readonly cacheSavingsUsd: number;
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
  /** One entry per provider instance that spent anything, richest first. */
  readonly instances: readonly InstanceTotals[];
  readonly models: readonly ModelTotals[];
  readonly daily: readonly DailyTotals[];
  readonly hourly: readonly HourlyTotals[];
  readonly costQuality: CostQuality;
  /** Environments whose data was dropped as a duplicate of another's. */
  readonly duplicateSources: readonly string[];
  readonly contributingEnvironments: readonly EnvironmentId[];
  readonly staleEnvironments: readonly EnvironmentId[];
}

/**
 * Two sources are the same physical transcript directory only when host,
 * provider, path and filesystem identity all agree.
 *
 * `volumeId` is what stops two machines that happen to share a hostname and a
 * home path, which is every Mac in a fleet, from collapsing into one source and
 * having one of them silently dropped.
 *
 * Instance ids are deliberately absent: the question this answers is "is this
 * the same directory", and two environments can reach one directory through
 * instances they named differently.
 */
function fingerprintKey(fingerprint: UsageSourceFingerprint): string {
  return [
    fingerprint.hostId,
    fingerprint.provider,
    fingerprint.resolvedHomePath,
    fingerprint.volumeId,
  ].join(" ");
}

/**
 * Decides which environment owns each physical transcript directory.
 *
 * Several environments on one machine (worktree servers, for instance) resolve
 * the same provider home and would otherwise double count every token. The
 * first environment in a stable order claims a fingerprint; the rest have that
 * directory's buckets dropped. Environments are sorted by id so the winner does
 * not change between renders.
 */
function claimSources(environments: readonly EnvironmentUsage[]): {
  readonly ownerByFingerprint: ReadonlyMap<string, EnvironmentId>;
  readonly duplicates: readonly string[];
} {
  const ownerByFingerprint = new Map<string, EnvironmentId>();
  const duplicates: string[] = [];

  const ordered = [...environments].sort((a, b) => a.environmentId.localeCompare(b.environmentId));

  for (const environment of ordered) {
    for (const source of environment.summary.sources) {
      if (source.status === "missing") continue;
      const key = fingerprintKey(source.fingerprint);
      if (ownerByFingerprint.has(key)) {
        duplicates.push(`${environment.label}: ${source.fingerprint.resolvedHomePath}`);
        continue;
      }
      ownerByFingerprint.set(key, environment.environmentId);
    }
  }

  return { ownerByFingerprint, duplicates };
}

/**
 * Sources this environment owns after fingerprint claims, plus their buckets.
 *
 * Ownership is resolved per instance rather than per provider kind. An
 * environment can own one Claude directory while another environment owns a
 * second one, and dropping or keeping every Claude bucket on the strength of a
 * single claim would double count one account or lose the other.
 */
function ownedContribution(
  environment: EnvironmentUsage,
  ownerByFingerprint: ReadonlyMap<string, EnvironmentId>,
): {
  readonly buckets: readonly UsageBucket[];
  readonly sources: readonly UsageSource[];
  readonly sessionsByInstance: ReadonlyMap<ProviderInstanceId, number>;
} {
  const ownedInstances = new Set<ProviderInstanceId>();
  const sources: UsageSource[] = [];
  const sessionsByInstance = new Map<ProviderInstanceId, number>();
  for (const source of environment.summary.sources) {
    if (source.status === "missing") continue;
    const key = fingerprintKey(source.fingerprint);
    if (ownerByFingerprint.get(key) !== environment.environmentId) continue;
    ownedInstances.add(source.instanceId);
    sources.push(source);
    // Distinct within a directory. Summing per-bucket session counts instead
    // would count a session once per day and model it spans.
    sessionsByInstance.set(
      source.instanceId,
      (sessionsByInstance.get(source.instanceId) ?? 0) + source.distinctSessions,
    );
  }
  return {
    buckets: environment.summary.buckets.filter((bucket) => ownedInstances.has(bucket.instanceId)),
    sources,
    sessionsByInstance,
  };
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

function isDefaultInstance(instanceId: ProviderInstanceId, provider: UsageProviderKind): boolean {
  return instanceId === defaultInstanceIdForDriver(USAGE_PROVIDER_DRIVERS[provider]);
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
  staleEnvironments: [],
};

interface InstanceIdentity {
  readonly provider: UsageProviderKind;
  readonly displayName: string | null;
  readonly accentColor: string | null;
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

/**
 * Merges every connected environment's summary.
 *
 * `expectedContractVersion` guards against an environment running older server
 * code: rather than blocking the page, its data is excluded and its id is
 * reported so the UI can say coverage is partial.
 */
export function mergeUsage(
  environments: readonly EnvironmentUsage[],
  expectedContractVersion: number,
): MergedUsage {
  if (environments.length === 0) return EMPTY_MERGED;

  const current: EnvironmentUsage[] = [];
  const staleEnvironments: EnvironmentId[] = [];
  for (const environment of environments) {
    if (environment.summary.contractVersion === expectedContractVersion) {
      current.push(environment);
    } else {
      staleEnvironments.push(environment.environmentId);
    }
  }

  const { ownerByFingerprint, duplicates } = claimSources(current);

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

  // Two environments can report the same instance id — `claudeAgent` is every
  // Claude default — so the first in environment order names it for the report.
  const identities = new Map<ProviderInstanceId, InstanceIdentity>();
  const instanceAccumulator = new Map<
    ProviderInstanceId,
    { costUsd: number; totalTokens: number; records: number; sessions: number }
  >();
  const modelAccumulator = new Map<
    string,
    {
      provider: UsageProviderKind;
      instanceId: ProviderInstanceId;
      model: string;
      costUsd: number;
      totalTokens: number;
      records: number;
    }
  >();
  const dailyAccumulator = new Map<
    string,
    {
      costUsd: number;
      totalTokens: number;
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
      byInstance: Map<ProviderInstanceId, { costUsd: number; totalTokens: number }>;
    }
  >();
  const contributingEnvironments: EnvironmentId[] = [];

  const orderedEnvironments = [...current].sort((a, b) =>
    a.environmentId.localeCompare(b.environmentId),
  );

  for (const environment of orderedEnvironments) {
    const { buckets, sources, sessionsByInstance } = ownedContribution(
      environment,
      ownerByFingerprint,
    );
    if (buckets.length > 0) contributingEnvironments.push(environment.environmentId);

    for (const source of sources) {
      if (identities.has(source.instanceId)) continue;
      identities.set(source.instanceId, {
        provider: source.fingerprint.provider,
        displayName: source.displayName,
        accentColor: source.accentColor,
      });
    }

    for (const [instanceId, instanceSessions] of sessionsByInstance) {
      sessions += instanceSessions;
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

      const instance = instanceAccumulator.get(bucket.instanceId) ?? {
        costUsd: 0,
        totalTokens: 0,
        records: 0,
        sessions: 0,
      };
      instance.costUsd += bucket.costUsd;
      instance.totalTokens += tokens;
      instance.records += bucket.records;
      instanceAccumulator.set(bucket.instanceId, instance);

      const modelKey = `${bucket.instanceId} ${bucket.model}`;
      const model = modelAccumulator.get(modelKey) ?? {
        provider: bucket.provider,
        instanceId: bucket.instanceId,
        model: bucket.model,
        costUsd: 0,
        totalTokens: 0,
        records: 0,
      };
      model.costUsd += bucket.costUsd;
      model.totalTokens += tokens;
      model.records += bucket.records;
      modelAccumulator.set(modelKey, model);

      const day = dailyAccumulator.get(bucket.day) ?? {
        costUsd: 0,
        totalTokens: 0,
        byInstance: new Map<ProviderInstanceId, { costUsd: number; totalTokens: number }>(),
      };
      day.costUsd += bucket.costUsd;
      day.totalTokens += tokens;
      const dayInstance = day.byInstance.get(bucket.instanceId) ?? { costUsd: 0, totalTokens: 0 };
      dayInstance.costUsd += bucket.costUsd;
      dayInstance.totalTokens += tokens;
      day.byInstance.set(bucket.instanceId, dayInstance);
      dailyAccumulator.set(bucket.day, day);

      if (bucket.hourStart !== undefined) {
        const hour = hourlyAccumulator.get(bucket.hourStart) ?? {
          day: bucket.day,
          hourStart: bucket.hourStart,
          costUsd: 0,
          totalTokens: 0,
          byInstance: new Map<ProviderInstanceId, { costUsd: number; totalTokens: number }>(),
        };
        hour.costUsd += bucket.costUsd;
        hour.totalTokens += tokens;
        const hourInstance = hour.byInstance.get(bucket.instanceId) ?? {
          costUsd: 0,
          totalTokens: 0,
        };
        hourInstance.costUsd += bucket.costUsd;
        hourInstance.totalTokens += tokens;
        hour.byInstance.set(bucket.instanceId, hourInstance);
        hourlyAccumulator.set(bucket.hourStart, hour);
      }
    }
  }

  const totalTokens = uncachedInputTokens + cachedInputTokens + cacheCreationTokens + outputTokens;

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
      // A bucket always names a source in the same summary, so a missing
      // identity means a malformed payload rather than an instance to invent.
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
      costShare: costUsd === 0 ? 0 : totals.costUsd / costUsd,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || b.totalTokens - a.totalTokens);

  const daily: DailyTotals[] = [...dailyAccumulator.entries()]
    .map(([day, totals]) => ({
      day,
      costUsd: totals.costUsd,
      totalTokens: totals.totalTokens,
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
    staleEnvironments,
  };
}
