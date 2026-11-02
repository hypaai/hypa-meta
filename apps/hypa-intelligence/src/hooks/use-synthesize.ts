import { useState, useRef, useCallback } from "react";
import {
  resolveTtsVoiceForLanguage,
  useSettingsStore,
} from "@/stores/settings-store";
import { showToast } from "@/components/shared/toast";
import { tp } from "@/lib/api";

const GAIN_BOOST = 3.0;

export function useSynthesize() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const synthesize = useCallback(
    async (text: string, language?: string, voiceOverride?: string) => {
      // If already playing, toggle off
      if (isPlaying) {
        stop();

        return;
      }

      setError(null);
      setIsLoading(true);

      try {
        const settings = useSettingsStore.getState();
        const {
          voiceSpeed,
          voicePitch,
          ttsProvider,
          ttsModel,
          ttsVoice,
          voiceSelectionMode,
          favoriteVoices,
          favoriteCelebrityVoices,
        } = settings;
        const resolvedVoice =
          voiceOverride ??
          resolveTtsVoiceForLanguage({
            language,
            preferredVoice: ttsVoice,
            provider: ttsProvider,
            modelName: ttsModel,
            voiceSelectionMode,
            favoriteVoices,
            favoriteCelebrityVoices,
          });

        console.info("[TTS][Web] Starting synthesis", {
          language: language?.toLowerCase() ?? "english",
          requestedVoice: resolvedVoice,
          textLength: text.length,
          voiceSpeed,
          voicePitch,
        });

        const audioUrl = await tp.synthesize({
          text,
          language,
          voice: resolvedVoice,
          preset: {
            provider: ttsProvider,
            model: ttsModel,
            language,
          },
        });

        // Revoke previous URL
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }
        urlRef.current = audioUrl;

        const audio = new Audio(audioUrl);

        audio.volume = 1.0;
        audio.playbackRate = voiceSpeed;
        audioRef.current = audio;

        // Amplify via Web Audio API GainNode
        if (!ctxRef.current) {
          ctxRef.current = new AudioContext();
        }
        const ctx = ctxRef.current;
        const source = ctx.createMediaElementSource(audio);
        const gainNode = ctx.createGain();

        gainNode.gain.value = GAIN_BOOST * voicePitch;
        source.connect(gainNode).connect(ctx.destination);

        audio.onplay = () => {
          console.info("[TTS][Web] Playback started");
          setIsPlaying(true);
        };
        audio.onended = () => {
          console.info("[TTS][Web] Playback ended");
          setIsPlaying(false);
        };
        audio.onerror = () => {
          console.error("[TTS][Web] Audio playback failed", {
            currentSrc: audio.currentSrc,
            networkState: audio.networkState,
            readyState: audio.readyState,
          });
          setIsPlaying(false);
          setError("Audio playback failed");
        };

        await audio.play();
      } catch (err) {
        console.error("[TTS][Web] Synthesis failed", err);
        let message = "Failed to synthesize speech";

        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as {
            response?: { data?: { message?: string } };
          };

          message = axiosErr.response?.data?.message ?? message;
        } else if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        showToast(message, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [isPlaying, stop],
  );

  return { synthesize, isLoading, isPlaying, error, stop };
}
