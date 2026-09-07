import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";
import { normalizeWorktreeBranchPrefix } from "@t3tools/shared/git";

import { usePrimarySettings, useUpdatePrimarySettings } from "../../hooks/useSettings";
import { DraftInput } from "../ui/draft-input";
import { SettingResetButton, SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

/**
 * Naming policy for the branches T3 Code creates for worktree threads. The
 * server sanitizes the stored value, so the preview here shows what a branch
 * will actually be called rather than what was typed.
 */
export function WorktreeBranchSettingsSection() {
  const settings = usePrimarySettings();
  const updateSettings = useUpdatePrimarySettings();
  const defaultPrefix = DEFAULT_UNIFIED_SETTINGS.worktreeBranchPrefix;
  const resolvedPrefix = normalizeWorktreeBranchPrefix(settings.worktreeBranchPrefix);

  return (
    <SettingsSection title="Branches">
      <SettingsRow
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
            className="w-full sm:w-72"
            value={settings.worktreeBranchPrefix}
            onCommit={(next) => updateSettings({ worktreeBranchPrefix: next })}
            placeholder={defaultPrefix}
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
