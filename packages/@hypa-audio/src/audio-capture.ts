import { encodeWAV } from "./encoder";
import { type AudioCaptureConfig, type ChunkCallback, DEFAULTS } from "./types";

export class AudioCapture {
  private config: Required<AudioCaptureConfig>;
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private sendTimer: ReturnType<typeof setInterval> | null = null;
  private chunkCallbacks: ChunkCallback[] = [];
  private _isCapturing = false;

  constructor(config?: AudioCaptureConfig) {
    this.config = { ...DEFAULTS, ...config };
  }

  get isCapturing(): boolean {
    return this._isCapturing;
  }

  onChunkReady(cb: ChunkCallback): () => void {
    this.chunkCallbacks.push(cb);
    return () => {
      this.chunkCallbacks = this.chunkCallbacks.filter((c) => c !== cb);
    };
  }

  async start(): Promise<void> {
    if (this._isCapturing) return;

    const { sampleRate, echoCancellation, noiseSuppression, bufferSize } = this.config;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate,
        channelCount: 1,
        echoCancellation,
        noiseSuppression,
      },
    });

    this.audioCtx = new AudioContext({ sampleRate });
    const source = this.audioCtx.createMediaStreamSource(this.mediaStream);

    this.processor = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
    this.processor.onaudioprocess = (e) => {
      this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };

    source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);
    this.chunks = [];
    this._isCapturing = true;

    this.sendTimer = setInterval(() => {
      const samples = this.drain();
      if (samples.length < sampleRate * 0.5) return;

      const wav = encodeWAV(samples, sampleRate);
      for (const cb of this.chunkCallbacks) cb(wav);
    }, this.config.chunkDuration * 1000);
  }

  stop(): void {
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
      this.sendTimer = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    this.chunks = [];
    this._isCapturing = false;
  }

  /** Send the last, possibly shorter, chunk before ending a live session. */
  flush(): void {
    const samples = this.drain();
    if (!samples.length) return;
    const wav = encodeWAV(samples, this.config.sampleRate);
    for (const cb of this.chunkCallbacks) cb(wav);
  }

  drain(): Float32Array {
    if (this.chunks.length === 0) return new Float32Array(0);

    const totalLen = this.chunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Float32Array(totalLen);
    let offset = 0;
    for (const c of this.chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    this.chunks = [];
    return out;
  }
}
