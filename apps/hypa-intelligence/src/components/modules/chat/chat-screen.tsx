/* eslint jsx-a11y/no-noninteractive-tabindex: ["error", { "roles": ["region"] }] */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Camera,
  Mic,
  Plus,
  Send,
  Square,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";
import { GetAppButtons } from "@hypa/ui/web";
import { getAssistantModels, MODELS } from "@hypa/config/models";
import conversationStarters from "@hypa/config/json/conversation-starter";
import { blobToWav } from "@hypa/audio";
import { CHAT_FILE_LIMIT } from "@hypa/config/chat-attachments";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStickToBottom } from "use-stick-to-bottom";

import { useAgentChat, type ChatTurn } from "./use-agent-chat";
import { AttachmentCard, AttachmentRow } from "./attachment-cards";
import { CameraCapture } from "./camera-capture";
import {
  attachmentFromFile,
  attachmentProblem,
  releaseAttachment,
  type ChatAttachment,
} from "./chat-attachments";
import { ImageViewer } from "./image-gallery";
import { ResponseMedia } from "./response-media";
import { MessageActions } from "./message-actions";
import { RecordingBar } from "./recording-bar";
import { ToolActivityFold } from "./tool-activity-fold";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAudioRecording } from "@/hooks/use-audio-recording";
import { usePageEnter } from "@/hooks/use-page-enter";

/** The Intelligence assistant default (app-level, not the catalog's global AC default). */
const DEFAULT_ASSISTANT = "meta/muse-spark-1.3";

/** Starter prompts that use Hypa tools, from the shared conversation starters. */
const STARTERS = (conversationStarters as { title: string; tools?: boolean }[])
  .filter((starter) => starter.tools)
  .map((starter) => starter.title);

/** Compact markdown for replies (lists, emphasis, links, code), styled with the site tokens. */
const MARKDOWN: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a className="underline" href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[var(--muted)] px-1 py-0.5 text-[0.85em]">
      {children}
    </code>
  ),
};

const assistantOptions = () =>
  Object.keys(MODELS).flatMap((provider) =>
    getAssistantModels(provider).map((model) => ({
      id: `${provider}/${model.name}`,
      label: model.displayName || model.name,
    })),
  );

const MAX_RECORDING_SECONDS = 150;

