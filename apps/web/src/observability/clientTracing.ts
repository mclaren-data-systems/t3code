/**
 * Stub for client-side tracing.
 *
 * The real implementation is introduced by upstream PR #1739 (OTLP trace proxy,
 * commit 04a1ae77) which will land via PR #48. Until that merge, this no-op
 * shim keeps wsTransport compiling standalone.
 */
import { Layer } from "effect";

/**
 * Initialise client-side tracing. No-op until the full OTLP implementation
 * lands.
 */
export function configureClientTracing(): Promise<void> {
  return Promise.resolve();
}

/**
 * A passthrough Effect layer — provides nothing, requires nothing.
 * The real `ClientTracingLive` will supply an OTLP exporter layer.
 */
export const ClientTracingLive = Layer.empty;

/**
 * Reset helper used by tests to tear down tracing state between runs.
 * No-op while the stub is in place.
 */
export function __resetClientTracingForTests(): Promise<void> {
  return Promise.resolve();
}
