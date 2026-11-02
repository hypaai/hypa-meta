// @ts-nocheck
import React, { useCallback, useState } from "react";
import { X, FileWarning, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

// Image Upload Component
interface ImageUploadProps {
  onImageSelected: (file: File | null, previewUrl: string | null) => void;
  selectedImage: File | null;
  imagePreviewUrl: string | null;
  disabled?: boolean;
  children?: React.ReactNode; // For the "Use as Text" button or other actions
  clearCounter?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelected,
  selectedImage,
  imagePreviewUrl,
  disabled = false,
  children,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragOverUnsupported, setIsDragOverUnsupported] = useState(false);

  const SUPPORTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const isSupportedImageFile = (file: File): boolean => {
    return SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase());
  };

  const isValidFileSize = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      if (disabled) return;

      if (!isSupportedImageFile(file)) {
        alert("Unsupported file format. Please upload JPG, PNG, or WEBP.");

        return;
      }

      if (!isValidFileSize(file)) {
        alert("File size exceeds 5MB limit.");

        return;
      }

      const previewUrl = URL.createObjectURL(file);

      onImageSelected(file, previewUrl);
    },
    [disabled, onImageSelected],
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
      if (disabled) return;

      const items = Array.from(e.dataTransfer.items);
      const hasUnsupported = items.some((item) => {
        if (item.kind === "file") {
          const itemType = item.type.toLowerCase();

          if (!SUPPORTED_IMAGE_TYPES.includes(itemType)) {
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

      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const clearImage = useCallback(() => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    onImageSelected(null, null);
  }, [imagePreviewUrl, onImageSelected]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex-1 min-h-0 h-full max-h-full w-full bg-theme-background p-1 rounded-lg border border-theme-border flex items-center justify-center">
      {!selectedImage ? (
        <div
          className={`border-2 w-full h-full rounded-lg p-6 transition-colors flex flex-col items-center justify-center overflow-y-auto
            ${
              isDragOver && !isDragOverUnsupported
                ? "border-theme-primary bg-theme-primary/10"
                : isDragOverUnsupported
                  ? "border-red-500 bg-red-500/10 opacity-70"
                  : "border-theme-border hover:border-theme-hover"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onClick={() =>
            !disabled && document.getElementById("image-file-input")?.click()
          }
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center">
            {isDragOverUnsupported ? (
              <FileWarning className="size-12 mx-auto mb-4 text-red-500" />
            ) : (
              <Camera
                className={`size-12 mx-auto mb-4 ${
                  isDragOver ? "text-theme-primary" : "text-theme-muted"
                }`}
              />
            )}

            <p className="text-lg font-semibold mb-2 text-theme-text">
              {isDragOverUnsupported
                ? "Unsupported file type"
                : isDragOver
                  ? "Drop your image"
                  : "Upload an image"}
            </p>

            <p className="text-sm opacity-50 mb-4">
              Drag and drop or click to browse
            </p>

            <p className="text-xs opacity-50">
              Supported: JPG, PNG, WEBP (max 5MB)
            </p>
          </div>

          <input
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            disabled={disabled}
            id="image-file-input"
            placeholder="Choose an image file"
            title="Upload an image file (JPG, PNG, or WEBP, max 5MB)"
            type="file"
            onChange={handleFileInputChange}
          />
        </div>
      ) : (
        <div className="border h-full w-full relative border-theme-border rounded-lg p-4 bg-theme-surface shadow-md flex flex-col overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-theme-text truncate w-48">
                {selectedImage.name}
              </div>
              <div className="text-xs text-theme-muted">
                {formatFileSize(selectedImage.size)}
              </div>
            </div>
            <Button
              className="text-theme-muted hover:text-theme-hover"
              size="sm"
              variant="ghost"
              onClick={clearImage}
            >
              <X className="size-4" />
            </Button>
          </div>

          {imagePreviewUrl && (
            <div className="mt-3 flex-1 min-h-0 overflow-auto">
              <img
                alt="preview"
                className="max-h-full object-contain mx-auto rounded"
                src={imagePreviewUrl}
              />
              {children && <div className="mt-4">{children}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
