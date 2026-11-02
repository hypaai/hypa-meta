import { useState, useRef, useEffect, useCallback } from "react";
import { AudioCapture } from "../audio-capture";
import type { AudioCaptureConfig, ChunkCallback } from "../types";

export function useAudioCapture(config?: AudioCaptureConfig) {
  const [isCapturing, setIsCapturing] = useState(false);
  const captureRef = useRef<AudioCapture | null>(null);

  useEffect(() => {
    captureRef.current = new AudioCapture(config);
    return () => {
      captureRef.current?.stop();
      captureRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    const capture = captureRef.current;
    if (!capture || capture.isCapturing) return;
    await capture.start();
    setIsCapturing(true);
  }, []);

  const stop = useCallback(() => {
    const capture = captureRef.current;
    if (!capture) return;
    capture.stop();
    setIsCapturing(false);
  }, []);

  const onChunkReady = useCallback((cb: ChunkCallback) => {
    const capture = captureRef.current;
    if (!capture) return () => {};
    return capture.onChunkReady(cb);
  }, []);

  const flush = useCallback(() => captureRef.current?.flush(), []);

  return { isCapturing, start, stop, flush, onChunkReady };
}
