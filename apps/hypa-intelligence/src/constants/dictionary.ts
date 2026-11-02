import { LANGUAGE_CATALOG } from "@hypa/config/language-metadata";
import faqData from "@hypa/config/json/faq";
import appFeaturesData from "@hypa/config/json/features";

export const CONTACT_US_LINK = "https://hypaintelligence.com/#contact";
export const ABOUT_US_LINK = "https://hypaintelligence.com/#about";

type FaqAnswerPart = { text?: string; link?: { text: string } };
export type FaqItem = { q: string; a: string };
export const HELP_FAQ: FaqItem[] = faqData.faqItems.map(
  (item: { question: string; answer: string | FaqAnswerPart[] }) => ({
    q: item.question,
    a: Array.isArray(item.answer)
      ? item.answer
          .map((part: FaqAnswerPart) => part.text ?? part.link?.text ?? "")
          .join("")
      : item.answer,
  }),
);

export type AppFeature = { title: string; description: string };
export const APP_FEATURES: AppFeature[] = appFeaturesData.features;

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
    href: "https://translate.hypaintelligence.com/",
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

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System Default" },
] as const;

/* ─── Dictionary-specific data ─── */

export const STATS = [
  { value: "10+", label: "Languages" },
  { value: "10M+", label: "Words" },
  { value: "6", label: "Continents" },
];

export const REGIONS = [
  { name: "Africa", languages: "2,100+" },
  { name: "Asia", languages: "2,300+" },
  { name: "Europe", languages: "280+" },
  { name: "Pacific", languages: "1,300+" },
  { name: "North America", languages: "1,000+" },
  { name: "South America", languages: "440+" },
];

export type FeaturedLanguage = {
  name: string;
  nativeName: string;
  status: string;
  speakers: string;
  region: string;
  writingSystem: string;
  sampleWords: string[];
};

const FEATURED_LANGUAGE_NAMES: string[] = LANGUAGE_CATALOG.map(
  (lang: { name: string }) => lang.name,
);

const FEATURED_LANGUAGE_META: Record<string, Omit<FeaturedLanguage, "name">> = {
  English: {
    nativeName: "English",
    status: "LIVING",
    speakers: "1.5 billion",
    region: "Global",
    writingSystem: "Latin",
    sampleWords: ["Hello", "World", "Peace", "Love"],
  },
  Yoruba: {
    nativeName: "Èdè Yorùbá",
    status: "LIVING",
    speakers: "45 million",
    region: "West Africa",
    writingSystem: "Latin (modified)",
    sampleWords: ["Ọmọ", "Àṣàntí", "Odún", "Ifẹ́"],
  },
  Igbo: {
    nativeName: "Asụsụ Igbo",
    status: "LIVING",
    speakers: "27 million",
    region: "West Africa",
    writingSystem: "Latin (modified)",
    sampleWords: ["Nnọọ", "Ndeewo", "Ụmụnna"],
  },
  Hausa: {
    nativeName: "Harshen Hausa",
    status: "LIVING",
    speakers: "75 million",
    region: "West Africa",
    writingSystem: "Latin, Arabic (Ajami)",
    sampleWords: ["Sanna", "Nagode", "Gida", "Ruwa"],
  },
  Annang: {
    nativeName: "Annang",
    status: "LIVING",
    speakers: "1 million",
    region: "West Africa",
    writingSystem: "Latin",
    sampleWords: ["Mbok", "Eka", "Edidiana", "Akwa"],
  },
  Efik: {
    nativeName: "Efik",
    status: "LIVING",
    speakers: "400,000",
    region: "West Africa",
    writingSystem: "Latin",
    sampleWords: ["Mbok", "Ete", "Nnyin", "Ke"],
  },
  Ibibio: {
    nativeName: "Ibibio",
    status: "LIVING",
    speakers: "4 million",
    region: "West Africa",
    writingSystem: "Latin",
    sampleWords: ["Emem", "Ufok", "Ndito", "Afo"],
  },
  Tiv: {
    nativeName: "Tiv",
    status: "LIVING",
    speakers: "5 million",
    region: "West Africa",
    writingSystem: "Latin",
    sampleWords: ["Mngu", "Kwagh", "Or", "Tar"],
  },
  Idoma: {
    nativeName: "Idoma",
    status: "LIVING",
    speakers: "600,000",
    region: "West Africa",
    writingSystem: "Latin",
    sampleWords: ["Òyā", "Abọ", "Aje", "Ɔma"],
  },
  Swahili: {
    nativeName: "Kiswahili",
    status: "LIVING",
    speakers: "100 million+",
    region: "East Africa",
    writingSystem: "Latin",
    sampleWords: ["Jambo", "Asante", "Safari", "Hakuna"],
  },
  Zulu: {
    nativeName: "isiZulu",
    status: "LIVING",
    speakers: "12 million",
    region: "Southern Africa",
    writingSystem: "Latin",
    sampleWords: ["Sawubona", "Ngiyabonga", "Ubuntu", "Amahle"],
  },
  Japanese: {
    nativeName: "日本語",
    status: "LIVING",
    speakers: "125 million",
    region: "East Asia",
    writingSystem: "Kanji, Hiragana, Katakana",
    sampleWords: ["言葉", "心", "桜", "和"],
  },
};

export const FEATURED_LANGUAGES: FeaturedLanguage[] =
  FEATURED_LANGUAGE_NAMES.filter((name) => name in FEATURED_LANGUAGE_META).map(
    (name) => ({ name, ...FEATURED_LANGUAGE_META[name] }),
  );

export const ENDANGERED_TAGS = ["WELSH", "NAVAJO"];

export const SEARCH_LANGUAGES = [
  "Auto-Detect",
  ...LANGUAGE_CATALOG.map((lang) => lang.name),
];

export const MISSION_FEATURES = [
  {
    icon: "globe",
    title: "Global Coverage",
    description:
      "From Yoruba to Welsh, Japanese to Navajo — we document languages across every continent.",
  },
  {
    icon: "book",
    title: "Academic Rigor",
    description:
      "Every entry includes etymology, phonetics, cultural context, and cross-linguistic connections.",
  },
  {
    icon: "community",
    title: "Community Driven",
    description:
      "Built with input from native speakers, linguists, and language communities worldwide.",
  },
];

/* ─── All Languages page filters ─── */

export const LANGUAGE_REGION_FILTERS = [
  "All Region",
  "Africa",
  "Asia",
  "Europe",
  "Pacific",
  "North America",
  "South America",
] as const;

export const LANGUAGE_STATUS_FILTERS = ["All Status", "Endangered"] as const;
