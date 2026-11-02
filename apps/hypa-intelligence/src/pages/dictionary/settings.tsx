import { useState } from "react";

import {
  Search,
  Palette,
  Info,
  Database,
  Cpu,
  Languages,
  Volume2,
} from "@/lucide-compat";
import {
  SettingsAppearance,
  LanguageDefault,
  SettingsDataManagement,
  SettingsAbout,
  ModelSettings,
  VoiceSettings,
} from "@/components/modules/settings";

/* ─── Settings Page ─── */
const Settings = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("models");

  const settingsTabs = [
    {
      id: "models",
      label: "Models",
      icon: Cpu,
      component: <ModelSettings />,
      keywords: ["model", "ai", "translation", "tts", "speech", "language"],
    },

    {
      id: "language",
      label: "Language",
      icon: Languages,
      component: <LanguageDefault showAutoLookup />,
      keywords: ["language", "default", "search", "source"],
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
      component: <SettingsAppearance />,
      keywords: ["theme", "appearance", "dark", "light", "system"],
    },
    {
      id: "voice",
      label: "Voice",
      icon: Volume2,
      component: <VoiceSettings />,
      keywords: ["voice", "speech", "speed", "pitch", "tts"],
    },

    {
      id: "data",
      label: "Data",
      icon: Database,
      component: <SettingsDataManagement />,
      keywords: ["data", "export", "clear", "reset"],
    },
    {
      id: "about",
      label: "About",
      icon: Info,
      component: <SettingsAbout />,
      keywords: ["about", "version", "support", "contact", "help"],
    },
  ];

  const filteredTabs = searchQuery
    ? settingsTabs.filter(
        (tab) =>
          tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tab.keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : settingsTabs;

  return (
    <div className="container mx-auto px-4 py-8 flex-1 relative">
      {/* Mobile-only close button in header */}
      {/* {typeof window !== 'undefined' &&
        window.innerWidth < 768 &&
        window.history.length > 1 && (
          <button
            onClick={() => window.history.back()}
            className="absolute right-4 top-8 z-[110] p-2 rounded-full bg-[var(--background)] border border-[var(--border)] shadow-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] transition-colors"
            aria-label="Close settings"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )} */}
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-4">
          Settings
        </h1>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted-foreground)]" />
          <input
            className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 pl-10 text-sm outline-none ring-[var(--ring)] focus:ring-2 placeholder:text-[var(--muted-foreground)]"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6 w-full mb-8 h-auto p-1 bg-[var(--muted)]/50 rounded-lg">
        {filteredTabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex flex-col items-center gap-1 p-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--background)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="size-4" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {filteredTabs.map((tab) =>
          activeTab === tab.id ? <div key={tab.id}>{tab.component}</div> : null,
        )}
      </div>

      {/* No results */}
      {filteredTabs.length === 0 && (
        <div className="text-center py-12">
          <Search className="size-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No settings found</h3>
          <p className="text-[var(--muted-foreground)]">
            Try adjusting your search query to find what you&apos;re looking
            for.
          </p>
        </div>
      )}
    </div>
  );
};

export default Settings;
