import catalog from "./json/models.json" with { type: "json" };
import languageNames from "./json/language-names.json" with { type: "json" };
import { DEPLOYMENT_CONTEXT_WINDOWS } from "@hypa/config/request-policy";

export const CAPABILITIES = [
  "AC",
  "MT",
  "TTS",
  "ASR",
  "OCR",
  "ALI",
  "VC",
  "IMG",
] as const;
export type ModelCapability = (typeof CAPABILITIES)[number];

export interface ModelRate {
  capabilities: ModelCapability[];
  inputPerMillionTokens?: number;
  outputPerMillionTokens?: number;
  inputPerMillionAudioTokens?: number;
  outputPerMillionAudioTokens?: number;
  perMillionCharacters?: number;
  perAudioMinute?: number;
  perImage?: number;
  voiceEnrollmentFee?: number;
}

export interface ModelDefinition {
  name: string;
  displayName?: string;
  capabilities: ModelCapability[];
  defaults?: ModelCapability[];
  baseApiUrl?: string;
  modelCardUrl?: string;
  languages: string[];
  rates: ModelRate[];
  reasoning?: boolean;
  reasoningEffort?: string;
  fixedTemperature?: number;
  openingThinkTag?: string | null;
  closingThinkTag?: string | null;
  contextWindow?: number;
  placeholders?: string[];
  voices?: Record<string, string[]>;
  celebrityVoices?: string[];
  apiKeyEnv?: string;
  servedModelName?: string;
  timeoutMs?: number;
  requiresSourceLanguage?: boolean;
  notes?: string;
  tools?: boolean;
  /** Chat accepts an image part. Other assistant models read images with OCR. */
  vision?: boolean;
}

export type ModelsByProvider = Record<string, ModelDefinition[]>;
export type CapabilityModel = ModelDefinition & { default: boolean };
export type ModelOption = CapabilityModel & { languageCodes: string[] };
export type CapabilityMap<T> = Record<ModelCapability, Record<string, T[]>>;

export const MODEL_CATALOG = catalog;
export const MODELS = Object.fromEntries(
  Object.entries(catalog.models).map(([provider, entries]) => [
    provider,
    entries.map((entry) => {
      const model = entry as ModelDefinition;
      const deployed = DEPLOYMENT_CONTEXT_WINDOWS[model.baseApiUrl ?? ""];
      return deployed
        ? { ...model, contextWindow: Math.min(model.contextWindow ?? deployed, deployed) }
        : model;
    }),
  ]),
) as ModelsByProvider;

export function getLanguageName(code: string): string {
  const name = (languageNames as Record<string, string>)[code];
  if (!name) throw new Error(`Unknown model language code: ${code}`);
  return name;
}

