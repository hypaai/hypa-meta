import { encodeWAV } from "./encoder";

const WAV_SAMPLE_RATE = 16000;

// MediaRecorder output (WebM/Opus, fragmented MP4) has no duration in its
// header, and speech-to-text billing/format checks need one. Transcoding to
// 16 kHz mono WAV client-side gives every provider a container it can always
// sniff and measure, regardless of which codec the browser recorded with.
export async function blobToWav(
  blob: Blob,
  sampleRate = WAV_SAMPLE_RATE,
): Promise<Blob> {
  const context = new AudioContext();

  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * sampleRate),
      sampleRate,
    );
    const source = offline.createBufferSource();

    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();

    const rendered = await offline.startRendering();

    return new Blob(
      [encodeWAV(rendered.getChannelData(0), sampleRate) as BlobPart],
      { type: "audio/wav" },
    );
  } finally {
    void context.close();
  }
}
