import { useParams, useSearchParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/react-router-compat";
import { useDictionarySearch } from "@/providers/dictionary-search-provider";
import { useSynthesize } from "@/hooks/use-synthesize";
import { useTranslateWord } from "@/hooks/use-translate";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Volume2,
  Loader2,
  SearchX,
  ArrowRight,
  ChevronDown,
  Check,
  Languages,
  Square,
} from "@/lucide-compat";
import { useTheme } from "@/components/modules/theme/theme-provider";
import { getThemeAwareLogo } from "@/lib/theme-assets";
import { ModelLanguagePicker } from "@/components/shared/model-language-picker";
import {
  buildDictionaryResultSpeech,
  buildSectionSpeech,
  buildWordOnlySpeech,
  joinTypedItemSpeech,
} from "@/lib/dictionary-speech";

const WordDetailPage = () => {
  const { word } = useParams<{ word: string }>();
  const [params] = useSearchParams();
  const lang = params.get("lang") ?? "English";
  const { theme } = useTheme();
  const trimmedWord = (word ?? "").trim();

  const {
    getCachedResult,
    search,
    searchError,
    isSearching,
    fetchDetails,
    detailsError,
    isFetchingDetailsFor,
  } = useDictionarySearch();
  const data = trimmedWord ? getCachedResult(trimmedWord, lang) : null;
  const isFetchingDetails = trimmedWord
    ? isFetchingDetailsFor(trimmedWord, lang)
    : false;
  const detailsRequestKey = `${trimmedWord.toLowerCase()}::${lang.toLowerCase()}`;
  const requestedDetailsKeyRef = useRef<string | null>(null);
  const culturalContextText = data?.cultural_context
    ?.map((item) => item.text)
    .join("\n");
  const funFactsText = data?.fun_facts?.map((item) => item.text).join("\n");

  useEffect(() => {
    if (!trimmedWord) return;

    if (!data && !isSearching && !searchError) {
      search({
        word: trimmedWord,
        language: lang,
      });

      return;
    }

    if (!data) return;

    if (isFetchingDetails) return;
    if (data?.cultural_context?.length && data?.fun_facts?.length) return;
    if (requestedDetailsKeyRef.current === detailsRequestKey) return;

    requestedDetailsKeyRef.current = detailsRequestKey;
    fetchDetails({
      word: trimmedWord,
      language: lang,
      cultural_context: true,
      fun_facts: true,
    });
  }, [
    data?.cultural_context?.length,
    data?.fun_facts?.length,
    data,
    detailsRequestKey,
    fetchDetails,
    isFetchingDetails,
    isSearching,
    lang,
    search,
    searchError,
    trimmedWord,
  ]);

  const isLoading = !!trimmedWord && !data && !searchError && !detailsError;
  const isError = (!!detailsError || !!searchError) && !data;
  const detailsLoading =
    isFetchingDetails && (!funFactsText || !culturalContextText);

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
    synthesize: synthesizeFunFact,
    isLoading: isFunFactSynthesizing,
    isPlaying: isFunFactPlaying,
    stop: stopFunFact,
  } = useSynthesize();
  const {
    synthesize: synthesizeContext,
    isLoading: isContextSynthesizing,
    isPlaying: isContextPlaying,
    stop: stopContext,
  } = useSynthesize();
  const {
    synthesize: synthesizeDefs,
    isLoading: isDefsSynthesizing,
    isPlaying: isDefsPlaying,
    stop: stopDefs,
  } = useSynthesize();
  const {
    synthesize: synthesizeExamples,
    isLoading: isExamplesSynthesizing,
    isPlaying: isExamplesPlaying,
    stop: stopExamples,
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

  const defaultTranslateLang = useSettingsStore((s) => s.defaultTranslateLang);
  const ttsVoice = useSettingsStore((s) => s.ttsVoice);
  const voiceSelectionMode = useSettingsStore((s) => s.voiceSelectionMode);
  const favoriteVoices = useSettingsStore((s) => s.favoriteVoices);
  const favoriteCelebrityVoices = useSettingsStore(
    (s) => s.favoriteCelebrityVoices,
  );
  const getTtsVoices = useSettingsStore((s) => s.actions.getTtsVoices);
  const setTtsVoice = useSettingsStore((s) => s.actions.setTtsVoice);

  const voicesForLang = getTtsVoices(lang);

  // Resolve which voices to show based on selection mode
  const availableVoices =
    voiceSelectionMode === "celebrity"
      ? favoriteCelebrityVoices
      : voiceSelectionMode === "favorites"
        ? favoriteVoices
        : voicesForLang;

  const [voiceOpen, setVoiceOpen] = useState(false);
  const voiceRef = useRef<HTMLDivElement>(null);

  const [translateLang, setTranslateLang] = useState<string | null>(
    defaultTranslateLang || null,
  );

  const {
    translations: mtTranslations,
    isLoading: isTranslating,
    refetch: refetchTranslation,
  } = useTranslateWord(
    data?.word,
    lang,
    !!data && !!translateLang,
    translateLang ?? undefined,
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!voiceRef.current?.contains(e.target as Node)) setVoiceOpen(false);
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="size-8 animate-spin text-[var(--muted-foreground)]" />
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Loading &ldquo;{word}&rdquo;...
        </p>
      </div>
    );
  }

  if (!data) {
    const message = isError
      ? (detailsError ??
        searchError ??
        `Could not find "${word}". Try another word.`)
      : "Word not found";

    return (
      <div className="flex flex-col items-center justify-center py-32">
        <SearchX className="size-10 text-[var(--muted-foreground)]" />
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-2">
        <nav className="text-sm text-[var(--muted-foreground)]">
          <Link className="hover:underline" to="/dictionary/languages">
            Languages
          </Link>
          <span className="mx-1">/</span>
          <Link
            className="hover:underline"
            to={`/search?word=${encodeURIComponent(data.word)}&lang=${encodeURIComponent(lang)}`}
          >
            {lang}
          </Link>
          <span className="mx-1">/</span>
          <span className="font-medium text-[var(--foreground)] italic [overflow-wrap:anywhere]">
            {data.word}
          </span>
        </nav>
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl px-4"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.4 }}
      >
        {/* Word header */}
        <div className="mb-6 pt-4 border-b border-[var(--border)] pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              {lang}
            </span>
            {isWordOnlyPlaying ? (
              <button
                className="p-1.5 rounded-full hover:bg-[var(--accent)] transition-colors"
                title="Stop"
                onClick={stopWordOnly}
              >
                <Square className="size-4 fill-[var(--foreground)] text-[var(--foreground)]" />
              </button>
            ) : (
              <button
                className="p-1.5 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                disabled={isWordOnlySynthesizing}
                title={isWordOnlySynthesizing ? "Loading..." : "Listen to word"}
                onClick={() =>
                  synthesizeWordOnly(buildWordOnlySpeech(data.word), lang)
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
          <div className="flex items-start gap-4 flex-wrap min-w-0 pb-1">
            <h1 className="min-w-0 text-3xl sm:text-4xl font-medium capitalize leading-none tracking-tight [overflow-wrap:anywhere]">
              {data.word}
            </h1>
            <div className="flex items-center gap-2 shrink-0 pt-1">

              {isPlaying ? (
                <button
                  className="p-1.5 rounded-full hover:bg-[var(--accent)] transition-colors"
                  title="Stop"
                  onClick={stop}
                >
                  <Square className="size-5 fill-[var(--foreground)] text-[var(--foreground)]" />
                </button>
              ) : (
                <button
                  className="p-1.5 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                  disabled={isSynthesizing}
                  title={
                    isSynthesizing ? "Loading..." : "Listen to pronunciation"
                  }
                  onClick={() =>
                    synthesize(buildDictionaryResultSpeech(data), lang)
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

            {/* Voice picker */}
            {availableVoices.length > 0 && (
              <div ref={voiceRef} className="relative">
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--accent)]"
                  type="button"
                  onClick={() => setVoiceOpen((prev) => !prev)}
                >
                  <Volume2 className="size-3.5 text-[var(--muted-foreground)]" />
                  {availableVoices.includes(ttsVoice)
                    ? ttsVoice
                    : availableVoices[0]}
                  <ChevronDown className="size-3 text-[var(--muted-foreground)]" />
                </button>
                <AnimatePresence>
                  {voiceOpen && (
                    <motion.div
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute left-0 top-full z-50 mt-1 w-44 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] py-1 shadow-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      exit={{ opacity: 0, y: 4 }}
                      initial={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {availableVoices.map((v) => (
                        <button
                          key={v}
                          className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-[var(--accent)]"
                          onClick={() => {
                            setTtsVoice(v);
                            setVoiceOpen(false);
                          }}
                        >
                          <span>{v}</span>
                          {ttsVoice === v && (
                            <Check className="size-3.5 text-[var(--foreground)]" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          {data.definitions?.[0]?.type && (
            <p className="mt-3 text-[13px] text-[var(--muted-foreground)] capitalize">
              {data.definitions?.[0]?.type}
            </p>
          )}
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          {/* Left column */}
          <div>
            {/* Definitions */}
            <section className="mb-10 pt-2">
              <div className="flex items-center gap-2 mb-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Definition
                </h2>
                {isDefsPlaying ? (
                  <button
                    className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
                    title="Stop"
                    onClick={stopDefs}
                  >
                    <Square className="size-3.5 fill-[var(--foreground)] text-[var(--foreground)]" />
                  </button>
                ) : (
                  <button
                    className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                    disabled={isDefsSynthesizing}
                    title="Listen to definitions"
                    onClick={() =>
                      synthesizeDefs(
                        buildSectionSpeech(
                          "Definition",
                          joinTypedItemSpeech(data.definitions),
                        ),
                        lang,
                      )
                    }
                  >
                    {isDefsSynthesizing ? (
                      <Loader2 className="size-3.5 animate-spin text-[var(--muted-foreground)]" />
                    ) : (
                      <Volume2 className="size-3.5 text-[var(--muted-foreground)]" />
                    )}
                  </button>
                )}
              </div>
              <div className="space-y-5">
                {data.definitions?.map((def, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="mt-2 size-[7px] shrink-0 rounded-full bg-[var(--foreground)]" />
                    <div className="flex-1">
                      {def.type && (
                        <p className="text-xs font-bold text-[var(--foreground)] mb-0.5 capitalize">
                          {def.type}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed text-[var(--foreground)]">
                        {def.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Example sentences / Usage Examples */}
            {(data.usage?.length ?? 0) > 0 && (
              <section className="mb-10 border-t border-[var(--border)] pt-6">
                <div className="flex items-center gap-2 mb-5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Usage Examples
                  </h2>
                  {isExamplesPlaying ? (
                    <button
                      className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
                      title="Stop"
                      onClick={stopExamples}
                    >
                      <Square className="size-3.5 fill-[var(--foreground)] text-[var(--foreground)]" />
                    </button>
                  ) : (
                    <button
                      className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                      disabled={isExamplesSynthesizing}
                      title="Listen to examples"
                      onClick={() =>
                        synthesizeExamples(
                          buildSectionSpeech(
                            "Usage Examples",
                            joinTypedItemSpeech(data.usage),
                          ),
                          lang,
                        )
                      }
                    >
                      {isExamplesSynthesizing ? (
                        <Loader2 className="size-3.5 animate-spin text-[var(--muted-foreground)]" />
                      ) : (
                        <Volume2 className="size-3.5 text-[var(--muted-foreground)]" />
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {data.usage?.map((ue, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-[var(--border)] pl-4 py-2"
                    >
                      <p className="text-xs font-semibold text-[var(--foreground)] mb-1">
                        {ue.type}
                      </p>
                      <p className="text-sm italic leading-relaxed text-[var(--muted-foreground)]">
                        &lsquo;{ue.text}&rsquo;
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Synonyms & Antonyms */}
            {((data.syms?.length ?? 0) > 0 || (data.antm?.length ?? 0) > 0) && (
              <section className="mb-10 border-t border-[var(--border)] pt-6">
                <div className="flex flex-wrap gap-12">
                  {(data.syms?.length ?? 0) > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                          Synonyms
                        </h2>
                        {isSynonymsPlaying ? (
                          <button
                            className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
                            title="Stop"
                            onClick={stopSynonyms}
                          >
                            <Square className="size-3 fill-[var(--foreground)] text-[var(--foreground)]" />
                          </button>
                        ) : (
                          <button
                            className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                            disabled={isSynonymsSynthesizing}
                            title="Listen to synonyms"
                            onClick={() =>
                              synthesizeSynonyms(
                                buildSectionSpeech(
                                  "Synonyms",
                                  data.syms?.join(", ") ?? "",
                                ),
                                lang,
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
                      <div className="flex flex-wrap gap-2">
                        {data.syms?.map((syn, i) => (
                          <span
                            key={`${syn}-${i}`}
                            className="rounded border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-1.5 text-xs font-medium"
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(data.antm?.length ?? 0) > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                          Antonyms
                        </h2>
                        {isAntonymsPlaying ? (
                          <button
                            className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
                            title="Stop"
                            onClick={stopAntonyms}
                          >
                            <Square className="size-3 fill-[var(--foreground)] text-[var(--foreground)]" />
                          </button>
                        ) : (
                          <button
                            className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                            disabled={isAntonymsSynthesizing}
                            title="Listen to antonyms"
                            onClick={() =>
                              synthesizeAntonyms(
                                buildSectionSpeech(
                                  "Antonyms",
                                  data.antm?.join(", ") ?? "",
                                ),
                                lang,
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
                      <div className="flex flex-wrap gap-2">
                        {data.antm?.map((ant, i) => (
                          <span
                            key={`${ant}-${i}`}
                            className="rounded border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-1.5 text-xs font-medium"
                          >
                            {ant}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Translations on-demand with language picker */}
            <section className="mb-10 border-t border-[var(--border)] pt-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-5">
                Translate
              </h2>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                {/* Source language (disabled) */}
                <button
                  disabled
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-2.5 text-sm font-medium opacity-60 cursor-not-allowed"
                  type="button"
                >
                  <Languages className="size-4 text-[var(--muted-foreground)]" />
                  {lang}
                </button>

                <ArrowRight className="size-4 text-[var(--muted-foreground)]" />

                {/* Target language picker */}
                <ModelLanguagePicker
                  buttonClassName="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--accent)]"
                  containerClassName="relative"
                  excludeLanguages={[lang]}
                  menuClassName="w-48 max-h-56"
                  modelSource="ac"
                  placeholder="Select language"
                  prefix={
                    <Languages className="size-4 text-[var(--muted-foreground)]" />
                  }
                  value={translateLang}
                  onValueChange={setTranslateLang}
                />
              </div>

              {/* Word being translated */}
              <div className="flex items-center gap-4 my-5 py-5 px-6 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted-foreground)] font-semibold mb-1">
                    {lang}
                  </p>
                  <p className="text-xl font-medium capitalize">{data.word}</p>
                </div>
                {translateLang && (
                  <>
                    <ArrowRight className="size-5 text-[var(--muted-foreground)] shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted-foreground)] font-semibold mb-1">
                        {translateLang}
                      </p>
                      {isTranslating ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
                          <p className="text-sm text-[var(--muted-foreground)]">
                            Translating...
                          </p>
                        </div>
                      ) : mtTranslations[translateLang] &&
                        mtTranslations[translateLang] !== "\u2014" ? (
                        <p className="text-xl font-medium">
                          {mtTranslations[translateLang]}
                        </p>
                      ) : mtTranslations[translateLang] === "\u2014" ? (
                        <button
                          className="text-sm text-[var(--muted-foreground)] hover:underline"
                          onClick={refetchTranslation}
                        >
                          Tap to retry
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
                          <p className="text-sm text-[var(--muted-foreground)]">
                            Translating...
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <a
                className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:underline"
                href={`https://hypatranslate.com/?st=${encodeURIComponent(data.word)}&sl=${encodeURIComponent(lang)}&tl=${encodeURIComponent(translateLang ?? "")}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <img
                  alt="Hypa Translate"
                  className="size-5"
                  src={getThemeAwareLogo("hypatranslate", theme)}
                />
                Translate with Hypa Translate
                <ArrowRight className="size-3.5" />
              </a>
            </section>
          </div>

          {/* Right column — Fun fact bubble */}
          <div className="hidden lg:block">
            {funFactsText ? (
              <div className="sticky top-24 rounded-full bg-[var(--foreground)] text-[var(--background)] p-10 aspect-square flex items-center justify-center text-center max-w-[340px]">
                <div>
                  <span className="text-3xl font-serif leading-none block mb-2">
                    &ldquo;
                  </span>
                  <p className="text-sm leading-relaxed">{funFactsText}</p>
                  <span className="text-3xl font-serif leading-none block mt-2">
                    &rdquo;
                  </span>
                  {isFunFactPlaying ? (
                    <button
                      className="mt-3 p-1.5 rounded-full hover:bg-[var(--background)]/20 transition-colors"
                      title="Stop"
                      onClick={stopFunFact}
                    >
                      <Square className="size-4 fill-current opacity-100" />
                    </button>
                  ) : (
                    <button
                      className="mt-3 p-1.5 rounded-full hover:bg-[var(--background)]/20 transition-colors disabled:opacity-50"
                      disabled={isFunFactSynthesizing}
                      title="Listen"
                      onClick={() =>
                        synthesizeFunFact(
                          buildSectionSpeech("Fun Fact", funFactsText!),
                          lang,
                        )
                      }
                    >
                      {isFunFactSynthesizing ? (
                        <Loader2 className="size-4 animate-spin opacity-70" />
                      ) : (
                        <Volume2 className="size-4 opacity-70" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : detailsLoading ? (
              <div className="sticky top-24 rounded-full bg-[var(--foreground)] text-[var(--background)] p-10 aspect-square flex items-center justify-center text-center max-w-[340px]">
                <div className="w-full space-y-2.5 px-4">
                  <div className="h-3 w-3/4 mx-auto rounded-full bg-[var(--background)]/20 animate-pulse" />
                  <div className="h-3 w-full rounded-full bg-[var(--background)]/20 animate-pulse" />
                  <div className="h-3 w-5/6 mx-auto rounded-full bg-[var(--background)]/20 animate-pulse" />
                  <div className="h-3 w-2/3 mx-auto rounded-full bg-[var(--background)]/20 animate-pulse" />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Cultural context */}
        {culturalContextText ? (
          <section className="mt-10 rounded-lg bg-[var(--foreground)] text-[var(--background)] px-8 py-8 md:px-12 md:py-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
                Cultural Context
              </h2>
              {isContextPlaying ? (
                <button
                  className="p-1.5 rounded-full hover:bg-[var(--background)]/20 transition-colors"
                  title="Stop"
                  onClick={stopContext}
                >
                  <Square className="size-4 fill-current opacity-100" />
                </button>
              ) : (
                <button
                  className="p-1.5 rounded-full hover:bg-[var(--background)]/20 transition-colors disabled:opacity-50"
                  disabled={isContextSynthesizing}
                  title="Listen"
                  onClick={() =>
                    synthesizeContext(
                      buildSectionSpeech(
                        "Cultural Context",
                        culturalContextText!,
                      ),
                      lang,
                    )
                  }
                >
                  {isContextSynthesizing ? (
                    <Loader2 className="size-4 animate-spin opacity-70" />
                  ) : (
                    <Volume2 className="size-4 opacity-70" />
                  )}
                </button>
              )}
            </div>
            <p className="text-sm leading-relaxed max-w-3xl">
              {culturalContextText}
            </p>
          </section>
        ) : detailsLoading ? (
          <section className="mt-10 rounded-lg bg-[var(--foreground)] text-[var(--background)] px-8 py-8 md:px-12 md:py-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70 mb-3">
              Cultural Context
            </h2>
            <div className="space-y-2.5 max-w-3xl">
              <div className="h-3 w-full rounded-full bg-[var(--background)]/20 animate-pulse" />
              <div className="h-3 w-5/6 rounded-full bg-[var(--background)]/20 animate-pulse" />
              <div className="h-3 w-3/4 rounded-full bg-[var(--background)]/20 animate-pulse" />
            </div>
          </section>
        ) : null}

        {/* Mobile fun fact */}
        {funFactsText ? (
          <div className="lg:hidden mt-8 rounded-2xl bg-[var(--foreground)] text-[var(--background)] p-8 text-center">
            <span className="text-3xl font-serif leading-none block mb-2">
              &ldquo;
            </span>
            <p className="text-sm leading-relaxed">{funFactsText}</p>
            <span className="text-3xl font-serif leading-none block mt-2">
              &rdquo;
            </span>
            {isFunFactPlaying ? (
              <button
                className="mt-3 p-1.5 rounded-full hover:bg-[var(--background)]/20 transition-colors"
                title="Stop"
                onClick={stopFunFact}
              >
                <Square className="size-4 fill-current opacity-100" />
              </button>
            ) : (
              <button
                className="mt-3 p-1.5 rounded-full hover:bg-[var(--background)]/20 transition-colors disabled:opacity-50"
                disabled={isFunFactSynthesizing}
                title="Listen"
                onClick={() =>
                  synthesizeFunFact(
                    buildSectionSpeech("Fun Fact", funFactsText!),
                    lang,
                  )
                }
              >
                {isFunFactSynthesizing ? (
                  <Loader2 className="size-4 animate-spin opacity-70" />
                ) : (
                  <Volume2 className="size-4 opacity-70" />
                )}
              </button>
            )}
          </div>
        ) : detailsLoading ? (
          <div className="lg:hidden mt-8 rounded-2xl bg-[var(--foreground)] text-[var(--background)] p-8 text-center">
            <div className="space-y-2.5 px-4">
              <div className="h-3 w-3/4 mx-auto rounded-full bg-[var(--background)]/20 animate-pulse" />
              <div className="h-3 w-full rounded-full bg-[var(--background)]/20 animate-pulse" />
              <div className="h-3 w-5/6 mx-auto rounded-full bg-[var(--background)]/20 animate-pulse" />
              <div className="h-3 w-2/3 mx-auto rounded-full bg-[var(--background)]/20 animate-pulse" />
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
};

export default WordDetailPage;
