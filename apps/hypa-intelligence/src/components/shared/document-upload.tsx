// @ts-nocheck
import React, { useCallback, useState } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  FileWarning,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  processDocument,
  type DocumentProcessingError,
  type DocumentProcessingResult,
} from "@/utils/document-processor";
import { toast } from "sonner";

interface DocumentUploadProps {
  onTextExtracted: (result: any) => void;
  disabled?: boolean;
  clearCounter?: number;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onTextExtracted,
  disabled = false,
  clearCounter,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragOverUnsupported, setIsDragOverUnsupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingResult, setProcessingResult] = useState<any>(null);

  const SUPPORTED_TYPES = [
    ".pdf",
    ".docx",
    ".doc",
    ".txt",
    ".xlsx",
    ".xls",
    ".csv",
  ];
  const ACCEPT_STRING = ".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv";

  const isSupportedFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();

    return SUPPORTED_TYPES.some((type) => fileName.endsWith(type));
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (disabled) return;

      setProcessingResult(null);
      setIsProcessing(true);
      setUploadedFile(file);

      if (!isSupportedFile(file)) {
        alert(
          `Unsupported file format. Supported: ${SUPPORTED_TYPES.join(", ")}`,
        );
        setUploadedFile(null);
        setIsProcessing(false);

        return;
      }

      try {
        const result = await processDocument(file);

        if ("error" in result) {
          const errorResult = result as DocumentProcessingError;

          toast.error(errorResult.error || "Document processing failed");
          setUploadedFile(null);
        } else {
          const successResult = result as DocumentProcessingResult;

          setProcessingResult(successResult);
          onTextExtracted(successResult);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to process document";

        // show toast and clear selection
        toast.error(errorMessage);
        setUploadedFile(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [disabled, onTextExtracted],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      setIsDragOverUnsupported(false);

      const files = Array.from(e.dataTransfer.files);

      if (files.length > 0) handleFileSelect(files[0]);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;

      const items = Array.from(e.dataTransfer.items);
      const hasUnsupported = items.some((item) => {
        if (item.kind === "file") {
          const fileName = item.getAsFile()?.name || "";

          if (
            !SUPPORTED_TYPES.some((type) =>
              fileName.toLowerCase().endsWith(type),
            )
          ) {
            return true;
          }
        }

        return false;
      });

      setIsDragOver(true);
      setIsDragOverUnsupported(hasUnsupported);
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
      const file = e.target.files?.[0];

      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const clearFile = useCallback(() => {
    setUploadedFile(null);
    setProcessingResult(null);
  }, []);

  React.useEffect(() => {
    if (typeof clearCounter === "number") {
      clearFile();
    }
  }, [clearCounter, clearFile]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex-1 min-h-0 h-full max-h-full w-full bg-theme-background p-1 rounded-lg border border-theme-border flex items-center justify-center">
      {!uploadedFile ? (
        <div
          className={`border-2 w-full h-full rounded-lg p-6 flex flex-col items-center justify-center overflow-y-auto transition-colors
            ${
              isDragOver && !isDragOverUnsupported
                ? "border-theme-primary bg-theme-primary/10"
                : isDragOverUnsupported
                  ? "border-red-500 bg-red-500/10 opacity-70"
                  : "border-theme-border hover:border-theme-hover"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onClick={() =>
            !disabled && document.getElementById("doc-file-input")?.click()
          }
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center">
            {isDragOverUnsupported ? (
              <FileWarning className="size-12 mx-auto mb-4 text-red-500" />
            ) : (
              <Upload
                className={`size-12 mx-auto mb-4 ${
                  isDragOver ? "text-theme-primary" : "text-theme-muted"
                }`}
              />
            )}

            <p className="text-lg font-semibold mb-2 text-theme-text">
              {isDragOverUnsupported
                ? "Unsupported file type"
                : isDragOver
                  ? "Drop your document"
                  : "Upload a document"}
            </p>

            <p className="text-sm opacity-50 mb-4">
              Drag and drop or click to browse
            </p>

            <p className="text-xs opacity-50">
              Supported: {SUPPORTED_TYPES.join(", ")}
            </p>
          </div>

          <input
            accept={ACCEPT_STRING}
            aria-label="Upload document"
            className="hidden"
            disabled={disabled}
            id="doc-file-input"
            placeholder="Choose a file"
            title="Upload document"
            type="file"
            onChange={handleFileInputChange}
          />
        </div>
      ) : (
        <div className="border h-full w-full p-4 rounded-lg bg-theme-surface relative shadow-md flex flex-col overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileText className="size-8 text-theme-icon" />
              <div>
                <p className="font-medium text-theme-text truncate w-48">
                  {uploadedFile.name}
                </p>
                <p className="text-sm text-theme-muted">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>

            {!isProcessing && (
              <Button
                className="text-theme-muted hover:text-theme-hover "
                size="sm"
                variant="ghost"
                onClick={clearFile}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 text-theme-primary mb-3">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Processing document...</span>
            </div>
          )}

          {processingResult && (
            <div className="mt-3 min-h-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 text-theme-success mb-1">
                <CheckCircle className="size-4" />
                <span className="text-sm font-medium">Document processed</span>
              </div>

              <div className="mt-2 h-full overflow-y-auto bg-theme-muted p-3 rounded text-sm">
                <pre className="whitespace-pre-wrap">
                  {processingResult.text}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
