/** Limits fit the 15 MB JSON body of /v2/agent and the 10 MB body of Lab chat after base64 encoding. */
export const CHAT_FILE_LIMIT = 4;
export const CHAT_FILE_BYTES = 5 * 1024 * 1024;
export const CHAT_TOTAL_FILE_BYTES = 7 * 1024 * 1024;
export const CHAT_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const CHAT_AUDIO_MIMES = [
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
] as const;
export const CHAT_FILE_MIMES: readonly string[] = [
  ...CHAT_IMAGE_MIMES,
  ...CHAT_AUDIO_MIMES,
];

export interface ChatFileInput {
  data: string;
  mime: string;
  name: string;
}

export function chatFileMime(name: string, type: string): string | undefined {
  const mime = type.split(";")[0].toLowerCase();
  const aliases: Record<string, string> = {
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
    "audio/x-m4a": "audio/mp4",
    "audio/x-flac": "audio/flac",
  };
  if (CHAT_FILE_MIMES.includes(aliases[mime] ?? mime))
    return aliases[mime] ?? mime;
  if (mime && mime !== "application/octet-stream") return undefined;
  const extensions: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    flac: "audio/flac",
    webm: "audio/webm",
  };
  return extensions[name.split(".").at(-1)?.toLowerCase() ?? ""];
}

/** Names the audio container from its first bytes, or undefined when it is not one we know. */
export function sniffAudioMime(bytes: Uint8Array): string | undefined {
  if (bytes.length < 12) return undefined;
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  const header = ascii(0, 12);
  if (header.startsWith("RIFF") && header.includes("WAVE")) return "audio/wav";
  if (header.startsWith("OggS")) return "audio/ogg";
  if (header.startsWith("fLaC")) return "audio/flac";
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
    return "audio/webm";
  if (header.startsWith("ID3")) return "audio/mpeg";
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (header.slice(4, 8) === "ftyp") return "audio/mp4";
  return undefined;
}
