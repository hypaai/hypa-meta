import { useEffect, useMemo, useState } from "react";

export const ALL_VOICE_LANGUAGES = "All";

type UseVoiceLanguageFilterOptions<T extends string> = {
  voices: T[];
  modelKey: string;
  getVoicesForLanguage: (language: string) => readonly T[];
  languages?: readonly string[];
};

export function useVoiceLanguageFilter<T extends string>({
  voices,
  modelKey,
  getVoicesForLanguage,
  languages = [],
}: UseVoiceLanguageFilterOptions<T>) {
  const [selectedLang, setSelectedLang] = useState(ALL_VOICE_LANGUAGES);
  const selectedLangIsValid =
    selectedLang === ALL_VOICE_LANGUAGES || languages.includes(selectedLang);
  const activeLang = selectedLangIsValid ? selectedLang : ALL_VOICE_LANGUAGES;

  useEffect(() => {
    setSelectedLang(ALL_VOICE_LANGUAGES);
  }, [modelKey]);

  useEffect(() => {
    if (!selectedLangIsValid) {
      setSelectedLang(ALL_VOICE_LANGUAGES);
    }
  }, [selectedLangIsValid]);

  const filteredVoices = useMemo(() => {
    if (activeLang === ALL_VOICE_LANGUAGES) return voices;
    const langVoices = getVoicesForLanguage(activeLang);
    return voices.filter((voice) => langVoices.includes(voice));
  }, [activeLang, voices, getVoicesForLanguage]);

  return {
    selectedLang: activeLang,
    setSelectedLang,
    filteredVoices,
  };
}
