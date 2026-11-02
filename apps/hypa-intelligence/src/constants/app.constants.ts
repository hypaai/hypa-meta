// @ts-nocheck
import type { ModelOption } from "@hypa/config/models";
import type { LucideIcon } from "lucide-react";

import { Globe, File, Languages, ImagePlus, Mic } from "lucide-react";
import helpFaqData from "@hypa/config/json/faq.json";
import appFeaturesData from "@hypa/config/json/app-features.json";
import { PRODUCT_MODEL_OPTIONS_BY_CAPABILITY as modelsJson } from "@hypa/config/models";

import packageJson from "../../package.json";

export const hasThinking = (name: string) =>
  TRANSLATION_MODELS.some(
    (model) => model.name == name && model.reasoning == true,
  );

export type VOICES =
  | "auto"
  | "Eniola"
  | "Prince"
  | "Juliet"
  | "Gbemisola"
  | "Emmanuel";

export type Language = {
  code: string;
  name: string;
  voice: VOICES | string;
  voices?: string[];
};

export type { ModelOption } from "@hypa/config/models";

type ProviderMap = Record<string, ModelOption[]>;

function getProviderModels(
  category: ProviderMap | undefined,
  provider: string,
): ModelOption[] {
  return category?.[provider] ?? [];
}

function flattenModels(category: ProviderMap | undefined): ModelOption[] {
  return category ? Object.values(category).flat() : [];
}

function findDefault(models: ModelOption[]): ModelOption | undefined {
  return models.find((m) => m.default) ?? models[0];
}

const modelsConfig = modelsJson;

export const TRANSLATION_MODELS = getProviderModels(modelsConfig.MT, "hypaai");
export const TTS_MODELS = getProviderModels(modelsConfig.TTS, "hypaai");
export const ASR_MODELS = getProviderModels(modelsConfig.ASR, "hypaai");
export const OCR_MODELS = getProviderModels(modelsConfig.OCR, "openai");
export const ALL_TRANSLATION_MODELS = flattenModels(modelsConfig.MT);
export const ALL_TTS_MODELS = flattenModels(modelsConfig.TTS);

export const DEFAULT_TRANSLATION_MODEL = findDefault(TRANSLATION_MODELS);
export const DEFAULT_TTS_MODEL =
  TTS_MODELS.find((model) => model.name === "hypaai-orpheus-v5-pqq") ??
  findDefault(TTS_MODELS);
export const DEFAULT_ASR_MODEL = findDefault(ASR_MODELS);
export const DEFAULT_OCR_MODEL = findDefault(OCR_MODELS);

// Extract languages from the shared package models config.
function extractLanguagesFromModels(): Language[] {
  const allModelLanguages = new Set<string>();

  TRANSLATION_MODELS.forEach((model) => {
    model.languages?.forEach((lang: string) => allModelLanguages.add(lang));
  });

  const ttsVoices = DEFAULT_TTS_MODEL?.voices || {};

  // Map language name to code (lowercase first letter, e.g., "English" -> "english")
  const languageMap: Record<string, Language> = {};

  // Add auto-detect option
  languageMap["auto"] = {
    code: "auto",
    name: "Auto-detect",
    voice: "Juliet",
  };

  // Create Language objects for each model language
  allModelLanguages.forEach((langName: string) => {
    const code = langName.charAt(0).toLowerCase() + langName.slice(1);
    const langKey = code.toLowerCase();

    // Get voices for this language from TTS model
    const voices = ttsVoices[langKey] || [];
    const defaultVoice = voices[0] || "Juliet";

    languageMap[code] = {
      code,
      name: langName,
      voice: defaultVoice,
      ...(voices.length > 0 && { voices }),
    };
  });

  // Return languages as array, with auto-detect first
  return [
    languageMap["auto"],
    ...Object.values(languageMap).filter((lang) => lang.code !== "auto"),
  ];
}

export type Feature = {
  id: "text" | "document" | "website" | "image" | "voice" | "reality";
  label: string;
  icon: LucideIcon;
};

export const FEATURES: Feature[] = [
  { id: "text", label: "Text", icon: Languages },
  { id: "document", label: "Document", icon: File },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "image", label: "Image", icon: ImagePlus },
  { id: "website", label: "Website", icon: Globe },
  { id: "reality", label: "Reality", icon: Globe },
];

// max characters allowed in the text input
export const MAX = 500;

// record duration
export const AUDIO_MAX_DURATION = 50;
export const CONTACT_US_LINK = "https://hypaintelligence.com/#contact";
export const ABOUT_US_LINK = "https://hypaintelligence.com/#about";

export const VOICE_TEST_TEXT_EN =
  "Hello, this is a test of your voice settings.";
export const LANGUAGES: Language[] = extractLanguagesFromModels();

// Filtered language arrays for specific use cases
export const SOURCE_LANGUAGES: Language[] = LANGUAGES; // Includes auto-detect
export const TARGET_LANGUAGES: Language[] = LANGUAGES.filter(
  (lang) => lang.code !== "auto",
); // Excludes auto-detect

