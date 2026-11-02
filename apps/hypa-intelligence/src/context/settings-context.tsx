// @ts-nocheck
// @TODO[ ]:@timi-leyin use dexie
import type { Language } from "@/constants/app.constants";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getProductModelsForCapability as getModelsForCapability } from "@hypa/config/models";
import { resolveSavedModelName } from "@hypa/config/settings-resolvers";
import {
  DEFAULT_ASR_MODEL,
  DEFAULT_OCR_MODEL,
  DEFAULT_TRANSLATION_MODEL,
  DEFAULT_TTS_MODEL,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  TRANSLATION_MODELS,
  TTS_MODELS,
  VOICE_OPTIONS,
  VOICE_SELECT_OPTIONS,
  HISTORY_OPTIONS,
  APP_VERSION,
  behaviourSettings,
  LANGUAGES,
} from "@/constants/app.constants";

export interface BehaviorSettings {
  enableInlineTranslation: boolean;
  enableTranslateReplace: boolean;
  autoTranslateSelected: boolean;
  autoPlayAudio: boolean;
  autoTranslateOnLanguageChange: boolean;
}

// Define type for a history item
export interface TranslationHistoryItem {
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp?: number;
}

export interface VoiceSettings {
  voice: string;
  speed: number;
  pitch: number;
}

export interface AppSettings {
  defaultSourceLanguage: Language;
  defaultTargetLanguage: Language;

  behavior: BehaviorSettings;

  theme: "light" | "dark" | "system";

  voice: VoiceSettings;

  voiceSelectionMode: "auto" | "favorites" | "celebrity";
  targetLanguageVoices: Record<string, string>;

  favoriteVoices: string[];
  favoriteCelebrityVoices: string[]; // Up to 4 favorite celebrity voices

  historyItemsToKeep: number;

  llmModel: string;
  ttsModel: string;
  asrModel: string;
  ocrModel: string;

  version: string;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  updateBehaviorSetting: <K extends keyof BehaviorSettings>(
    key: K,
    value: BehaviorSettings[K],
  ) => void;
  updateVoiceSetting: <K extends keyof VoiceSettings>(
    key: K,
    value: VoiceSettings[K],
  ) => void;
  updateFavoriteVoices: (voices: string[]) => void;
  toggleFavoriteVoice: (voice: string) => void;
  updateFavoriteCelebrityVoices: (voices: string[]) => void;
  toggleFavoriteCelebrityVoice: (voice: string) => void;
  resetSettings: () => void;
  resetLocalAppData: () => void;
  exportSettings: () => void;
  // Constants getters
  getBehaviorSettings: () => typeof behaviourSettings;
  getVoiceOptions: () => typeof VOICE_OPTIONS;
  getHistoryOptions: () => typeof HISTORY_OPTIONS;

  getAvailableSourceLanguages: () => Language[];
  getAvailableTargetLanguages: () => Language[];
  getAvailableVoices: () => string[];
  getAvailableLabelledVoices: () => {
    value: string;
    label: string;
    language?: string;
  }[];
  getAvailableCelebrityVoices: () => string[];

  // TLVS - Target Language Voice Selection
  getVoicesForLanguage: (languageCode: string) => string[];
  updateTargetLanguageVoice: (languageCode: string, voice: string) => void;
  resolvePlaybackVoice: (
    kind: "input" | "output",
    languageCode: string,
    userSelection?: string,
  ) => string;

  // History Settings
  addToHistory: (item: TranslationHistoryItem) => void;
  setHistory: (items: TranslationHistoryItem[]) => void;
  getHistory: () => TranslationHistoryItem[];
  clearHistory: () => void;

  // Dynamically detected source languages (from autodetect)
  addDetectedSourceLanguage: (langName: string) => void;
}

const defaultLLM = (() => {
  try {
    return DEFAULT_TRANSLATION_MODEL?.name || "";
  } catch {
    return "";
  }
})();

const defaultTTS = (() => {
  try {
    return DEFAULT_TTS_MODEL?.name || "";
  } catch {
    return "";
  }
})();

const defaultASR = (() => {
  try {
    return DEFAULT_ASR_MODEL?.name || "";
  } catch {
    return "";
  }
})();

