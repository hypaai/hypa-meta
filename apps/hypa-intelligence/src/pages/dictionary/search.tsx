import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { Link } from "@/react-router-compat";
import { dictionary } from "@/lib/api";
import { useSynthesize } from "@/hooks/use-synthesize";
import { useAcModelLanguages } from "@/hooks/use-model-languages";
import { useSettingsStore } from "@/stores/settings-store";
import { ModelLanguagePicker } from "@/components/shared/model-language-picker";
import {
  ArrowUpRight,
  Loader2,
  SearchX,
  Volume2,
  Search,
  Square,
} from "@/lucide-compat";
import Globe3D from "@/components/modules/dictionary/globe-3d";
import {
  buildDictionaryResultSpeech,
  buildSectionSpeech,
  buildTypedItemSpeech,
  buildWordOnlySpeech,
} from "@/lib/dictionary-speech";

const SearchPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const modelLanguages = useAcModelLanguages();
  const autoLookupOnLanguageChange = useSettingsStore(
    (s) => s.autoLookupOnLanguageChange,
  );

  const wordParam = params.get("word") ?? "";
  const langParam = params.get("lang") ?? "English";

  const [searchInput, setSearchInput] = useState(wordParam);
  // Resolved up front: the submit effect fires on mount, before the
  // normalization effect below can correct an unsupported lang from the URL.
  const [selectedLang, setSelectedLang] = useState(() =>
    modelLanguages.includes(langParam)
      ? langParam
      : (modelLanguages[0] ?? "English"),
  );
  const [submittedWord, setSubmittedWord] = useState(wordParam);
  const prevLangRef = useRef(selectedLang);

  const searchMutation = useMutation({
    mutationFn: (params: Parameters<typeof dictionary.search>[0]) =>
      dictionary.search(params),
    mutationKey: ["dictionary", submittedWord],
  });
  const data = searchMutation.data?.data;
  const error = searchMutation.error?.message;

  const {
    synthesize,
    isLoading: isSynthesizing,
    isPlaying,
    stop,
  } = useSynthesize();
  const {
    synthesize: synthesizeWordOnly,
    isLoading: isWordOnlySynthesizing,
    isPlaying: isWordOnlyPlaying,
    stop: stopWordOnly,
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

  useEffect(() => {
    setSearchInput(wordParam);
    setSubmittedWord(wordParam);
  }, [wordParam]);

  useEffect(() => {
    const nextLang = modelLanguages.includes(langParam)
      ? langParam
      : (modelLanguages[0] ?? "English");

    // Model normalization, not a user pick: keep the ref in step so the
    // language effect below does not read it as a change.
    prevLangRef.current = nextLang;
    setSelectedLang(nextLang);
  }, [langParam, modelLanguages]);

  useEffect(() => {
    if (modelLanguages.includes(selectedLang)) return;
    const nextLang = modelLanguages[0] ?? "English";

    prevLangRef.current = nextLang;
    setSelectedLang(nextLang);
  }, [modelLanguages, selectedLang]);

  // Submit path: search whenever a new word is submitted, at the current language.
  useEffect(() => {
    const trimmed = submittedWord.trim();

    if (!trimmed) return;
    searchMutation.mutate({
      word: trimmed,
      language: selectedLang,
    });
  }, [submittedWord]);

  // Language path: re-search the word already in play when the language changes.
  useEffect(() => {
    const changed =
      prevLangRef.current.toLowerCase() !== selectedLang.toLowerCase();

    prevLangRef.current = selectedLang;
    if (!changed || !autoLookupOnLanguageChange) return;

    const trimmed = submittedWord.trim();

    if (!trimmed || searchMutation.isPending) return;

    const timeout = setTimeout(() => {
      searchMutation.mutate({ word: trimmed, language: selectedLang });
    }, 300);

    return () => clearTimeout(timeout);
  }, [selectedLang]);

  const handleSearch = () => {
    const trimmed = searchInput.trim();

    if (!trimmed) return;
    setSubmittedWord(trimmed);
    searchMutation.mutate({
      word: trimmed,
      language: selectedLang,
    });
    navigate(
      `/search?word=${encodeURIComponent(trimmed)}&lang=${encodeURIComponent(selectedLang)}`,
      { replace: true },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="min-h-[60vh] relative">
      {/* Globe background — top right */}
      <div className="absolute top-0 right-0 opacity-[0.07] pointer-events-none select-none overflow-hidden z-0">
        <Suspense fallback={null}>
          <Globe3D className="h-[380px] w-[380px] translate-x-[30%] -translate-y-[10%]" />
        </Suspense>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-8 pb-6">
        {/* Loading state */}
        {searchMutation.isPending && (
          <motion.div animate={{ opacity: 1 }} initial={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-4 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="size-4 animate-spin shrink-0" />
              <span>
                {`Looking up \u201c${submittedWord}\u201d in ${selectedLang}...`}
              </span>
            </div>
          </motion.div>
        )}

        {/* Error state */}
        {searchMutation.isError && (
          <motion.div
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24"
            initial={{ opacity: 0 }}
          >
            <SearchX className="size-10 text-[var(--muted-foreground)]" />
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              {error ?? "Something went wrong"}
            </p>
          </motion.div>
        )}

        {/* Dictionary Result */}
        {data && !searchMutation.isPending && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded border border-[var(--border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                {selectedLang}
              </span>
              {isWordOnlyPlaying ? (
                <button
                  className="shrink-0 p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
                  title="Stop"
                  onClick={stopWordOnly}
                >
                  <Square className="size-4 fill-[var(--foreground)] text-[var(--foreground)]" />
                </button>
              ) : (
                <button
                  className="shrink-0 p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                  disabled={isWordOnlySynthesizing}
                  title={
                    isWordOnlySynthesizing ? "Loading..." : "Listen to word"
                  }
                  onClick={() =>
                    synthesizeWordOnly(
                      buildWordOnlySpeech(data.word),
                      selectedLang,
                    )
                  }
                >
                  {isWordOnlySynthesizing ? (
                    <Loader2 className="size-4 animate-spin text-[var(--muted-foreground)]" />
                  ) : (
                    <Volume2 className="size-4 text-[var(--muted-foreground)]" />
                  )}
                </button>
              )}
            </div>
            {/* Word title */}
            <div className="mb-1 flex items-start gap-2 min-w-0">
              <Link
                className="group flex min-w-0 flex-1 items-start gap-1.5"
                to={`/dictionary/word/${encodeURIComponent(data.word)}?lang=${encodeURIComponent(selectedLang)}`}
              >
                <h1 className="min-w-0 text-2xl sm:text-3xl font-semibold capitalize leading-tight [overflow-wrap:anywhere]">
                  {data.word}
                </h1>
                <ArrowUpRight className="size-4 shrink-0 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors" />
              </Link>
              {isPlaying ? (
                <button
                  className="shrink-0 p-1.5 rounded-full hover:bg-[var(--accent)] transition-colors"
                  title="Stop"
                  onClick={stop}
                >
                  <Square className="size-5 fill-[var(--foreground)] text-[var(--foreground)]" />
                </button>
              ) : (
                <button
                  className="shrink-0 p-1.5 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                  disabled={isSynthesizing}
                  title={
                    isSynthesizing ? "Loading..." : "Listen to pronunciation"
                  }
                  onClick={() =>
                    synthesize(buildDictionaryResultSpeech(data), selectedLang)
                  }
                >
                  {isSynthesizing ? (
                    <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
                  ) : (
                    <Volume2 className="size-5 text-[var(--muted-foreground)]" />
                  )}
                </button>
              )}
            </div>

            {/* Definitions — grouped by part of speech */}
            {(data.definitions?.length ?? 0) > 0 && (
              <div className="space-y-2 mb-5">
                <div className="mb-2 flex items-center gap-1.5">
                  <h3 className="mb-0 leading-none text-xs font-bold tracking-wide">
                    Definition
                  </h3>
                  {isDefinitionsPlaying ? (
                    <button
                      className="inline-flex shrink-0 items-center justify-center rounded-full p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)]"
                      title="Stop"
                      onClick={stopDefinitions}
                    >
                      <Square className="size-3.5 fill-[var(--foreground)] text-[var(--foreground)]" />
                    </button>
                  ) : (
                    <button
                      className="inline-flex shrink-0 items-center justify-center rounded-full p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
                      disabled={isDefinitionsSynthesizing}
                      title="Listen to definitions"
                      onClick={() =>
                        synthesizeDefinitions(
                          buildSectionSpeech(
                            "Definition",
                            data.definitions
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
                {data.definitions?.map((def, i) => (
                  <p key={i} className="text-[13px] leading-relaxed">
                    {def.type && (
                      <span className="font-bold">{def.type}: </span>
                    )}
                    {def.text}
                  </p>
                ))}
              </div>
            )}

            {/* Usage Examples */}
            {(data.usage?.length ?? 0) > 0 && (
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-wide">
                    Usage Examples
                  </h3>
                  {isUsagePlaying ? (
                    <button
                      className="shrink-0 p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
                      title="Stop"
                      onClick={stopUsage}
                    >
                      <Square className="size-3.5 fill-[var(--foreground)] text-[var(--foreground)]" />
                    </button>
                  ) : (
                    <button
                      className="shrink-0 p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                      disabled={isUsageSynthesizing}
                      title="Listen to usage examples"
                      onClick={() =>
                        synthesizeUsage(
                          buildSectionSpeech(
                            "Usage Examples",
                            data.usage?.map(buildTypedItemSpeech).join(". ") ??
                              "",
                          ),
                          selectedLang,
                        )
                      }
                    >
                      {isUsageSynthesizing ? (
                        <Loader2 className="size-3.5 animate-spin text-[var(--muted-foreground)]" />
                      ) : (
                        <Volume2 className="size-3.5 text-[var(--muted-foreground)]" />
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 pl-3">
                  {data.usage?.map((ue, i) => (
                    <p key={i} className="text-[13px] leading-relaxed">
                      {ue.type && (
                        <span className="font-semibold">— {ue.type}: </span>
                      )}
                      <span className="italic text-[var(--muted-foreground)]">
                        &lsquo;{ue.text}&rsquo;
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Synonyms */}
            {(data.syms?.length ?? 0) > 0 && (
              <div className="mb-2">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[13px] font-bold">Synonyms:</span>
                  {isSynonymsPlaying ? (
                    <button
                      className="shrink-0 p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
                      title="Stop"
                      onClick={stopSynonyms}
                    >
                      <Square className="size-3.5 fill-[var(--foreground)] text-[var(--foreground)]" />
                    </button>
                  ) : (
                    <button
                      className="shrink-0 p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                      disabled={isSynonymsSynthesizing}
                      title="Listen to synonyms"
                      onClick={() =>
                        synthesizeSynonyms(
                          buildSectionSpeech(
                            "Synonyms",
                            data.syms?.join(", ") ?? "",
                          ),
                          selectedLang,
                        )
                      }
                    >
                      {isSynonymsSynthesizing ? (
                        <Loader2 className="size-3.5 animate-spin text-[var(--muted-foreground)]" />
                      ) : (
                        <Volume2 className="size-3.5 text-[var(--muted-foreground)]" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[13px] leading-relaxed [overflow-wrap:anywhere]">
                  <span className="text-[var(--muted-foreground)]">
                    {data.syms?.join(", ")}
                  </span>
                </p>
              </div>
            )}

            {/* Antonyms + See More */}
            {(data.antm?.length ?? 0) > 0 && (
              <div className="flex min-w-0 items-start justify-between gap-4 mb-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[13px] font-bold">Antonyms:</span>
                    {isAntonymsPlaying ? (
                      <button
                        className="shrink-0 p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
                        title="Stop"
                        onClick={stopAntonyms}
                      >
                        <Square className="size-3.5 fill-[var(--foreground)] text-[var(--foreground)]" />
                      </button>
                    ) : (
                      <button
                        className="shrink-0 p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                        disabled={isAntonymsSynthesizing}
                        title="Listen to antonyms"
                        onClick={() =>
                          synthesizeAntonyms(
                            buildSectionSpeech(
                              "Antonyms",
                              data.antm?.join(", ") ?? "",
                            ),
                            selectedLang,
                          )
                        }
                      >
                        {isAntonymsSynthesizing ? (
                          <Loader2 className="size-3.5 animate-spin text-[var(--muted-foreground)]" />
                        ) : (
                          <Volume2 className="size-3.5 text-[var(--muted-foreground)]" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="min-w-0 text-[13px] leading-relaxed [overflow-wrap:anywhere]">
                    <span className="text-[var(--muted-foreground)]">
                      {data.antm?.join(", ")}
                    </span>
                  </p>
                </div>
                <Link
                  className="shrink-0 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors whitespace-nowrap"
                  to={`/dictionary/word/${encodeURIComponent(data.word)}?lang=${encodeURIComponent(selectedLang)}`}
                >
                  See More &rsaquo;
                </Link>
              </div>
            )}

            {/* See More fallback if no antonyms */}
            {(data.antm?.length ?? 0) === 0 && (
              <div className="flex justify-end mb-4">
                <Link
                  className="text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  to={`/dictionary/word/${encodeURIComponent(data.word)}?lang=${encodeURIComponent(selectedLang)}`}
                >
                  See More &rsaquo;
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Bottom search bar */}
      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-12">
        <div className="group flex items-stretch rounded-full bg-[var(--card)] border border-[var(--border)]/60 shadow-sm transition-all duration-300 focus-within:border-[var(--border)] focus-within:shadow-md overflow-hidden">
          {/* Language selector */}
          <ModelLanguagePicker
            autoSelectFirst
            buttonClassName="px-4 md:px-5 py-3 md:py-3.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50"
            chevronClassName="size-3 opacity-60"
            containerClassName="relative z-50 flex"
            disabled={searchMutation.isPending}
            itemClassName="mx-1.5 w-[calc(100%-12px)] rounded-lg px-3.5 py-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
            menuClassName="left-2 bottom-full mb-2 w-44 rounded-xl border-[var(--border)]/60 bg-[var(--card)] py-1.5"
            menuPlacement="top"
            modelSource="ac"
            selectedItemClassName="bg-[var(--accent)] text-[var(--foreground)]"
            value={selectedLang}
            onValueChange={setSelectedLang}
          />

          {/* Subtle divider */}
          <div className="w-px my-2.5 bg-[var(--border)]/50" />

          {/* Input */}
          <input
            className="flex-1 bg-transparent px-3 md:px-4 py-3 md:py-3.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]/60"
            placeholder="Search any word..."
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* Search button */}
          <button
            className="flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-4 md:px-5 py-2 my-1.5 mr-1.5 rounded-full text-sm font-medium transition-all hover:opacity-80 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={!searchInput.trim()}
            type="button"
            onClick={handleSearch}
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        {/* Hint */}
        <p className="mt-5 text-center text-[11px] text-[var(--muted-foreground)]/50 tracking-wide">
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--muted)]/60 text-[10px] font-mono">
            ⏎
          </kbd>{" "}
          to search
        </p>
      </div>
    </div>
  );
};

export default SearchPage;