type FaqAnswerPart = string | { text?: string; link?: { text?: string } };

function stringifyFaqAnswer(answer: string | FaqAnswerPart[]): string {
  if (typeof answer === "string") return answer;

  return answer
    .map((part) => {
      if (typeof part === "string") return part;

      return part.text ?? part.link?.text ?? "";
    })
    .join("");
}

export type FaqItem = { q: string; a: string };
export const HELP_FAQ: FaqItem[] = (helpFaqData.faqItems || []).map((item) => ({
  q: item.question,
  a: stringifyFaqAnswer(item.answer),
}));

export type AppFeature = { id: string; title: string; description: string };
export const APP_FEATURES: AppFeature[] = appFeaturesData.features || [];

export const PRODUCTS = [
  {
    id: "hypaintelligence",
    name: "Intelligence",
    href: "https://intelligence.hypaintelligence.com",
  },
  {
    id: "hypadictionary",
    name: "Dictionary",
    href: "https://dictionary.hypaintelligence.com/",
  },
  {
    id: "hypatranslate",
    name: "Translate",
    href: "https://chromewebstore.google.com/search/Hypa%20Translate?hl=en-US&utm_source=ext_sidebar",
  },
  {
    id: "hypalab",
    name: "Lab",
    href: "https://labs.hypaintelligence.com",
  },
  {
    id: "hypa",
    name: "Website",
    href: "https://hypaintelligence.com",
  },
  {
    id: "hypamarket",
    name: "Market",
    href: "https://market.hypaintelligence.com/",
  },
  {
    id: "hypakeyboard",
    name: "Keyboard",
    href: "https://intelligence.hypaintelligence.com/#get-app",
  },
  {
    id: "hypachat",
    name: "Chat",
    href: "https://hypachat.com/chat",
  },
  {
    id: "hypasocials",
    name: "Socials",
    href: "https://hypaintelligence.com/socials",
  },
  {
    id: "hypachain",
    name: "Chain",
    href: "https://chain.hypaintelligence.com/",
  },
  {
    id: "hypareality",
    name: "Reality",
    href: "https://reality.hypaintelligence.com/",
  },
  {
    id: "hypacast",
    name: "Cast",
    href: "https://cast.hypaintelligence.com/",
  },
];

export const behaviourSettings = [
  // {
  //   key: "enableInlineTranslation",
  //   name: "Enable inline translation",
  //   explanation:
  //     "Show translate icon when text is selected on webpages (150 characters or less)",
  // },
  // {
  //   key: "enableTranslateReplace",
  //   name: "Enable translate & replace in text fields",
  //   explanation:
  //     "Allow translating and replacing selected text directly in input fields and text areas",
  // },
  // {
  //   key: "autoTranslateSelected",
  //   name: "Auto-translate selected text",
  //   explanation:
  //     "Automatically translate when text is selected via context menu or keyboard shortcut",
  // },
  {
    key: "autoPlayAudio",
    name: "Auto-play audio after translation",
    explanation:
      "Automatically play text-to-speech audio when translation completes",
  },
  {
    key: "autoTranslateOnLanguageChange",
    name: "Auto-translate on language change",
    explanation:
      "Automatically translate input text when you change the target language",
  },
];

// Extract all voices from the default TTS model
function extractVoicesFromModels(): string[] {
  const ttsVoices = DEFAULT_TTS_MODEL?.voices || {};

  const allVoices = new Set<string>();

  Object.values(ttsVoices).forEach((voices) => {
    if (Array.isArray(voices)) {
      voices.forEach((voice: string) => allVoices.add(voice));
    }
  });

  return Array.from(allVoices).sort();
}

export const VOICE_OPTIONS = extractVoicesFromModels();

// Create voice select options from languages
export const VOICE_SELECT_OPTIONS: {
  value: string;
  label: string;
  language?: string;
}[] = LANGUAGES.filter(
  (lang) => lang.code !== "auto" && lang.voices && lang.voices.length > 0,
)
  .map((lang) => {
    const languageName = lang.name || lang.code;
    const voices = lang.voices ?? [];

    return voices.map((v: string) => ({
      value: v,
      label: `${v} — ${languageName}`,
      language: languageName,
    }));
  })
  .flat()
  .sort((a, b) => a.label.localeCompare(b.label));
// "Lucky",
// "Linda",
// "Faith",
// "Charisma", "Immaculate", "Lawal", "Semiah", "Remi", "Chidi", "Tochi", "Maryam",
// "Shittu", "Kolade", "Adewale", "Devine", "Deborah", "Danjuma", "Lovelyn",
// "Precious", "Gift", "Cynthia", "Adams", "Abiola", "Khadijah", "Hafizat",

export const HISTORY_OPTIONS = [10, 30, 50, 100];

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System Default" },
] as const;

export const APP_VERSION = packageJson.version;
