import { useEffect, useRef, useState, Suspense, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  ArrowRight,
  Loader2,
  Search,
  X,
  Volume2,
  Square,
} from "@/lucide-compat";
import { useAcModelLanguages } from "@/hooks/use-model-languages";
import Globe3D from "@/components/modules/dictionary/globe-3d";
import { ModelLanguagePicker } from "@/components/shared/model-language-picker";
import { useDictionarySearch } from "@/providers/dictionary-search-provider";
import { GetAppButtons } from "@hypa/ui/web";
import { useSettingsStore } from "@/stores/settings-store";
import { useSynthesize } from "@/hooks/use-synthesize";
import {
  buildDictionaryResultSpeech,
  buildSectionSpeech,
  buildTypedItemSpeech,
  // buildWordOnlySpeech,
} from "@/lib/dictionary-speech";

// Written by Settings → Language → Default Search Language.
const DEFAULT_LANGUAGE_STORAGE_KEY = "hypa-intelligence-default-language";

const HeroSection = () => {
  const [word, setWord] = useState("");
  const searchAreaRef = useRef<HTMLDivElement | null>(null);
  const [dropupMaxHeight, setDropupMaxHeight] = useState<number | null>(null);
  const modelLanguages = useAcModelLanguages();

  const [selectedLang, setSelectedLang] = useState(() => {
    const stored = localStorage.getItem(DEFAULT_LANGUAGE_STORAGE_KEY);

    // Only honour a stored default the current model still supports.
    if (stored && modelLanguages.includes(stored)) return stored;

    return modelLanguages[0] || "English";
  });
  const prevLangRef = useRef(selectedLang);
  // The word the last lookup actually sent: re-running on a language change
  // must use this, not whatever the input holds at pick time.
  const searchedWordRef = useRef("");
  const autoLookupOnLanguageChange = useSettingsStore(
    (s) => s.autoLookupOnLanguageChange,
  );
  const {
    searchResult: searchResponse,
    searchError,
    isSearching,
    isSearchError,
    search,
    resetSearch,
  } = useDictionarySearch();
  const {
    synthesize,
    isLoading: isSynthesizing,
    isPlaying,
    stop,
  } = useSynthesize();

  const {
    synthesize: synthesizeDefinitions,
    isLoading: isDefinitionsSynthesizing,
    isPlaying: isDefinitionsPlaying,
    stop: stopDefinitions,
  } = useSynthesize();
  const {
    synthesize: synthesizeUsage,
    isLoading: isUsageSynthesizing,
    isPlaying: isUsagePlaying,
    stop: stopUsage,
  } = useSynthesize();
  const {
    synthesize: synthesizeSynonyms,
    isLoading: isSynonymsSynthesizing,
    isPlaying: isSynonymsPlaying,
    stop: stopSynonyms,
  } = useSynthesize();
  const {
    synthesize: synthesizeAntonyms,
    isLoading: isAntonymsSynthesizing,
    isPlaying: isAntonymsPlaying,
    stop: stopAntonyms,
  } = useSynthesize();

  const runSearch = () => {
    if (isSearching) return;

    const trimmed = word.trim();

    if (!trimmed) return;
    searchedWordRef.current = trimmed;
    search({ word: trimmed, language: selectedLang });
  };

  const handleKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key == "Enter") runSearch();
  };

  const reset = () => {
    searchedWordRef.current = "";
    resetSearch();
  };

  // Language path: re-look-up the word already in play when the language changes.
  useEffect(() => {
    const changed =
      prevLangRef.current.toLowerCase() !== selectedLang.toLowerCase();

    prevLangRef.current = selectedLang;
    if (!changed || !autoLookupOnLanguageChange) return;

    const trimmed = searchedWordRef.current.trim();

    if (!trimmed || isSearching) return;

    const timeout = setTimeout(() => {
      search({ word: trimmed, language: selectedLang });
    }, 300);

    return () => clearTimeout(timeout);
  }, [selectedLang]);

  useEffect(() => {
    const updateDropupMaxHeight = () => {
      const searchArea = searchAreaRef.current;

      if (!searchArea) {
        setDropupMaxHeight(null);

        return;
      }

      const navbar = document.querySelector("header");
      const searchAreaRect = searchArea.getBoundingClientRect();
      const navbarBottom = navbar?.getBoundingClientRect().bottom ?? 0;
      const availableSpace = Math.floor(searchAreaRect.top - navbarBottom - 12);

      setDropupMaxHeight(availableSpace > 0 ? availableSpace : null);
    };

    updateDropupMaxHeight();

    window.addEventListener("resize", updateDropupMaxHeight);
    window.addEventListener("scroll", updateDropupMaxHeight, { passive: true });

    return () => {
      window.removeEventListener("resize", updateDropupMaxHeight);
      window.removeEventListener("scroll", updateDropupMaxHeight);
    };
  }, [searchResponse, isSearching, isSearchError]);

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-10 md:pb-20 ">
      {/* 3D Interactive Globe */}
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center mb-6"
        initial={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Suspense
          fallback={
            <div className="flex h-[280px] w-[280px] md:h-[380px] md:w-[380px] items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
            </div>
          }
        >
          <Globe3D className="h-[420px] w-[420px] md:mt-0 mt-5" />
        </Suspense>
      </motion.div>

      {/* Centered: search bar + icons */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl px-2 "
        initial={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Search area wrapper — result dropup + search bar */}
        <div
          ref={searchAreaRef}
          className="relative mt-10"
          id="hero-search-area"
        >
          {/* Result dropup panel */}

          <AnimatePresence>
            {(searchResponse || isSearching || isSearchError) && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 right-0 mb-2 z-40"
                exit={{ opacity: 0, y: 16 }}
                initial={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className="relative max-h-[65vh] overflow-y-auto rounded-md border border-[#767676] bg-[#F2F2F2] shadow-2xl [scrollbar-width:none] dark:border-[#555] dark:bg-[#1a1a1a] [&::-webkit-scrollbar]:hidden"
                  style={
                    dropupMaxHeight
                      ? { maxHeight: `${dropupMaxHeight}px` }
                      : undefined
                  }
                >
                  {/* Close button */}
                  <button
                    className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
                    title="Close"
                    onClick={reset}
                  >
                    <X className="size-4 text-[var(--muted-foreground)]" />
                  </button>
                  {/* Loading */}
                  {isSearching && (
                    <div className="flex flex-col items-center justify-center py-14 px-6">
                      <Loader2 className="size-6 animate-spin text-[var(--muted-foreground)]" />
                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                        Looking up &ldquo;{word}&rdquo; in {selectedLang}...
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {isSearchError && !isSearching && (
                    <div className="flex flex-col items-center justify-center py-14 px-6">
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {searchError ??
                          `Could not find "${word}". Try another word.`}
                      </p>
                    </div>
                  )}

                  {/* Result content */}
                  {searchResponse && !isSearching && (
                    <div className="px-6 py-5 bg">
                      <>
                        {/* Word title + speaker + bookmark */}
                        <div className="flex rounded-md items-center gap-2 mb-0.5">
                          <h2 className="text-xl font-semibold capitalize">
                            {searchResponse.word}
                          </h2>
                          {isPlaying ? (
                            <button
                              className="p-0.5 rounded-full hover:bg-[var(--accent)] transition-colors"
                              title="Stop"
                              onClick={stop}
                            >
                              <Square className="size-4 fill-[var(--foreground)] text-[var(--foreground)]" />
                            </button>
                          ) : (
                            <button
                              className="p-0.5 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                              disabled={isSynthesizing}
                              title={
                                isSynthesizing
                                  ? "Loading..."
                                  : "Listen to result"
                              }
                              onClick={() =>
                                synthesize(
                                  buildDictionaryResultSpeech(searchResponse),
                                  selectedLang,
                                )
                              }
                            >
                              {isSynthesizing ? (
                                <Loader2 className="size-4 animate-spin text-[var(--muted-foreground)]" />
                              ) : (
                                <Volume2 className="size-4 text-[var(--muted-foreground)]" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Definitions by part of speech */}
                        {(searchResponse?.definitions?.length ?? 0) > 0 && (
                          <div className="space-y-1 mb-4">
                            <div className="mb-1 flex items-center gap-1.5">
                              <p className="mb-0 leading-none text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                                Definition:
                              </p>
                              {isDefinitionsPlaying ? (
                                <button
                                  className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)]"
                                  title="Stop"
                                  onClick={stopDefinitions}
                                >
                                  <Square className="size-3.5 fill-[var(--foreground)] text-[var(--foreground)]" />
                                </button>
                              ) : (
                                <button
                                  className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
                                  disabled={isDefinitionsSynthesizing}
                                  title="Listen to definitions"
                                  onClick={() =>
                                    synthesizeDefinitions(
                                      buildSectionSpeech(
                                        "Definition",
                                        searchResponse.definitions
                                          ?.map(buildTypedItemSpeech)
                                          .join(". ") ?? "",
                                      ),
                                      selectedLang,
                                    )
                                  }
                                >
                                  {isDefinitionsSynthesizing ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Volume2 className="size-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            {searchResponse?.definitions?.map((def, i) => (
                              <p
                                key={i}
                                className="text-[13px] leading-relaxed"
                              >
                                {def.type && (
                                  <span className="font-bold italic">
                                    {def.type}:{" "}
                                  </span>
                                )}
                                <span className="text-[var(--muted-foreground)]">
                                  {def.text}
                                </span>
                              </p>
                            ))}
                          </div>
                        )}
                        {/* Divider */}
                        <hr className="border-[var(--border)] mb-3" />
                        {/* Usage Examples */}
                        {searchResponse?.usage &&
                          searchResponse.usage.length > 0 && (
                            <div className="mb-4">
                              <div className="mb-1.5 flex items-center gap-2">
                                <h3 className="text-[13px] font-bold">
                                  Usage Example
                                </h3>
                                {isUsagePlaying ? (
                                  <button
                                    className="p-0.5 rounded-full hover:bg-[var(--accent)] transition-colors"
                                    title="Stop"
                                    onClick={stopUsage}
                                  >
                                    <Square className="size-3 fill-[var(--foreground)] text-[var(--foreground)]" />
                                  </button>
                                ) : (
                                  <button
                                    className="p-0.5 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                                    disabled={isUsageSynthesizing}
                                    title="Listen to usage examples"
                                    onClick={() =>
                                      synthesizeUsage(
                                        buildSectionSpeech(
                                          "Usage Example",
                                          searchResponse.usage
                                            ?.map(buildTypedItemSpeech)
                                            .join(". ") ?? "",
                                        ),
                                        selectedLang,
                                      )
                                    }
                                  >
                                    {isUsageSynthesizing ? (
                                      <Loader2 className="size-3 animate-spin text-[var(--muted-foreground)]" />
                                    ) : (
                                      <Volume2 className="size-3 text-[var(--muted-foreground)]" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1 pl-1">
                                {searchResponse.usage.map((ue, i) => (
                                  <p
                                    key={i}
                                    className="text-[12px] leading-relaxed"
                                  >
                                    {ue.type && (
                                      <span className="font-semibold">
                                        • {ue.type}{" "}
                                      </span>
                                    )}
                                    <span className="italic text-[var(--muted-foreground)]">
                                      {ue.text}
                                    </span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Divider */}
                        {((searchResponse?.syms?.length ?? 0) > 0 ||
                          (searchResponse?.antm?.length ?? 0) > 0) && (
                          <hr className="border-[var(--border)] mb-3" />
                        )}
                        {/* Synonyms */}
                        {Array.isArray(searchResponse?.syms) &&
                          searchResponse?.syms?.length > 0 && (
                            <div className="mb-1.5">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-[12px] font-bold">
                                  Synonyms:
                                </span>
                                {isSynonymsPlaying ? (
                                  <button
                                    className="p-0.5 rounded-full hover:bg-[var(--accent)] transition-colors"
                                    title="Stop"
                                    onClick={stopSynonyms}
                                  >
                                    <Square className="size-3 fill-[var(--foreground)] text-[var(--foreground)]" />
                                  </button>
                                ) : (
                                  <button
                                    className="p-0.5 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                                    disabled={isSynonymsSynthesizing}
                                    title="Listen to synonyms"
                                    onClick={() =>
                                      synthesizeSynonyms(
                                        buildSectionSpeech(
                                          "Synonyms",
                                          searchResponse.syms?.join(", ") ?? "",
                                        ),
                                        selectedLang,
                                      )
                                    }
                                  >
                                    {isSynonymsSynthesizing ? (
                                      <Loader2 className="size-3 animate-spin text-[var(--muted-foreground)]" />
                                    ) : (
                                      <Volume2 className="size-3 text-[var(--muted-foreground)]" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <p className="text-[12px] leading-relaxed">
                                <span className="text-[var(--muted-foreground)] italic">
                                  {searchResponse.syms.join(", ")}
                                </span>
                              </p>
                            </div>
                          )}
                        {/* Antonyms + See More */}
                        <div className="flex items-start justify-between gap-4">
                          {Array.isArray(searchResponse?.antm) &&
                            searchResponse?.antm.length > 0 && (
                              <div>
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-[12px] font-bold">
                                    Antonyms:
                                  </span>
                                  {isAntonymsPlaying ? (
                                    <button
                                      className="p-0.5 rounded-full hover:bg-[var(--accent)] transition-colors"
                                      title="Stop"
                                      onClick={stopAntonyms}
                                    >
                                      <Square className="size-3 fill-[var(--foreground)] text-[var(--foreground)]" />
                                    </button>
                                  ) : (
                                    <button
                                      className="p-0.5 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                                      disabled={isAntonymsSynthesizing}
                                      title="Listen to antonyms"
                                      onClick={() =>
                                        synthesizeAntonyms(
                                          buildSectionSpeech(
                                            "Antonyms",
                                            searchResponse.antm?.join(", ") ??
                                              "",
                                          ),
                                          selectedLang,
                                        )
                                      }
                                    >
                                      {isAntonymsSynthesizing ? (
                                        <Loader2 className="size-3 animate-spin text-[var(--muted-foreground)]" />
                                      ) : (
                                        <Volume2 className="size-3 text-[var(--muted-foreground)]" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                <p className="text-[12px] leading-relaxed">
                                  <span className="text-[var(--muted-foreground)] italic">
                                    {searchResponse.antm.join(", ")}
                                  </span>
                                </p>
                              </div>
                            )}
                          <a
                            className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold hover:underline transition-colors ml-auto"
                            href={`https://dictionary.hypaintelligence.com/word/${encodeURIComponent(searchResponse.word)}?lang=${encodeURIComponent(selectedLang)}`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            See More <ArrowRight className="size-3.5" />
                          </a>
                        </div>
                      </>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search bar */}
          <div className="flex items-center md:h-[66px] mx-1 sm:mx-4 rounded-xl border border-[#767676] dark:border-[#555] shadow-xl mt-1">
            {/* Language selector */}
            <ModelLanguagePicker
              autoSelectFirst
              buttonClassName="md:h-16 rounded-l-xl gap-1.5 sm:gap-2 border-r border-[#767676] bg-[#F2F2F2] px-3 py-3 text-sm font-medium transition-colors hover:bg-[#e8e8e8] dark:border-[#555] dark:bg-[#2a2a2a] dark:hover:bg-[#333] sm:px-4"
              containerClassName="relative z-50"
              disabled={isSearching}
              itemClassName="px-4 py-2.5"
              menuClassName="-left-px bottom-full mb-3 w-[calc(100%+12px)] max-h-64 border-[#767676] bg-[#F2F2F2] dark:border-[#555] dark:bg-[#2a2a2a]"
              menuPlacement="top"
              modelSource="ac"
              selectedCheckClassName="size-4"
              value={selectedLang}
              onValueChange={setSelectedLang}
            />
            {/* Search input */}
            <input
              className="flex-1 min-w-0 md:h-16 bg-[#DADADA] dark:bg-[#1e1e1e] px-3 sm:px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground)] placeholder:text-ellipsis"
              placeholder="Search any word in any language."
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {/* Search button */}
            <button
              className="flex items-center justify-center md:h-16 px-3 sm:px-4 py-3 rounded-r-xl bg-[#DADADA] dark:bg-[#1e1e1e] transition-colors hover:bg-[#ccc] dark:hover:bg-[#2a2a2a]"
              disabled={isSearching}
              type="button"
              onClick={runSearch}
            >
              {isSearching ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Search className="size-5 cursor-pointer text-[var(--muted-foreground)]" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-8">
          <GetAppButtons />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