// Keep one selector option when multiple provider codes have the same label.
export function getModelLanguageOptions(
  model: Pick<ModelDefinition, "languages">,
) {
  const seen = new Set<string>();
  const languageCodes = model.languages.filter((code) => {
    const name = getLanguageName(code);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
  return { languages: languageCodes.map(getLanguageName), languageCodes };
}

export function groupModelsByCapability(
  models: ModelsByProvider,
): CapabilityMap<CapabilityModel> {
  const result = Object.fromEntries(
    CAPABILITIES.map((capability) => [capability, {}]),
  ) as CapabilityMap<CapabilityModel>;
  for (const [provider, entries] of Object.entries(models)) {
    for (const entry of entries) {
      for (const capability of entry.capabilities) {
        (result[capability][provider] ??= []).push({
          ...entry,
          default: entry.defaults?.includes(capability) ?? false,
        });
      }
    }
  }
  return result;
}

export const MODELS_BY_CAPABILITY = groupModelsByCapability(MODELS);

export function isContributorModel(provider: string, model: string): boolean {
  return provider === "meta" && model.endsWith("-contributor");
}

// Contributor models remain available in the developer catalog and Lab only.
export const PRODUCT_MODELS_BY_CAPABILITY = groupModelsByCapability(
  Object.fromEntries(
    Object.entries(MODELS).map(([provider, models]) => [
      provider,
      models.filter((model) => !isContributorModel(provider, model.name)),
    ]),
  ),
);

function modelOptions(
  modelsByCapability: CapabilityMap<CapabilityModel>,
): CapabilityMap<ModelOption> {
  return Object.fromEntries(
    CAPABILITIES.map((capability) => [
      capability,
      Object.fromEntries(
        Object.entries(modelsByCapability[capability]).map(
          ([provider, models]) => [
            provider,
            models.map(
              (model): ModelOption => ({
                ...model,
                ...getModelLanguageOptions(model),
              }),
            ),
          ],
        ),
      ),
    ]),
  ) as CapabilityMap<ModelOption>;
}

// Providers the API can prompt for a translation explanation (/mt/thinking).
// A provider missing here, such as a native MT API, cannot explain.
const EXPLANATION_PROVIDERS = new Set(["hypaai", "openai", "google"]);

export function supportsExplanation(provider: string): boolean {
  return EXPLANATION_PROVIDERS.has(provider);
}

/** Auto Router never picks custom or contributor models. */
export function isAutoRoutableModel(provider: string, model: string): boolean {
  return provider !== "custom" && !model.endsWith("-contributor");
}

const mtLanguageCodes = Array.from(
  new Set(
    Object.entries(MODELS_BY_CAPABILITY.MT)
      .flatMap(([provider, models]) =>
        models.filter((model) => isAutoRoutableModel(provider, model.name)),
      )
      .flatMap((model) => model.languages),
  ),
);
const autoRouterLanguages = getModelLanguageOptions({
  languages: mtLanguageCodes,
});

/**
 * Auto Router is a product choice, not a billable provider model. Keep it out
 * of MODELS_BY_CAPABILITY so backend validation and pricing continue to use
 * only real catalog entries, while every Translate client receives the option
 * through the same shared selector configuration.
 */
const createAutoModel = (
  capabilities: ModelCapability[],
  languages: ReturnType<typeof getModelLanguageOptions>,
): ModelOption => ({
  name: "auto",
  displayName: "Auto",
  capabilities,
  defaults: [],
  default: true,
  ...languages,
  rates: [],
});

export const AUTO_ROUTER_MODEL = createAutoModel(["MT"], autoRouterLanguages);

const autoSpeechLanguages = getModelLanguageOptions({
  languages: Array.from(
    new Set(
      (["TTS", "ASR"] as const).flatMap((capability) =>
        Object.entries(MODELS_BY_CAPABILITY[capability])
          .flatMap(([provider, models]) =>
            models.filter((model) => isAutoRoutableModel(provider, model.name)),
          )
          .flatMap((model) => model.languages),
      ),
    ),
  ),
});

export const AUTO_SPEECH_MODEL = createAutoModel(
  ["TTS", "ASR"],
  autoSpeechLanguages,
);

export function resolveSpeechModelName(
  selectionEnabled: boolean,
  modelName?: string,
): string | undefined {
  return selectionEnabled ? modelName : AUTO_SPEECH_MODEL.name;
}

function withAutoRouter(
  options: CapabilityMap<ModelOption>,
): CapabilityMap<ModelOption> {
  options.MT.hypaai = [AUTO_ROUTER_MODEL, ...(options.MT.hypaai ?? [])];
  options.TTS.hypaai = [AUTO_SPEECH_MODEL, ...(options.TTS.hypaai ?? [])];
  options.ASR.hypaai = [AUTO_SPEECH_MODEL, ...(options.ASR.hypaai ?? [])];
  return options;
}

/** Real catalog entries only, for Lab where Auto is its own provider. */
export const CATALOG_MODEL_OPTIONS_BY_CAPABILITY =
  modelOptions(MODELS_BY_CAPABILITY);
export const MODEL_OPTIONS_BY_CAPABILITY = withAutoRouter(
  modelOptions(MODELS_BY_CAPABILITY),
);
export const PRODUCT_MODEL_OPTIONS_BY_CAPABILITY = withAutoRouter(
  modelOptions(PRODUCT_MODELS_BY_CAPABILITY),
);

export function getProductModelsForCapability(
  capability: ModelCapability,
  provider?: string,
): CapabilityModel[] {
  const providers = PRODUCT_MODEL_OPTIONS_BY_CAPABILITY[capability];
  return provider
    ? (providers[provider] ?? [])
    : Object.values(providers).flat();
}

/** Assistant pickers list only these. Contributor models are never included. */
export function getAssistantModels(provider?: string): CapabilityModel[] {
  const names = provider ? [provider] : Object.keys(MODELS);
  return names.flatMap((name) =>
    (MODELS[name] ?? [])
      .filter(
        (model) =>
          model.tools === true && !isContributorModel(name, model.name),
      )
      .map((model) => ({
        ...model,
        default: model.defaults?.includes("AC") ?? false,
      })),
  );
}

export function isAssistantModel(provider: string, model: string): boolean {
  if (isContributorModel(provider, model)) return false;
  return supportsToolCalling(provider, model);
}

/** Tool capability for Lab, independent of consumer-product eligibility. */
export function supportsToolCalling(provider: string, model: string): boolean {
  const row = MODELS[provider]?.find((entry) => entry.name === model);
  return row?.tools === true;
}

export function getModelsForCapability(
  capability: ModelCapability,
  provider?: string,
): CapabilityModel[] {
  const providers = MODEL_OPTIONS_BY_CAPABILITY[capability];
  return provider
    ? (providers[provider] ?? [])
    : Object.values(providers).flat();
}

export function getModelRate(
  model: ModelDefinition,
  capability: ModelCapability,
): ModelRate {
  const matches = model.rates.filter((rate) =>
    rate.capabilities.includes(capability),
  );
  if (!model.capabilities.includes(capability) || matches.length !== 1) {
    throw new Error(
      `${model.name}: expected exactly one rate for ${capability}`,
    );
  }
  return matches[0];
}

/** First row with this name across every provider. Names are unique in the catalog. */
export function findModelByName(
  name?: string | null,
): ModelDefinition | undefined {
  if (!name) return undefined;
  for (const entries of Object.values(MODELS)) {
    const match = entries.find((entry) => entry.name === name);
    if (match) return match;
  }
  return undefined;
}

/**
 * A row whose baseApiUrl is a WebSocket is served by a live session, not by a
 * request/response call: it can only be used over the developer WS gateway and
 * must never be handed to an HTTP endpoint. Mirrors how google-models.ts derives
 * behaviour from baseApiUrl.
 */
export function isStreamingModel(
  model?: { baseApiUrl?: string } | null,
): boolean {
  return /^wss?:\/\//i.test(model?.baseApiUrl ?? "");
}
