// @ts-nocheck
import { useState, useRef } from "react";

export interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  playAudio: (audioBlob: Blob) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
}

export const useAudioPlayback = (): UseAudioPlaybackReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = (audioBlob: Blob): void => {
    if (audioBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
    }
  };

  const pauseAudio = (): void => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stopAudio = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return {
    isPlaying,
    playAudio,
    pauseAudio,
    stopAudio,
  };
};
