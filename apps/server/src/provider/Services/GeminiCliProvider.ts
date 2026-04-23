import { Context } from "effect";

import type { ServerProviderShape } from "./ServerProvider.ts";

export interface GeminiCliProviderShape extends ServerProviderShape {}

export class GeminiCliProvider extends Context.Service<GeminiCliProvider, GeminiCliProviderShape>()(
  "t3/provider/Services/GeminiCliProvider",
) {}
