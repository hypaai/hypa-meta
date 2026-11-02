// @ts-nocheck
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
/* eslint-disable */
import * as pdfjsLib from "pdfjs-dist";
import { MAX } from "@/constants/app.constants";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type SupportedFileType =
  | "pdf"
  | "docx"
  | "doc"
  | "txt"
  | "xlsx"
  | "xls"
  | "csv";

export interface DocumentProcessingResult {
  text: string;
  fileName: string;
  fileType: SupportedFileType;
  pageCount?: number;
  wordCount?: number;
}

export interface DocumentProcessingError {
  error: string;
  fileName: string;
  fileType?: SupportedFileType;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const SUPPORTED_TYPES: Record<string, SupportedFileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/msword": "doc",
  "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
};

export function getFileType(file: File): SupportedFileType | null {
  return SUPPORTED_TYPES[file.type] || null;
}

export function validateFile(file: File): { isValid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: "File size must be less than 1MB" };
  }

  const fileType = getFileType(file);

  if (!fileType) {
    return {
      isValid: false,
      error:
        "Unsupported file type. Please upload PDF, DOCX, DOC, TXT, XLSX, XLS, or CSV files.",
    };
  }

  return { isValid: true };
}

export async function processDocument(
  file: File,
): Promise<DocumentProcessingResult | DocumentProcessingError> {
  const validation = validateFile(file);

  if (!validation.isValid) {
    return {
      error: validation.error!,
      fileName: file.name,
    };
  }

  const fileType = getFileType(file)!;

  try {
    let text = "";
    let pageCount: number | undefined;

    switch (fileType) {
      case "pdf": {
        const pdfData = await file.arrayBuffer();

        // Load PDF document using PDF.js
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        pageCount = pdf.numPages;

        // Extract text from all pages
        const textPromises = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          textPromises.push(
            pdf.getPage(pageNum).then(async (page: any) => {
              const textContent = await page.getTextContent();

              return (textContent.items as Array<any>)
                .map((item) => (item && item.str ? item.str : ""))
                .join(" ");
            }),
          );
        }

        const pageTexts = await Promise.all(textPromises);

        text = pageTexts.join("\n\n");
        break;
      }

      case "docx":
      case "doc": {
        const docxData = await file.arrayBuffer();
        const docxResult = await mammoth.extractRawText({
          arrayBuffer: docxData,
        });

        text = docxResult.value;
        if (docxResult.messages.length > 0) {
          console.warn("DOCX processing warnings:", docxResult.messages);
        }
        break;
      }

      case "xlsx":
      case "xls": {
        const excelData = await file.arrayBuffer();
        const workbook = XLSX.read(excelData, { type: "array" });
        const sheetNames = workbook.SheetNames;

        // Extract text from all sheets
        const sheetTexts: string[] = [];

        for (const sheetName of sheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_csv(worksheet);

          if (sheetText.trim()) {
            sheetTexts.push(`Sheet: ${sheetName}\n${sheetText}`);
          }
        }
        text = sheetTexts.join("\n\n");
        break;
      }

      case "csv":
        text = await file.text();
        break;

      case "txt":
        text = await file.text();
        break;

      default:
        return {
          error: "Unsupported file type",
          fileName: file.name,
          fileType,
        };
    }

    // Clean up the text
    text = text
      .replace(/\n\s*\n/g, "\n\n") // Remove excessive newlines
      .replace(/\r\n/g, "\n") // Normalize line endings
      .trim();

    if (text.length > MAX) {
      text = text.slice(0, MAX).trimEnd();
    }

    // Calculate word count
    const wordCount = text.length
      ? text.split(/\s+/).filter((word) => word.length > 0).length
      : 0;

    return {
      text,
      fileName: file.name,
      fileType,
      pageCount,
      wordCount,
    };
  } catch (error) {
    console.error("Document processing error:", error);

    return {
      error: `Failed to process ${fileType.toUpperCase()} file: ${error instanceof Error ? error.message : "Unknown error"}`,
      fileName: file.name,
      fileType,
    };
  }
}

export function getSupportedFileTypes(): string {
  return ".pdf, .docx, .doc, .txt, .xlsx, .xls, .csv";
}

export function getFileTypeDescription(fileType: SupportedFileType): string {
  const descriptions: Record<SupportedFileType, string> = {
    pdf: "PDF Document",
    docx: "Word Document",
    doc: "Word Document (Legacy)",
    txt: "Text File",
    xlsx: "Excel Spreadsheet",
    xls: "Excel Spreadsheet (Legacy)",
    csv: "CSV File",
  };

  return descriptions[fileType] || "Unknown File Type";
}
