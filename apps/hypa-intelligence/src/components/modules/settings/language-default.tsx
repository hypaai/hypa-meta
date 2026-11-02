import { useState, useRef, useEffect } from "react";
import { Switch } from "@heroui/switch";

import CardWidth from "./card-width";

import { ChevronDown, Check, Globe } from "@/lucide-compat";
import {
  useAcModelLanguages,
  useModelLanguages,
} from "@/hooks/use-model-languages";
import { useSettingsStore } from "@/stores/settings-store";
import { showToast } from "@/components/shared/toast";

const STORAGE_KEY = "hypa-intelligence-default-language";

// Shared by the dictionary and translate settings pages; only the dictionary
// page shows the auto-lookup toggle.
const LanguageDefault = ({
  showAutoLookup = false,
}: {
  showAutoLookup?: boolean;
}) => {
  const searchModelLanguages = useAcModelLanguages();
  const autoLookupOnLanguageChange = useSettingsStore(
    (s) => s.autoLookupOnLanguageChange,
  );
  const setAutoLookupOnLanguageChange = useSettingsStore(
    (s) => s.actions.setAutoLookupOnLanguageChange,
  );
  const translateModelLanguages = useModelLanguages();
  const defaultTranslateLang = useSettingsStore((s) => s.defaultTranslateLang);
  const setDefaultTranslateLang = useSettingsStore(
    (s) => s.actions.setDefaultTranslateLang,
  );
  const [defaultLang, setDefaultLang] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    // If stored value is still valid for the current model, use it
    if (stored && searchModelLanguages.includes(stored)) return stored;

    // Otherwise fall back to the first language of the model
    return searchModelLanguages[0] || "English";
  });
  const [open, setOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const translateRef = useRef<HTMLDivElement>(null);

  // Reset language when model languages change and stored value is no longer valid
  useEffect(() => {
    if (!searchModelLanguages.includes(defaultLang)) {
      const next = searchModelLanguages[0] || "English";

      setDefaultLang(next);
      localStorage.setItem(STORAGE_KEY, next);
    }
    if (
      defaultTranslateLang &&
      !translateModelLanguages.includes(defaultTranslateLang)
    ) {
      setDefaultTranslateLang("");
    }
  }, [
    searchModelLanguages,
    translateModelLanguages,
    defaultLang,
    defaultTranslateLang,
    setDefaultTranslateLang,
  ]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
      if (
        translateRef.current &&
        !translateRef.current.contains(e.target as Node)
      )
        setTranslateOpen(false);
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (lang: string) => {
    setDefaultLang(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    setOpen(false);
    showToast(`Default search language set to ${lang}`);
  };

  return (
    <CardWidth>
      <h3 className="font-semibold text-base lg:text-2xl xl:text-4xl">
        Language Defaults
      </h3>
      <div className="mt-8 space-y-6">
        <div>
          <h4 className="mb-3 font-medium text-sm lg:text-base">
            Default Search Language
          </h4>
          <p className="text-[var(--muted-foreground)] text-sm mb-4">
            Choose the default language for dictionary searches. You can always
            change it in the search bar.
          </p>
          <div ref={ref} className="relative inline-block">
            <button
              aria-label="Default language selector"
              className="inline-flex min-w-40 lg:w-56 items-center justify-between gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              onClick={() => setOpen(!open)}
            >
              <span className="flex items-center gap-2">
                <Globe className="size-4" />
                {defaultLang}
              </span>
              <ChevronDown className="size-4" />
            </button>

            {open && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-40 lg:w-56 max-h-64 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {searchModelLanguages.map((lang) => (
                  <button
                    key={lang}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] ${
                      defaultLang === lang ? "bg-[var(--accent)]" : ""
                    }`}
                    onClick={() => handleSelect(lang)}
                  >
                    <span className="flex-1 min-w-0 text-left">{lang}</span>
                    {defaultLang === lang && (
                      <Check className="size-4 ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Default Translation Language */}
        <div>
          <h4 className="mb-3 font-medium text-sm lg:text-base">
            Default Translation Language
          </h4>
          <p className="text-[var(--muted-foreground)] text-sm mb-4">
            Choose the default language for translations on the word page. You
            can always change it there.
          </p>
          <div ref={translateRef} className="relative inline-block">
            <button
              aria-label="Default translation language selector"
              className="inline-flex min-w-40 lg:w-56 items-center justify-between gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              onClick={() => setTranslateOpen(!translateOpen)}
            >
              <span className="flex items-center gap-2">
                <Globe className="size-4" />
                {defaultTranslateLang || "None"}
              </span>
              <ChevronDown className="size-4" />
            </button>

            {translateOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-40 lg:w-56 max-h-64 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] ${
                    !defaultTranslateLang ? "bg-[var(--accent)]" : ""
                  }`}
                  onClick={() => {
                    setDefaultTranslateLang("");
                    setTranslateOpen(false);
                    showToast("Default translation language cleared");
                  }}
                >
                  <span className="flex-1 min-w-0 text-left text-[var(--muted-foreground)]">
                    None
                  </span>
                  {!defaultTranslateLang && (
                    <Check className="size-4 ml-auto shrink-0" />
                  )}
                </button>
                {translateModelLanguages.map((lang) => (
                  <button
                    key={lang}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] ${
                      defaultTranslateLang === lang ? "bg-[var(--accent)]" : ""
                    }`}
                    onClick={() => {
                      setDefaultTranslateLang(lang);
                      setTranslateOpen(false);
                      showToast(`Default translation language set to ${lang}`);
                    }}
                  >
                    <span className="flex-1 min-w-0 text-left">{lang}</span>
                    {defaultTranslateLang === lang && (
                      <Check className="size-4 ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {showAutoLookup && (
          <div>
            <h4 className="mb-3 font-medium text-sm lg:text-base">
              Auto-lookup on language change
            </h4>
            <p className="text-[var(--muted-foreground)] text-sm mb-4">
              Look the word up again when you change the dictionary language.
            </p>
            <Switch
              isSelected={autoLookupOnLanguageChange}
              onValueChange={setAutoLookupOnLanguageChange}
            />
          </div>
        )}
      </div>
    </CardWidth>
  );
};

export default LanguageDefault;
