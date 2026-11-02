export type SharedModelCategory =
  | "AC"
  | "MT"
  | "TTS"
  | "ASR"
  | "OCR"
  | "ALI"
  | "VC";

export type SharedVoiceSelectionMode = "auto" | "favorites" | "celebrity";

export const DEFAULT_MODEL_PROVIDER = "hypaai";

export interface ProviderModel {
  name: string;
  default?: boolean;
}

export interface TtsProviderModel extends ProviderModel {
  voices?: Record<string, string[]>;
  celebrityVoices?: string[];
}

export type ProviderMap<TModel extends ProviderModel = ProviderModel> = Record<
  string,
  TModel[]
>;

export function getProviderModelsFromProviderMap<TModel extends ProviderModel>(
  providerMap: ProviderMap<TModel> | undefined,
  provider = DEFAULT_MODEL_PROVIDER,
): TModel[] {
  if (!providerMap) return [];
  return providerMap[provider] ?? [];
}

export function flattenModelsFromProviderMap<TModel extends ProviderModel>(
  providerMap: ProviderMap<TModel> | undefined,
): TModel[] {
  if (!providerMap) return [];
  return Object.values(providerMap).flat();
}

export function getProvidersFromProviderMap<TModel extends ProviderModel>(
  providerMap: ProviderMap<TModel> | undefined,
): string[] {
  if (!providerMap) return [];
  return Object.keys(providerMap);
}

export function resolveDefaultModelFromModels<TModel extends ProviderModel>(
  models: TModel[],
): TModel | undefined {
  return models.find((model) => model.default) ?? models[0];
}

export function resolveDefaultModelFromProviderMap<
  TModel extends ProviderModel,
>(
  providerMap: ProviderMap<TModel> | undefined,
  provider = DEFAULT_MODEL_PROVIDER,
): TModel | undefined {
  return resolveDefaultModelFromModels(
    getProviderModelsFromProviderMap(providerMap, provider),
  );
}

export function resolveDefaultModelNameFromProviderMap<
  TModel extends ProviderModel,
>(
  providerMap: ProviderMap<TModel> | undefined,
  provider = DEFAULT_MODEL_PROVIDER,
): string {
  return resolveDefaultModelFromProviderMap(providerMap, provider)?.name ?? "";
}

/** Keeps a saved model only when it is still in the catalog. Otherwise the
 *  explicit fallback, then the catalog default. */
export function resolveSavedModelName(
  models: readonly ProviderModel[],
  saved?: string | null,
  fallback?: string,
): string {
  const savedName = saved?.trim();
  if (savedName && models.some((model) => model.name === savedName)) {
    return savedName;
  }

  const fallbackName = fallback?.trim();
  if (fallbackName && models.some((model) => model.name === fallbackName)) {
    return fallbackName;
  }

  return resolveDefaultModelFromModels([...models])?.name ?? "";
}

export function findCaseInsensitiveMatch(
  values: string[],
  candidate?: string | null,
): string | null {
  if (!candidate) return null;
  const normalizedCandidate = candidate.trim().toLowerCase();
  return (
    values.find(
      (value) => value.trim().toLowerCase() === normalizedCandidate,
    ) ?? null
  );
}

function getVoicesForModel(
  models: TtsProviderModel[],
  modelName: string,
  language: string,
): string[] {
  const model = models.find((m) => m.name === modelName);
  if (!model?.voices) return [];
  return model.voices[language.toLowerCase()] ?? [];
}

function getCelebVoicesForModel(
  models: TtsProviderModel[],
  modelName: string,
): string[] {
  const model = models.find((m) => m.name === modelName);
  return model?.celebrityVoices ?? [];
}

export function resolveProviderForModelFromProviderMap<
  TModel extends ProviderModel,
>(
  providerMap: ProviderMap<TModel> | undefined,
  modelName: string,
  fallback = "hypaai",
): string {
  if (!providerMap || !modelName) return fallback;

  return (
    Object.entries(providerMap).find(([, models]) =>
      models.some((model) => model.name === modelName),
    )?.[0] ?? fallback
  );
}

export function resolveTtsVoiceForLanguageFromModels(params: {
  language?: string;
  preferredVoice?: string | null;
  modelName: string;
  voiceSelectionMode: SharedVoiceSelectionMode;
  favoriteVoices: string[];
  favoriteCelebrityVoices: string[];
  providerModels: TtsProviderModel[];
}): string {
  const {
    language,
    preferredVoice,
    modelName,
    voiceSelectionMode,
    favoriteVoices,
    favoriteCelebrityVoices,
    providerModels,
  } = params;

  const normalizedLanguage = language?.trim().toLowerCase() || "english";
  const voicesForLanguage = getVoicesForModel(
    providerModels,
    modelName,
    normalizedLanguage,
  );
  const celebrityVoices = getCelebVoicesForModel(providerModels, modelName);
  const allowCelebrityVoice = normalizedLanguage === "english";

  const candidates =
    voiceSelectionMode === "celebrity"
      ? [preferredVoice, ...favoriteCelebrityVoices, ...celebrityVoices]
      : voiceSelectionMode === "favorites"
        ? [preferredVoice, ...favoriteVoices, ...voicesForLanguage]
        : [preferredVoice, ...voicesForLanguage];

  for (const candidate of candidates) {
    const standardMatch = findCaseInsensitiveMatch(
      voicesForLanguage,
      candidate,
    );
    if (standardMatch) return standardMatch;

    if (allowCelebrityVoice) {
      const celebrityMatch = findCaseInsensitiveMatch(
        celebrityVoices,
        candidate,
      );
      if (celebrityMatch) return celebrityMatch;
    }
  }

  return (
    voicesForLanguage[0] ??
    (allowCelebrityVoice ? celebrityVoices[0] : null) ??
    preferredVoice ??
    ""
  );
}
