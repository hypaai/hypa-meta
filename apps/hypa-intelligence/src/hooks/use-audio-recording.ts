// @ts-nocheck
import { useState, useRef, useEffect } from "react";

export interface UseAudioRecordingReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  recordingTime: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearAudio: () => void;
  setAudioBlob: (blob: Blob | null) => void;
  formatTime: (seconds: number) => string;
}

/**
 * Pick the best MIME type the current browser's MediaRecorder supports.
 * iOS Safari supports "audio/mp4", Chrome/Android prefer "audio/webm;codecs=opus",
 * and Firefox falls back to "audio/ogg;codecs=opus".
 */
function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }

  // Let the browser use its default
  return undefined;
}

export const useAudioRecording = (): UseAudioRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string | undefined>(undefined);

  const startRecording = async (): Promise<void> => {
    // ---- Guard: API availability (requires HTTPS on mobile) ----
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "Microphone access is not available. " +
          "Please make sure you are using HTTPS and a supported browser.",
      );
    }

    // ---- Guard: MediaRecorder support ----
    if (typeof MediaRecorder === "undefined") {
      throw new Error(
        "Audio recording is not supported in this browser. " +
          "Please try Chrome, Safari, or Firefox.",
      );
    }

    try {
      // Request permission with mobile-friendly constraints.
      // `echoCancellation` and `noiseSuppression` improve quality on phones;
      // setting them as `ideal` avoids hard-failing on devices that don't
      // support them.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 44100 },
        },
      });

      streamRef.current = stream;

      // Negotiate MIME type once
      const mimeType = getSupportedMimeType();

      mimeTypeRef.current = mimeType;

      const recorderOptions: MediaRecorderOptions = {};

      if (mimeType) recorderOptions.mimeType = mimeType;

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the actual MIME type the recorder produced
        const blobType = mimeTypeRef.current || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: blobType,
        });

        setAudioBlob(recordedBlob);

        // Release the microphone
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        // Ensure we clean up on error
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          /* no-op */
        }
        streamRef.current = null;
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      // Use timeslice so data is available incrementally (helps on some
      // mobile browsers that don't fire ondataavailable until stop()).
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error: unknown) {
      console.error("Error starting recording:", error);

      const err = error as DOMException | Error;

      // Provide user-friendly messages for common mobile permission errors
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        throw new Error(
          "Microphone permission was denied. " +
            "Please allow microphone access in your browser settings and try again.",
        );
      }
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        throw new Error(
          "No microphone was found on this device. " +
            "Please connect a microphone and try again.",
        );
      }
      if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        throw new Error(
          "The microphone is already in use by another application. " +
            "Please close other apps using the microphone and try again.",
        );
      }
      if (err.name === "OverconstrainedError") {
        // Retry with bare-minimum constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

          streamRef.current = stream;
          const mediaRecorder = new MediaRecorder(stream);

          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };
          mediaRecorder.onstop = () => {
            const blobType = mimeTypeRef.current || "audio/webm";
            const recordedBlob = new Blob(audioChunksRef.current, {
              type: blobType,
            });

            setAudioBlob(recordedBlob);
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          };
          mediaRecorder.start(1000);
          setIsRecording(true);
          setRecordingTime(0);
          recordingTimerRef.current = setInterval(() => {
            setRecordingTime((prev) => prev + 1);
          }, 1000);

          return;
        } catch {
          // Fall through to generic error
        }
      }

      throw new Error(
        "Failed to start recording. Please check microphone permissions in your browser/device settings.",
      );
    }
  };

  const stopRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
      }
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const clearAudio = (): void => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount — stop any active stream & timer
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    audioBlob,
    recordingTime,
    startRecording,
    stopRecording,
    clearAudio,
    setAudioBlob,
    formatTime,
  };
};
