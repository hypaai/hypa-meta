import { create } from "zustand";
import { PRODUCT_MODEL_OPTIONS_BY_CAPABILITY as modelsData } from "@hypa/config/models";
import {
  findCaseInsensitiveMatch,
  flattenModelsFromProviderMap,
  getProviderModelsFromProviderMap,
  getProvidersFromProviderMap,
  resolveDefaultModelFromModels,
  resolveProviderForModelFromProviderMap,
  resolveTtsVoiceForLanguageFromModels,
} from "@hypa/config/settings-resolvers";

/* ─── Model types ─── */

export interface ModelOption {
  name: string;
  displayName?: string;
  modelCardUrl?: string;
  default?: boolean;
  languages?: string[];
  voices?: Record<string, string[]>;
  celebrityVoices?: string[];
  notes?: string;
}

export type VoiceSelectionMode = "auto" | "favorites" | "celebrity";
type ModelCategory = "AC" | "MT" | "TTS";

/* ─── Helpers to extract provider model arrays ─── */

type ProviderMap = Record<string, ModelOption[]>;

/* ─── All available models by category ─── */

const modelsAny = modelsData as any;
const getCategory = (category: ModelCategory): ProviderMap | undefined =>
  modelsAny[category] as ProviderMap | undefined;

const mtModels = getProviderModelsFromProviderMap(getCategory("MT"), "hypaai");
const acModels = getProviderModelsFromProviderMap(getCategory("AC"), "hypaai");

// TTS: provider-aware
const ttsProviders = getProvidersFromProviderMap(
  modelsAny.TTS as ProviderMap | undefined,
);
const ttsModelsByProvider = modelsAny.TTS as ProviderMap | undefined;

function getTtsModelsForProvider(provider: string): ModelOption[] {
  return getProviderModelsFromProviderMap(ttsModelsByProvider, provider);
}

const defaultTtsProvider = "hypaai";
const defaultTtsModels = getTtsModelsForProvider(defaultTtsProvider);
const defaultTTS = resolveDefaultModelFromModels(defaultTtsModels);

const defaultMT = resolveDefaultModelFromModels(mtModels);
const defaultAC = resolveDefaultModelFromModels(acModels);

// All TTS models flattened (for backward compat)
const ttsModels = flattenModelsFromProviderMap(ttsModelsByProvider);

function getVoicesForModel(
  models: ModelOption[],
  modelName: string,
  language: string,
): string[] {
  const model = models.find((m) => m.name === modelName);

  if (!model?.voices) return [];

  return model.voices[language.toLowerCase()] ?? [];
}

function getAllVoicesForModel(
  models: ModelOption[],
  modelName: string,
): string[] {
  const model = models.find((m) => m.name === modelName);

  if (!model?.voices) return [];
  const seen = new Set<string>();

  for (const voices of Object.values(model.voices)) {
    for (const v of voices) seen.add(v);
  }

  return Array.from(seen).sort();
}

function getCelebVoicesForModel(
  models: ModelOption[],
  modelName: string,
): string[] {
  const model = models.find((m) => m.name === modelName);

  return model?.celebrityVoices ?? [];
}