const defaultOCR = (() => {
  try {
    return DEFAULT_OCR_MODEL?.name || "";
  } catch {
    return "";
  }
})();

// Preprocess TTS models into voice lookup for performance
const ttsVoiceLookup: Record<
  string,
  {
    voices: string[];
    labelledVoices: { value: string; label: string; language: string }[];
    languageVoices: Record<string, string[]>;
    celebVoices: string[];
  }
> = (() => {
  try {
    const lookup: Record<string, any> = {};

    TTS_MODELS.forEach((model) => {
      const voicesObj = model.voices || {};
      const celebVoicesRaw = model.celebrityVoices || [];
      const allVoices: string[] = [];
      const labelled: any[] = [];
      const languageVoices: Record<string, string[]> = {};

      // Flatten voices from all languages
      Object.entries(voicesObj).forEach(([lang, voices]: [string, any]) => {
        const voiceArray = Array.isArray(voices) ? voices : [];
        const langKey = lang.toLowerCase();

        // Store language-specific voices for quick lookup
        languageVoices[langKey] = voiceArray;

        voiceArray.forEach((v: string) => {
          if (!allVoices.includes(v)) {
            allVoices.push(v);
            labelled.push({
              value: v,
              label: `${v} — ${lang.charAt(0).toUpperCase() + lang.slice(1)}`,
              language: lang,
            });
          }
        });
      });

      lookup[model.name] = {
        voices: allVoices.sort(),
        labelledVoices: labelled.sort((a, b) => a.label.localeCompare(b.label)),
        languageVoices,
        celebVoices: Array.isArray(celebVoicesRaw) ? celebVoicesRaw : [],
      };
    });

    return lookup;
  } catch {
    return {};
  }
})();

