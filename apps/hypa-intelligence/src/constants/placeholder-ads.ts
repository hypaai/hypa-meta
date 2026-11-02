// @ts-nocheck
/**
 * Rotating placeholder messages for the translation input textarea.
 * These are mixed in with model-specific placeholders.
 * Update this file anytime to add/remove/change messages.
 */

export interface PlaceholderAd {
  /** The text shown in the placeholder */
  text: string;
  /** Category for potential filtering/styling in the future */
  category: "promo" | "announcement" | "fun-fact";
  /** Optional description to be shown in the toast notification */
  description?: string;
  /** Optional action button configuration */
  action?: {
    label: string;
    url: string;
  };
}

export const placeholderAds: PlaceholderAd[] = [
  // ── Promos & Announcements ────────────────────────────────
  {
    text: "📱 Mobile app coming soon — stay tuned!",
    category: "promo",
  },
  {
    text: "🌐 Download our Chrome Extension on the Chrome Web Store!",
    category: "promo",
    description:
      "Translate content directly in your browser with our extension.",
    action: {
      label: "Download",
      url: "https://chromewebstore.google.com/detail/hypa-intelligence/phokhpemncdemfdojbmoadodppgflcdj",
    },
  },
  {
    text: "🗣️ New languages coming soon — any requests?",
    category: "announcement",
  },
  {
    text: "⭐ Enjoying the app? Share it with a friend!",
    category: "promo",
  },
  {
    text: "🔔 Sign up to get notified when the mobile app launches!",
    category: "promo",
  },

  // ── Fun Facts: Languages ──────────────────────────────────
  {
    text: "🌍 There are over 7,000 languages spoken worldwide today.",
    category: "fun-fact",
  },
  {
    text: "📖 Mandarin Chinese has the most native speakers in the world.",
    category: "fun-fact",
  },
  {
    text: "🇵🇬 Papua New Guinea has 840+ languages — the most of any country!",
    category: "fun-fact",
  },
  {
    text: "🤯 The English word 'set' has over 430 different definitions.",
    category: "fun-fact",
  },
  {
    text: "🔤 Khmer (Cambodian) has the largest alphabet with 74 letters.",
    category: "fun-fact",
  },
  {
    text: "🗨️ About half the world's population is bilingual or multilingual.",
    category: "fun-fact",
  },
  {
    text: "📝 Korean's Hangul alphabet was invented by a single person — King Sejong.",
    category: "fun-fact",
  },
  {
    text: "🇪🇸 Spanish is the official language in 20 countries.",
    category: "fun-fact",
  },

  // ── Fun Facts: Cultures ───────────────────────────────────
  {
    text: "🎌 In Japan, slurping noodles is a sign of appreciation.",
    category: "fun-fact",
  },
  {
    text: "🇮🇳 India has 22 officially recognized languages and hundreds more.",
    category: "fun-fact",
  },
  {
    text: "🇧🇷 Brazil is the only Portuguese-speaking country in the Americas.",
    category: "fun-fact",
  },
  {
    text: "🤝 A thumbs-up gesture is considered rude in some Middle Eastern cultures.",
    category: "fun-fact",
  },
  {
    text: "🇪🇹 Ethiopia follows a calendar that is 7-8 years behind the Gregorian one.",
    category: "fun-fact",
  },
  {
    text: "🌸 The word 'emoji' comes from Japanese: e (picture) + moji (character).",
    category: "fun-fact",
  },
  {
    text: "🇫🇷 French was the international language of diplomacy for centuries.",
    category: "fun-fact",
  },
  {
    text: "🇳🇬 Nigeria has over 500 living languages.",
    category: "fun-fact",
  },
];
