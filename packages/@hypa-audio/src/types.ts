export interface AudioCaptureConfig {
  chunkDuration?: number;
  sampleRate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  bufferSize?: number;
}

export interface AudioCaptureState {
  isCapturing: boolean;
}

export type ChunkCallback = (wav: Uint8Array) => void;

export const DEFAULTS = {
  chunkDuration: 1.5,
  sampleRate: 16000,
  echoCancellation: true,
  noiseSuppression: true,
  bufferSize: 4096,
} as const satisfies Required<AudioCaptureConfig>;
