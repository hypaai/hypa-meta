// Unified API Service
import axios from "axios";
import { ANALYTICS, analyticsHeaders } from "@hypa/config/analytics";
import { analytics } from "@/lib/analytics";
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

// Tells the API which product and surface this traffic comes from.
const attribution = analyticsHeaders("hypa-intelligence", __APP_VERSION__);

export const api = axios.create({
  baseURL: BASE_URL,
  headers: attribution,
  timeout: 70000,
});

/** `/v2/agent` connection for the Chat tab. Nobody signs in here, so it is anonymous. */
export const agentConnection = () => {
  const anonId = analytics.anonId();

  return {
    baseUrl: BASE_URL,
    headers: {
      ...attribution,
      ...(anonId ? { [ANALYTICS.headers.anonId]: anonId } : {}),
    },
  };
};

// Nobody signs in here, so every request is attributed to the device.
api.interceptors.request.use((config) => {
  const anonId = analytics.anonId();

  if (anonId) config.headers[ANALYTICS.headers.anonId] = anonId;

  return config;
});


export function getApiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    const payload = err.response?.data;
    if (typeof payload === "string") return payload;
    if (payload && typeof payload === "object") {
      const data = payload as any;
      const code = data.code ? String(data.code) : undefined;
      if (Array.isArray(data.message)) {
        const message = data.message.join(", ");
        return code ? `${message} (Code ${code})` : message;
      }
      if (typeof data.message === "string") {
        return code ? `${data.message} (Code ${code})` : data.message;
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

export interface DictionarySearchParams {
  word: string;
  language: string;
  cultural_context?: boolean;
  fun_facts?: boolean;
  only_cc_and_ff?: boolean;
  model_name?: string;
  provider?: string;
}

export type DictionarySection = {
  type?: string;
  text: string;
};
export interface DictionaryResponse {
  word: string;
  definitions?: DictionarySection[];
  syms?: string[];
  antm?: string[];
  usage?: DictionarySection[];
  cultural_context?: DictionarySection[];
  fun_facts?: DictionarySection[];
}

export interface DictionaryErrorResponse {
  message: string;
  code: string;
}

export interface DictionaryHistoryEntry {
  id: string;
  word: string;
  language: string;
  result?: {
    raw?: unknown;
    prompt?: unknown;
    parsed?: DictionaryResponse;
  };
  created_at: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  message?: string;
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiDataResponse<T> {
  message?: string;
  data: T;
}


export interface TranslationParams {
  text: string;
  source_lang?: string;
  target_lang: string;
  preset?: {
    provider?: string;
    model?: string;
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface TranslationResponse {
  type?: string;
  output_text: string;
  source_lang?: string;
  target_lang?: string;
  id?: string;
}

export interface SynthesizeParams {
  text: string;
  language?: string;
  voice?: string;
  preset?: Record<string, unknown>;
}


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

const dictionarySearch = async (
  params: DictionarySearchParams,
  signal?: AbortSignal,
) => {
  try {
    return await api.post<DictionaryResponse>("/dictionary", params, {
      signal: signal ?? searchAbortController.signal,
    });
  } catch (err) {
    throw normalizeApiError(err, "Could not complete dictionary search.");
  }
};

const getHistory = async (params?: {
  page?: number;
  limit?: number;
  query?: string;
}) => {
  try {
    const response = await api.get<PaginatedResponse<DictionaryHistoryEntry>>(
      "/dictionary/history",
      { params },
    );

    return response.data;
  } catch (err) {
    throw normalizeApiError(err, "Could not load dictionary history.");
  }
};

const deleteHistory = async (id: string) => {
  try {
    const response = await api.delete<{ message: string }>(
      `/dictionary/history/${id}`,
    );

    return response.data;
  } catch (err) {
    throw normalizeApiError(err, "Could not delete dictionary history.");
  }
};

export const dictionary = {
  search: dictionarySearch,
  getHistory,
  deleteHistory,
};


// BOOKMARK
const getBookmark = async () => {
  try {
    const response =
      await api.get<ApiDataResponse<DictionaryHistoryEntry[]>>(
        "/profile/bookmarks",
      );

    return response.data.data;
  } catch (err) {
    throw normalizeApiError(err, "Could not load bookmarks.");
  }
};

const removeBookmark = async (word: string, language: string) => {
  try {
    const response = await api.delete<{ message: string }>(
      "/profile/bookmarks",
      {
        data: { word, language },
      },
    );

    return response.data;
  } catch (err) {
    throw normalizeApiError(err, "Could not remove bookmark.");
  }
};

const addBookmark = async (
  word: string,
  language: string,
  result: DictionaryResponse,
) => {
  try {
    const response = await api.post<ApiDataResponse<DictionaryHistoryEntry>>(
      "/profile/bookmarks",
      { word, language, result },
    );

    return response.data.data;
  } catch (err) {
    throw normalizeApiError(err, "Could not save bookmark.");
  }
};

export const bookmarks = {
  getBookmark,
  removeBookmark,
  addBookmark,
};


// synthesis

export const translateAPI = async (params: TranslateAPIParams) => {
  const request = buildMtRequest(params);
  const response = await api.post<string>(
    TRANSLATE_ENDPOINTS.mt,
    request.body,
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "text/plain; charset=utf-8, application/json; charset=utf-8",
      },
      responseType: "text",
      transformResponse: [(data) => data],
    },
  );

  return {
    data: mapMtResponse(response.data, params, request.translationId),
  };
};

export const textToSpeechAPI = async (params: TextToSpeechAPIParams) => {
  const response = await api.post<{
    response?: TextToSpeechAPIResponse;
  }>(TRANSLATE_ENDPOINTS.tts, buildTtsRequest(params, params.voice));

  return {
    data: unwrapTtsResponse(response.data),
  };
};

export interface SpeechToTextAPIResponse {
  text?: string;
  error?: string;
}

export const speechToTextAPI = async (
  blob: Blob,
  asrModel?: string,
): Promise<SpeechToTextAPIResponse> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const response = await api.post<{
    response?: { text?: string };
  }>(
    TRANSLATE_ENDPOINTS.stt,
    buildSttRequest({ audioBase64: dataUrl, asrModel }),
  );

  return { text: unwrapSttResponse(response.data) };
};

export const getTranslationHistoryAPI = async (params: {
  filter: "all" | "bookmarks";
  limit?: number;
}) => {
  const response = await api.get<HistoryResponsePayload>(
    TRANSLATE_ENDPOINTS.history,
    {
      params: {
        limit: params.limit || 50,
        filter: params.filter,
      },
    },
  );

  return {
    data: mapHistoryResponse(response.data),
  };
};

export interface GetTranslationByIdResponse extends TranslationHistoryItem {}

export const getTranslationByIdAPI = async ({ id }: { id: string }) => {
  const response = await api.get<{
    data: TranslationRecord;
  }>(translationEndpoint(id));

  return {
    data: mapTranslationRecord(response.data.data),
  };
};

export const updateBookmarkStatusAPI = async (params?: unknown) => {
  const { translationId, bookmarked } = params as {
    translationId: string;
    bookmarked: boolean;
  };
  const response = await api.post<{ data: TranslationRecord }>(
    bookmarkEndpoint(translationId),
    { bookmarked },
  );

  // console.log("[api] update bookmark response", {
  //   translationId,
  //   bookmarked: response.data.data?.data?.bookmarked,
  //   dbId: response.data.data?.id,
  // });
  return { data: mapTranslationRecord(response.data.data) };
};

export const updateTranslationFeedbackAPI = async (params?: unknown) => {
  const { translationId, liked, correction } = params as {
    translationId: string;
    liked: boolean | null;
    correction?: string;
  };
  const response = await api.post<{ data: TranslationRecord }>(
    feedbackEndpoint(translationId),
    { liked, correction },
  );

  return { data: mapTranslationRecord(response.data.data) };
};

export const deleteTranslationAPI = async (params?: unknown) => {
  const { translationId } = params as { translationId: string };

  await api.delete(translationEndpoint(translationId));

  return { data: { success: true, translationId } };
};

export const translateFromImageOnlyAPI = async (body: {
  image: string;
  ocrModel?: string;
}) => {
  const response = await api.post<{
    response?: { text?: string };
  }>(TRANSLATE_ENDPOINTS.ocr, buildOcrRequest(body));

  return { data: { text: unwrapOcrResponse(response.data) } };
};

export const translateFromImageAPI = async (params: {
  targetLang: string;
  sourceLang?: string;
  image: string;
  llmModel?: string;
  thinkingMode?: boolean;
  ocrModel?: string;
}) => {
  const ocr = await translateFromImageOnlyAPI({
    image: params.image,
    ocrModel: params.ocrModel,
  });
  const text = ocr.data.text;
  const translated = await translateAPI({
    targetLang: params.targetLang,
    sourceLang: params.sourceLang,
    text,
    llmModel: params.llmModel,
    thinkingMode: params.thinkingMode,
  });

  return {
    data: {
      ...translated.data,
      text,
    },
  };
};

export interface DictionaryRequest {
  word: string;
  language?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface TranslateDictionaryResponse {
  word: string;
  language: string;
  definitions: {
    text: string;
    context?: string;
    partOfSpeech?: string;
  }[];
  usageExamples: {
    partOfSpeech: string;
    example: string;
  }[];
  synonyms: string[];
  antonyms: string[];
  exampleSentences: string[];
  translations: Record<string, string>;
  markdown?: string;
  content?: string;
  raw?: unknown;
}

export const dictionaryAPI = async (params: DictionaryRequest) => {
  const response = await api.post<TranslateDictionaryResponse>(
    TRANSLATE_ENDPOINTS.dictionary,
    buildDictionaryRequest(params),
  );

  const {
    culturalContext: _culturalContext,
    funFact: _funFact,
    ...data
  } = response.data as TranslateDictionaryResponse & {
    culturalContext?: string;
    funFact?: string;
  };

  return { data };
};


const synthesize = async (params: SynthesizeParams): Promise<string> => {
  try {
    const response = await api.post<
      string | { audio_url?: string; audio_b64?: string }
    >("/dictionary/tts", {
      text: params.text,
      voice: params.voice,
      preset: {
        ...params.preset,
        language: params.preset?.language ?? params.language,
      },
    });
    const payload = response.data;

    if (typeof payload === "string") {
      if (payload.startsWith("data:") || payload.startsWith("blob:")) {
        return payload;
      }

      return `data:audio/wav;base64,${payload}`;
    }

    if (payload.audio_url) return payload.audio_url;
    if (payload.audio_b64) return `data:audio/wav;base64,${payload.audio_b64}`;

    throw new Error("No audio was returned.");
  } catch (err) {
    throw normalizeApiError(err, "Failed to synthesize speech.");
  }
};

const translation = async (
  params: TranslationParams,
): Promise<TranslationResponse> => {
  try {
    const response = await api.post<TranslationResponse>(
      "/dictionary/translate",
      params,
    );

    return response.data;
  } catch (err) {
    throw normalizeApiError(err, "Translation failed.");
  }
};


export const tp = {
  synthesize,
  translation,
  translate: translation,
};
