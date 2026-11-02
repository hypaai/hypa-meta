import { useSettingsStore } from "@/stores/settings-store";

/**
 * Returns the list of languages supported by the currently selected MT model.
 * Falls back to a minimal set if the model has no languages defined.
 */
export function useModelLanguages() {
  const languages = useSettingsStore((s) => s.actions.getMtLanguages());

  if (languages.length === 0) {
    return ["English"];
  }

  return languages;
}

/**
 * Returns the list of languages supported by the currently selected AC model.
 * Falls back to a minimal set if the model has no languages defined.
 */
export function useAcModelLanguages() {
  const languages = useSettingsStore((s) => s.actions.getAcLanguages());

  if (languages.length === 0) {
    return ["English"];
  }

  return languages;
}
