import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, PlusIcon, RotateCcwIcon, Undo2Icon, XIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_GIT_TEXT_GENERATION_MODEL_BY_PROVIDER,
  type DesktopUpdateState,
  type ProviderKind,
} from "@t3tools/contracts";
import { getModelOptions, normalizeModelSlug } from "@t3tools/shared/model";

import {
  APP_PROVIDER_LOGO_APPEARANCE_OPTIONS,
  getAppModelOptions,
  getCustomModelsForProvider,
  MAX_CUSTOM_MODEL_LENGTH,
  MODEL_PROVIDER_SETTINGS,
  patchCustomModels,
  patchGitTextGenerationModelOverrides,
  useAppSettings,
} from "../appSettings";
import { ACCENT_COLOR_PRESETS, DEFAULT_ACCENT_COLOR, normalizeAccentColor } from "../accentColor";
import { APP_VERSION } from "../branding";
import { Button } from "../components/ui/button";
import { Collapsible, CollapsibleContent } from "../components/ui/collapsible";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { SidebarTrigger } from "../components/ui/sidebar";
import { Switch } from "../components/ui/switch";
import { SidebarInset } from "../components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../components/ui/tooltip";
import { resolveAndPersistPreferredEditor } from "../editorPreferences";
import { isElectron } from "../env";
import { useTheme } from "../hooks/useTheme";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";
import { cn } from "../lib/utils";
import { ensureNativeApi, readNativeApi } from "../nativeApi";

const THEME_OPTIONS = [
  {
    value: "system",
    label: "System",
    description: "Match your OS appearance setting.",
  },
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme.",
  },
] as const;

const TIMESTAMP_FORMAT_LABELS = {
  locale: "System default",
  "12-hour": "12-hour",
  "24-hour": "24-hour",
} as const;
const GIT_TEXT_GENERATION_INHERIT_VALUE = "__inherit__";

// ---------------------------------------------------------------------------
// Log syntax highlighting
// ---------------------------------------------------------------------------

const LOG_TOKEN_PATTERN =
  /(?<key>timestamp|level|fiber|message|cause|span\.\w+)=(?<value>"(?:[^"\\]|\\.)*"|[^\s]+)/g;

const LOG_LEVEL_COLORS: Record<string, string> = {
  Info: "text-blue-400",
  Warning: "text-amber-400",
  Error: "text-red-400",
  Debug: "text-zinc-500",
  Fatal: "text-red-500 font-semibold",
};

function highlightLogLine(line: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(LOG_TOKEN_PATTERN)) {
    const start = match.index;
    if (start > lastIndex) {
      parts.push(line.slice(lastIndex, start));
    }

    const key = match.groups?.key ?? "";
    const value = match.groups?.value ?? "";

    if (key === "timestamp") {
      parts.push(
        <span key={start} className="text-zinc-500">
          {key}={value}
        </span>,
      );
    } else if (key === "level") {
      const levelClass = LOG_LEVEL_COLORS[value] ?? "text-muted-foreground";
      parts.push(
        <span key={start} className={levelClass}>
          {key}={value}
        </span>,
      );
    } else if (key === "fiber") {
      parts.push(
        <span key={start} className="text-violet-400/70">
          {key}={value}
        </span>,
      );
    } else if (key === "message" || key === "cause") {
      parts.push(
        <span key={start}>
          <span className="text-zinc-500">{key}=</span>
          <span className="text-foreground">{value}</span>
        </span>,
      );
    } else {
      parts.push(
        <span key={start} className="text-zinc-500">
          {key}={value}
        </span>,
      );
    }

    lastIndex = start + match[0].length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length > 0 ? parts : line;
}

function HighlightedLogContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, lineIndex) => (
        // eslint-disable-next-line react/no-array-index-key -- static log lines never reorder
        <span key={lineIndex}>
          {highlightLogLine(line)}
          {lineIndex < lines.length - 1 ? "\n" : null}
        </span>
      ))}
    </>
  );
}

type InstallBinarySettingsKey = "claudeBinaryPath" | "codexBinaryPath";
type InstallProviderSettings = {
  provider: ProviderKind;
  title: string;
  binaryPathKey: InstallBinarySettingsKey;
  binaryPlaceholder: string;
  binaryDescription: ReactNode;
  homePathKey?: "codexHomePath";
  homePlaceholder?: string;
  homeDescription?: ReactNode;
};

