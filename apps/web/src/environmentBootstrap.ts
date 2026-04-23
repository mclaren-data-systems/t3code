import {
  createKnownEnvironmentFromWsUrl,
  getKnownEnvironmentBaseUrl,
  type KnownEnvironment,
} from "@t3tools/client-runtime";
import type { DesktopEnvironmentBootstrap } from "@t3tools/contracts";

function createKnownEnvironmentFromDesktopBootstrap(
  bootstrap: DesktopEnvironmentBootstrap | null | undefined,
): KnownEnvironment | null {
  if (!bootstrap?.wsBaseUrl) {
    return null;
  }

  return createKnownEnvironmentFromWsUrl({
    id: `desktop:${bootstrap.label}`,
    label: bootstrap.label,
    source: "desktop-managed",
    wsUrl: bootstrap.wsBaseUrl,
  });
}

export function getPrimaryKnownEnvironment(): KnownEnvironment | null {
  const desktopEnvironment = createKnownEnvironmentFromDesktopBootstrap(
    window.desktopBridge?.getLocalEnvironmentBootstrap(),
  );
  if (desktopEnvironment) {
    return desktopEnvironment;
  }

  const configuredWsUrl = import.meta.env.VITE_WS_URL;
  if (typeof configuredWsUrl === "string" && configuredWsUrl.length > 0) {
    return createKnownEnvironmentFromWsUrl({
      id: "configured-primary",
      label: "Primary environment",
      source: "configured",
      wsUrl: configuredWsUrl,
    });
  }

  return createKnownEnvironmentFromWsUrl({
    id: "window-origin",
    label: "Primary environment",
    source: "window-origin",
    wsUrl: window.location.origin,
  });
}

export function resolvePrimaryEnvironmentBootstrapUrl(): string {
  const baseUrl = getKnownEnvironmentBaseUrl(getPrimaryKnownEnvironment());
  if (!baseUrl) {
    throw new Error("Unable to resolve a known environment bootstrap URL.");
  }
  return baseUrl;
}