export function ChatScreen() {
  const enter = usePageEnter();
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
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [micError, setMicError] = useState("");
  const [imagePreview, setImagePreview] = useState<{
    urls: string[];
    start: number;
  } | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Async reads finish after a render, so they check the files attached now.
  const latest = useRef(attachments);
  const discard = useRef(false);

  latest.current = attachments;
  const {
    scrollRef,
    contentRef,
    state: scrollState,
    scrollToBottom,
    stopScroll,
  } = useStickToBottom({
    initial: "instant",
    resize: "instant",
  });
  const recorder = useAudioRecording();

  // Composer/keyboard resizing changes available space without changing messages.
  useEffect(() => {
    const viewport = scrollRef.current;

    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      void scrollToBottom({
        animation: "instant",
        preserveScrollPosition: true,
      });
    });

    observer.observe(viewport);

    return () => observer.disconnect();
  }, [scrollRef, scrollToBottom]);

  const empty = chat.messages.length === 0;

  useLayoutEffect(() => {
    if (!empty) return;
    // Starter cards should begin at the top even on a small viewport.
    stopScroll();
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [empty, scrollRef, stopScroll]);

  const submit = (turn: ChatTurn) => {
    if (chat.busy || (!turn.text && !turn.files?.length)) return;
    void scrollToBottom({ animation: "instant" });
    void chat.send(turn);
    setText("");
    setAttachments([]);
    setAttachmentError("");
  };

  const addFiles = async (
    files: FileList | File[] | Blob[] | null,
    options?: { name?: string; seconds?: number },
  ) => {
    setAttachmentError("");
    try {
      const ready = await Promise.all(
        Array.from(files ?? []).map((file) =>
          attachmentFromFile(file, options),
        ),
      );
      const problem = attachmentProblem(latest.current, ready);

      if (problem) {
        ready.forEach(releaseAttachment);
        setAttachmentError(problem);

        return;
      }
      setAttachments((current) => [...current, ...ready]);
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : "Couldn't read that file.",
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // A finished recording becomes an attachment, unless it was discarded.
  useEffect(() => {
    const blob = recorder.audioBlob;

    if (!blob) return;
    const seconds = recorder.recordingTime;

    recorder.clearAudio();
    if (discard.current) {
      discard.current = false;

      return;
    }
    // Numbered across the whole chat, so a step can name the recording it heard.
    const count = [
      ...chat.messages.flatMap((m) => m.audio ?? []),
      ...latest.current,
    ].filter((item) => item.name.startsWith("Recording ")).length;

    // A phone's recording has no length in its header, so the speech models cannot time
    // it. A WAV always can, so the recording is converted the way Hypa Labs does.
    blobToWav(blob)
      .then((wav) =>
        addFiles([wav], { name: `Recording ${count + 1}`, seconds }),
      )
      .catch(() =>
        setAttachmentError("Couldn't process the recording. Please try again."),
      );
  }, [recorder.audioBlob]);

  // A 16 kHz mono WAV is about 32 KB a second, so this keeps a take under the 5 MB file limit.
  useEffect(() => {
    if (recorder.isRecording && recorder.recordingTime >= MAX_RECORDING_SECONDS)
      recorder.stopRecording();
  }, [recorder.isRecording, recorder.recordingTime]);

  const startRecording = async () => {
    setMicError("");
    try {
      await recorder.startRecording();
    } catch (error) {
      setMicError(
        error instanceof Error
          ? error.message
          : "Couldn't start the microphone.",
      );
    }
  };

  return (
    <div className="chat-screen flex min-h-0 w-full flex-1 flex-col">
      <motion.div
        {...enter(0, { duration: 0.4 })}
        className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 px-4 py-4 text-sm md:px-6"
      >
        <label className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <span className="sr-only">Assistant</span>
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
          onClick={() => {
            chat.reset();
            setAttachmentError("");
          }}
        >
          <Plus /> New chat
        </Button>
      </motion.div>

      <div
        ref={scrollRef}
        aria-label="Conversation"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        role="region"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (
            ["ArrowUp", "PageUp", "Home"].includes(event.key) ||
            (event.key === " " && event.shiftKey)
          )
            stopScroll();
        }}
      >
        <div
          ref={contentRef}
          className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-6 md:px-6"
        >
          {chat.messages.length === 0 ? (
            <div className="space-y-6 pt-10 text-center">
              <motion.h1
                {...enter(0.1)}
                className="text-2xl font-semibold text-[var(--foreground)] md:text-3xl"
              >
                Ask Hypa in your language
              </motion.h1>
              <motion.p
                {...enter(0.2)}
                className="text-sm text-[var(--muted-foreground)]"
              >
                Type, speak, or add a photo. Hypa translates, speaks, looks up
                words and reads text for you.
              </motion.p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STARTERS.map((starter, index) => (
                  <motion.button
                    key={starter}
                    {...enter(0.3 + index * 0.06, { duration: 0.35 })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left text-sm text-[var(--foreground)] hover:bg-[var(--muted)]"
                    type="button"
                    onClick={() => setText(starter)}
                  >
                    {starter}
                  </motion.button>
                ))}
              </div>
              <motion.div
                {...enter(0.3 + STARTERS.length * 0.06, { duration: 0.35 })}
              >
                <GetAppButtons />
              </motion.div>
            </div>
          ) : (
            chat.messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={`group/message flex min-w-0 flex-col ${
                    message.role === "user" ? "max-w-[90%] items-end" : "w-full"
                  }`}
                >
                  <div
                    className={`min-w-0 rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "bg-[var(--muted)] text-[var(--foreground)]"
                        : "w-full text-[var(--foreground)]"
                    }`}
                  >
                    {message.images && message.images.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {message.images.map((src, index) => (
                          <button
                            key={src.slice(-24) + index}
                            aria-label={`Open attachment ${index + 1}`}
                            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                            type="button"
                            onClick={() =>
                              setImagePreview({
                                urls: message.images!,
                                start: index,
                              })
                            }
                          >
                            <img
                              alt={`Attachment ${index + 1}`}
                              className="h-20 w-20 rounded-lg object-cover"
                              src={src}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    {message.audio && message.audio.length > 0 && (
                      <div className="mb-2 flex flex-wrap justify-end gap-2">
                        {message.audio.map((item) => (
                          <AttachmentCard key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                    {message.role === "assistant" && (
                      <ToolActivityFold
                        activity={message.activity}
                        audioNames={message.audioNames ?? []}
                        pending={message.status === "pending"}
                        steps={message.steps ?? []}
                      />
                    )}
                    {message.content &&
                      (message.role === "assistant" ? (
                        <Markdown
                          components={MARKDOWN}
                          remarkPlugins={[remarkGfm]}
                        >
                          {message.content}
                        </Markdown>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ))}
                    {message.role === "assistant" &&
                      message.status !== "pending" && (
                        <ResponseMedia
                          clips={message.audioClips}
                          images={message.imageUrls}
                          steps={message.steps}
                        />
                      )}
                  </div>
                  <MessageActions
                    isUser={message.role === "user"}
                    ready={message.status !== "pending"}
                    text={message.content}
                    timestamp={message.timestamp}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-3xl shrink-0 bg-[var(--background)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:px-6">
        {!empty && !scrollState.isAtBottom && (
          <Button
            aria-label="Jump to latest"
            className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full bg-[var(--card)] shadow-md hover:bg-[var(--muted)] dark:bg-[var(--card)] dark:hover:bg-[var(--muted)]"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void scrollToBottom({ animation: "instant" })}
          >
            <ArrowDown aria-hidden="true" className="size-3.5" />
            Jump to latest
          </Button>
        )}
        <form
          className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit({ text: text.trim(), files: attachments });
          }}
        >
          <input
            ref={fileRef}
            hidden
            multiple
            accept="image/*,audio/*"
            type="file"
            onChange={(e) => void addFiles(e.target.files)}
          />
          {attachments.length > 0 && (
            <AttachmentRow
              canAdd={attachments.length < CHAT_FILE_LIMIT}
              items={attachments}
              onAdd={() => fileRef.current?.click()}
              onOpen={(image) => {
                const pictures = attachments.filter(
                  (item) => item.kind === "image",
                );

                setImagePreview({
                  urls: pictures.map((item) => item.url),
                  start: pictures.findIndex((item) => item.id === image.id),
                });
              }}
              onRemove={(id) => {
                attachments
                  .filter((item) => item.id === id)
                  .forEach(releaseAttachment);
                setAttachments((current) =>
                  current.filter((item) => item.id !== id),
                );
                setAttachmentError("");
              }}
            />
          )}
          {recorder.isRecording ? (
            <RecordingBar
              time={recorder.formatTime(recorder.recordingTime)}
              onCancel={() => {
                discard.current = true;
                recorder.stopRecording();
              }}
              onStop={recorder.stopRecording}
            />
          ) : (
            <div className="flex items-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Add attachment"
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Plus />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="flex min-w-0 gap-1"
                  side="top"
                >
                  <DropdownMenuItem
                    aria-label="Upload"
                    className="size-10 justify-center"
                    onSelect={() => fileRef.current?.click()}
                  >
                    <Upload className="size-5" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    aria-label="Capture"
                    className="size-10 justify-center"
                    onSelect={() => setCameraOpen(true)}
                  >
                    <Camera className="size-5" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Textarea
                className="max-h-40 min-h-10 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
                placeholder="Ask anything"
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit({ text: text.trim(), files: attachments });
                  }
                }}
                onPaste={(event) => {
                  const pasted = Array.from(event.clipboardData.files).filter(
                    (file) => file.type.startsWith("image/"),
                  );

                  if (!pasted.length) return;
                  // Preserve native text insertion when the clipboard has both.
                  if (!event.clipboardData.getData("text/plain"))
                    event.preventDefault();
                  void addFiles(pasted);
                }}
              />
              <Button
                aria-label="Speak"
                disabled={attachments.length >= CHAT_FILE_LIMIT}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => void startRecording()}
              >
                <Mic />
              </Button>
              <Button
                aria-label={chat.busy ? "Stop response" : "Send"}
                disabled={
                  !chat.busy && !text.trim() && attachments.length === 0
                }
                size="icon"
                type={chat.busy ? "button" : "submit"}
                onClick={chat.busy ? () => void chat.stop() : undefined}
              >
                {chat.busy ? <Square /> : <Send />}
              </Button>
            </div>
          )}
        </form>
        <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">
          {attachmentError ||
            micError ||
            "Chats aren't saved. Check medical answers with a pharmacist or doctor."}
        </p>
      </div>
      {cameraOpen && (
        <CameraCapture
          onCapture={(photo) => void addFiles([photo])}
          onClose={() => setCameraOpen(false)}
        />
      )}
      {imagePreview && (
        <ImageViewer
          imageLabel="Attachment"
          start={imagePreview.start}
          urls={imagePreview.urls}
          onClose={() => setImagePreview(null)}
        />
      )}
    </div>
  );
}