const INSTALL_PROVIDER_SETTINGS: readonly InstallProviderSettings[] = [
  {
    provider: "codex",
    title: "Codex",
    binaryPathKey: "codexBinaryPath",
    binaryPlaceholder: "Codex binary path",
    binaryDescription: (
      <>
        Leave blank to use <code>codex</code> from your PATH.
      </>
    ),
    homePathKey: "codexHomePath",
    homePlaceholder: "CODEX_HOME",
    homeDescription: "Optional custom Codex home and config directory.",
  },
  {
    provider: "claudeAgent",
    title: "Claude",
    binaryPathKey: "claudeBinaryPath",
    binaryPlaceholder: "Claude binary path",
    binaryDescription: (
      <>
        Leave blank to use <code>claude</code> from your PATH.
      </>
    ),
  },
];

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="relative overflow-hidden rounded-2xl border bg-card not-dark:bg-clip-padding text-card-foreground shadow-xs/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  title,
  description,
  status,
  resetAction,
  control,
  children,
  onClick,
}: {
  title: string;
  description: string;
  status?: ReactNode;
  resetAction?: ReactNode;
  control?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className="border-t border-border px-4 py-4 first:border-t-0 sm:px-5"
      data-slot="settings-row"
    >
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          onClick && "cursor-pointer",
        )}
        onClick={onClick}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-h-5 items-center gap-1.5">
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
              {resetAction}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
          {status ? <div className="pt-1 text-[11px] text-muted-foreground">{status}</div> : null}
        </div>
        {control ? (
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:justify-end">
            {control}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SettingResetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Reset ${label} to default`}
            className="size-5 rounded-sm p-0 text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            <Undo2Icon className="size-3" />
          </Button>
        }
      />
      <TooltipPopup side="top">Reset to default</TooltipPopup>
    </Tooltip>
  );
}

function SettingsRouteView() {
  const { theme, setTheme } = useTheme();
  const { settings, defaults, updateSettings, resetSettings } = useAppSettings();
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const [isOpeningKeybindings, setIsOpeningKeybindings] = useState(false);
  const [openKeybindingsError, setOpenKeybindingsError] = useState<string | null>(null);
  const [openInstallProviders, setOpenInstallProviders] = useState<Record<ProviderKind, boolean>>({
    codex: Boolean(settings.codexBinaryPath || settings.codexHomePath),
    copilot: false,
    claudeAgent: Boolean(settings.claudeBinaryPath),
    cursor: false,
    opencode: false,
    geminiCli: false,
    amp: false,
    kilo: false,
  });
  const [selectedCustomModelProvider, setSelectedCustomModelProvider] =
    useState<ProviderKind>("codex");
  const [customModelInputByProvider, setCustomModelInputByProvider] = useState<
    Record<ProviderKind, string>
  >({
    codex: "",
    copilot: "",
    claudeAgent: "",
    cursor: "",
    opencode: "",
    geminiCli: "",
    amp: "",
    kilo: "",
  });
  const [customModelErrorByProvider, setCustomModelErrorByProvider] = useState<
    Partial<Record<ProviderKind, string | null>>
  >({});
  const [showAllCustomModels, setShowAllCustomModels] = useState(false);

  const [updateState, setUpdateState] = useState<DesktopUpdateState | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const [logDir, setLogDir] = useState<string | null>(null);
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedLogFile, setSelectedLogFile] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>("");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const logViewerRef = useRef<HTMLPreElement>(null);

  const loadLogFile = useCallback(async (filename: string) => {
    setIsLoadingLogs(true);
    try {
      const api = ensureNativeApi();
      const result = await api.logs.read(filename);
      setLogContent(result.content);
      requestAnimationFrame(() => {
        if (logViewerRef.current) {
          logViewerRef.current.scrollTop = logViewerRef.current.scrollHeight;
        }
      });
    } catch {
      setLogContent("Failed to read log file.");
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  const hasDesktopBridge = isElectron && !!window.desktopBridge;

  useEffect(() => {
    if (!hasDesktopBridge) return;
    const bridge = window.desktopBridge!;
    void bridge
      .getUpdateState()
      .then(setUpdateState)
      .catch(() => {});
    const unsubscribe = bridge.onUpdateState(setUpdateState);
    return unsubscribe;
  }, [hasDesktopBridge]);

  useEffect(() => {
    const api = ensureNativeApi();
    void api.logs
      .getDir()
      .then((result) => setLogDir(result.dir))
      .catch(() => {});
  }, []);

  const handleCheckForUpdate = useCallback(async () => {
    if (!hasDesktopBridge) return;
    setIsCheckingUpdate(true);
    try {
      const state = await window.desktopBridge!.checkForUpdate();
      setUpdateState(state);
    } catch {
      setUpdateState((prev) =>
        prev
          ? {
              ...prev,
              status: "error",
              message: "Failed to check for updates.",
              errorContext: "check",
            }
          : prev,
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [hasDesktopBridge]);

  const handleDownloadUpdate = useCallback(async () => {
    if (!hasDesktopBridge) return;
    try {
      const result = await window.desktopBridge!.downloadUpdate();
      setUpdateState(result.state);
    } catch (error) {
      setUpdateState((prev) =>
        prev
          ? {
              ...prev,
              status: "error",
              message: error instanceof Error ? error.message : "Failed to download update.",
              errorContext: "download",
            }
          : prev,
      );
    }
  }, [hasDesktopBridge]);

  const handleInstallUpdate = useCallback(async () => {
    if (!hasDesktopBridge) return;
    try {
      const result = await window.desktopBridge!.installUpdate();
      setUpdateState(result.state);
    } catch (error) {
      setUpdateState((prev) =>
        prev
          ? {
              ...prev,
              status: "error",
              message: error instanceof Error ? error.message : "Failed to install update.",
              errorContext: "install",
            }
          : prev,
      );
    }
  }, [hasDesktopBridge]);

  const codexBinaryPath = settings.codexBinaryPath;
  const codexHomePath = settings.codexHomePath;
  const accentColor = settings.accentColor;
  const [presetNameInput, setPresetNameInput] = useState<string | null>(null);
  const presetNameRef = useRef<HTMLInputElement>(null);
  const claudeBinaryPath = settings.claudeBinaryPath;
  const keybindingsConfigPath = serverConfigQuery.data?.keybindingsConfigPath ?? null;
  const availableEditors = serverConfigQuery.data?.availableEditors;

  const selectedCustomModelProviderSettings = MODEL_PROVIDER_SETTINGS.find(
    (providerSettings) => providerSettings.provider === selectedCustomModelProvider,
  )!;
  const selectedCustomModelInput = customModelInputByProvider[selectedCustomModelProvider];
  const selectedCustomModelError = customModelErrorByProvider[selectedCustomModelProvider] ?? null;
  const savedCustomModelRows = MODEL_PROVIDER_SETTINGS.flatMap((providerSettings) =>
    getCustomModelsForProvider(settings, providerSettings.provider).map((slug) => ({
      key: `${providerSettings.provider}:${slug}`,
      provider: providerSettings.provider,
      providerTitle: providerSettings.title,
      slug,
    })),
  );
  const totalCustomModels = savedCustomModelRows.length;
  const visibleCustomModelRows = showAllCustomModels
    ? savedCustomModelRows
    : savedCustomModelRows.slice(0, 5);
  const isInstallSettingsDirty =
    settings.claudeBinaryPath !== defaults.claudeBinaryPath ||
    settings.codexBinaryPath !== defaults.codexBinaryPath ||
    settings.codexHomePath !== defaults.codexHomePath;
  const changedSettingLabels = [
    ...(theme !== "system" ? ["Theme"] : []),
    ...(settings.timestampFormat !== defaults.timestampFormat ? ["Time format"] : []),
    ...(settings.diffWordWrap !== defaults.diffWordWrap ? ["Diff line wrapping"] : []),
    ...(settings.enableAssistantStreaming !== defaults.enableAssistantStreaming
      ? ["Assistant output"]
      : []),
    ...(settings.defaultThreadEnvMode !== defaults.defaultThreadEnvMode ? ["New thread mode"] : []),
    ...(settings.confirmThreadDelete !== defaults.confirmThreadDelete
      ? ["Delete confirmation"]
      : []),
    ...(totalCustomModels > 0 ? ["Custom models"] : []),
    ...(isInstallSettingsDirty ? ["Provider installs"] : []),
  ];

  const openKeybindingsFile = useCallback(() => {
    if (!keybindingsConfigPath) return;
    setOpenKeybindingsError(null);
    setIsOpeningKeybindings(true);
    const api = ensureNativeApi();
    const editor = resolveAndPersistPreferredEditor(availableEditors ?? []);
    if (!editor) {
      setOpenKeybindingsError("No available editors found.");
      setIsOpeningKeybindings(false);
      return;
    }
    void api.shell
      .openInEditor(keybindingsConfigPath, editor)
      .catch((error) => {
        setOpenKeybindingsError(
          error instanceof Error ? error.message : "Unable to open keybindings file.",
        );
      })
      .finally(() => {
        setIsOpeningKeybindings(false);
      });
  }, [availableEditors, keybindingsConfigPath]);

  const addCustomModel = useCallback(
    (provider: ProviderKind) => {
      const customModelInput = customModelInputByProvider[provider];
      const customModels = getCustomModelsForProvider(settings, provider);
      const normalized = normalizeModelSlug(customModelInput, provider);
      if (!normalized) {
        setCustomModelErrorByProvider((existing) => ({
          ...existing,
          [provider]: "Enter a model slug.",
        }));
        return;
      }
      if (getModelOptions(provider).some((option) => option.slug === normalized)) {
        setCustomModelErrorByProvider((existing) => ({
          ...existing,
          [provider]: "That model is already built in.",
        }));
        return;
      }
      if (normalized.length > MAX_CUSTOM_MODEL_LENGTH) {
        setCustomModelErrorByProvider((existing) => ({
          ...existing,
          [provider]: `Model slugs must be ${MAX_CUSTOM_MODEL_LENGTH} characters or less.`,
        }));
        return;
      }
      if (customModels.includes(normalized)) {
        setCustomModelErrorByProvider((existing) => ({
          ...existing,
          [provider]: "That custom model is already saved.",
        }));
        return;
      }

      updateSettings(patchCustomModels(provider, [...customModels, normalized]));
      setCustomModelInputByProvider((existing) => ({
        ...existing,
        [provider]: "",
      }));
      setCustomModelErrorByProvider((existing) => ({
        ...existing,
        [provider]: null,
      }));
    },
    [customModelInputByProvider, settings, updateSettings],
  );

  const removeCustomModel = useCallback(
    (provider: ProviderKind, slug: string) => {
      const customModels = getCustomModelsForProvider(settings, provider);
      updateSettings(
        patchCustomModels(
          provider,
          customModels.filter((model) => model !== slug),
        ),
      );
      setCustomModelErrorByProvider((existing) => ({
        ...existing,
        [provider]: null,
      }));
    },
    [settings, updateSettings],
  );

  async function restoreDefaults() {
    if (changedSettingLabels.length === 0) return;

    const api = readNativeApi();
    const confirmed = await (api ?? ensureNativeApi()).dialogs.confirm(
      ["Restore default settings?", `This will reset: ${changedSettingLabels.join(", ")}.`].join(
        "\n",
      ),
    );
    if (!confirmed) return;

    setTheme("system");
    resetSettings();
    setOpenInstallProviders({
      codex: false,
      copilot: false,
      claudeAgent: false,
      cursor: false,
      opencode: false,
      geminiCli: false,
      amp: false,
      kilo: false,
    });
    setSelectedCustomModelProvider("codex");
    setCustomModelInputByProvider({
      codex: "",
      copilot: "",
      claudeAgent: "",
      cursor: "",
      opencode: "",
      geminiCli: "",
      amp: "",
      kilo: "",
    });
    setCustomModelErrorByProvider({});
  }

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground isolate">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
        {!isElectron && (
          <header className="border-b border-border px-3 py-2 sm:px-5">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="size-7 shrink-0 md:hidden" />
              <span className="text-sm font-medium text-foreground">Settings</span>
              <div className="ms-auto flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={changedSettingLabels.length === 0}
                  onClick={() => void restoreDefaults()}
                >
                  <RotateCcwIcon className="size-3.5" />
                  Restore defaults
                </Button>
              </div>
            </div>
          </header>
        )}

        {isElectron && (
          <div className="drag-region flex h-[52px] shrink-0 items-center border-b border-border px-5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground/70">
              Settings
            </span>
            <div className="ms-auto flex items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                disabled={changedSettingLabels.length === 0}
                onClick={() => void restoreDefaults()}
              >
                <RotateCcwIcon className="size-3.5" />
                Restore defaults
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <SettingsSection title="General">
              <SettingsRow
                title="Theme"
                description="Choose how T3 Code looks across the app."
                resetAction={
                  theme !== "system" ? (
                    <SettingResetButton label="theme" onClick={() => setTheme("system")} />
                  ) : null
                }
                control={
                  <Select
                    value={theme}
                    onValueChange={(value) => {
                      if (value !== "system" && value !== "light" && value !== "dark") return;
                      setTheme(value);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40" aria-label="Theme preference">
                      <SelectValue>
                        {THEME_OPTIONS.find((option) => option.value === theme)?.label ?? "System"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPopup align="end" alignItemWithTrigger={false}>
                      {THEME_OPTIONS.map((option) => (
                        <SelectItem hideIndicator key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                }
              />

              <SettingsRow
                title="Time format"
                description="System default follows your browser or OS clock preference."
                resetAction={
                  settings.timestampFormat !== defaults.timestampFormat ? (
                    <SettingResetButton
                      label="time format"
                      onClick={() =>
                        updateSettings({
                          timestampFormat: defaults.timestampFormat,
                        })
                      }
                    />
                  ) : null
                }
                control={
                  <Select
                    value={settings.timestampFormat}
                    onValueChange={(value) => {
                      if (value !== "locale" && value !== "12-hour" && value !== "24-hour") {
                        return;
                      }
                      updateSettings({
                        timestampFormat: value,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40" aria-label="Timestamp format">
                      <SelectValue>{TIMESTAMP_FORMAT_LABELS[settings.timestampFormat]}</SelectValue>
                    </SelectTrigger>
                    <SelectPopup align="end" alignItemWithTrigger={false}>
                      <SelectItem hideIndicator value="locale">
                        {TIMESTAMP_FORMAT_LABELS.locale}
                      </SelectItem>
                      <SelectItem hideIndicator value="12-hour">
                        {TIMESTAMP_FORMAT_LABELS["12-hour"]}
                      </SelectItem>
                      <SelectItem hideIndicator value="24-hour">
                        {TIMESTAMP_FORMAT_LABELS["24-hour"]}
                      </SelectItem>
                    </SelectPopup>
                  </Select>
                }
              />

              <SettingsRow
                title="Diff line wrapping"
                description="Set the default wrap state when the diff panel opens. The in-panel wrap toggle only affects the current diff session."
                resetAction={
                  settings.diffWordWrap !== defaults.diffWordWrap ? (
                    <SettingResetButton
                      label="diff line wrapping"
                      onClick={() =>
                        updateSettings({
                          diffWordWrap: defaults.diffWordWrap,
                        })
                      }
                    />
                  ) : null
                }
                control={
                  <Switch
                    checked={settings.diffWordWrap}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        diffWordWrap: Boolean(checked),
                      })
                    }
                    aria-label="Wrap diff lines by default"
                  />
                }
              />

              <SettingsRow
                title="Assistant output"
                description="Show token-by-token output while a response is in progress."
                resetAction={
                  settings.enableAssistantStreaming !== defaults.enableAssistantStreaming ? (
                    <SettingResetButton
                      label="assistant output"
                      onClick={() =>
                        updateSettings({
                          enableAssistantStreaming: defaults.enableAssistantStreaming,
                        })
                      }
                    />
                  ) : null
                }
                control={
                  <Switch
                    checked={settings.enableAssistantStreaming}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        enableAssistantStreaming: Boolean(checked),
                      })
                    }
                    aria-label="Stream assistant messages"
                  />
                }
              />

              <SettingsRow
                title="New threads"
                description="Pick the default workspace mode for newly created draft threads."
                resetAction={
                  settings.defaultThreadEnvMode !== defaults.defaultThreadEnvMode ? (
                    <SettingResetButton
                      label="new threads"
                      onClick={() =>
                        updateSettings({
                          defaultThreadEnvMode: defaults.defaultThreadEnvMode,
                        })
                      }
                    />
                  ) : null
                }
                control={
                  <Select
                    value={settings.defaultThreadEnvMode}
                    onValueChange={(value) => {
                      if (value !== "local" && value !== "worktree") return;
                      updateSettings({
                        defaultThreadEnvMode: value,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-44" aria-label="Default thread mode">
                      <SelectValue>
                        {settings.defaultThreadEnvMode === "worktree" ? "New worktree" : "Local"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPopup align="end" alignItemWithTrigger={false}>
                      <SelectItem hideIndicator value="local">
                        Local
                      </SelectItem>
                      <SelectItem hideIndicator value="worktree">
                        New worktree
                      </SelectItem>
                    </SelectPopup>
                  </Select>
                }
              />

              <SettingsRow
                title="Delete confirmation"
                description="Ask before deleting a thread and its chat history."
                resetAction={
                  settings.confirmThreadDelete !== defaults.confirmThreadDelete ? (
                    <SettingResetButton
                      label="delete confirmation"
                      onClick={() =>
                        updateSettings({
                          confirmThreadDelete: defaults.confirmThreadDelete,
                        })
                      }
                    />
                  ) : null
                }
                control={
                  <Switch
                    checked={settings.confirmThreadDelete}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        confirmThreadDelete: Boolean(checked),
                      })
                    }
                    aria-label="Confirm thread deletion"
                  />
                }
              />
            </SettingsSection>

            <SettingsSection title="Appearance">
              <SettingsRow
                title="Accent color"
                description="Applies to primary actions, focus rings, info highlights, and terminal blue."
                resetAction={
                  accentColor !== DEFAULT_ACCENT_COLOR ? (
                    <SettingResetButton
                      label="accent color"
                      onClick={() => updateSettings({ accentColor: DEFAULT_ACCENT_COLOR })}
                    />
                  ) : null
                }
              >
                <div className="mt-4 border-t border-border pt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLOR_PRESETS.map((preset) => {
                      const selected = accentColor === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs transition-colors ${
                            selected
                              ? "border-primary/60 bg-primary/8 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                          onClick={() => updateSettings({ accentColor: preset.value })}
                        >
                          <span
                            aria-hidden="true"
                            className="size-3 rounded-full border border-black/20"
                            style={{ backgroundColor: preset.value }}
                          />
                          {preset.label}
                        </button>
                      );
                    })}
                    {settings.customAccentPresets.map((preset) => {
                      const selected = accentColor === preset.value;
                      return (
                        <div
                          key={`custom:${preset.value}:${preset.label}`}
                          className={`group inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs transition-colors ${
                            selected
                              ? "border-primary/60 bg-primary/8 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-2"
                            onClick={() => updateSettings({ accentColor: preset.value })}
                          >
                            <span
                              aria-hidden="true"
                              className="size-3 rounded-full border border-black/20"
                              style={{ backgroundColor: preset.value }}
                            />
                            {preset.label}
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${preset.label} preset`}
                            className="ml-0.5 hidden text-muted-foreground/50 hover:text-foreground group-hover:inline"
                            onClick={() => {
                              updateSettings({
                                customAccentPresets: settings.customAccentPresets.filter(
                                  (p) => p.value !== preset.value || p.label !== preset.label,
                                ),
                              });
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    <label
                      htmlFor="accent-color-picker"
                      className="text-xs font-medium text-foreground"
                    >
                      Custom
                    </label>
                    <input
                      id="accent-color-picker"
                      type="color"
                      value={accentColor}
                      className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent p-0"
                      onChange={(event) =>
                        updateSettings({ accentColor: normalizeAccentColor(event.target.value) })
                      }
                    />
                    <code className="text-xs text-muted-foreground">{accentColor}</code>
                    <span className="flex-1" />
                    {presetNameInput === null ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          const allPresets = [
                            ...ACCENT_COLOR_PRESETS,
                            ...settings.customAccentPresets,
                          ];
                          if (allPresets.some((p) => p.value === accentColor)) return;
                          setPresetNameInput("");
                          requestAnimationFrame(() => presetNameRef.current?.focus());
                        }}
                      >
                        Save as Preset
                      </Button>
                    ) : (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const name = presetNameInput.trim();
                          if (!name) return;
                          if (
                            settings.customAccentPresets.some(
                              (p) => p.label.toLowerCase() === name.toLowerCase(),
                            )
                          )
                            return;
                          updateSettings({
                            customAccentPresets: [
                              ...settings.customAccentPresets,
                              { label: name, value: accentColor },
                            ],
                          });
                          setPresetNameInput(null);
                        }}
                      >
                        <Input
                          ref={presetNameRef}
                          className="h-7 w-32 py-0 text-xs leading-7"
                          placeholder="Preset name"
                          value={presetNameInput}
                          onChange={(e) => setPresetNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setPresetNameInput(null);
                          }}
                          onBlur={() => {
                            if (!presetNameInput.trim()) setPresetNameInput(null);
                          }}
                        />
                        <Button size="xs" type="submit" disabled={!presetNameInput.trim()}>
                          Save
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </SettingsRow>

              <SettingsRow
                title="Provider logo appearance"
                description={
                  APP_PROVIDER_LOGO_APPEARANCE_OPTIONS.find(
                    (option) => option.value === settings.providerLogoAppearance,
                  )?.description ?? "Use each provider's native logo colors."
                }
                resetAction={
                  settings.providerLogoAppearance !== defaults.providerLogoAppearance ? (
                    <SettingResetButton
                      label="provider logo appearance"
                      onClick={() =>
                        updateSettings({
                          providerLogoAppearance: defaults.providerLogoAppearance,
                        })
                      }
                    />
                  ) : null
                }
                control={
                  <Select
                    items={APP_PROVIDER_LOGO_APPEARANCE_OPTIONS.map((option) => ({
                      label: option.label,
                      value: option.value,
                    }))}
                    value={settings.providerLogoAppearance}
                    onValueChange={(value) => {
                      if (!value) return;
                      updateSettings({ providerLogoAppearance: value });
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup align="end" alignItemWithTrigger={false}>
                      {APP_PROVIDER_LOGO_APPEARANCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                }
              />
            </SettingsSection>

            <SettingsSection title="Git">
              {MODEL_PROVIDER_SETTINGS.map((providerSettings) => {
                const provider = providerSettings.provider;
                const customModels = getCustomModelsForProvider(settings, provider);
                const overrideModel = settings.gitTextGenerationModelByProvider[provider] ?? null;
                const modelOptions = getAppModelOptions(provider, customModels, overrideModel);
                const providerFallbackModel =
                  DEFAULT_GIT_TEXT_GENERATION_MODEL_BY_PROVIDER[provider];
                const providerFallbackLabel =
                  modelOptions.find((option) => option.slug === providerFallbackModel)?.name ??
                  providerFallbackModel;
                return (
                  <SettingsRow
                    key={`git-${provider}`}
                    title={`${providerSettings.title} git model`}
                    description={`Leave unset to use the active thread model, then ${providerFallbackLabel}.`}
                    control={
                      <Select
                        value={overrideModel ?? GIT_TEXT_GENERATION_INHERIT_VALUE}
                        onValueChange={(value) =>
                          updateSettings(
                            patchGitTextGenerationModelOverrides(
                              settings.gitTextGenerationModelByProvider,
                              provider,
                              value === GIT_TEXT_GENERATION_INHERIT_VALUE ? null : value,
                            ),
                          )
                        }
                      >
                        <SelectTrigger
                          className="w-full sm:w-52"
                          aria-label={`${providerSettings.title} git text generation model`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup align="end">
                          <SelectItem value={GIT_TEXT_GENERATION_INHERIT_VALUE}>
                            Use active thread model
                          </SelectItem>
                          {modelOptions.map((option) => (
                            <SelectItem key={`${provider}-${option.slug}`} value={option.slug}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    }
                  />
                );
              })}
            </SettingsSection>

            <SettingsSection title="Models">
              <SettingsRow
                title="Custom models"
                description="Add custom model slugs for supported providers."
                resetAction={
                  totalCustomModels > 0 ? (
                    <SettingResetButton
                      label="custom models"
                      onClick={() => {
                        updateSettings({
                          customCodexModels: defaults.customCodexModels,
                          customClaudeModels: defaults.customClaudeModels,
                          customCopilotModels: defaults.customCopilotModels,
                          customCursorModels: defaults.customCursorModels,
                          customOpencodeModels: defaults.customOpencodeModels,
                          customGeminiCliModels: defaults.customGeminiCliModels,
                          customAmpModels: defaults.customAmpModels,
                          customKiloModels: defaults.customKiloModels,
                        });
                        setCustomModelErrorByProvider({});
                        setShowAllCustomModels(false);
                      }}
                    />
                  ) : null
                }
              >
                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select
                      value={selectedCustomModelProvider}
                      onValueChange={(value) => {
                        setSelectedCustomModelProvider(value as ProviderKind);
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full sm:w-40"
                        aria-label="Custom model provider"
                      >
                        <SelectValue>{selectedCustomModelProviderSettings.title}</SelectValue>
                      </SelectTrigger>
                      <SelectPopup align="start" alignItemWithTrigger={false}>
                        {MODEL_PROVIDER_SETTINGS.map((providerSettings) => (
                          <SelectItem
                            hideIndicator
                            className="min-h-7 text-sm"
                            key={providerSettings.provider}
                            value={providerSettings.provider}
                          >
                            {providerSettings.title}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                    <Input
                      id="custom-model-slug"
                      value={selectedCustomModelInput}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCustomModelInputByProvider((existing) => ({
                          ...existing,
                          [selectedCustomModelProvider]: value,
                        }));
                        if (selectedCustomModelError) {
                          setCustomModelErrorByProvider((existing) => ({
                            ...existing,
                            [selectedCustomModelProvider]: null,
                          }));
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        addCustomModel(selectedCustomModelProvider);
                      }}
                      placeholder={selectedCustomModelProviderSettings.example}
                      spellCheck={false}
                    />
                    <Button
                      className="shrink-0"
                      variant="outline"
                      onClick={() => addCustomModel(selectedCustomModelProvider)}
                    >
                      <PlusIcon className="size-3.5" />
                      Add
                    </Button>
                  </div>

                  {selectedCustomModelError ? (
                    <p className="mt-2 text-xs text-destructive">{selectedCustomModelError}</p>
                  ) : null}

                  {totalCustomModels > 0 ? (
                    <div className="mt-3">
                      <div>
                        {visibleCustomModelRows.map((row) => (
                          <div
                            key={row.key}
                            className="group grid grid-cols-[minmax(5rem,6rem)_minmax(0,1fr)_auto] items-center gap-3 border-t border-border/60 px-4 py-2 first:border-t-0"
                          >
                            <span className="truncate text-xs text-muted-foreground">
                              {row.providerTitle}
                            </span>
                            <code className="min-w-0 truncate text-sm text-foreground">
                              {row.slug}
                            </code>
                            <button
                              type="button"
                              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                              aria-label={`Remove ${row.slug}`}
                              onClick={() => removeCustomModel(row.provider, row.slug)}
                            >
                              <XIcon className="size-3.5 text-muted-foreground hover:text-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {savedCustomModelRows.length > 5 ? (
                        <button
                          type="button"
                          className="mt-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => setShowAllCustomModels((value) => !value)}
                        >
                          {showAllCustomModels
                            ? "Show less"
                            : `Show more (${savedCustomModelRows.length - 5})`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </SettingsRow>
            </SettingsSection>

            <SettingsSection title="Advanced">
              <SettingsRow
                title="Provider installs"
                description="Override the CLI used for new sessions."
                resetAction={
                  isInstallSettingsDirty ? (
                    <SettingResetButton
                      label="provider installs"
                      onClick={() => {
                        updateSettings({
                          claudeBinaryPath: defaults.claudeBinaryPath,
                          codexBinaryPath: defaults.codexBinaryPath,
                          codexHomePath: defaults.codexHomePath,
                        });
                        setOpenInstallProviders({
                          codex: false,
                          copilot: false,
                          claudeAgent: false,
                          cursor: false,
                          opencode: false,
                          geminiCli: false,
                          amp: false,
                          kilo: false,
                        });
                      }}
                    />
                  ) : null
                }
              >
                <div className="mt-4">
                  <div className="space-y-2">
                    {INSTALL_PROVIDER_SETTINGS.map((providerSettings) => {
                      const isOpen = openInstallProviders[providerSettings.provider];
                      const isDirty =
                        providerSettings.provider === "codex"
                          ? settings.codexBinaryPath !== defaults.codexBinaryPath ||
                            settings.codexHomePath !== defaults.codexHomePath
                          : settings.claudeBinaryPath !== defaults.claudeBinaryPath;
                      const binaryPathValue =
                        providerSettings.binaryPathKey === "claudeBinaryPath"
                          ? claudeBinaryPath
                          : codexBinaryPath;

                      return (
                        <Collapsible
                          key={providerSettings.provider}
                          open={isOpen}
                          onOpenChange={(open) =>
                            setOpenInstallProviders((existing) => ({
                              ...existing,
                              [providerSettings.provider]: open,
                            }))
                          }
                        >
                          <div className="overflow-hidden rounded-xl border border-border/70">
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-4 py-3 text-left"
                              onClick={() =>
                                setOpenInstallProviders((existing) => ({
                                  ...existing,
                                  [providerSettings.provider]: !existing[providerSettings.provider],
                                }))
                              }
                            >
                              <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                                {providerSettings.title}
                              </span>
                              {isDirty ? (
                                <span className="text-[11px] text-muted-foreground">Custom</span>
                              ) : null}
                              <ChevronDownIcon
                                className={cn(
                                  "size-4 shrink-0 text-muted-foreground transition-transform",
                                  isOpen && "rotate-180",
                                )}
                              />
                            </button>

                            <CollapsibleContent>
                              <div className="border-t border-border/70 px-4 py-4">
                                <div className="space-y-3">
                                  <label
                                    htmlFor={`provider-install-${providerSettings.binaryPathKey}`}
                                    className="block"
                                  >
                                    <span className="block text-xs font-medium text-foreground">
                                      {providerSettings.title} binary path
                                    </span>
                                    <Input
                                      id={`provider-install-${providerSettings.binaryPathKey}`}
                                      className="mt-1"
                                      value={binaryPathValue}
                                      onChange={(event) =>
                                        updateSettings(
                                          providerSettings.binaryPathKey === "claudeBinaryPath"
                                            ? { claudeBinaryPath: event.target.value }
                                            : { codexBinaryPath: event.target.value },
                                        )
                                      }
                                      placeholder={providerSettings.binaryPlaceholder}
                                      spellCheck={false}
                                    />
                                    <span className="mt-1 block text-xs text-muted-foreground">
                                      {providerSettings.binaryDescription}
                                    </span>
                                  </label>

                                  {providerSettings.homePathKey ? (
                                    <label
                                      htmlFor={`provider-install-${providerSettings.homePathKey}`}
                                      className="block"
                                    >
                                      <span className="block text-xs font-medium text-foreground">
                                        CODEX_HOME path
                                      </span>
                                      <Input
                                        id={`provider-install-${providerSettings.homePathKey}`}
                                        className="mt-1"
                                        value={codexHomePath}
                                        onChange={(event) =>
                                          updateSettings({
                                            codexHomePath: event.target.value,
                                          })
                                        }
                                        placeholder={providerSettings.homePlaceholder}
                                        spellCheck={false}
                                      />
                                      {providerSettings.homeDescription ? (
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                          {providerSettings.homeDescription}
                                        </span>
                                      ) : null}
                                    </label>
                                  ) : null}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              </SettingsRow>

              <SettingsRow
                title="Keybindings"
                description="Open the persisted `keybindings.json` file to edit advanced bindings directly."
                status={
                  <>
                    <span className="block break-all font-mono text-[11px] text-foreground">
                      {keybindingsConfigPath ?? "Resolving keybindings path..."}
                    </span>
                    {openKeybindingsError ? (
                      <span className="mt-1 block text-destructive">{openKeybindingsError}</span>
                    ) : (
                      <span className="mt-1 block">Opens in your preferred editor.</span>
                    )}
                  </>
                }
                control={
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={!keybindingsConfigPath || isOpeningKeybindings}
                    onClick={openKeybindingsFile}
                  >
                    {isOpeningKeybindings ? "Opening..." : "Open file"}
                  </Button>
                }
              />

              <SettingsRow title="Logs" description="Application log files for debugging.">
                <div className="mt-4 border-t border-border pt-4 space-y-3">
                  {logDir ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                      <code className="min-w-0 truncate text-xs text-muted-foreground select-all">
                        {logDir}
                      </code>
                      {hasDesktopBridge ? (
                        <Button
                          size="xs"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => void window.desktopBridge!.openLogDir()}
                        >
                          Show in File Manager
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <Button
                    size="xs"
                    variant="outline"
                    disabled={isLoadingLogs}
                    onClick={async () => {
                      if (isLogViewerOpen) {
                        setIsLogViewerOpen(false);
                        return;
                      }
                      setIsLoadingLogs(true);
                      try {
                        const api = ensureNativeApi();
                        const result = await api.logs.list();
                        const files = result.files;
                        setLogFiles(files);
                        if (files.length > 0 && !selectedLogFile) {
                          setSelectedLogFile(files[0]!);
                          await loadLogFile(files[0]!);
                        }
                        setIsLogViewerOpen(true);
                      } catch {
                        setLogContent("Failed to load log files.");
                        setIsLogViewerOpen(true);
                      } finally {
                        setIsLoadingLogs(false);
                      }
                    }}
                  >
                    {isLoadingLogs
                      ? "Loading..."
                      : isLogViewerOpen
                        ? "Hide Log Viewer"
                        : "View in App"}
                  </Button>

                  {isLogViewerOpen ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedLogFile ?? ""}
                          onValueChange={(value) => {
                            if (!value) return;
                            setSelectedLogFile(value);
                            void loadLogFile(value);
                          }}
                        >
                          <SelectTrigger className="h-7 w-60 text-xs">
                            <SelectValue placeholder="Select a log file" />
                          </SelectTrigger>
                          <SelectPopup>
                            {logFiles.map((file) => (
                              <SelectItem key={file} value={file}>
                                {file}
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={!selectedLogFile || isLoadingLogs}
                          onClick={() => {
                            if (selectedLogFile) void loadLogFile(selectedLogFile);
                          }}
                        >
                          Refresh
                        </Button>
                      </div>
                      <pre
                        ref={logViewerRef}
                        className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground"
                      >
                        {logContent ? (
                          <HighlightedLogContent content={logContent} />
                        ) : (
                          "No log content."
                        )}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </SettingsRow>

              <SettingsRow
                title="Version"
                description="Current application version."
                control={
                  <code className="text-xs font-medium text-muted-foreground">{APP_VERSION}</code>
                }
              />
            </SettingsSection>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}

export const Route = createFileRoute("/_chat/settings")({
  component: SettingsRouteView,
});
