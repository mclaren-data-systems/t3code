/**
 * CopilotAdapter — Service tag + shape type for the GitHub Copilot adapter.
 *
 * The driver model ({@link ../Drivers/CopilotDriver}) bundles one adapter
 * per instance as a captured closure, so production code no longer reads
 * adapters through this Service tag. The tag is retained for back-compat
 * with the conformance suite and any legacy boot graph that still resolves
 * a single Copilot adapter via the Effect Context.
 *
 * Wrap a per-instance adapter into this tag with the `makeCopilotAdapterLive`
 * Layer in `Layers/CopilotAdapter.ts`.
 *
 * @module CopilotAdapter
 */
import * as Context from "effect/Context";

import type { ProviderAdapterError } from "../Errors.ts";
import type { ProviderAdapterShape } from "./ProviderAdapter.ts";

/**
 * CopilotAdapterShape — per-instance Copilot adapter contract. Carries
 * a branded driver kind (`ProviderDriverKind`) as the nominal discriminant
 * inherited from `ProviderAdapterShape`.
 */
export interface CopilotAdapterShape extends ProviderAdapterShape<ProviderAdapterError> {}

export class CopilotAdapter extends Context.Service<CopilotAdapter, CopilotAdapterShape>()(
  "t3/provider/Services/CopilotAdapter",
) {}
