import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";
import { normalizeWorktreeBranchPrefix } from "@t3tools/shared/git";

import { DraftInput } from "../ui/draft-input";
import { SettingResetButton, SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "./useScopedSettings";

/**
 * Naming policy for the branches T3 Code creates for worktree threads. The
 * server sanitizes the stored value, so the preview here shows what a branch
 * will actually be called rather than what was typed. Environment-wide: the
 * row goes inert at project scope like every other non-overridable key.
 */
export function WorktreeBranchSettingsSection() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const mixed = useScopedSettingsMixed(["worktreeBranchPrefix"]);
  const defaultPrefix = DEFAULT_UNIFIED_SETTINGS.worktreeBranchPrefix;
  const resolvedPrefix = normalizeWorktreeBranchPrefix(settings.worktreeBranchPrefix);

  return (
    <SettingsSection title="Branches">
      <SettingsRow
        serverScoped
        settingKeys={["worktreeBranchPrefix"]}
        {...searchableSetting("worktree-branch-prefix")}
        description={`Namespace for branches created for worktree threads, and so for the head branch of any change request opened from one. New branches look like ${resolvedPrefix}/fix-login-redirect. Leave empty to use "${defaultPrefix}".`}
        resetAction={
          settings.worktreeBranchPrefix !== defaultPrefix ? (
            <SettingResetButton
              label="branch prefix"
              onClick={() => updateSettings({ worktreeBranchPrefix: defaultPrefix })}
            />
          ) : null
        }
        control={
          <DraftInput
            size="sm"
            className="w-full sm:w-72"
            value={mixed ? "" : settings.worktreeBranchPrefix}
            onCommit={(next) => updateSettings({ worktreeBranchPrefix: next })}
            placeholder={mixed ? "Mixed" : defaultPrefix}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Worktree branch prefix"
          />
        }
      />
    </SettingsSection>
  );
}
