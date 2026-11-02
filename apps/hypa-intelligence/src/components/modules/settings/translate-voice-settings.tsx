// @ts-nocheck
import {
  ChevronDown,
  Volume2,
  Play,
  Check,
  Star,
  Sparkles,
} from "lucide-react";
import { useSettings } from "@/context/settings-context";
import { useMutation } from "@tanstack/react-query";
import { textToSpeechAPI } from "@/lib/api";
import { VOICE_TEST_TEXT_EN } from "@/constants/app.constants";
import { toast } from "sonner";
import {
  playBlobWithPitchAndSpeed,
  stopOrPauseAudio,
  warmUpAudioContext,
  type AudioController,
} from "@/lib/audio";
import { useState, useMemo } from "react";

import { Slider } from "../../ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Button } from "../../ui/button";
import CardWidth from "../../ui/card-with";

const VoiceSettings = () => {
  const {
    settings,
    updateSettings,
    updateVoiceSetting,
    getAvailableVoices,
    getAvailableLabelledVoices,
    getAvailableCelebrityVoices,
    toggleFavoriteVoice,
    toggleFavoriteCelebrityVoice,
  } = useSettings();

  const allVoiceOptions = getAvailableVoices();
  const celebrityVoiceOptions = getAvailableCelebrityVoices();
  const favoriteVoiceOptions = allVoiceOptions.filter(
    (v) => String(v).toLowerCase() !== "auto",
  );

  const findLabel = (voice: string) => {
    const found = getAvailableLabelledVoices().find((o) => o.value === voice);

    return found ? found.label : voice;
  };

  const avatarMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};

    allVoiceOptions.forEach((v) => {
      if (v.toLowerCase() !== "auto") {
        const seed = encodeURIComponent(`${v}-${settings.ttsModel}`);

        m[v] = `https://api.dicebear.com/6.x/open-peeps/svg?seed=${seed}`;
      }
    });

    return m;
  }, [allVoiceOptions, settings.ttsModel]);

  const celebrityAvatarMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};

    celebrityVoiceOptions.forEach((v) => {
      const seed = encodeURIComponent(`celeb-${v}-${settings.ttsModel}`);

      m[v] = `https://api.dicebear.com/6.x/open-peeps/svg?seed=${seed}`;
    });

    return m;
  }, [celebrityVoiceOptions, settings.ttsModel]);

  const [currentController, setCurrentController] =
    useState<AudioController | null>(null);

  const ttsTestMutation = useMutation({
    mutationFn: textToSpeechAPI,
    onMutate: () => {
      if (currentController) {
        stopOrPauseAudio(currentController);
        setCurrentController(null);
      }
    },
    onSuccess: async (res) => {
      try {
        const data = res.data;

        if (!data || !data.audio_b64)
          throw new Error("No audio returned from TTS API");

        const audioData = data.audio_b64;
        const bytes = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "audio/wav" });

        const controller = await playBlobWithPitchAndSpeed(blob, {
          speed: settings.voice.speed,
          pitch: settings.voice.pitch,
          onended: () => setCurrentController(null),
          onerror: (msg) => {
            setCurrentController(null);
            toast.error("TTS playback failed: " + msg);
          },
        });

        setCurrentController(controller);
      } catch (err) {
        console.error(
          "TTS playback failed, falling back to SpeechSynthesis:",
          err,
        );
        try {
          const utterance = new SpeechSynthesisUtterance(VOICE_TEST_TEXT_EN);

          utterance.rate = settings.voice.speed;
          utterance.pitch = settings.voice.pitch;
          const voices = speechSynthesis.getVoices();
          const voiceToTest = settings.voice.voice;
          const selectedVoice = voices.find((v) => v.name === voiceToTest);

          if (selectedVoice) utterance.voice = selectedVoice;
          speechSynthesis.speak(utterance);
          toast.warning("Fell back to browser TTS");
        } catch (err2) {
          console.error("SpeechSynthesis fallback failed:", err2);
          toast.error("Failed to play test voice");
        }
      }
    },
    onError: (error) => {
      console.error("TTS API test failed:", error);
      try {
        const utterance = new SpeechSynthesisUtterance(VOICE_TEST_TEXT_EN);

        utterance.rate = settings.voice.speed;
        utterance.pitch = settings.voice.pitch;
        const voices = speechSynthesis.getVoices();
        const voiceToTest = settings.voice.voice;
        const selectedVoice = voices.find((v) => v.name === voiceToTest);

        if (selectedVoice) utterance.voice = selectedVoice;
        speechSynthesis.speak(utterance);
        toast.warning("Fell back to browser TTS");
      } catch (err2) {
        console.error("SpeechSynthesis fallback failed:", err2);
        toast.error("Failed to play test voice");
      }
    },
  });

  const testVoice = () => {
    // Warm up AudioContext inside the user gesture (iOS requirement)
    warmUpAudioContext();

    const voiceToTest = settings.voice.voice;

    ttsTestMutation.mutate({
      text: VOICE_TEST_TEXT_EN,
      voice: voiceToTest,
      ttsModel: settings.ttsModel,
    });
  };

  const getCurrentVoiceLabel = () => {
    return findLabel(settings.voice.voice);
  };

  const getVoiceSelectionModeLabel = () => {
    switch (settings.voiceSelectionMode) {
      case "auto":
        return "Auto (Target Language)";
      case "favorites":
        return "Favorites";
      case "celebrity":
        return "Celebrity";
      default:
        return "Auto (Target Language)";
    }
  };

  return (
    <div className="">
      <CardWidth>
        <h3 className="text-card-foreground font-semibold text-base lg:text-2xl xl:text-4xl">
          Voice Settings
        </h3>

        <div className="space-y-8 mt-8">
          {/* Voice Selection Mode */}
          <div>
            <div className="mb-3">
              <p className="text-base text-card-foreground font-medium mb-1">
                Voice Selection Mode
              </p>
              <p className="text-xs text-muted-foreground">
                Choose how voices are selected during translation
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Voice selection mode"
                  className="min-w-40 lg:w-56 justify-between"
                  variant="outline"
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="size-4" />
                    <span>{getVoiceSelectionModeLabel()}</span>
                  </div>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                style={{ width: "var(--radix-dropdown-menu-trigger-width)" }}
              >
                <DropdownMenuItem
                  className={
                    settings.voiceSelectionMode === "auto" ? "bg-accent" : ""
                  }
                  onClick={() => {
                    console.log("[VoiceSettings] Switching to Auto mode");
                    updateSettings("voiceSelectionMode", "auto");
                    // Auto mode doesn't need a specific voice selection
                    console.log(
                      "[VoiceSettings] Auto mode selected - voice will be determined per target language",
                    );
                  }}
                >
                  <span className="flex-1 min-w-0">Auto (Target Language)</span>
                  {settings.voiceSelectionMode === "auto" && (
                    <Check className="size-4 ml-auto shrink-0" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={
                    settings.voiceSelectionMode === "favorites"
                      ? "bg-accent"
                      : ""
                  }
                  onClick={() => {
                    console.log("[VoiceSettings] Switching to Favorites mode");
                    console.log(
                      "[VoiceSettings] Available favorite voices:",
                      settings.favoriteVoices,
                    );
                    updateSettings("voiceSelectionMode", "favorites");
                    // Select the first favorite voice as default
                    if (
                      settings.favoriteVoices &&
                      settings.favoriteVoices.length > 0
                    ) {
                      const firstFavoriteVoice = settings.favoriteVoices[0];

                      console.log(
                        "[VoiceSettings] Setting default voice to first favorite:",
                        firstFavoriteVoice,
                      );
                      updateVoiceSetting("voice", firstFavoriteVoice);
                    } else {
                      console.log(
                        "[VoiceSettings] No favorite voices available to set as default",
                      );
                    }
                  }}
                >
                  <span className="flex-1 min-w-0">Favorites</span>
                  {settings.voiceSelectionMode === "favorites" && (
                    <Check className="size-4 ml-auto shrink-0" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={
                    settings.voiceSelectionMode === "celebrity"
                      ? "bg-accent"
                      : ""
                  }
                  onClick={() => {
                    console.log("[VoiceSettings] Switching to Celebrity mode");
                    console.log(
                      "[VoiceSettings] Available celebrity voices:",
                      settings.favoriteCelebrityVoices,
                    );
                    updateSettings("voiceSelectionMode", "celebrity");
                    // Select the first celebrity voice as default
                    if (
                      settings.favoriteCelebrityVoices &&
                      settings.favoriteCelebrityVoices.length > 0
                    ) {
                      const firstCelebrityVoice =
                        settings.favoriteCelebrityVoices[0];

                      console.log(
                        "[VoiceSettings] Setting default voice to first celebrity:",
                        firstCelebrityVoice,
                      );
                      updateVoiceSetting("voice", firstCelebrityVoice);
                    } else {
                      console.log(
                        "[VoiceSettings] No celebrity voices available to set as default",
                      );
                    }
                  }}
                >
                  <span className="flex-1 min-w-0">Celebrity</span>
                  {settings.voiceSelectionMode === "celebrity" && (
                    <Check className="size-4 ml-auto shrink-0" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Conditional: Text-to-Speech Voice (Favorites/Celebrity Mode) */}
          {settings.voiceSelectionMode === "favorites" ||
          settings.voiceSelectionMode === "celebrity" ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="">
                    <p className="text-base mb-4 text-card-foreground font-medium">
                      {settings.voiceSelectionMode === "celebrity"
                        ? "Celebrity Voice"
                        : "Text-to-Speech Voice"}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label="Voice selector"
                          className="min-w-40 lg:w-56 justify-between"
                          variant="outline"
                        >
                          <div className="flex items-center gap-2">
                            <Volume2 className="size-4" />
                            <span>{getCurrentVoiceLabel()}</span>
                          </div>
                          <ChevronDown className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="max-h-80 overflow-auto"
                        style={{
                          width: "var(--radix-dropdown-menu-trigger-width)",
                        }}
                      >
                        {settings.voiceSelectionMode === "celebrity"
                          ? // Celebrity voices dropdown - show favorites
                            settings.favoriteCelebrityVoices.map((voice) => (
                              <DropdownMenuItem
                                key={voice}
                                className={
                                  settings.voice.voice === voice
                                    ? "bg-accent"
                                    : ""
                                }
                                onClick={() =>
                                  updateVoiceSetting("voice", voice)
                                }
                              >
                                <span className="flex-1 min-w-0">{voice}</span>
                                {settings.voice.voice === voice && (
                                  <Check className="size-4 ml-auto shrink-0" />
                                )}
                              </DropdownMenuItem>
                            ))
                          : // Favorite voices dropdown
                            settings.favoriteVoices.map((voice) => (
                              <DropdownMenuItem
                                key={voice}
                                className={
                                  settings.voice.voice === voice
                                    ? "bg-accent"
                                    : ""
                                }
                                onClick={() =>
                                  updateVoiceSetting("voice", voice)
                                }
                              >
                                <span className="flex-1 min-w-0">
                                  {findLabel(voice)}
                                </span>
                                {settings.voice.voice === voice && (
                                  <Check className="size-4 ml-auto shrink-0" />
                                )}
                              </DropdownMenuItem>
                            ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <Button
                  className="flex items-center gap-2"
                  disabled={ttsTestMutation.isPending}
                  loading={ttsTestMutation.isPending}
                  size="sm"
                  variant="outline"
                  onClick={testVoice}
                >
                  <Play className="size-4" />
                  Test Voice
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/30 rounded-lg border border-muted">
              <p className="text-sm text-muted-foreground">
                💡 In Auto mode, voice selection happens per language in the
                translation output panel. You can choose different voices for
                each target language when you translate.
              </p>
            </div>
          )}

          {/* Speed Control */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-base text-card-foreground font-medium">
                Speech Speed
              </p>
              <span className="text-sm text-muted-foreground font-mono">
                {settings.voice.speed.toFixed(1)}x
              </span>
            </div>
            <div className="space-y-2">
              <Slider
                className="w-full lg:w-56"
                max={2}
                min={0.5}
                step={0.1}
                value={[settings.voice.speed]}
                onValueChange={(value) => updateVoiceSetting("speed", value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5x (Slow)</span>
                <span>2.0x (Fast)</span>
              </div>
            </div>
          </div>

          {/* Pitch Control */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-base text-card-foreground font-medium">
                Speech Pitch
              </p>
              <span className="text-sm text-muted-foreground font-mono">
                {settings.voice.pitch.toFixed(1)}
              </span>
            </div>
            <div className="space-y-2">
              <Slider
                className="w-full lg:w-56"
                max={2}
                min={0.5}
                step={0.1}
                value={[settings.voice.pitch]}
                onValueChange={(value) => updateVoiceSetting("pitch", value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5 (Low)</span>
                <span>2.0 (High)</span>
              </div>
            </div>
          </div>
        </div>
      </CardWidth>

      {/* Celebrity Voices Card */}
      {settings.voiceSelectionMode === "celebrity" && (
        <CardWidth>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-theme-primary" />
            <h3 className="text-card-foreground font-semibold text-base lg:text-2xl xl:text-4xl">
              Celebrity Voices
            </h3>
          </div>

          <div className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground">
              Choose a celebrity voice for all translations. Perfect for
              entertainment and unique content!
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-2">
              {celebrityVoiceOptions.map((v) => {
                const selected = settings.favoriteCelebrityVoices?.includes(v);

                return (
                  <button
                    key={v}
                    aria-pressed={selected}
                    className={`flex flex-col mx-3 items-center p-3 rounded-lg border transform transition-transform duration-150 ${
                      selected
                        ? "scale-105 ring-2 ring-theme-primary bg-theme-primary/10 border-transparent"
                        : "border-transparent hover:bg-muted"
                    } focus:outline-none`}
                    type="button"
                    onClick={() => toggleFavoriteCelebrityVoice(v)}
                  >
                    <div className="relative">
                      <img
                        alt={`${v} avatar`}
                        className="w-12 h-12 rounded-full object-cover"
                        src={celebrityAvatarMap[v]}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/logo.jpg";
                        }}
                      />
                      {selected && (
                        <span className="absolute -top-1 -right-1 bg-theme-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                          <Check className="size-4" />
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium mt-3 text-center line-clamp-2">
                      {v}
                    </div>
                  </button>
                );
              })}
            </div>
            {celebrityVoiceOptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="size-12 mx-auto mb-3 opacity-50" />
                <p>No celebrity voices available for the current TTS model.</p>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Selected: {settings.favoriteCelebrityVoices?.length || 0} / 4
            </div>
          </div>
        </CardWidth>
      )}

      {/* Favorite Voices Card */}
      {settings.voiceSelectionMode === "favorites" && (
        <CardWidth>
          <div className="flex items-center gap-2 mb-4">
            <Star className="size-5 text-theme-primary" />
            <h3 className="text-card-foreground font-semibold text-base lg:text-2xl xl:text-4xl">
              Favorite Voices
            </h3>
          </div>

          <div className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground">
              Select up to 4 favorite voices for quick access.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-2">
              {favoriteVoiceOptions.map((v) => {
                const selected = settings.favoriteVoices?.includes(v);

                return (
                  <button
                    key={v}
                    aria-pressed={selected}
                    className={`flex flex-col mx-3 items-center p-3 rounded-lg border transform transition-transform duration-150 ${
                      selected
                        ? "scale-105 ring-2 ring-theme-primary bg-theme-primary/10 border-transparent"
                        : "border-transparent hover:bg-muted"
                    } focus:outline-none`}
                    type="button"
                    onClick={() => toggleFavoriteVoice(v)}
                  >
                    <div className="relative">
                      <img
                        alt={`${v} avatar`}
                        className="w-12 h-12 rounded-full object-cover"
                        src={avatarMap[v]}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/logo.jpg";
                        }}
                      />
                      {selected && (
                        <span className="absolute -top-1 -right-1 bg-theme-primary text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                          <Check className="size-3" />
                        </span>
                      )}
                    </div>
                    <div className="text-sm mt-2">{findLabel(v)}</div>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              Selected: {settings.favoriteVoices?.length || 0} / 4
            </div>
          </div>
        </CardWidth>
      )}
    </div>
  );
};

export default VoiceSettings;