function getLabelledVoicesForModel(
  models: ModelOption[],
  modelName: string,
): { value: string; label: string; language: string }[] {
  const model = models.find((m) => m.name === modelName);

  if (!model?.voices) return [];
  const result: { value: string; label: string; language: string }[] = [];
  const seen = new Set<string>();

  for (const [lang, voices] of Object.entries(model.voices)) {
    for (const v of voices) {
      if (!seen.has(v)) {
        seen.add(v);
        result.push({
          value: v,
          label: `${v} — ${lang.charAt(0).toUpperCase() + lang.slice(1)}`,
          language: lang,
        });
      }
    }
  }

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

export function resolveProviderForModel(
  category: ModelCategory,
  modelName: string,
  fallback = "hypaai",
): string {
  return resolveProviderForModelFromProviderMap(
    getCategory(category),
    modelName,
    fallback,
  );
}

export function resolveTtsVoiceForLanguage(params: {
  language?: string;
  preferredVoice?: string | null;
  provider: string;
  modelName: string;
  voiceSelectionMode: VoiceSelectionMode;
  favoriteVoices: string[];
  favoriteCelebrityVoices: string[];
}): string {
  const {
    language,
    preferredVoice,
    provider,
    modelName,
    voiceSelectionMode,
    favoriteVoices,
    favoriteCelebrityVoices,
  } = params;

  const providerModels = getTtsModelsForProvider(provider);

  return resolveTtsVoiceForLanguageFromModels({
    language,
    preferredVoice,
    modelName,
    voiceSelectionMode,
    favoriteVoices,
    favoriteCelebrityVoices,
    providerModels,
  });
}

/* ─── Default favorite voices from the default model ─── */

const defaultFavoriteVoices = (() => {
  const all = getAllVoicesForModel(defaultTtsModels, defaultTTS?.name ?? "");

  return all.length > 0 ? all.slice(0, 4) : ["Juliet", "Eniola", "Zac", "tara"];
})();

const defaultFavoriteCelebrityVoices = (() => {
  const celebs = getCelebVoicesForModel(
    defaultTtsModels,
    defaultTTS?.name ?? "",
  );

  return celebs.length > 0
    ? celebs.slice(0, 4)
    : ["Pete Edochie", "Davido", "Tyla", "Portable"];
})();

/* ─── Store ─── */

interface SettingsStore {
  mtModel: string;
  ttsProvider: string;
  ttsModel: string;
  ttsVoice: string;
  voiceSpeed: number;
  voicePitch: number;
  acModel: string;
  defaultTranslateLang: string;
  autoLookupOnLanguageChange: boolean;
  voiceSelectionMode: VoiceSelectionMode;
  favoriteVoices: string[];
  favoriteCelebrityVoices: string[];

  actions: {
    setMtModel: (name: string) => void;
    setTtsProvider: (provider: string) => void;
    setTtsModel: (name: string) => void;
    setTtsVoice: (voice: string) => void;
    setVoiceSpeed: (speed: number) => void;
    setVoicePitch: (pitch: number) => void;
    setAcModel: (name: string) => void;
    setDefaultTranslateLang: (lang: string) => void;
    setAutoLookupOnLanguageChange: (enabled: boolean) => void;
    setVoiceSelectionMode: (mode: VoiceSelectionMode) => void;
    toggleFavoriteVoice: (voice: string) => void;
    toggleFavoriteCelebrityVoice: (voice: string) => void;
    getMtLanguages: () => string[];
    getTtsVoices: (language: string) => string[];
    getAllTtsVoices: () => string[];
    getLabelledTtsVoices: () => {
      value: string;
      label: string;
      language: string;
    }[];
    getCelebrityVoices: () => string[];
    getTtsModels: () => ModelOption[];
    getAcLanguages: () => string[];
    syncModelDefaults: () => void;
    resetToDefaults: () => void;
  };
}

const STORAGE_KEY = "hypa-intelligence-settings";

interface PersistedSettings {
  mtModel?: string;
  ttsProvider?: string;
  ttsModel?: string;
  ttsVoice?: string;
  voiceSpeed?: number;
  voicePitch?: number;
  acModel?: string;
  defaultTranslateLang?: string;
  autoLookupOnLanguageChange?: boolean;
  voiceSelectionMode?: VoiceSelectionMode;
  favoriteVoices?: string[];
  favoriteCelebrityVoices?: string[];
}

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSettings(s: PersistedSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function persist(
  get: () => SettingsStore,
  overrides: Partial<PersistedSettings> = {},
) {
  const s = get();

  saveSettings({
    mtModel: s.mtModel,
    ttsProvider: s.ttsProvider,
    ttsModel: s.ttsModel,
    ttsVoice: s.ttsVoice,
    voiceSpeed: s.voiceSpeed,
    voicePitch: s.voicePitch,
    acModel: s.acModel,
    defaultTranslateLang: s.defaultTranslateLang,
    autoLookupOnLanguageChange: s.autoLookupOnLanguageChange,
    voiceSelectionMode: s.voiceSelectionMode,
    favoriteVoices: s.favoriteVoices,
    favoriteCelebrityVoices: s.favoriteCelebrityVoices,
    ...overrides,
  });
}

function getLanguagesForModel(
  models: ModelOption[],
  modelName: string,
): string[] {
  const model = models.find((m) => m.name === modelName);

  if (model?.languages?.length) return model.languages;
  const fallback = models.find((m) => m.default) ?? models[0];

  return fallback?.languages ?? [];
}

const persisted = loadSettings();

// Validate persisted model is still valid; fall back to default if not
const validMtModel =
  persisted.mtModel && mtModels.some((m) => m.name === persisted.mtModel)
    ? persisted.mtModel
    : (defaultMT?.name ?? "");
const validAcModel =
  persisted.acModel && acModels.some((m) => m.name === persisted.acModel)
    ? persisted.acModel
    : (defaultAC?.name ?? "");
const validTtsProvider =
  persisted.ttsProvider && ttsProviders.includes(persisted.ttsProvider)
    ? persisted.ttsProvider
    : defaultTtsProvider;
const persistedTtsModels = getTtsModelsForProvider(validTtsProvider);
const validTtsModel =
  persisted.ttsModel &&
  persistedTtsModels.some((m) => m.name === persisted.ttsModel)
    ? persisted.ttsModel
    : (resolveDefaultModelFromModels(persistedTtsModels)?.name ??
      defaultTTS?.name ??
      "");
const persistedStandardVoices = getAllVoicesForModel(
  persistedTtsModels,
  validTtsModel,
);
const persistedCelebrityVoices = getCelebVoicesForModel(
  persistedTtsModels,
  validTtsModel,
);
const validTtsVoice =
  findCaseInsensitiveMatch(
    [...persistedStandardVoices, ...persistedCelebrityVoices],
    persisted.ttsVoice,
  ) ??
  persistedStandardVoices[0] ??
  persistedCelebrityVoices[0] ??
  "Juliet";

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  mtModel: validMtModel,
  ttsProvider: validTtsProvider,
  ttsModel: validTtsModel,
  ttsVoice: validTtsVoice,
  voiceSpeed: persisted.voiceSpeed ?? 1.0,
  voicePitch: persisted.voicePitch ?? 1.0,
  acModel: validAcModel,
  defaultTranslateLang: persisted.defaultTranslateLang ?? "",
  autoLookupOnLanguageChange: persisted.autoLookupOnLanguageChange ?? true,
  voiceSelectionMode: persisted.voiceSelectionMode ?? "auto",
  favoriteVoices: persisted.favoriteVoices ?? defaultFavoriteVoices,
  favoriteCelebrityVoices:
    persisted.favoriteCelebrityVoices ?? defaultFavoriteCelebrityVoices,

  actions: {
    setMtModel: (name) => {
      set({ mtModel: name });
      persist(get, { mtModel: name });
    },

    setTtsProvider: (provider) => {
      const models = getTtsModelsForProvider(provider);
      const defaultModel = resolveDefaultModelFromModels(models);
      const firstVoice =
        defaultModel?.voices?.[
          Object.keys(defaultModel.voices ?? {})[0]
        ]?.[0] ?? "";

      set({
        ttsProvider: provider,
        ttsModel: defaultModel?.name ?? "",
        ttsVoice: firstVoice,
      });
      persist(get, {
        ttsProvider: provider,
        ttsModel: defaultModel?.name ?? "",
        ttsVoice: firstVoice,
      });
    },

    setTtsModel: (name) => {
      const models = getTtsModelsForProvider(get().ttsProvider);
      const model = models.find((m) => m.name === name);
      const firstVoice =
        model?.voices?.[Object.keys(model.voices ?? {})[0]]?.[0] ?? "";

      set({ ttsModel: name, ttsVoice: firstVoice });
      persist(get, { ttsModel: name, ttsVoice: firstVoice });
    },

    setTtsVoice: (voice) => {
      set({ ttsVoice: voice });
      persist(get, { ttsVoice: voice });
    },

    setVoiceSpeed: (speed) => {
      set({ voiceSpeed: speed });
      persist(get, { voiceSpeed: speed });
    },

    setVoicePitch: (pitch) => {
      set({ voicePitch: pitch });
      persist(get, { voicePitch: pitch });
    },

    setAcModel: (name) => {
      set({ acModel: name });
      persist(get, { acModel: name });
    },

    setDefaultTranslateLang: (lang) => {
      set({ defaultTranslateLang: lang });
      persist(get, { defaultTranslateLang: lang });
    },

    setAutoLookupOnLanguageChange: (enabled) => {
      set({ autoLookupOnLanguageChange: enabled });
      persist(get, { autoLookupOnLanguageChange: enabled });
    },

    setVoiceSelectionMode: (mode) => {
      const s = get();
      const updates: Partial<SettingsStore> = { voiceSelectionMode: mode };

      if (mode === "favorites" && s.favoriteVoices.length > 0) {
        updates.ttsVoice = s.favoriteVoices[0];
      } else if (mode === "celebrity" && s.favoriteCelebrityVoices.length > 0) {
        updates.ttsVoice = s.favoriteCelebrityVoices[0];
      }

      set(updates);
      persist(get, {
        voiceSelectionMode: mode,
        ttsVoice: updates.ttsVoice ?? s.ttsVoice,
      });
    },

    toggleFavoriteVoice: (voice) => {
      const arr = get().favoriteVoices.slice();
      const idx = arr.indexOf(voice);

      if (idx === -1) {
        if (arr.length >= 4) return;
        arr.push(voice);
      } else {
        arr.splice(idx, 1);
      }
      set({ favoriteVoices: arr });
      persist(get, { favoriteVoices: arr });
    },

    toggleFavoriteCelebrityVoice: (voice) => {
      const arr = get().favoriteCelebrityVoices.slice();
      const idx = arr.indexOf(voice);

      if (idx === -1) {
        if (arr.length >= 4) return;
        arr.push(voice);
      } else {
        arr.splice(idx, 1);
      }
      set({ favoriteCelebrityVoices: arr });
      persist(get, { favoriteCelebrityVoices: arr });
    },

    getMtLanguages: () => getLanguagesForModel(mtModels, get().mtModel),
    getTtsVoices: (language: string) =>
      getVoicesForModel(
        getTtsModelsForProvider(get().ttsProvider),
        get().ttsModel,
        language,
      ),
    getAllTtsVoices: () =>
      getAllVoicesForModel(
        getTtsModelsForProvider(get().ttsProvider),
        get().ttsModel,
      ),
    getLabelledTtsVoices: () =>
      getLabelledVoicesForModel(
        getTtsModelsForProvider(get().ttsProvider),
        get().ttsModel,
      ),
    getCelebrityVoices: () =>
      getCelebVoicesForModel(
        getTtsModelsForProvider(get().ttsProvider),
        get().ttsModel,
      ),
    getTtsModels: () => getTtsModelsForProvider(get().ttsProvider),
    getAcLanguages: () => getLanguagesForModel(acModels, get().acModel),

    syncModelDefaults: () => {
      const s = get();
      const updates: Partial<SettingsStore> = {};
      const persistedUpdates: Partial<PersistedSettings> = {};

      if (defaultMT?.name && s.mtModel !== defaultMT.name) {
        updates.mtModel = defaultMT.name;
        persistedUpdates.mtModel = defaultMT.name;
      }

      if (defaultAC?.name && s.acModel !== defaultAC.name) {
        updates.acModel = defaultAC.name;
        persistedUpdates.acModel = defaultAC.name;
      }

      const defaultTtsModelName = defaultTTS?.name ?? "";

      if (
        s.ttsProvider !== defaultTtsProvider ||
        s.ttsModel !== defaultTtsModelName
      ) {
        const firstVoice =
          defaultTTS?.voices?.[Object.keys(defaultTTS?.voices ?? {})[0]]?.[0] ??
          s.ttsVoice;

        updates.ttsProvider = defaultTtsProvider;
        updates.ttsModel = defaultTtsModelName;
        updates.ttsVoice = firstVoice;
        persistedUpdates.ttsProvider = defaultTtsProvider;
        persistedUpdates.ttsModel = defaultTtsModelName;
        persistedUpdates.ttsVoice = firstVoice;
      }

      if (Object.keys(updates).length === 0) return;

      set(updates);
      persist(get, persistedUpdates);
    },

    resetToDefaults: () => {
      const defaults = {
        mtModel: defaultMT?.name ?? "",
        ttsProvider: defaultTtsProvider,
        ttsModel: defaultTTS?.name ?? "",
        ttsVoice: "Juliet",
        voiceSpeed: 1.0,
        voicePitch: 1.0,
        acModel: defaultAC?.name ?? "",
        defaultTranslateLang: "",
        autoLookupOnLanguageChange: true,
        voiceSelectionMode: "auto" as VoiceSelectionMode,
        favoriteVoices: defaultFavoriteVoices,
        favoriteCelebrityVoices: defaultFavoriteCelebrityVoices,
      };

      set(defaults);
      saveSettings(defaults);
    },
  },
}));

/* ─── Exported model lists for UI ─── */
export {
  acModels,
  mtModels,
  ttsModels,
  ttsProviders,
  getTtsModelsForProvider,
  getLanguagesForModel,
};

/** First language of the default MT model (used as initial default language) */
export const defaultMtLanguage: string = defaultMT?.languages?.[0] ?? "English";
