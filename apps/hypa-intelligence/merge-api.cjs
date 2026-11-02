const fs = require('fs');
const path = require('path');

const dictPath = path.join(__dirname, 'src/lib/api-dictionary.ts');
const transPath = path.join(__dirname, 'src/lib/api-translate.ts');
const outPath = path.join(__dirname, 'src/lib/api.ts');

const dictContent = fs.readFileSync(dictPath, 'utf8');
const transContent = fs.readFileSync(transPath, 'utf8');

let merged = `// Unified API Service
import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth-store";
import {
  TRANSLATE_ENDPOINTS,
  bookmarkEndpoint,
  buildDictionaryRequest,
  buildMtRequest,
  buildOcrRequest,
  buildSttRequest,
  buildTtsRequest,
  feedbackEndpoint,
  mapHistoryResponse,
  mapMtResponse,
  mapTranslationRecord,
  translationEndpoint,
  unwrapOcrResponse,
  unwrapSttResponse,
  unwrapTtsResponse,
} from "@hypa/translate-core";
import type {
  HistoryResponsePayload,
  TextToSpeechAPIParams,
  TextToSpeechAPIResponse,
  TranslateAPIParams,
  TranslationHistoryItem,
  TranslationRecord,
  GetTranslationHistoryResponse,
  TranslateAPIResponse
} from "@hypa/translate-core";

export type {
  GetTranslationHistoryResponse,
  TextToSpeechAPIParams,
  TextToSpeechAPIResponse,
  TranslateAPIParams,
  TranslateAPIResponse,
  TranslationHistoryItem,
};

const BASE_URL = import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_HYPA_API_BASE_URL || import.meta.env.VITE_API_BASE || "https://api.hypaintelligence.com";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 70000,
});

const TOKEN_KEY = "hypa-api-token";
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event("hypa-auth-changed"));
};
export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("hypa-auth-changed"));
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().actions?.getAccessToken?.() || getStoredToken();
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().actions?.clearAccessToken?.();
      clearStoredToken();
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    const payload = err.response?.data;
    if (typeof payload === "string") return payload;
    if (payload && typeof payload === "object") {
      const data = payload as any;
      const code = data.code ? String(data.code) : undefined;
      if (Array.isArray(data.message)) {
        const message = data.message.join(", ");
        return code ? \`\${message} (Code \${code})\` : message;
      }
      if (typeof data.message === "string") {
        return code ? \`\${data.message} (Code \${code})\` : data.message;
      }
      if (typeof data.error === "string") return data.error;
      if (code) return code;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function normalizeApiError(err: unknown, fallback?: string): Error {
  return new Error(getApiErrorMessage(err, fallback));
}
`;

const dictRegex = /(export interface DictionarySearchParams[\s\S]*?)let currentSearchAbortController/m;
const dictMatch = dictContent.match(dictRegex);
if (dictMatch) merged += '\n' + dictMatch[1];

merged += `
let currentSearchAbortController = new AbortController();

export const searchAbortController = {
  get signal() {
    return currentSearchAbortController.signal;
  },
  abort() {
    currentSearchAbortController.abort();
    currentSearchAbortController = new AbortController();
  },
};
`;

const dictEndpointsRegex = /(const dictionarySearch = async[\s\S]*?)const synthesize =/m;
const dictEndpoints = dictContent.match(dictEndpointsRegex);
if (dictEndpoints) merged += '\n' + dictEndpoints[1];

const translateRegex = /(export const translateAPI = async[\s\S]*)$/m;
const translateMatch = transContent.match(translateRegex);
if (translateMatch) merged += '\n' + translateMatch[1];

// Also add tp.synthesize and tp.translate from the dictionary one just in case
const tpRegex = /(const synthesize = async[\s\S]*?)export const tp =/m;
const tpMatch = dictContent.match(tpRegex);
if (tpMatch) merged += '\n' + tpMatch[1] + '\nexport const tp = {\n  synthesize,\n  translation,\n  translate: translation,\n};\n';

fs.writeFileSync(outPath, merged);
console.log('Successfully created unified api.ts');

fs.unlinkSync(dictPath);
fs.unlinkSync(transPath);
