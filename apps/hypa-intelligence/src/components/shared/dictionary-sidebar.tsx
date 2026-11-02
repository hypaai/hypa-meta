// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Volume2, Square, Loader2, RotateCcw } from "lucide-react";

export interface WordDefinition {
  text: string;
  context?: string;
  partOfSpeech?: string;
}

export interface UsageExample {
  partOfSpeech: string;
  example: string;
}

export interface WordResult {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  language: string;
  definitions?: WordDefinition[];
  usageExamples?: UsageExample[];
  synonyms?: string[];
  antonyms?: string[];
  exampleSentences?: string[];
  translations?: Record<string, string>;
  culturalContext?: string;
  funFact?: string;
}

type DictionaryProps = {
  isOpen: boolean;
  onClose: () => void;
  sourceData: WordResult | null;
  targetData: WordResult | null;
  sourceWord: string;
  targetWord: string;
  sourceLang: string;
  targetLang: string;
  isSourceError?: boolean;
  isTargetError?: boolean;
  onPlayWord: (text: string) => void;
  onPlayDefinition?: () => void;
  isTTSLoading?: boolean;
  isAudioPlaying?: boolean;
  isSourceLoading?: boolean;
  isTargetLoading?: boolean;
  loadingType?: "spinner" | "skeleton";
  onToggleLoadingType?: () => void;
  onTabChange?: (tab: "source" | "target") => void;
};

