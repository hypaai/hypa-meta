// @ts-nocheck
import React, { useCallback, useRef, useState } from "react";
import {
  Upload,
  Music,
  X,
  Loader2,
  Mic,
  Square,
  FileWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AUDIO_MAX_DURATION } from "@/constants/app.constants";

interface AudioUploadProps {
  onAudioSelected: (audioBlob: Blob) => void;
  onConvertAndTranslate: () => void;
  onClear: () => void;
  audioBlob: Blob | null;
  isConverting?: boolean;
  disabled?: boolean;
  isRecording?: boolean;
  recordingTime?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  clearCounter?: number;
}

const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB

// Supported audio types
const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/flac",
  "audio/x-m4a",
];

export const AudioUpload: React.FC<AudioUploadProps> = ({
  onAudioSelected,
  onConvertAndTranslate,
  onClear,
  audioBlob,
  isConverting = false,
  disabled = false,
  isRecording = false,
  recordingTime = 0,
  onStopRecording,
  clearCounter,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragOverUnsupported, setIsDragOverUnsupported] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (disabled) return;

      // Validate file type
      const fileType = file.type;

      if (!SUPPORTED_AUDIO_TYPES.some((type) => fileType.startsWith(type))) {
        toast.error("Unsupported audio format", {
          description: "Please upload MP3, WAV, M4A, OGG, WebM, AAC, or FLAC",
        });

        return;
      }

      // Validate file size (5MB)
      if (file.size > MAX_AUDIO_SIZE) {
        toast.error("File too large", {
          description: "Maximum audio file size is 5MB",
        });

        return;
      }

      // Validate duration
      try {
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: file.type });

        const audio = document.createElement("audio");

        audio.preload = "metadata";

        audio.src = URL.createObjectURL(blob);
        audio.load(); // force reload metadata

        await new Promise((resolve, reject) => {
          audio.onloadedmetadata = () => resolve(true);
          audio.onerror = () => reject("Invalid audio file");
        });

        if (audio.duration > AUDIO_MAX_DURATION) {
          toast.error("Audio too long", {
            description: `Maximum allowed audio length is ${AUDIO_MAX_DURATION} seconds`,
          });

          return;
        }

        // Pass blob upward
        setFileName(file.name);
        setFileSize(file.size);
        onAudioSelected(blob);
      } catch (err) {
        console.error("Audio metadata failed:", err);
        toast.error("Could not read audio file", {
          description: "Please upload a valid audio file",
        });

        return;
      }
    },
    [disabled, onAudioSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      setIsDragOverUnsupported(false);

      const files = Array.from(e.dataTransfer.files);

      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        // Check if dragged file is unsupported
        const items = Array.from(e.dataTransfer.items);
        const hasUnsupportedFile = items.some((item) => {
          if (item.kind === "file") {
            const type = item.type;

            // If it's not an audio type, it's unsupported
            return !SUPPORTED_AUDIO_TYPES.some((audioType) =>
              type.startsWith(audioType),
            );
          }

          return false;
        });

        setIsDragOver(true);
        setIsDragOverUnsupported(hasUnsupportedFile);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsDragOverUnsupported(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;

      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleClear = useCallback(() => {
    setFileName("");
    setFileSize(0);
    onClear();
  }, [onClear]);

  // Clear when parent explicitly increments clearCounter (skip initial mount)
  const prevClearCounter = useRef(clearCounter);

  React.useEffect(() => {
    if (
      typeof clearCounter === "number" &&
      clearCounter !== prevClearCounter.current
    ) {
      prevClearCounter.current = clearCounter;
      handleClear();
    }
  }, [clearCounter, handleClear]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 min-h-0 h-full max-h-full w-full bg-theme-background p-1 rounded-lg border border-theme-border flex items-center justify-center">
      {!audioBlob ? (
        <div
          className={`border-2 w-full h-full border-theme-border rounded-lg p-6 transition-colors flex flex-col items-center justify-center overflow-y-auto ${
            isDragOver && !isDragOverUnsupported
              ? "border-theme-primary bg-theme-primary/10"
              : isDragOver && isDragOverUnsupported
                ? "border-red-500 bg-red-500/10 opacity-60"
                : "border-theme-border hover:border-theme-hover"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onClick={() =>
            !disabled &&
            !isRecording &&
            document.getElementById("audio-file-input")?.click()
          }
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center">
            {isRecording ? (
              <Mic className="size-12 mx-auto mb-4 text-red-500 animate-pulse" />
            ) : isDragOverUnsupported ? (
              <FileWarning className="size-12 mx-auto mb-4 text-red-500" />
            ) : (
              <Upload
                className={`size-12 mx-auto mb-4 ${
                  isDragOver ? "text-theme-primary" : "text-theme-muted"
                }`}
              />
            )}
            <p className="text-lg font-semibold mb-2 text-theme-text">
              {isRecording
                ? "Recording..."
                : isDragOverUnsupported
                  ? "Unsupported file type"
                  : isDragOver
                    ? "Drop your audio here"
                    : "Upload an audio file or record"}
            </p>
            {isRecording ? (
              <div className="mb-4">
                <p className="text-2xl font-mono text-red-500 mb-3">
                  {formatTime(recordingTime)}
                </p>
                <Button
                  className="bg-red-500 hover:bg-red-600"
                  size="lg"
                  type="button"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStopRecording?.();
                  }}
                >
                  <Square className="size-5 mr-2" />
                  Stop Recording
                </Button>
              </div>
            ) : isDragOverUnsupported ? (
              <p className="text-sm text-red-500 mb-2">
                Only audio files are supported
              </p>
            ) : (
              <>
                <p className="text-sm opacity-50 mb-4">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs opacity-50">
                  Supported: MP3, WAV, M4A, WebM... (max 5MB,{" "}
                  {AUDIO_MAX_DURATION}s)
                </p>
              </>
            )}
          </div>
          <input
            accept="audio/*"
            className="hidden"
            disabled={disabled || isRecording}
            id="audio-file-input"
            title="Upload audio file"
            type="file"
            onChange={handleFileInputChange}
          />
        </div>
      ) : (
        <div className="border h-full w-full relative border-theme-border rounded-lg p-4 bg-theme-surface shadow-md flex flex-col overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Music className="size-8 text-theme-icon" />
              <div>
                <p className="font-medium text-theme-text truncate w-48">
                  {fileName || "Audio Recording"}
                </p>
                <p className="text-sm text-theme-muted">
                  {formatFileSize(fileSize || audioBlob.size)}
                </p>
              </div>
            </div>
            {!isConverting && (
              <Button
                className="text-theme-muted hover:text-theme-hover"
                size="sm"
                variant="ghost"
                onClick={handleClear}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {isConverting && (
            <div className="flex items-center w-full gap-2 text-theme-primary mb-3">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Converting audio to text...</span>
            </div>
          )}

          <div className="mt-4 shrink-0 flex items-center gap-2">
            <Button
              disabled={isConverting || disabled}
              loading={isConverting}
              type="button"
              onClick={onConvertAndTranslate}
            >
              Use as Text
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
