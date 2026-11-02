import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Mic, Plus, Send, Square, X } from "lucide-react";
import { getAssistantModels, MODELS } from "@hypa/config/models";
import conversationStarters from "@hypa/config/json/conversation-starter";
import { blobToBase64, imageToAttachment } from "@hypa/intelligence-core/agent-stream";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { useAgentChat, type ChatTurn } from "./use-agent-chat";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAudioRecording } from "@/hooks/use-audio-recording";

/** The Intelligence assistant default (app-level, not the catalog's global AC default). */
const DEFAULT_ASSISTANT = "meta/muse-spark-1.3";

/** Starter prompts that use Hypa tools, from the shared conversation starters. */
const STARTERS = (conversationStarters as { title: string; tools?: boolean }[])
  .filter((starter) => starter.tools)
  .map((starter) => starter.title);

/** Compact markdown for replies (lists, emphasis, links, code), styled with the site tokens. */
const MARKDOWN: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children, href }) => (
    <a className="underline" href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[var(--muted)] px-1 py-0.5 text-[0.85em]">{children}</code>
  ),
};

const assistantOptions = () =>
  Object.keys(MODELS).flatMap((provider) =>
    getAssistantModels(provider).map((model) => ({
      id: `${provider}/${model.name}`,
      label: model.displayName || model.name,
    })),
  );

export function ChatScreen() {
  const options = useMemo(assistantOptions, []);
  const [assistant, setAssistant] = useState(
    options.some((option) => option.id === DEFAULT_ASSISTANT)
      ? DEFAULT_ASSISTANT
      : (options[0]?.id ?? ""),
  );
  const slash = assistant.indexOf("/");
  const chat = useAgentChat({
    provider: assistant.slice(0, slash),
    model: assistant.slice(slash + 1),
  });
  const [text, setText] = useState("");
  const [images, setImages] = useState<NonNullable<ChatTurn["images"]>>([]);
  const [micError, setMicError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recorder = useAudioRecording();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages]);

  const submit = (turn: ChatTurn) => {
    if (chat.busy || (!turn.text && !turn.audio && !turn.images?.length)) return;
    void chat.send(turn);
    setText("");
    setImages([]);
  };

  // A finished recording is sent as a voice turn.
  useEffect(() => {
    if (!recorder.audioBlob) return;
    void blobToBase64(recorder.audioBlob).then((audio) => {
      submit({ text: text.trim(), audio, images });
      recorder.clearAudio();
    });
  }, [recorder.audioBlob]);

  const addImages = async (files: FileList | null) => {
    const picked = Array.from(files ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 4 - images.length);
    const ready = await Promise.all(picked.map((file) => imageToAttachment(file)));

    setImages((current) =>
      [...current, ...ready.filter((image) => image.data.length * 0.75 <= 5 * 1024 * 1024)].slice(0, 4),
    );
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleMic = async () => {
    setMicError("");
    if (recorder.isRecording) {
      recorder.stopRecording();

      return;
    }
    try {
      await recorder.startRecording();
    } catch (error) {
      setMicError(error instanceof Error ? error.message : "Couldn't start the microphone.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 md:px-6">
      <div className="flex flex-wrap items-center gap-2 py-4 text-sm">
        <label className="flex items-center gap-2 text-[var(--muted-foreground)]">
          Assistant
          <select
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[var(--foreground)]"
            value={assistant}
            onChange={(e) => setAssistant(e.target.value)}
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          className="ml-auto"
          disabled={chat.messages.length === 0 || chat.busy}
          size="sm"
          variant="outline"
          onClick={chat.reset}
        >
          <Plus /> New chat
        </Button>
      </div>

      <div className="flex-1 space-y-5 pb-6">
        {chat.messages.length === 0 ? (
          <div className="space-y-6 pt-10 text-center">
            <h1 className="text-2xl font-semibold text-[var(--foreground)] md:text-3xl">
              Ask Hypa in your language
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Type, speak, or add a photo. Hypa translates, speaks, looks up words and reads text
              for you.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left text-sm text-[var(--foreground)] hover:bg-[var(--muted)]"
                  type="button"
                  onClick={() => setText(starter)}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-[var(--muted)] text-[var(--foreground)]"
                    : "text-[var(--foreground)]"
                }`}
              >
                {message.images && message.images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {message.images.map((src, index) => (
                      <img
                        key={src.slice(-24) + index}
                        alt={`Attachment ${index + 1}`}
                        className="h-20 w-20 rounded-lg object-cover"
                        src={src}
                      />
                    ))}
                  </div>
                )}
                {message.content &&
                  (message.role === "assistant" ? (
                    <Markdown components={MARKDOWN} remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </Markdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ))}
                {message.status === "pending" && (
                  <p className="text-[var(--muted-foreground)]">
                    {message.activity ? `${message.activity}…` : "Thinking…"}
                  </p>
                )}
                {message.audioUrl && (
                  <audio controls className="mt-2 w-full max-w-sm" src={message.audioUrl}>
                    <track kind="captions" />
                  </audio>
                )}
                {message.steps?.some((step) => step.status === "ok") && (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    {message.steps
                      .filter((step) => step.status === "ok")
                      .map((step) => step.label)
                      .join(" · ")}
                  </p>
                )}
                {message.failedTools?.map((line) => (
                  <p key={line} className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-[var(--background)] pb-4 pt-2">
        {images.length > 0 && (
          <div className="mb-2 flex gap-2">
            {images.map((image, index) => (
              <div key={image.preview.slice(-24) + index} className="relative">
                <img
                  alt={`Attachment ${index + 1}`}
                  className="h-14 w-14 rounded-lg border border-[var(--border)] object-cover"
                  src={image.preview}
                />
                <button
                  aria-label="Remove photo"
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--muted)] p-0.5"
                  type="button"
                  onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form
          className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit({ text: text.trim(), images });
          }}
        >
          <input
            ref={fileRef}
            hidden
            multiple
            accept="image/*"
            type="file"
            onChange={(e) => void addImages(e.target.files)}
          />
          <Button
            aria-label="Add a photo"
            disabled={images.length >= 4}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
          >
            <Camera />
          </Button>
          <Textarea
            className="max-h-40 min-h-10 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
            placeholder="Ask anything"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit({ text: text.trim(), images });
              }
            }}
          />
          <Button
            aria-label={recorder.isRecording ? "Stop recording" : "Speak"}
            size="icon"
            type="button"
            variant={recorder.isRecording ? "default" : "ghost"}
            onClick={() => void toggleMic()}
          >
            {recorder.isRecording ? <Square /> : <Mic />}
          </Button>
          <Button
            aria-label="Send"
            disabled={chat.busy || (!text.trim() && images.length === 0)}
            size="icon"
            type="submit"
          >
            <Send />
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">
          {micError ||
            "Chats aren't saved. Check medical answers with a pharmacist or doctor."}
        </p>
      </div>
    </div>
  );
}
