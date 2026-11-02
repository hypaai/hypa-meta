import type { VoiceSelectionMode } from "@/stores/settings-store";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Volume2,
  ChevronDown,
  Check,
  Play,
  Loader2,
  Star,
  Sparkles,
} from "@/lucide-compat";
import { useSettingsStore } from "@/stores/settings-store";
import { useModelLanguages } from "@/hooks/use-model-languages";
import { useSynthesize } from "@/hooks/use-synthesize";
import { showToast } from "@/components/shared/toast";
import { getVoiceAvatarUrl } from "@hypa/config/voice-avatar";
import { useVoiceLanguageFilter } from "@hypa/config/voice-language-filter";

import CardWidth from "./card-width";

/* ── Reusable dropdown hook (click-outside close) ── */

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return { open, setOpen, ref };
}

/* ── Dropdown button + list ── */

function Dropdown({
  label,
  value,
  options,
  onSelect,
  ariaLabel,
  icon,
  renderLabel,
}: {
  label?: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  ariaLabel: string;
  icon?: React.ReactNode;
  renderLabel?: (v: string) => string;
}) {
  const { open, setOpen, ref } = useDropdown();
  const display = renderLabel ? renderLabel(value) : value;

  return (
    <div ref={ref} className="relative inline-block">
      {label && <p className="text-base font-medium mb-1">{label}</p>}
      <button
        aria-label={ariaLabel}
        className="inline-flex min-w-[200px] lg:min-w-[280px] items-center justify-between gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          {icon}
          <span>{display || "Select..."}</span>
        </span>
        <ChevronDown className="size-4 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] lg:min-w-[280px] max-h-64 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {options.map((opt) => (
            <button
              key={opt}
              className={`flex w-full items-center justify-between px-2 py-1.5 text-sm transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] ${
                value === opt ? "bg-[var(--accent)]" : ""
              }`}
              onClick={() => {
                onSelect(opt);
                setOpen(false);
              }}
            >
              <span>{renderLabel ? renderLabel(opt) : opt}</span>
              {value === opt && <Check className="size-4 ml-auto shrink-0" />}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-2 py-3 text-xs text-[var(--muted-foreground)] text-center">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Voice Settings section ─── */

const AVATAR_FALLBACK = "/logo.jpg";

const VoiceSettings = () => {
  const ttsVoice = useSettingsStore((s) => s.ttsVoice);
  const ttsModel = useSettingsStore((s) => s.ttsModel);
  const voiceSpeed = useSettingsStore((s) => s.voiceSpeed);
  const voicePitch = useSettingsStore((s) => s.voicePitch);
  const voiceSelectionMode = useSettingsStore((s) => s.voiceSelectionMode);
  const favoriteVoices = useSettingsStore((s) => s.favoriteVoices);
  const favoriteCelebrityVoices = useSettingsStore(
    (s) => s.favoriteCelebrityVoices,
  );

  const {
    setTtsVoice,
    setVoiceSpeed,
    setVoicePitch,
    setVoiceSelectionMode,
    toggleFavoriteVoice,
    toggleFavoriteCelebrityVoice,
    getTtsVoices,
    getAllTtsVoices,
    getLabelledTtsVoices,
    getCelebrityVoices,
  } = useSettingsStore((s) => s.actions);

  const modelLanguages = useModelLanguages();
  const [previewLang, setPreviewLang] = useState(
    () => modelLanguages[0] || "English",
  );

  const voices = getTtsVoices(previewLang);
  const allVoices = getAllTtsVoices();
  const labelledVoices = getLabelledTtsVoices();
  const celebrityVoices = getCelebrityVoices();

  const { synthesize, isLoading: isTesting } = useSynthesize();

  // If current voice isn't available for the selected language in auto mode, auto-select first
  useEffect(() => {
    if (
      voiceSelectionMode === "auto" &&
      voices.length > 0 &&
      !voices.includes(ttsVoice)
    ) {
      setTtsVoice(voices[0]);
    }
  }, [voices, ttsVoice, setTtsVoice, voiceSelectionMode]);

  const testVoice = () => {
    synthesize("Hello, this is a test of the selected voice.", previewLang);
  };

  const findLabel = (voice: string) => {
    const found = labelledVoices.find((o) => o.value === voice);

    return found ? found.label : voice;
  };

  const modeLabel = (mode: VoiceSelectionMode) => {
    switch (mode) {
      case "auto":
        return "Auto (Per Language)";
      case "favorites":
        return "Favorites";
      case "celebrity":
        return "Celebrity";
    }
  };

  const regularAvatarMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};

    allVoices.forEach((v) => {
      m[v] = getVoiceAvatarUrl(`${v}-${ttsModel}`);
    });

    return m;
  }, [allVoices, ttsModel]);

  const celebrityAvatarMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};

    celebrityVoices.forEach((v) => {
      m[v] = getVoiceAvatarUrl(`celeb-${v}-${ttsModel}`);
    });

    return m;
  }, [celebrityVoices, ttsModel]);

  const {
    selectedLang,
    setSelectedLang,
    filteredVoices: filteredFavoriteVoices,
  } = useVoiceLanguageFilter({
    voices: allVoices,
    modelKey: ttsModel,
    languages: modelLanguages,
    getVoicesForLanguage: getTtsVoices,
  });

  /* Voices available in the mode-specific picker dropdown */
  const pickerVoices =
    voiceSelectionMode === "celebrity"
      ? favoriteCelebrityVoices
      : favoriteVoices;

  return (
    <div>
      <CardWidth>
        <div className="flex items-center gap-2 mb-2">
          <Volume2 className="size-5" />
          <h3 className="font-semibold text-base lg:text-2xl xl:text-4xl">
            Voice Settings
          </h3>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          Configure voice, speed, and pitch for text-to-speech playback across
          the dictionary.
        </p>

        <div className="space-y-8">
          {/* Voice Selection Mode */}
          <div>
            <p className="text-base font-medium mb-1">Voice Selection Mode</p>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">
              Choose how voices are selected for playback
            </p>
            <Dropdown
              ariaLabel="Voice selection mode"
              icon={<Volume2 className="size-4" />}
              options={["auto", "favorites", "celebrity"]}
              renderLabel={(v) => modeLabel(v as VoiceSelectionMode)}
              value={voiceSelectionMode}
              onSelect={(v) => {
                setVoiceSelectionMode(v as VoiceSelectionMode);
                showToast(
                  `Voice mode set to ${modeLabel(v as VoiceSelectionMode)}`,
                );
              }}
            />
          </div>

          {/* Conditional: Voice Picker or Auto info */}
          {voiceSelectionMode === "auto" ? (
            <>
              {/* Language selector (for previewing voices per language) */}
              <div>
                <p className="text-base font-medium mb-1">Preview Language</p>
                <p className="text-xs text-[var(--muted-foreground)] mb-3">
                  Choose a language to see available voices
                </p>
                <Dropdown
                  ariaLabel="Preview language selector"
                  options={modelLanguages}
                  value={previewLang}
                  onSelect={setPreviewLang}
                />
              </div>

              {/* Voice selector for the chosen language */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-base font-medium mb-1">Voice</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {voices.length} voice
                      {voices.length !== 1 ? "s" : ""} available for{" "}
                      {previewLang}
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
                    disabled={isTesting || voices.length === 0}
                    onClick={testVoice}
                  >
                    {isTesting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    Test Voice
                  </button>
                </div>
                <Dropdown
                  ariaLabel="Voice selector"
                  icon={<Volume2 className="size-4" />}
                  options={voices}
                  value={ttsVoice}
                  onSelect={(v) => {
                    setTtsVoice(v);
                    showToast(`Voice set to ${v}`);
                  }}
                />
              </div>
            </>
          ) : (
            /* Favorites / Celebrity mode — voice picker from selected pool */
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-base font-medium mb-4">
                    {voiceSelectionMode === "celebrity"
                      ? "Celebrity Voice"
                      : "Text-to-Speech Voice"}
                  </p>
                  <Dropdown
                    ariaLabel="Voice selector"
                    icon={<Volume2 className="size-4" />}
                    options={pickerVoices}
                    renderLabel={
                      voiceSelectionMode === "favorites" ? findLabel : undefined
                    }
                    value={ttsVoice}
                    onSelect={(v) => {
                      setTtsVoice(v);
                      showToast(`Voice set to ${v}`);
                    }}
                  />
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
                  disabled={isTesting || pickerVoices.length === 0}
                  onClick={testVoice}
                >
                  {isTesting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Test Voice
                </button>
              </div>
            </div>
          )}

          {/* Speed slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-base font-medium" htmlFor="speech-speed">
                Speech Speed
              </label>
              <span className="text-sm text-[var(--muted-foreground)] font-mono">
                {voiceSpeed.toFixed(1)}x
              </span>
            </div>
            <input
              className="w-full lg:w-56 h-4 accent-blue-500"
              id="speech-speed"
              max={2}
              min={0.5}
              step={0.1}
              title="Adjust speech speed from 0.5x to 2.0x"
              type="range"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-xs text-[var(--muted-foreground)] w-full lg:w-56 mt-1">
              <span>0.5x (Slow)</span>
              <span>2.0x (Fast)</span>
            </div>
          </div>

          {/* Pitch slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-base font-medium" htmlFor="speech-pitch">
                Speech Pitch
              </label>
              <span className="text-sm text-[var(--muted-foreground)] font-mono">
                {voicePitch.toFixed(1)}
              </span>
            </div>
            <input
              className="w-full lg:w-56 h-3 accent-blue-500"
              id="speech-pitch"
              max={2}
              min={0.5}
              step={0.1}
              title="Adjust speech pitch from 0.5 to 2.0"
              type="range"
              value={voicePitch}
              onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-xs text-[var(--muted-foreground)] w-full lg:w-56 mt-1">
              <span>0.5 (Low)</span>
              <span>2.0 (High)</span>
            </div>
          </div>
        </div>
      </CardWidth>

      {/* Celebrity Voices Grid */}
      {voiceSelectionMode === "celebrity" && (
        <CardWidth>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-[var(--primary)]" />
            <h3 className="font-semibold text-base lg:text-2xl xl:text-4xl">
              Celebrity Voices
            </h3>
          </div>

          <div className="space-y-4 mt-6">
            <p className="text-sm text-[var(--muted-foreground)]">
              Choose celebrity voices for unique playback. Select up to 4.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-2">
              {celebrityVoices.map((v) => {
                const selected = favoriteCelebrityVoices.includes(v);

                return (
                  <button
                    key={v}
                    aria-pressed={selected}
                    className={`flex flex-col mx-3 items-center p-3 rounded-lg border transform transition-transform duration-150 ${
                      selected
                        ? "scale-105 ring-2 ring-[var(--primary)] bg-[var(--primary)]/10 border-transparent"
                        : "border-transparent hover:bg-[var(--muted)]"
                    } focus:outline-none`}
                    type="button"
                    onClick={() => toggleFavoriteCelebrityVoice(v)}
                  >
                    <div className="relative">
                      <img
                        alt={`${v} avatar`}
                        className="w-12 h-12 rounded-full bg-[var(--muted)]"
                        src={celebrityAvatarMap[v]}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            AVATAR_FALLBACK;
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium mt-3 text-center line-clamp-2">
                      {v}
                    </div>
                  </button>
                );
              })}
            </div>
            {celebrityVoices.length === 0 && (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                <Sparkles className="size-12 mx-auto mb-3 opacity-50" />
                <p>No celebrity voices available for the current TTS model.</p>
              </div>
            )}
            <div className="text-xs text-[var(--muted-foreground)]">
              Selected: {favoriteCelebrityVoices.length} / 4
            </div>
          </div>
        </CardWidth>
      )}

      {/* Favorite Voices Grid */}
      {voiceSelectionMode === "favorites" && (
        <CardWidth>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="size-5 text-[var(--primary)]" />
              <h3 className="font-semibold text-base lg:text-2xl xl:text-4xl">
                Favorite Voices
              </h3>
            </div>

            <Dropdown
              ariaLabel="Language filter"
              options={["All", ...modelLanguages]}
              value={selectedLang}
              onSelect={setSelectedLang}
            />
          </div>

          <div className="space-y-4 mt-6">
            <p className="text-sm text-[var(--muted-foreground)]">
              Select up to 4 favorite voices for quick access.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-2">
              {filteredFavoriteVoices.map((v) => {
                const selected = favoriteVoices.includes(v);

                return (
                  <button
                    key={v}
                    aria-pressed={selected}
                    className={`flex flex-col mx-3 items-center p-3 rounded-lg border transform transition-transform duration-150 ${
                      selected
                        ? "scale-105 ring-2 ring-[var(--primary)] bg-[var(--primary)]/10 border-transparent"
                        : "border-transparent hover:bg-[var(--muted)]"
                    } focus:outline-none`}
                    type="button"
                    onClick={() => toggleFavoriteVoice(v)}
                  >
                    <div className="relative">
                      <img
                        alt={`${v} avatar`}
                        className="w-12 h-12 rounded-full bg-[var(--muted)]"
                        src={regularAvatarMap[v]}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            AVATAR_FALLBACK;
                        }}
                      />
                    </div>
                    <div className="text-sm mt-2">{findLabel(v)}</div>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Selected: {favoriteVoices.length} / 4
            </div>
          </div>
        </CardWidth>
      )}
    </div>
  );
};

export default VoiceSettings;