const defaultSettings: AppSettings = {
  defaultSourceLanguage: SOURCE_LANGUAGES[0] || {
    code: "auto",
    name: "Auto-detect",
  },
  defaultTargetLanguage: TARGET_LANGUAGES[0] || { code: "en", name: "English" },
  behavior: {
    enableInlineTranslation: true,
    enableTranslateReplace: false,
    autoTranslateSelected: false,
    autoPlayAudio: true,
    autoTranslateOnLanguageChange: false,
  },
  theme: "system",
  voice: {
    voice: VOICE_OPTIONS[0],
    speed: 1.0,
    pitch: 1.0,
  },
  voiceSelectionMode: "auto",
  targetLanguageVoices: {},
  favoriteVoices: (() => {
    try {
      const modelVoices = ttsVoiceLookup[defaultTTS];

      if (modelVoices && modelVoices.voices.length > 0) {
        // Pick first 4 voices from default model
        return modelVoices.voices.slice(0, 4);
      }

      return ["Eniola", "Prince", "Juliet", "Gbemisola"];
    } catch {
      return ["Eniola", "Prince", "Juliet", "Gbemisola"];
    }
  })(),
  favoriteCelebrityVoices: (() => {
    try {
      const modelVoices = ttsVoiceLookup[defaultTTS];

      if (modelVoices && modelVoices.celebVoices.length > 0) {
        return modelVoices.celebVoices.slice(0, 4);
      }

      return ["Pete Edochie", "Davido", "Tyla", "Portable"];
    } catch {
      return ["Pete Edochie", "Davido", "Tyla", "Portable"];
    }
  })(),
  historyItemsToKeep: HISTORY_OPTIONS[0],
  llmModel: defaultLLM,
  ttsModel: defaultTTS,
  asrModel: defaultASR,
  ocrModel: defaultOCR,
  version: APP_VERSION,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "hypa-intelligence-settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Track dynamically detected source languages (from autodetect) not in the model config
  const [detectedSourceLanguages, setDetectedSourceLanguages] = useState<
    Language[]
  >([]);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        // Migration: If voice is "Auto" and we're in favorites/celebrity mode, replace with a real voice
        let migratedVoice = parsed.voice?.voice;

        if (
          parsed.voiceSelectionMode === "favorites" &&
          migratedVoice &&
          migratedVoice.toLowerCase() === "auto"
        ) {
          const modelVoices = ttsVoiceLookup[parsed.ttsModel || defaultTTS];
          const availableVoices = modelVoices?.voices || VOICE_OPTIONS;
          const favoritesList = Array.isArray(parsed.favoriteVoices)
            ? parsed.favoriteVoices
            : [];

          migratedVoice = favoritesList[0] || availableVoices[0] || "Juliet";
        } else if (
          parsed.voiceSelectionMode === "celebrity" &&
          migratedVoice &&
          migratedVoice.toLowerCase() === "auto"
        ) {
          const modelVoices = ttsVoiceLookup[parsed.ttsModel || defaultTTS];
          const availableCelebs = modelVoices?.celebVoices || [];
          const favoriteCelebsList = Array.isArray(
            parsed.favoriteCelebrityVoices,
          )
            ? parsed.favoriteCelebrityVoices
            : [];

          migratedVoice =
            favoriteCelebsList[0] || availableCelebs[0] || "Pete Edochie";
        }

        // Migration: normalize old settings to include new TLVS fields and celebrity voices
        return {
          ...defaultSettings,
          ...parsed,
          llmModel: resolveSavedModelName(
            getModelsForCapability("MT"),
            parsed.llmModel,
            defaultLLM,
          ),
          ttsModel: resolveSavedModelName(
            getModelsForCapability("TTS"),
            parsed.ttsModel,
            defaultTTS,
          ),
          asrModel: resolveSavedModelName(
            getModelsForCapability("ASR"),
            parsed.asrModel,
            defaultASR,
          ),
          ocrModel: resolveSavedModelName(
            getModelsForCapability("OCR"),
            parsed.ocrModel,
            defaultOCR,
          ),
          voiceSelectionMode: parsed.voiceSelectionMode || "auto",
          targetLanguageVoices: parsed.targetLanguageVoices || {},
          favoriteCelebrityVoices:
            parsed.favoriteCelebrityVoices ||
            defaultSettings.favoriteCelebrityVoices,
          voice: {
            ...parsed.voice,
            voice:
              migratedVoice ||
              parsed.voice?.voice ||
              defaultSettings.voice.voice,
          },
        };
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }

    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings]);

  const updateSettings = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };

      // Guard when switching to favorites mode with "Auto" voice
      if (key === "voiceSelectionMode" && value === "favorites") {
        const currentVoice = prev.voice.voice;

        if (currentVoice.toLowerCase() === "auto") {
          const modelVoices = ttsVoiceLookup[prev.ttsModel];
          const availableVoices = modelVoices?.voices || VOICE_OPTIONS;
          const favoriteVoices = Array.isArray(prev.favoriteVoices)
            ? prev.favoriteVoices
            : [];
          const newVoice = favoriteVoices[0] || availableVoices[0] || "Juliet";

          return {
            ...newSettings,
            voice: { ...prev.voice, voice: newVoice },
          };
        }
      }

      // Guard when switching to celebrity mode with "Auto" voice
      if (key === "voiceSelectionMode" && value === "celebrity") {
        const currentVoice = prev.voice.voice;

        if (currentVoice.toLowerCase() === "auto") {
          const modelVoices = ttsVoiceLookup[prev.ttsModel];
          const availableCelebs = modelVoices?.celebVoices || [];
          const favoriteCelebsList = Array.isArray(prev.favoriteCelebrityVoices)
            ? prev.favoriteCelebrityVoices
            : [];
          const newVoice =
            favoriteCelebsList[0] || availableCelebs[0] || "Pete Edochie";

          return {
            ...newSettings,
            voice: { ...prev.voice, voice: newVoice },
          };
        }
      }

      // Guard voice selections when TTS model changes
      if (key === "ttsModel") {
        const newModelVoices = ttsVoiceLookup[value as string];
        const availableVoices = newModelVoices?.voices || VOICE_OPTIONS;
        const availableCelebs = newModelVoices?.celebVoices || [];
        const availableSet = new Set(availableVoices);
        const availableCelebSet = new Set(availableCelebs);

        // Normalize favorites to handle undefined/legacy settings
        const prevFavorites = Array.isArray(prev.favoriteVoices)
          ? prev.favoriteVoices
          : [];
        const prevFavoriteCelebs = Array.isArray(prev.favoriteCelebrityVoices)
          ? prev.favoriteCelebrityVoices
          : [];

        // Filter favorites to only include voices from new model
        let validFavorites = prevFavorites.filter((v) => availableSet.has(v));

        // Filter celebrity favorites to only include celebrity voices from new model
        let validFavoriteCelebs = prevFavoriteCelebs.filter((v) =>
          availableCelebSet.has(v),
        );

        // Auto-seed favorites if the filtered list is empty
        if (validFavorites.length === 0 && availableVoices.length > 0) {
          validFavorites = availableVoices.slice(0, 4);
        }

        // Auto-seed celebrity favorites if the filtered list is empty
        if (validFavoriteCelebs.length === 0 && availableCelebs.length > 0) {
          validFavoriteCelebs = availableCelebs.slice(0, 4);
        }

        // Reset primary voice if it's not available in new model
        let newVoice = prev.voice.voice;

        if (
          !availableSet.has(newVoice) &&
          !availableCelebSet.has(newVoice) &&
          newVoice !== "auto" &&
          newVoice !== "Auto"
        ) {
          // Use appropriate voice based on current mode
          if (prev.voiceSelectionMode === "celebrity") {
            newVoice = validFavoriteCelebs[0] || availableCelebs[0] || "Auto";
          } else {
            newVoice = validFavorites[0] || availableVoices[0] || "Auto";
          }
        }

        // Clean up targetLanguageVoices: remove voices not valid for their language in new model
        const cleanedTargetVoices: Record<string, string> = {};

        Object.entries(prev.targetLanguageVoices || {}).forEach(
          ([lang, voice]) => {
            // Check if this voice still exists for this specific language in the new model
            const langVoices = newModelVoices?.languageVoices?.[lang] || [];

            if (langVoices.includes(voice)) {
              cleanedTargetVoices[lang] = voice;
            }
          },
        );

        return {
          ...newSettings,
          favoriteVoices: validFavorites,
          favoriteCelebrityVoices: validFavoriteCelebs,
          targetLanguageVoices: cleanedTargetVoices,
          voice: { ...prev.voice, voice: newVoice },
        };
      }

      return newSettings;
    });
  };

  const updateBehaviorSetting = <K extends keyof BehaviorSettings>(
    key: K,
    value: BehaviorSettings[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      behavior: { ...prev.behavior, [key]: value },
    }));
  };

  const updateVoiceSetting = <K extends keyof VoiceSettings>(
    key: K,
    value: VoiceSettings[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      voice: { ...prev.voice, [key]: value },
    }));
  };

  const updateFavoriteVoices = (voices: string[]) => {
    setSettings((prev) => ({ ...prev, favoriteVoices: voices }));
  };

  const toggleFavoriteVoice = (voice: string) => {
    setSettings((prev) => {
      const arr = Array.isArray(prev.favoriteVoices)
        ? prev.favoriteVoices.slice()
        : [];
      const idx = arr.indexOf(voice);

      if (idx === -1) {
        // add
        if (arr.length >= 4) return prev; // limit 4
        arr.push(voice);
      } else {
        arr.splice(idx, 1);
      }

      return { ...prev, favoriteVoices: arr };
    });
  };

  const updateFavoriteCelebrityVoices = (voices: string[]) => {
    setSettings((prev) => ({ ...prev, favoriteCelebrityVoices: voices }));
  };

  const toggleFavoriteCelebrityVoice = (voice: string) => {
    setSettings((prev) => {
      const arr = Array.isArray(prev.favoriteCelebrityVoices)
        ? prev.favoriteCelebrityVoices.slice()
        : [];
      const idx = arr.indexOf(voice);

      if (idx === -1) {
        // add
        if (arr.length >= 4) return prev; // limit 4
        arr.push(voice);
      } else {
        arr.splice(idx, 1);
      }

      return { ...prev, favoriteCelebrityVoices: arr };
    });
  };

  const updateTargetLanguageVoice = (languageCode: string, voice: string) => {
    setSettings((prev) => ({
      ...prev,
      targetLanguageVoices: {
        ...prev.targetLanguageVoices,
        [languageCode.toLowerCase()]: voice,
      },
    }));
  };

  const HISTORY_STORAGE_KEY = "translation-history";

  const addToHistory = (item: TranslationHistoryItem) => {
    try {
      const existing = JSON.parse(
        localStorage.getItem(HISTORY_STORAGE_KEY) || "[]",
      );
      const updated = [item, ...existing].slice(0, settings.historyItemsToKeep);

      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));

      setSettings((prev) => ({
        ...prev,
        history: updated,
      }));
    } catch (error) {
      console.error("Failed to add to history:", error);
    }
  };

  const setHistory = (items: TranslationHistoryItem[]) => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
      setSettings((prev) => ({ ...prev, history: items }));
    } catch (err) {
      console.error("Failed to save history", err);
    }
  };

  const getHistory = (): TranslationHistoryItem[] => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const resetLocalAppData = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    setSettings(defaultSettings);
    setDetectedSourceLanguages([]);
  };

  const exportSettings = () => {
    const history = getHistory();

    const exportData = {
      settings,
      history,
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "translate-app-settings.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    updateBehaviorSetting,
    updateVoiceSetting,
    updateFavoriteVoices,
    toggleFavoriteVoice,
    updateFavoriteCelebrityVoices,
    toggleFavoriteCelebrityVoice,
    resetSettings,
    resetLocalAppData,
    exportSettings,
    addToHistory,
    getHistory,
    setHistory,
    clearHistory,
    getBehaviorSettings: () => behaviourSettings,
    getVoiceOptions: () => VOICE_OPTIONS,
    getHistoryOptions: () => HISTORY_OPTIONS,

    //Auto detect Language function to update the list of source languages based on what the user has used, even if not in the model config. This allows for more flexibility with autodetection and user-added languages without needing constant model config updates.
    addDetectedSourceLanguage: (langName: string) => {
      const code = langName.charAt(0).toLowerCase() + langName.slice(1);
      // Check if it already exists in LANGUAGES or detectedSourceLanguages
      const alreadyInGlobal = LANGUAGES.some(
        (l) =>
          l.name.toLowerCase() === langName.toLowerCase() ||
          l.code.toLowerCase() === code.toLowerCase(),
      );
      const alreadyDetected = detectedSourceLanguages.some(
        (l) => l.name.toLowerCase() === langName.toLowerCase(),
      );

      if (!alreadyInGlobal && !alreadyDetected) {
        setDetectedSourceLanguages((prev) => [
          ...prev,
          { code, name: langName, voice: "Juliet" },
        ]);
      }
    },
    getAvailableSourceLanguages: () => {
      try {
        const m = TRANSLATION_MODELS.find(
          (mm) => mm.name === settings.llmModel,
        );
        const modelLangs: string[] = m?.languages || [];

        if (!modelLangs || modelLangs.length === 0) {
          // Merge detected languages into SOURCE_LANGUAGES
          const existingCodes = new Set(
            SOURCE_LANGUAGES.map((l) => l.code.toLowerCase()),
          );
          const extras = detectedSourceLanguages.filter(
            (l) => !existingCodes.has(l.code.toLowerCase()),
          );

          return [...SOURCE_LANGUAGES, ...extras];
        }
        const lowerSet = new Set(
          modelLangs.map((s) => String(s).toLowerCase()),
        );
        const filtered = LANGUAGES.filter(
          (l) =>
            l.code === "auto" ||
            lowerSet.has(l.name.toLowerCase()) ||
            lowerSet.has(l.code.toLowerCase()),
        );
        // Merge any dynamically detected languages not already present
        const filteredCodes = new Set(
          filtered.map((l) => l.code.toLowerCase()),
        );
        const extras = detectedSourceLanguages.filter(
          (l) => !filteredCodes.has(l.code.toLowerCase()),
        );

        return [...filtered, ...extras];
      } catch {
        return SOURCE_LANGUAGES;
      }
    },
    getAvailableTargetLanguages: () => {
      try {
        const m = TRANSLATION_MODELS.find(
          (mm) => mm.name === settings.llmModel,
        );
        const modelLangs: string[] = m?.languages || [];

        if (!modelLangs || modelLangs.length === 0) return TARGET_LANGUAGES;
        const lowerSet = new Set(
          modelLangs.map((s) => String(s).toLowerCase()),
        );

        return LANGUAGES.filter(
          (l) =>
            l.code !== "auto" &&
            (lowerSet.has(l.name.toLowerCase()) ||
              lowerSet.has(l.code.toLowerCase())),
        );
      } catch {
        return TARGET_LANGUAGES;
      }
    },
    getAvailableVoices: () => {
      try {
        const modelVoices = ttsVoiceLookup[settings.ttsModel];

        if (modelVoices && modelVoices.voices.length > 0) {
          return modelVoices.voices;
        }

        return VOICE_OPTIONS;
      } catch {
        return VOICE_OPTIONS;
      }
    },
    getAvailableLabelledVoices: () => {
      try {
        const modelVoices = ttsVoiceLookup[settings.ttsModel];

        if (modelVoices && modelVoices.labelledVoices.length > 0) {
          return modelVoices.labelledVoices;
        }

        return VOICE_SELECT_OPTIONS;
      } catch {
        return VOICE_SELECT_OPTIONS;
      }
    },
    getAvailableCelebrityVoices: () => {
      try {
        const modelVoices = ttsVoiceLookup[settings.ttsModel];

        if (modelVoices && modelVoices.celebVoices.length > 0) {
          return modelVoices.celebVoices;
        }

        return [
          "Pete Edochie",
          "Davido",
          "Tyla",
          "Portable",
          "Very Dark Man",
          "Odumeje",
        ];
      } catch {
        return [
          "Pete Edochie",
          "Davido",
          "Tyla",
          "Portable",
          "Very Dark Man",
          "Odumeje",
        ];
      }
    },
    // getCelebrityVoiceLabel: (voice: string) => {
    //   // Celebrity voices are displayed as-is, no language suffix needed
    //   return voice;
    // },
    getVoicesForLanguage: (languageCode: string) => {
      try {
        const modelVoices = ttsVoiceLookup[settings.ttsModel];

        if (!modelVoices?.languageVoices) return [];

        const langKey = languageCode.toLowerCase();

        return modelVoices.languageVoices[langKey] || [];
      } catch {
        return [];
      }
    },
    updateTargetLanguageVoice,
    resolvePlaybackVoice: (
      _kind: "input" | "output",
      languageCode: string,
      userSelection?: string,
    ) => {
      // If in celebrity mode, use the selected voice from favoriteCelebrityVoices
      if (settings.voiceSelectionMode === "celebrity") {
        const celebVoice = settings.voice.voice;

        if (!celebVoice || celebVoice.toLowerCase() === "auto") {
          const modelVoices = ttsVoiceLookup[settings.ttsModel];
          const availableCelebs = modelVoices?.celebVoices || [];
          const favoriteCelebsList = Array.isArray(
            settings.favoriteCelebrityVoices,
          )
            ? settings.favoriteCelebrityVoices
            : [];

          return favoriteCelebsList[0] || availableCelebs[0] || "Pete Edochie";
        }

        return celebVoice;
      }

      // If in favorites mode, use the selected favorite voice
      if (settings.voiceSelectionMode === "favorites") {
        const favoriteVoice = settings.voice.voice;

        if (!favoriteVoice || favoriteVoice.toLowerCase() === "auto") {
          const modelVoices = ttsVoiceLookup[settings.ttsModel];
          const availableVoices = modelVoices?.voices || VOICE_OPTIONS;
          const favoritesList = Array.isArray(settings.favoriteVoices)
            ? settings.favoriteVoices
            : [];

          return favoritesList[0] || availableVoices[0] || "Juliet";
        }

        return favoriteVoice;
      }

      // Auto mode: priority order
      const langKey = languageCode.toLowerCase();
      const modelVoices = ttsVoiceLookup[settings.ttsModel];
      const availableVoicesForLang =
        modelVoices?.languageVoices?.[langKey] || [];

      // 1. User's current selection (from TLVS dropdown) - validate it's still valid
      if (userSelection && availableVoicesForLang.includes(userSelection)) {
        return userSelection;
      }

      // 2. Cached preference from previous session - validate it's still valid for this language
      const cachedVoice = settings.targetLanguageVoices[langKey];

      if (cachedVoice && availableVoicesForLang.includes(cachedVoice)) {
        return cachedVoice;
      }

      // 3. First available voice for this language in current TTS model
      if (availableVoicesForLang[0]) {
        return availableVoicesForLang[0];
      }

      // 4. Language default from models
      const langDefault = LANGUAGES.find(
        (l) => l.code.toLowerCase() === langKey,
      )?.voice;

      if (langDefault) return langDefault;

      // 5. System fallback
      return "Juliet";
    },
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
}
