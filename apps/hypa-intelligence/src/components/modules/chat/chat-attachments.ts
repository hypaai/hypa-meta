import {
  CHAT_FILE_BYTES,
  CHAT_FILE_LIMIT,
  CHAT_TOTAL_FILE_BYTES,
  chatFileMime,
  sniffAudioMime,
} from "@hypa/config/chat-attachments";
import {
  blobToBase64,
  imageToAttachment,
} from "@hypa/intelligence-core/agent-stream";

/** An image or audio file waiting to be sent, or already sent in a user message. */
export interface ChatAttachment {
  id: string;
  kind: "image" | "audio";
  name: string;
  mime: string;
  /** Base64 without the data-URL prefix. */
  data: string;
  size: number;
  /** An image data URL, or an object URL for audio. */
  url: string;
  /** Known for recordings; uploaded audio reports its own length when played. */
  seconds?: number;
}

/** What a card or a sent message needs, without the file bytes. */
export type AttachmentView = Pick<
  ChatAttachment,
  "id" | "kind" | "name" | "url" | "seconds" | "size"
>;

const SUPPORTED = "Add PNG, JPG, WebP, MP3, WAV, M4A, OGG, FLAC or WebM files.";

export const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export async function attachmentFromFile(
  file: Blob & { name?: string },
  options: { name?: string; seconds?: number } = {},
): Promise<ChatAttachment> {
  const name = options.name ?? file.name ?? "file";
  const mime = chatFileMime(name, file.type);

  if (!mime) throw new Error(SUPPORTED);
  if (mime.startsWith("image/")) {
    const image = await imageToAttachment(file).catch(() => {
      throw new Error("Couldn't read that image. Try another image.");
    });

    return {
      id: crypto.randomUUID(),
      kind: "image",
      name: name.replace(/\.\w+$/, "") + ".jpg",
      mime: image.mime,
      data: image.data,
      size: Math.round(image.data.length * 0.75),
      url: image.preview,
    };
  }

  // The server checks the real bytes too, so a mislabeled file is refused here with a clear reason.
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (sniffAudioMime(head) !== mime)
    throw new Error(
      `"${name}" doesn't look like the audio file its name says. Try another file.`,
    );

  return {
    id: crypto.randomUUID(),
    kind: "audio",
    name,
    mime,
    data: await blobToBase64(file),
    size: file.size,
    url: URL.createObjectURL(file),
    seconds: options.seconds,
  };
}

/** The first problem with adding `incoming` to `existing`, or undefined when it all fits. */
export function attachmentProblem(
  existing: ChatAttachment[],
  incoming: ChatAttachment[],
): string | undefined {
  if (existing.length + incoming.length > CHAT_FILE_LIMIT)
    return `You can attach up to ${CHAT_FILE_LIMIT} files.`;
  if (incoming.some((item) => item.size > CHAT_FILE_BYTES))
    return "Each file must be 5 MB or smaller.";
  if (
    [...existing, ...incoming].reduce((sum, item) => sum + item.size, 0) >
    CHAT_TOTAL_FILE_BYTES
  )
    return "Attachments must total 7 MB or less.";

  return undefined;
}

export const releaseAttachment = (item: ChatAttachment) => {
  if (item.kind === "audio") URL.revokeObjectURL(item.url);
};