const DictionarySidebar = ({
  isOpen,
  onClose,
  sourceData,
  targetData,
  sourceWord,
  targetWord,
  sourceLang,
  targetLang,
  isSourceError = false,
  isTargetError = false,
  onPlayWord,
  onPlayDefinition: _onPlayDefinition,
  isTTSLoading = false,
  isAudioPlaying = false,
  isSourceLoading = false,
  isTargetLoading = false,
  loadingType = "skeleton",
  onToggleLoadingType,
  onTabChange,
}: DictionaryProps) => {
  const [activeTab, setActiveTab] = useState<"source" | "target">("source");
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const onTabChangeRef = useRef(onTabChange);
  // Track which audio is playing/loading: 'word', 'definition', 'usage', or null
  const [activeAudio, setActiveAudio] = useState<
    null | "word" | "definition" | "usage" | "synonyms" | "antonyms"
  >(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);

    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reset activeAudio when word or isOpen changes
  const activeWord = activeTab === "source" ? sourceWord : targetWord;
  const activeData = activeTab === "source" ? sourceData : targetData;
  const isLoading = activeTab === "source" ? isSourceLoading : isTargetLoading;
  const isError = activeTab === "source" ? isSourceError : isTargetError;
  const headerWord = activeWord || "Word";

  useEffect(() => {
    setActiveAudio(null);
  }, [activeTab, activeWord, isOpen]);

  useEffect(() => {
    if (isOpen && isMobile) {
      const prev = document.body.style.overflow;

      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = prev;
      };
    }

    return;
  }, [isOpen, isMobile]);

  useEffect(() => {
    onTabChangeRef.current = onTabChange;
  }, [onTabChange]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("source");
      onTabChangeRef.current?.("source");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Skeleton loading component
  const SkeletonLoader = () => (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="h-px bg-border" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/5" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-5 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-5 bg-muted rounded w-2/5" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    </div>
  );

  const SpinnerLoader = () => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading dictionary...</p>
    </div>
  );

  const LoadingContent = () =>
    loadingType === "skeleton" ? <SkeletonLoader /> : <SpinnerLoader />;

  // Returns the TTS label for a given type, for future i18n
  function getTTSLabel(type: "definition" | "usage" | "synonyms" | "antonyms") {
    switch (type) {
      case "definition":
        return "definition ";
      case "usage":
        return "usage example ";
      case "synonyms":
        return "synonyms ";
      case "antonyms":
        return "antonyms ";
      default:
        return "";
    }
  }

  const asArray = <T,>(value?: T[] | null): T[] =>
    Array.isArray(value) ? value : [];

  // Word Result
  const WordContent = ({
    result,
    word,
  }: {
    result: WordResult;
    word: string;
  }) => {
    const definitions = asArray(result.definitions);
    const usageExamples = asArray(result.usageExamples);
    const exampleSentences = asArray(result.exampleSentences);
    const synonyms = asArray(result.synonyms);
    const antonyms = asArray(result.antonyms);

    return (
      <div>
        {/* Word title + speaker */}
        <div className="flex items-center gap-2 mb-0.5 justify-between">
          <h2 className="text-xl font-semibold capitalize">{word}</h2>
          <button
            className="p-0.5 rounded-full hover:bg-accent transition-colors disabled:opacity-50"
            disabled={isTTSLoading && activeAudio === "word"}
            title={
              activeAudio === "word"
                ? isAudioPlaying
                  ? "Stop"
                  : isTTSLoading
                    ? "Loading…"
                    : "Listen to pronunciation"
                : "Listen to pronunciation"
            }
            onClick={() => {
              setActiveAudio("word");
              onPlayWord(word);
            }}
          >
            {isTTSLoading && activeAudio === "word" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : isAudioPlaying && activeAudio === "word" ? (
              <Square className="size-5 fill-current" />
            ) : (
              <Volume2 className="size-5" />
            )}
          </button>
        </div>

        {/* Phonetic + language */}
        {(result.phonetic || result.language) && (
          <p className="text-[11px] text-muted-foreground mb-4">
            {result.phonetic && (
              <span className="italic">/{result.phonetic}/</span>
            )}
            {result.phonetic && result.language && (
              <span className="mx-1.5">·</span>
            )}
            {result.language && <span>{result.language}</span>}
          </p>
        )}

        <hr className="border-border mb-3" />

        {/* Definitions */}
        {definitions.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Definition
              </h2>
              <button
                className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                disabled={isTTSLoading && activeAudio === "definition"}
                title={
                  activeAudio === "definition"
                    ? isAudioPlaying
                      ? "Stop"
                      : isTTSLoading
                        ? "Loading…"
                        : "Listen to pronunciation"
                    : "Listen to pronunciation"
                }
                onClick={() => {
                  setActiveAudio("definition");
                  onPlayWord(
                    getTTSLabel("definition") +
                      definitions.map((d) => d.text).join(" "),
                  );
                }}
              >
                {isTTSLoading && activeAudio === "definition" ? (
                  <Loader2 className="size-3.5 animate-spin text-[var(--muted-foreground)]" />
                ) : isAudioPlaying && activeAudio === "definition" ? (
                  <Square className="size-3.5 fill-[var(--foreground)] text-[var(--foreground)]" />
                ) : (
                  <Volume2 className="size-3.5 text-[var(--muted-foreground)]" />
                )}
              </button>
            </div>
            
            <div className="space-y-4">
              {definitions.map((def, i) => (
                <div key={i} className="flex gap-4">
                  <span className="mt-2 size-[7px] shrink-0 rounded-full bg-[var(--foreground)]" />
                  <div className="flex-1">
                    {def.partOfSpeech && (
                      <p className="text-xs font-bold text-[var(--foreground)] mb-0.5 capitalize">
                        {def.partOfSpeech}
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
        )}

        {/* Usage examples */}
        {(usageExamples.length > 0 || exampleSentences.length > 0) && (
          <section className="mb-6 border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Usage Examples
              </h2>
              <button
                className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                disabled={isTTSLoading && activeAudio === "usage"}
                title={
                  activeAudio === "usage"
                    ? isAudioPlaying
                      ? "Stop"
                      : isTTSLoading
                        ? "Loading…"
                        : "Listen to pronunciation"
                    : "Listen to pronunciation"
                }
                onClick={() => {
                  setActiveAudio("usage");
                  const usageText =
                    usageExamples.length > 0
                      ? usageExamples.map((ue) => ue.example).join(" ")
                      : exampleSentences.length > 0
                        ? exampleSentences.join(" ")
                        : definitions.map((d) => d.text).join(" ");
                  onPlayWord(getTTSLabel("usage") + usageText);
                }}
              >
                {isTTSLoading && activeAudio === "usage" ? (
                  <Loader2 className="size-3.5 animate-spin text-[var(--muted-foreground)]" />
                ) : isAudioPlaying && activeAudio === "usage" ? (
                  <Square className="size-3.5 fill-[var(--foreground)] text-[var(--foreground)]" />
                ) : (
                  <Volume2 className="size-3.5 text-[var(--muted-foreground)]" />
                )}
              </button>
            </div>
            
            <div className="space-y-4">
              {usageExamples.length > 0 ? (
                usageExamples.map((ue, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="mt-2 size-[7px] shrink-0 rounded-full bg-transparent border border-[var(--foreground)]" />
                    <div className="flex-1">
                      {ue.partOfSpeech && (
                        <p className="text-xs font-bold text-[var(--foreground)] mb-0.5 capitalize">
                          {ue.partOfSpeech}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed text-[var(--muted-foreground)] italic">
                        "{ue.example}"
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                exampleSentences.map((sentence, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="mt-2 size-[7px] shrink-0 rounded-full bg-transparent border border-[var(--foreground)]" />
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-[var(--muted-foreground)] italic">
                        "{sentence}"
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Divider before synonyms/antonyms */}
        {(synonyms.length > 0 || antonyms.length > 0) && (
          <hr className="border-border mb-3" />
        )}

        {/* Synonyms + speaker */}
        {synonyms.length > 0 && (
          <div className="flex items-center mb-1.5 gap-2">
            <span className="text-[12px] font-bold">Synonyms: </span>
            <span className="text-[12px] text-muted-foreground italic flex-1">
              {synonyms.join(", ")}
            </span>
            <button
              aria-label="Play synonyms"
              className="shrink-0 p-0.5 rounded-full hover:bg-accent transition-colors"
              disabled={isTTSLoading && activeAudio === "synonyms"}
              title={
                activeAudio === "synonyms"
                  ? isAudioPlaying
                    ? "Stop"
                    : isTTSLoading
                      ? "Loading…"
                      : "Listen to synonyms"
                  : "Listen to synonyms"
              }
              onClick={() => {
                setActiveAudio("synonyms");
                onPlayWord(getTTSLabel("synonyms") + synonyms.join(", "));
              }}
            >
              {isTTSLoading && activeAudio === "synonyms" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isAudioPlaying && activeAudio === "synonyms" ? (
                <Square className="size-4 fill-current" />
              ) : (
                <Volume2 className="size-4 text-muted-foreground" />
              )}
            </button>
          </div>
        )}

        {/* Antonyms + speaker */}
        {antonyms.length > 0 && (
          <div className="flex items-center mb-1.5 gap-2">
            <span className="text-[12px] font-bold">Antonyms: </span>
            <span className="text-[12px] text-muted-foreground italic flex-1">
              {antonyms.join(", ")}
            </span>
            <button
              aria-label="Play antonyms"
              className="shrink-0 p-0.5 rounded-full hover:bg-accent transition-colors"
              disabled={isTTSLoading && activeAudio === "antonyms"}
              title={
                activeAudio === "antonyms"
                  ? isAudioPlaying
                    ? "Stop"
                    : isTTSLoading
                      ? "Loading…"
                      : "Listen to antonyms"
                  : "Listen to antonyms"
              }
              onClick={() => {
                setActiveAudio("antonyms");
                onPlayWord(getTTSLabel("antonyms") + antonyms.join(", "));
              }}
            >
              {isTTSLoading && activeAudio === "antonyms" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isAudioPlaying && activeAudio === "antonyms" ? (
                <Square className="size-4 fill-current" />
              ) : (
                <Volume2 className="size-4 text-muted-foreground" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ─────────────────────────────────────────────
     Shared content block (used by both layouts)
  ───────────────────────────────────────────── */
  const Content = () => (
    <>
      {isLoading ? (
        <div className="space-y-4">
          {/* Word header always visible while loading */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-2xl font-bold text-foreground flex-1 capitalize">
              {headerWord}
            </h2>
            {onToggleLoadingType && (
              <Button
                aria-label="Toggle loading style"
                className="shrink-0"
                size="icon"
                title={`Switch to ${
                  loadingType === "skeleton" ? "spinner" : "skeleton"
                } loading`}
                variant="ghost"
                onClick={onToggleLoadingType}
              >
                <RotateCcw className="size-4" />
              </Button>
            )}
          </div>
          <div className="h-px bg-border" />
          <LoadingContent />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-14 px-6">
          <p className="text-xs text-muted-foreground text-center">
            Dictionary lookup failed. Try again.
          </p>
        </div>
      ) : activeData ? (
        <div className="">
          <WordContent
            result={activeData}
            word={activeWord || activeData.word || ""}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-14 px-6">
          <p className="text-xs text-muted-foreground text-center">
            {activeWord
              ? `No definition found for "${activeWord}".`
              : "No word available for dictionary."}
          </p>
        </div>
      )}
    </>
  );

  /* ─────────────────────────────────────────────
     Shared tab switcher
  ───────────────────────────────────────────── */
  const Tabs = () => (
    <div className="px-4 pt-4">
      <div className="flex items-center bg-muted rounded-lg p-1.5 gap-1.5 relative">
        <div
          className="absolute h-[calc(100%-12px)] rounded-md bg-background shadow-sm transition-all duration-300 ease-in-out"
          style={{
            width: "calc(50% - 6px)",
            left: activeTab === "source" ? "6px" : "calc(50% + 0px)",
          }}
        />
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md transition-all duration-300 relative z-10 ${
            activeTab === "source"
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => {
            setActiveTab("source");
            onTabChange?.("source");
          }}
        >
          <span className="text-sm">{sourceLang}</span>
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md transition-all duration-300 relative z-10 ${
            activeTab === "target"
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => {
            setActiveTab("target");
            onTabChange?.("target");
          }}
        >
          <span className="text-sm">{targetLang}</span>
        </button>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════
     Desktop sidebar
  ═══════════════════════════════════════ */
  const desktopSidebar = (
    <aside
      aria-label="Dictionary"
      className="hidden md:flex md:flex-col md:w-80 lg:w-96 border-l bg-background/70 backdrop-blur top-14 right-0 fixed h-[calc(100vh-3.5rem)] z-40"
    >
      <div className="p-4 flex items-center justify-between border-b">
        <div>
          <h3 className="font-semibold text-lg">Dictionary</h3>
          <div className="text-xs text-muted-foreground">
            Word definition and details
          </div>
        </div>
        <Button
          aria-label="Close dictionary"
          size="sm"
          title="Close"
          variant="ghost"
          onClick={onClose}
        >
          <X className="size-4" />
          <span className="ml-2 hidden sm:inline">Close</span>
        </Button>
      </div>

      <Tabs />

      <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Content />
      </div>
    </aside>
  );

  /* ═══════════════════════════════════════
     Mobile drawer
  ═══════════════════════════════════════ */
  const mobileDrawer = (
    <div
      aria-label="Dictionary"
      aria-modal="true"
      className="md:hidden fixed inset-0 z-50 bg-background/90 backdrop-blur flex flex-col"
      role="dialog"
    >
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-lg">Dictionary</h3>
          <div className="text-xs text-muted-foreground">
            Word definition and details
          </div>
        </div>
        <Button
          aria-label="Close dictionary"
          size="sm"
          variant="ghost"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <Tabs />

      <div className="flex-1 overflow-y-auto p-4 pb-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Content />
      </div>
    </div>
  );

  return (
    <>
      {desktopSidebar}
      {isMobile && isOpen ? mobileDrawer : null}
    </>
  );
};

export default DictionarySidebar;
