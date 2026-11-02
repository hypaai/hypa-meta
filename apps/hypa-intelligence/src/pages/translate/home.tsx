/* eslint-disable */
// @ts-nocheck
import type { DocumentProcessingResult } from "@/utils/document-processor";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bookmark,
  Clock4,
  ArrowLeftRight,
  Mic,
  Copy,
  X,
  Square,
  Play,
  Pause,
  Check,
  Globe,
  Camera,
  ThumbsUp,
  ThumbsDown,
  BrainIcon,
  Volume2Icon,
  ChevronDown,
} from "lucide-react";
import { useFormik } from "formik";
import {
  FEATURES,
  MAX,
  VOICE_OPTIONS,
  AUDIO_MAX_DURATION,
  type Language,
  LANGUAGES,
  hasThinking,
} from "@/constants/app.constants";
import LangSelect, {
  type LangOption,
} from "@/components/shared/lang-select";
import { GetAppButtons } from "@hypa/ui/web";
import MainFooter from "@/components/shared/main-footer";


import { DocumentUpload } from "@/components/shared/document-upload";
import { AudioUpload } from "@/components/shared/audio-upload";
import {
  translateAPI,
  textToSpeechAPI,
  speechToTextAPI,
  getTranslationHistoryAPI,
  getTranslationByIdAPI,
  updateBookmarkStatusAPI,
  translateFromImageAPI,
  translateFromImageOnlyAPI,
  updateTranslationFeedbackAPI,
  type GetTranslationHistoryResponse,
} from "@/lib/api";
import { useAudioRecording } from "@/hooks/use-audio-recording";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { translateSchema } from "@/schemas/app.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorHandler } from "@/utils/error-handler";
import { toast } from "sonner";
import { useSettings } from "@/context/settings-context";
import {
  playBlobWithPitchAndSpeed,
  stopOrPauseAudio,
  warmUpAudioContext,
  type AudioController,
} from "@/lib/audio";
import { useSearchParams } from "react-router-dom";
import { TRANSLATION_MODELS } from "@/constants/app.constants";
import { getThemeAwareLogo } from "@/lib/theme-assets";
import { useTheme } from "@/components/modules/theme/theme-provider";
import { ImageUpload } from "@/components/shared/image-upload";
import { getErrorMessage } from "@/lib/error";
import { placeholderAds } from "@/constants/placeholder-ads";
import { isAutoDetectLanguage, parseTranslation } from "@hypa/translate-core";
import { motion } from "framer-motion";
import { usePageEnter } from "@/hooks/use-page-enter";

type Lang = LangOption & Language;

interface FormValues {
  text: string;
  sourceLang: Lang;
  targetLang: Lang;
  thinkingMode: boolean;
  inputMode: "text" | "document" | "website" | "image" | "voice" | "reality";
}

const normalizeLanguageToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const resolveLanguageOption = (detected: string, options: Lang[]) => {
  const normalizedDetected = normalizeLanguageToken(detected);

  if (!normalizedDetected) return null;

  return (
    options.find((lang) => {
      const normalizedName = normalizeLanguageToken(lang.name);
      const normalizedCode = normalizeLanguageToken(lang.code);

      return (
        normalizedName === normalizedDetected ||
        normalizedCode === normalizedDetected ||
        normalizedName.includes(normalizedDetected) ||
        normalizedDetected.includes(normalizedName)
      );
    }) || null
  );
};

const isAnonymousUser = (u: any) => false;
const user: any = null;

const Home = () => {
  const enter = usePageEnter();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);

  const [sidebarMode, setSidebarMode] = useState<"history" | "bookmarks">(
    "history",
  );
  const isTranscribingToTranslate = useRef(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [tlvsVoice, setTlvsVoice] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;

        resolve(result);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  const speechToTextMutation = useMutation({
    mutationFn: (blob: Blob) => speechToTextAPI(blob, settings.asrModel),
    mutationKey: ["speech-to-text"],
    onSuccess: (response) => {
      if (response.text) {
        resetTranslationState();
        formik.setFieldValue("text", response.text);
      } else {
        const message = response.error || "Speech-to-text failed";

        toast.error("Speech-to-text failed", { description: message });
      }
    },
    onError: (error) => {
      const err = errorHandler(error);

      toast.error("Speech-to-text failed", { description: err });
    },
  });

  const handleCheckAudio = (shouldTranslate: boolean = false) => {
    console.log(settings.llmModel, "[LLM MODEL]");
    if (!audioBlob) return;
    isTranscribingToTranslate.current = shouldTranslate;
    setError(null);
    speechToTextMutation.mutate(audioBlob, {
      onSuccess: (response) => {
        if (response.text) {
          resetTranslationState();
          formik.setFieldValue("text", response.text);
          if (!shouldTranslate) {
            formik.setFieldValue("inputMode", "text");
            toast.success(
              "Text transcribed from audio. Switched to text mode.",
            );
          }

          // Only translate if requested (from translate button)
          if (shouldTranslate) {
            translateMutation.mutate({
              targetLang: formik.values.targetLang.name,
              text: response.text.trim(),
              sourceLang: formik.values.sourceLang.name,
              llmModel: settings.llmModel,
              thinkingMode:
                formik.values.thinkingMode && hasThinking(settings.llmModel),
            });
          }
        } else {
          const message = response.error || "Speech-to-text failed";

          toast.error("Speech-to-text failed", { description: message });
        }
      },
    });
  };
  const [translated, setTranslated] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentTranslationId, setCurrentTranslationId] = useState<
    string | null
  >(null);
  const [translationFeedback, setTranslationFeedback] = useState<
    boolean | null
  >(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isPlayingTranslation, setIsPlayingTranslation] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<
    AudioController | HTMLAudioElement | null
  >(null);
  const [isPlayingInputText, setIsPlayingInputText] = useState(false);
  const [currentInputAudio, setCurrentInputAudio] = useState<
    AudioController | HTMLAudioElement | null
  >(null);
  const [copyInputStatus, setCopyInputStatus] = useState<"idle" | "copied">(
    "idle",
  );
  const [forceInputTooltipOpen, setForceInputTooltipOpen] = useState(false);
  const [copyTranslatedStatus, setCopyTranslatedStatus] = useState<
    "idle" | "copied"
  >("idle");
  const [forceTranslatedTooltipOpen, setForceTranslatedTooltipOpen] =
    useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const isUserTargetLangChange = useRef(false);
  const translatingToLang = useRef("");
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackCorrection, setFeedbackCorrection] = useState("");
  const [imageClearCounter, setImageClearCounter] = useState(0);
  const [documentProcessed, setDocumentProcessed] = useState(false);
  const [_isProcessingTranslate, setIsProcessingTranslate] = useState(false);
  const [swapHistory, setSwapHistory] = useState<{
    originalInput: string;
    originalTranslated: string;
    originalRawTranslated: string;
  } | null>(null);

  // We only need the mainContent (text outside any <think>...</think> block).
  // Keep parseTranslation for possible future use but avoid unused vars.
  const { mainContent, thinkingContent } = useMemo(
    () => parseTranslation(translated),
    [translated],
  );

  const resetTranslationState = useCallback(() => {
    setTranslated("");
    setCurrentTranslationId(null);
    setTranslationFeedback(null);
    setIsBookmarked(false);
    setSwapHistory(null);
    setDocumentProcessed(false);
    translatingToLang.current = "";
  }, []);

  const resetDocumentTranslationState = useCallback(() => {
    setTranslated("");
    setCurrentTranslationId(null);
    setTranslationFeedback(null);
    setIsBookmarked(false);
    setSwapHistory(null);
    translatingToLang.current = "";
  }, []);

  const isSingleWord = useCallback((text: string): boolean => {
    const trimmed = text.trim();

    // Check if it's a single word (no spaces, tabs, or newlines)
    return trimmed.length > 0 && !/\s/.test(trimmed);
  }, []);




  const translateMutation = useMutation({
    mutationFn: translateAPI,
    mutationKey: ["translate"],
    onMutate: () => {
      // resetTranslationState();
      if (documentProcessed) {
        resetDocumentTranslationState();
      } else {
        resetTranslationState();
      }
      setError(null);
    },
    onSuccess: ({ data }) => {
      console.log("[translate] response", {
        translationId: data.id || null,
        detectedLanguage: data.language || null,
      });
      // console.log('Translation API response:', data); // Debug log
      const translatedText = data.translation || "";

      setTranslated(translatedText);
      setCurrentTranslationId(data.id || null);
      setTranslationFeedback(null);
      setIsBookmarked(false);

      // Only show dictionary icon if source text is a single word
      // API will be called lazily when user clicks the icon
      const sourceText = formik.values.text.trim();

      if (isSingleWord(sourceText)) {
        setShowDictionaryIcon(true);
      }

      if (data.language) {
        const detectedLanguage = String(data.language).trim();

        if (isAutoDetectLanguage(detectedLanguage)) {
          console.log("[autodetect] ignored auto language", {
            detectedLanguage,
          });
        } else {
          const availableSourceLangs = getAvailableSourceLanguages();
          const langFound =
            resolveLanguageOption(detectedLanguage, availableSourceLangs) ||
            resolveLanguageOption(detectedLanguage, LANGUAGES);

          console.log("[autodetect] resolve", {
            detectedLanguage,
            normalized: normalizeLanguageToken(detectedLanguage),
            availableCount: availableSourceLangs.length,
            match: langFound?.name || null,
          });

          if (langFound) {
            if (
              !availableSourceLangs.some((lang) => lang.code === langFound.code)
            ) {
              addDetectedSourceLanguage(langFound.name);
            }
            formik.setFieldValue("sourceLang", langFound);
          } else if (formik.values.sourceLang.code === "auto") {
            // Detected language not in available source languages — add it dynamically
            addDetectedSourceLanguage(detectedLanguage);
            const code =
              detectedLanguage.charAt(0).toLowerCase() +
              detectedLanguage.slice(1);

            formik.setFieldValue("sourceLang", {
              code,
              name: detectedLanguage,
              voice: "Juliet",
            });
          } else {
            console.log("[autodetect] no match; source not auto", {
              detectedLanguage,
              currentSource: formik.values.sourceLang,
            });
          }
        }
      }

      // Locally update the history cache, even on a cold first load.
      if (data.id) {
        const resolvedSourceLang = data.language
          ? String(data.language)
          : formik.values.sourceLang.name;

        const newHistoryItem = {
          id: data.id,
          sourceLanguage: resolvedSourceLang,
          targetLanguage: formik.values.targetLang.name,
          originalText: formik.values.text.trim(),
          translatedText: translatedText,
          bookmarked: false,
          liked: null as boolean | null,
          timestamp: new Date().toISOString(),
        };

        queryClient.setQueryData(
          ["translationHistory", "history", signedInUserId],
          (old: GetTranslationHistoryResponse | undefined) => {
            return {
              translations: [
                newHistoryItem,
                ...(old?.translations || []),
              ].slice(0, settings.historyItemsToKeep),
              meta: old?.meta || { nextCursor: null },
            };
          },
        );
      }
    },
    onError(error) {
      const err = errorHandler(error);

      setError(err);
      toast.error("Translation failed", { description: err });
    },
    onSettled: () => {
      setIsProcessingTranslate(false);
    },
  });

  const translateFromImageMutation = useMutation({
    mutationFn: async ({
      file,
      targetLang,
      sourceLang,
      llmModel,
      thinkingMode,
      ocrModel,
    }: {
      file: File;
      targetLang: string;
      sourceLang?: string;
      llmModel?: string;
      thinkingMode?: boolean;
      ocrModel?: string;
    }) => {
      const base64 = await fileToBase64(file);

      return translateFromImageAPI({
        image: base64,
        targetLang,
        sourceLang,
        llmModel,
        thinkingMode,
        ocrModel,
      });
    },
    mutationKey: ["translate-from-image"],
    onMutate: () => {
      resetTranslationState();
      setError(null);
    },
    onSuccess: ({ data }) => {
      const translatedText = data.translation || "";

      setTranslated(translatedText);
      setCurrentTranslationId(data.id || null);
      setTranslationFeedback(null);
      setIsBookmarked(false);

      if (formik.values.sourceLang.code === "auto" && data.language) {
        console.log("[Autodetect Response - Image]", {
          detectedLanguage: data.language,
          translationId: data.id,
        });
      }

      if (data.language) {
        const detectedLanguage = String(data.language).trim();

        if (isAutoDetectLanguage(detectedLanguage)) {
          console.log("[autodetect] ignored auto language", {
            detectedLanguage,
          });
        } else {
          const availableSourceLangs = getAvailableSourceLanguages();
          const langFound =
            resolveLanguageOption(detectedLanguage, availableSourceLangs) ||
            resolveLanguageOption(detectedLanguage, LANGUAGES);

          console.log("[autodetect] resolve image", {
            detectedLanguage,
            normalized: normalizeLanguageToken(detectedLanguage),
            availableCount: availableSourceLangs.length,
            match: langFound?.name || null,
          });

          if (langFound) {
            if (
              !availableSourceLangs.some((lang) => lang.code === langFound.code)
            ) {
              addDetectedSourceLanguage(langFound.name);
            }
            formik.setFieldValue("sourceLang", langFound);
          } else if (formik.values.sourceLang.code === "auto") {
            addDetectedSourceLanguage(detectedLanguage);
            const code =
              detectedLanguage.charAt(0).toLowerCase() +
              detectedLanguage.slice(1);

            formik.setFieldValue("sourceLang", {
              code,
              name: detectedLanguage,
              voice: "Juliet",
            });
          } else {
            console.log("[autodetect] no match; source not auto", {
              detectedLanguage,
              currentSource: formik.values.sourceLang,
            });
          }
        }
      }

      // if API returned extracted text, put it into input box
      if (data.text) {
        formik.setFieldValue("text", data.text);
      }

      // Locally update the history cache, even on a cold first load.
      if (data.id) {
        const resolvedSourceLang = data.language
          ? String(data.language)
          : formik.values.sourceLang.name;

        const newHistoryItem = {
          id: data.id,
          sourceLanguage: resolvedSourceLang,
          targetLanguage: formik.values.targetLang.name,
          originalText: (data.text || formik.values.text).trim(),
          translatedText: translatedText,
          bookmarked: false,
          liked: null as boolean | null,
          timestamp: new Date().toISOString(),
        };

        queryClient.setQueryData(
          ["translationHistory", "history", signedInUserId],
          (old: GetTranslationHistoryResponse | undefined) => {
            return {
              translations: [
                newHistoryItem,
                ...(old?.translations || []),
              ].slice(0, settings.historyItemsToKeep),
              meta: old?.meta || { nextCursor: null },
            };
          },
        );
      }
    },
    onError: (error) => {
      const err = errorHandler(error);

      setError(err);
      toast.error("Image translation failed", { description: err });
    },
    onSettled: () => {
      setIsProcessingTranslate(false);
    },
  });

  const extractTextFromImageMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const base64 = await fileToBase64(file);

      return translateFromImageOnlyAPI({
        image: base64,
        ocrModel: settings.ocrModel,
      });
    },
    mutationKey: ["extract-text-from-image"],
    onSuccess: ({ data }) => {
      if (data.text) {
        resetTranslationState();
        formik.setFieldValue("text", data.text);
        formik.setFieldValue("inputMode", "text");
        // ✅ No translate call — just switch mode and populate text
        toast.success("Text extracted. Edit it, then press Translate.");
      }
    },
    onError: (error) => {
      const err = errorHandler(error);

      toast.error("Failed to extract text from image", { description: err });
    },
    onSettled: () => {
      setIsProcessingTranslate(false);
    },
  });

  const isTranslating =
    translateMutation.isPending || translateFromImageMutation.isPending;
  const isTranslatingRef = useRef(isTranslating);

  isTranslatingRef.current = isTranslating;

  const feedbackMutation = useMutation({
    mutationFn: ({
      translationId,
      liked,
      correction,
    }: {
      translationId: string;
      liked: boolean | null;
      correction?: string;
    }) => {
      if (!translationId) {
        throw new Error("Translation ID is required");
      }

      return updateTranslationFeedbackAPI({ translationId, liked, correction });
    },
    onMutate: ({ liked }) => {
      // Optimistic update
      setTranslationFeedback(liked);
    },
    onError: (error) => {
      // Revert optimistic update
      setTranslationFeedback(translationFeedback);
      const err = errorHandler(error);

      toast.error(`Failed to save feedback: ${err}`);
    },
    onSuccess: () => {
      toast.success("Feedback saved!");
    },
  });

  const ttsMutation = useMutation({
    mutationFn: textToSpeechAPI,
    mutationKey: ["text-to-speech"],
    onMutate: () => {
      setError(null);
      setIsPlayingTranslation(false);
      if (currentAudio) {
        stopOrPauseAudio(currentAudio);
        setCurrentAudio(null);
      }
    },
    onSuccess: async ({ data }) => {
      const audioData = data.audio_b64;
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0))],
        { type: "audio/wav" },
      );

      try {
        const controller = await playBlobWithPitchAndSpeed(audioBlob, {
          pitch: settings.voice.pitch,
          speed: settings.voice.speed,
          onended: () => {
            setIsPlayingTranslation(false);
            setCurrentAudio(null);
          },
          onerror: (errMsg: string) => {
            setIsPlayingTranslation(false);
            setCurrentAudio(null);
            toast.error("TTS playback failed", { description: errMsg });
          },
        });

        setCurrentAudio(controller);
        setIsPlayingTranslation(true);
      } catch (err) {
        setIsPlayingTranslation(false);
        toast.error("TTS playback failed", { description: String(err) });
      }
    },
    onError(error) {
      const err = errorHandler(error);

      toast.error("TTS error", { description: err });
      if (currentAudio) {
        stopOrPauseAudio(currentAudio);
        setCurrentAudio(null);
      }
      setIsPlayingTranslation(false);
    },
  });

  const inputTtsMutation = useMutation({
    mutationFn: textToSpeechAPI,
    mutationKey: ["input-text-to-speech"],
    onMutate: () => {
      setError(null);
      setIsPlayingInputText(false);
      if (currentInputAudio) {
        stopOrPauseAudio(currentInputAudio);
        setCurrentInputAudio(null);
      }
    },
    onSuccess: async ({ data }) => {
      const audioData = data.audio_b64;
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0))],
        { type: "audio/wav" },
      );

      try {
        const controller = await playBlobWithPitchAndSpeed(audioBlob, {
          pitch: settings.voice.pitch,
          speed: settings.voice.speed,
          onended: () => {
            setIsPlayingInputText(false);
            setCurrentInputAudio(null);
          },
          onerror: (errMsg: string) => {
            setIsPlayingInputText(false);
            setCurrentInputAudio(null);
            toast.error("Input TTS playback failed", { description: errMsg });
          },
        });

        setCurrentInputAudio(controller);
        setIsPlayingInputText(true);
      } catch (err) {
        setIsPlayingInputText(false);
        toast.error("Input TTS playback failed", { description: String(err) });
      }
    },
    onError(error) {
      const err = errorHandler(error);

      toast.error("Input TTS error", { description: err });
    },
  });

  const {
    settings,
    getAvailableSourceLanguages,
    getAvailableTargetLanguages,
    getVoicesForLanguage,
    updateVoiceSetting,
    updateTargetLanguageVoice,
    resolvePlaybackVoice,
    addDetectedSourceLanguage,
  } = useSettings();

  const signedInUserId = user && !isAnonymousUser(user) ? user.uid : undefined;

  useQuery({
    queryKey: ["translationHistory", "history", signedInUserId],
    queryFn: async () => {
      const response = await getTranslationHistoryAPI({
        filter: "all",
        limit: settings.historyItemsToKeep,
      });

      return response.data;
    },
    enabled: Boolean(signedInUserId),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useQuery({
    queryKey: ["translationHistory", "bookmarks", signedInUserId],
    queryFn: async () => {
      const response = await getTranslationHistoryAPI({
        filter: "bookmarks",
        limit: settings.historyItemsToKeep,
      });

      return response.data;
    },
    enabled: Boolean(signedInUserId),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const hasPendingOperations =
    isTranslating ||
    speechToTextMutation.isPending ||
    extractTextFromImageMutation.isPending ||
    ttsMutation.isPending ||
    inputTtsMutation.isPending;


  const formik = useFormik<FormValues>({
    enableReinitialize: true,
    initialValues: {
      text: "",
      sourceLang:
        settings.defaultSourceLanguage ||
        getAvailableSourceLanguages()[0] ||
        LANGUAGES[0],
      targetLang:
        settings.defaultTargetLanguage ||
        getAvailableTargetLanguages()[0] ||
        LANGUAGES.find((l) => l.code != "auto") ||
        LANGUAGES[0],
      inputMode: "text" as const,
      thinkingMode: false,
    },
    validationSchema: translateSchema,
    onSubmit: async (values) => {
      translatingToLang.current = values.targetLang.name;
      // iOS/WebKit: unlock AudioContext during the user's translate tap
      warmUpAudioContext();

      // Handle Image Mode
      if (values.inputMode === "image") {
        if (!selectedImage) {
          setError("No image selected");

          return;
        }
        translateFromImageMutation.mutate({
          file: selectedImage,
          targetLang: values.targetLang.name,
          sourceLang: values.sourceLang.name,
          llmModel: settings.llmModel,
          thinkingMode: values.thinkingMode && hasThinking(settings.llmModel),
          ocrModel: settings.ocrModel,
        });

        return;
      }

      if (values.inputMode === "voice") {
        if (!audioBlob) {
          setError("No audio recording available");

          return;
        }
        // Convert audio to text and automatically translate
        handleCheckAudio(true);

        return;
      }

      if (values.inputMode === "website") {
        toast.info(
          "Please use the Hypa Translate browser extension for website translation",
        );

        return;
      }

      if (values.inputMode === "reality") {
        toast.info("HypaReality is coming soon to AR, VR, and MR devices");

        return;
      }

      if (!values.text.trim()) {
        setError("Please enter text to translate");

        return;
      }

      translateMutation.mutate({
        targetLang: values.targetLang.name,
        text: values.text.trim(),
        sourceLang: values.sourceLang.name,
        llmModel: settings.llmModel,
        thinkingMode: values.thinkingMode && hasThinking(settings.llmModel),
      });
    },
  });



  // settings already obtained above

  const [documentClearCounter, setDocumentClearCounter] = useState(0);
  const [audioClearCounter, setAudioClearCounter] = useState(0);

  const [searchParams] = useSearchParams();

  const st = searchParams.get("st");
  const sl = searchParams.get("sl");
  const tl = searchParams.get("tl");

  // Use Effect to get st, sl, tl from URL and pre-populate form for quick testing and also clear url params after use to prevent unintended reuse
  useEffect(() => {
    if (st) {
      formik.setFieldValue("text", st);
    }
    if (sl) {
      const sourceLang = LANGUAGES.find(
        (l) =>
          l.name.toLowerCase() === sl.toLowerCase() ||
          l.code.toLowerCase() === sl.toLowerCase(),
      );

      if (sourceLang) {
        formik.setFieldValue("sourceLang", sourceLang);
      }
    }
    if (tl) {
      const targetLang = LANGUAGES.find(
        (l) =>
          l.name.toLowerCase() === tl.toLowerCase() ||
          l.code.toLowerCase() === tl.toLowerCase(),
      );

      if (targetLang) {
        formik.setFieldValue("targetLang", targetLang);
      }
    }
    // Clear URL params after use
    if (st || sl || tl) {
      const url = new URL(window.location.href);

      url.searchParams.delete("st");
      url.searchParams.delete("sl");
      url.searchParams.delete("tl");
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [st, sl, tl]);

  // A model change can leave a selected language the new model does not
  // support; fall back to the first language it does.
  useEffect(() => {
    const sources = getAvailableSourceLanguages();
    if (sources.length && !sources.some((l) => l.code === formik.values.sourceLang.code)) {
      formik.setFieldValue("sourceLang", sources[0]);
    }
    const targets = getAvailableTargetLanguages();
    if (targets.length && !targets.some((l) => l.code === formik.values.targetLang.code)) {
      formik.setFieldValue("targetLang", targets[0]);
    }
  }, [settings.llmModel]);

  const sharedMut = useMutation({
    mutationFn: getTranslationByIdAPI,
    mutationKey: ["shared-translation"],
    retry: 3,
    onSuccess: (res) => {
      const result = res.data;

      formik.setFieldValue("text", result.originalText || "");
      const source = LANGUAGES.find(
        (l) =>
          l.name.toLowerCase() ===
            (result.sourceLanguage || "").toLowerCase() ||
          l.code.toLowerCase() === (result.targetLanguage || "").toLowerCase(),
      );
      const target = LANGUAGES.find(
        (l) =>
          l.name.toLowerCase() ===
            (result.sourceLanguage || "").toLowerCase() ||
          l.code.toLowerCase() === (result.targetLanguage || "").toLowerCase(),
      );

      if (source) formik.setFieldValue("sourceLang", source);
      if (target) formik.setFieldValue("targetLang", target);
      setTranslated(result.translatedText || "");
      translatingToLang.current = target?.name || "";
      setCurrentTranslationId(result.id || null);
      setIsBookmarked(!!result.bookmarked);
    },
  });

  useEffect(() => {
    const params = searchParams;
    const id = params.get("id");

    if (!id) return;
    if (!searchParams) return;
    sharedMut.mutate({ id });
  }, [searchParams, sharedMut]);

  const chooseVoice = (lang: string, kind: "input" | "output") => {
    const inAutoMode = settings.voiceSelectionMode === "auto";
    const langCode = (
      inAutoMode ? formik.values.targetLang.code : lang
    ).toLowerCase();
    const selectedVoice = inAutoMode && tlvsVoice ? tlvsVoice : undefined;

    if (resolvePlaybackVoice) {
      return resolvePlaybackVoice(kind, langCode, selectedVoice);
    }

    // Fallback for legacy behaviour if resolver is unavailable
    if (settings.voice.voice?.toLowerCase() === "auto") {
      return (
        LANGUAGES.find((language) => language.code.toLowerCase() === langCode)
          ?.voice || VOICE_OPTIONS[0]
      );
    }

    return settings.voice.voice;
  };

  const handleTTS = (overrideVoice?: string) => {
    // Warm up AudioContext while still inside the tap/click gesture call-stack.
    // This is critical on iOS where AudioContext must be resumed during a user
    // gesture — by the time the TTS API responds the gesture has expired.
    warmUpAudioContext();

    // Determine what text to play based on what's currently displayed
    let textToPlay = mainContent || thinkingContent || translated;

    console.log("[TTS] textToPlay before thinking mode check:", textToPlay);

    // If thinking mode is active and thinking content exists, play that instead
    if (
      formik.values.thinkingMode &&
      hasThinking(settings.llmModel) &&
      thinkingContent
    ) {
      textToPlay = thinkingContent;
    }

    ttsMutation.mutate({
      text: textToPlay,
      voice:
        overrideVoice || chooseVoice(formik.values.targetLang.code, "output"),
      ttsModel: settings.ttsModel,
    });
  };

  const handleInputTTS = () => {
    // Warm up AudioContext inside the user gesture (iOS requirement)
    warmUpAudioContext();

    inputTtsMutation.mutate({
      text: formik.values.text,
      voice: chooseVoice(formik.values.sourceLang.code, "input"),
      ttsModel: settings.ttsModel,
    });
  };

  const {
    isRecording,
    audioBlob,
    recordingTime,
    startRecording,
    stopRecording,
    clearAudio,
    setAudioBlob,
    formatTime,
  } = useAudioRecording();

  useEffect(() => {
    if (isRecording && recordingTime >= AUDIO_MAX_DURATION) {
      stopRecording();
    }
  }, [isRecording, recordingTime, stopRecording]);

  const { isPlaying, playAudio, pauseAudio, stopAudio } = useAudioPlayback();

  useEffect(() => {
    return () => {
      stopOrPauseAudio(currentAudio);
      stopOrPauseAudio(currentInputAudio);
    };
  }, [currentAudio, currentInputAudio]);

  useEffect(() => {
    if (translated && !isSwapping) {
      setError(null);
    }
  }, [formik.values.targetLang.code, isSwapping, translated]);

  // Reset TLVS voice when target language, TTS model, or voice mode changes
  useEffect(() => {
    if (getVoicesForLanguage) {
      const voices = getVoicesForLanguage(formik.values.targetLang.code);
      const langKey = formik.values.targetLang.code.toLowerCase();

      // Priority: saved preference > first available voice > null
      const defaultVoice =
        settings.targetLanguageVoices?.[langKey] || voices[0] || null;

      setTlvsVoice(defaultVoice);
    }
  }, [
    formik.values.targetLang.code,
    settings.ttsModel,
    settings.voiceSelectionMode,
    settings.targetLanguageVoices,
    getVoicesForLanguage,
  ]);

  const remaining = useMemo(
    () =>
      `${formik.values.text.length.toLocaleString()} / ${MAX.toLocaleString()}`,
    [formik.values.text],
  );

  const swap = () => {
    if (formik.values.sourceLang.code === "auto") return;

    setIsSwapping(true);

    const newSourceLang = formik.values.targetLang;
    const newTargetLang = formik.values.sourceLang;

    // Get clean version for input
    const { mainContent: cleanTranslated } = parseTranslation(translated);

    // If this is the first swap, store the original values
    if (!swapHistory) {
      setSwapHistory({
        originalInput: formik.values.text,
        originalTranslated: translated,
        originalRawTranslated: translated, // Store raw version with <think> tags
      });

      // First swap: clean translated == input, original input == translated
      formik.setFieldValue("sourceLang", newSourceLang);
      formik.setFieldValue("targetLang", newTargetLang);
      formik.setFieldValue("text", cleanTranslated);
      setTranslated(formik.values.text);
      translatingToLang.current = newTargetLang.name;
    } else {
      // Swapping back: restore original values
      formik.setFieldValue("sourceLang", newSourceLang);
      formik.setFieldValue("targetLang", newTargetLang);
      formik.setFieldValue("text", swapHistory.originalInput);
      setTranslated(swapHistory.originalRawTranslated);
      translatingToLang.current = newTargetLang.name;

      // Clear swap history
      setSwapHistory(null);
    }

    setTimeout(() => setIsSwapping(false), 100);
  };

  const translate = useCallback(async () => {
    const errors = await formik.validateForm();

    if (Object.keys(errors).length > 0) {
      formik.setTouched({
        text: true,
        sourceLang: { code: true, name: true },
        targetLang: { code: true, name: true },
        inputMode: true,
      });

      return;
    }

    formik.handleSubmit();
  }, [formik]);

  const isWebsite =
    formik.values.inputMode === "website" ||
    formik.values.inputMode === "reality";
  const isInputPanelEmpty =
    formik.values.inputMode === "text" && !formik.values.text.trim();
  const isOutputPanelEmpty = !translated && !isTranslating && !error;
  const useCompactMobilePanelLayout =
    !isWebsite && isInputPanelEmpty && isOutputPanelEmpty;

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to start recording",
      );
    }
  };

  const handleDocumentTextExtracted = useCallback(
    (result: DocumentProcessingResult) => {
      resetTranslationState();
      formik.setFieldValue("text", result.text, true);
      setError(null);
      setDocumentProcessed(true);
    },
    [formik, resetTranslationState],
  );

  const handlePlayAudio = () => {
    if (audioBlob) playAudio(audioBlob);
  };

  const handleClearAudio = () => {
    if (isPlaying) stopAudio();
    clearAudio();
  };

  const stopTranslationPlayback = () => {
    if (currentAudio) {
      stopOrPauseAudio(currentAudio);
      setCurrentAudio(null);
    }
    setIsPlayingTranslation(false);
  };

  const stopInputTextPlayback = () => {
    if (currentInputAudio) {
      stopOrPauseAudio(currentInputAudio);
      setCurrentInputAudio(null);
    }
    setIsPlayingInputText(false);
  };

  const copyInputToClipboard = async () => {
    const text = formik.values.text.trim();

    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setCopyInputStatus("copied");
        setForceInputTooltipOpen(true);
        setTimeout(() => {
          setCopyInputStatus("idle");
          setForceInputTooltipOpen(false);
        }, 2000);
      } catch (error) {
        console.error("Failed to copy input:", error);
      }
    }
  };

  const copyTranslatedToClipboard = async () => {
    if (translated) {
      try {
        // Copy main content without thinking tags
        await navigator.clipboard.writeText(mainContent || translated);
        setCopyTranslatedStatus("copied");
        setForceTranslatedTooltipOpen(true);
        setTimeout(() => {
          setCopyTranslatedStatus("idle");
          setForceTranslatedTooltipOpen(false);
        }, 2000);
      } catch (error) {
        console.error("Failed to copy translated:", error);
      }
    }
  };

  const clearText = () => {
    formik.resetForm();
    resetTranslationState();
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setError(null);
    handleClearAudio();
    if (currentInputAudio && isPlayingInputText) stopInputTextPlayback();
    // signal DocumentUpload to clear any selected file / processing result
    setDocumentClearCounter((c) => c + 1);
    // signal AudioUpload to clear any selected file
    setAudioClearCounter((c) => c + 1);
    // signal ImageUpload to clear any selected image
    setImageClearCounter((c) => c + 1);
  };

  const handleFeedback = (liked: boolean) => {
    if (!liked) {
      const newFeedback = translationFeedback === false ? null : false;

      if (currentTranslationId) {
        feedbackMutation.mutate({
          translationId: currentTranslationId,
          liked: newFeedback,
        });
      } else {
        setTranslationFeedback(newFeedback);
        toast.success(
          `Feedback ${
            newFeedback === false ? "disliked" : "removed"
          }! (Local only - no translation ID)`,
        );
      }
      setFeedbackModalOpen(true);
      setFeedbackCorrection("");

      return;
    }

    const newFeedback = translationFeedback === liked ? null : liked;

    if (currentTranslationId) {
      feedbackMutation.mutate({
        translationId: currentTranslationId,
        liked: newFeedback,
      });
    } else {
      setTranslationFeedback(newFeedback);
      toast.success(
        `Feedback ${
          newFeedback === true
            ? "liked"
            : newFeedback === false
              ? "disliked"
              : "removed"
        }! (Local only - no translation ID)`,
      );
    }
  };

  const handleSubmitFeedback = () => {
    if (currentTranslationId) {
      feedbackMutation.mutate({
        translationId: currentTranslationId,
        liked: false,
        correction: feedbackCorrection.trim() || undefined,
      });
    } else {
      setTranslationFeedback(false);
      toast.success("Feedback submitted! (Local only - no translation ID)");
    }

    setFeedbackModalOpen(false);
    setFeedbackCorrection("");
  };

  const bookmarkMutation = useMutation({
    mutationFn: async (bookmarked: boolean) => {
      if (!currentTranslationId) {
        throw new Error("Translation ID is required");
      }
      // console.log("[home] bookmark mutate request", {
      //   translationId: currentTranslationId,
      //   signedInUserId,
      //   bookmarked,
      // });
      const response = await updateBookmarkStatusAPI({
        userId: signedInUserId || "",
        translationId: currentTranslationId,
        bookmarked,
      });

      // console.log("[home] bookmark mutate response", {
      //   translationId: currentTranslationId,
      //   savedBookmarked: response.data.bookmarked,
      // });
      return response.data;
    },
    onMutate: (bookmarked) => {
      const previous = isBookmarked;

      // console.log("[home] bookmark optimistic update", {
      //   translationId: currentTranslationId,
      //   previous,
      //   next: bookmarked,
      // });
      setIsBookmarked(bookmarked);

      return { previous };
    },
    onError: (error, _variables, context) => {
      // console.error("[home] bookmark mutate failed", {
      //   translationId: currentTranslationId,
      //   error,
      // });
      setIsBookmarked(context?.previous ?? false);
      const err = errorHandler(error);

      toast.error("Bookmark update failed", { description: err });
    },
    onSuccess: (_data, bookmarked) => {
      // console.log("[home] bookmark mutate success", {
      //   translationId: currentTranslationId,
      //   bookmarked,
      // });
      toast.success(
        bookmarked ? "Added to bookmarks" : "Removed from bookmarks",
      );
      // Update local history cache for bookmark status
      if (currentTranslationId) {
        ["history", "bookmarks"].forEach((mode) => {
          queryClient.setQueryData(
            ["translationHistory", mode, signedInUserId],
            (old: GetTranslationHistoryResponse | undefined) => {
              if (!old) return old;

              return {
                ...old,
                translations: old.translations.map((item) =>
                  item.id === currentTranslationId
                    ? { ...item, bookmarked }
                    : item,
                ),
              };
            },
          );
        });
      }
    },
  });

  const handleBookmarkToggle = () => {
    if (!currentTranslationId || bookmarkMutation.isPending || !user?.uid)
      return;
    bookmarkMutation.mutate(!isBookmarked);
  };

  // Check if feedback buttons should be enabled
  const canGiveFeedback = !!(
    (formik.values.text?.trim() && translated && !isTranslating)
    // Note: currentTranslationId check temporarily removed for testing
    // Will be re-enabled once we confirm cloud functions are working
  );
  const canBookmark = !!(
    currentTranslationId &&
    translated &&
    !isTranslating &&
    user?.uid
  );

  // Get placeholders for the current model, then ads (Sequential)
  // Each entry tracks whether it's an ad so we can skip spacebar auto-fill for ads
  const placeholderItems = useMemo(() => {
    try {
      const currentModel = TRANSLATION_MODELS.find(
        (m) => m.name === settings.llmModel,
      );

      const modelPlaceholders = (
        currentModel?.placeholders || ["Enter text to translate..."]
      ).map((text: string) => ({ text, isAd: false, ad: undefined }));
      const adItems = placeholderAds.map((ad) => ({
        text: ad.text,
        isAd: true,
        ad,
      }));

      // Sequential: model placeholders first, then ads
      const merged = [...modelPlaceholders, ...adItems];

      return merged.length > 0
        ? merged
        : [{ text: "Enter text to translate...", isAd: false, ad: undefined }];
    } catch {
      return [
        { text: "Enter text to translate...", isAd: false, ad: undefined },
      ];
    }
  }, [settings.llmModel]);

  // Convenience array of just the display strings (used by deps that only need length)
  const placeholderTexts = useMemo(
    () => placeholderItems.map((item) => item.text),
    [placeholderItems],
  );

  // Whether the current placeholder is an ad (spacebar should NOT auto-fill)
  const isCurrentPlaceholderAd = useCallback(
    (index: number) => placeholderItems[index]?.isAd ?? false,
    [placeholderItems],
  );

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Placeholder animation appears every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(
        (prev: number) => (prev + 1) % placeholderTexts.length,
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [placeholderTexts.length]);

  useEffect(() => {
    const handleSpace = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isInputFocused =
        active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT");
      const isEmpty = !formik.values.text.trim();
      const spaceKeyPressed =
        e.key === " " || e.key === "Space" || e.code === "Space";

      if (spaceKeyPressed && isInputFocused && isEmpty) {
        const currentItem = placeholderItems[placeholderIndex];

        // Check if it's an ad
        if (currentItem?.isAd && currentItem.ad) {
          e.preventDefault();
          e.stopPropagation();

          // Show toast if ad has description or action
          if (currentItem.ad.description || currentItem.ad.action) {
            toast.info(currentItem.ad.text, {
              description: currentItem.ad.description,
              action: currentItem.ad.action
                ? {
                    label: currentItem.ad.action.label,
                    onClick: () =>
                      window.open(currentItem.ad.action?.url, "_blank"),
                  }
                : undefined,
              duration: 5000,
            });
          }

          return;
        }

        // Only populate if the current placeholder is NOT an ad
        if (!isCurrentPlaceholderAd(placeholderIndex)) {
          e.preventDefault();
          e.stopPropagation();
          const raw = `${placeholderTexts[placeholderIndex]} [Press Space]`;
          let clean = raw.replace(/\s*\[Press Space\]$/i, "").trim();

          clean = clean.replace(/^[A-Za-z]+:\s*/, "");
          formik.setFieldValue("text", clean);
        }
      }
    };

    const handleInput = (e: Event) => {
      const active = document.activeElement as HTMLElement | null;
      const isInputFocused =
        active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT");
      const wasEmpty = !formik.values.text.trim();

      if (isInputFocused && wasEmpty) {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;

        if (target.value === " " && !isCurrentPlaceholderAd(placeholderIndex)) {
          const raw = `${placeholderTexts[placeholderIndex]} [Press Space]`;
          let clean = raw.replace(/\s*\[Press Space\]$/i, "").trim();

          clean = clean.replace(/^[A-Za-z]+:\s*/, "");
          formik.setFieldValue("text", clean);
        }
      }
    };

    window.addEventListener("keydown", handleSpace);
    document.addEventListener("input", handleInput, true);

    return () => {
      window.removeEventListener("keydown", handleSpace);
      document.removeEventListener("input", handleInput, true);
    };
  }, [
    formik,
    placeholderIndex,
    placeholderTexts,
    isCurrentPlaceholderAd,
    placeholderItems,
  ]);

  const { mainContent: outsideText } = parseTranslation(translated || "");

  // Only keep the text outside of any <think>...</think> block — discard the
  // tagged content entirely as requested.
  const placeholder = (outsideText || "").trim();

  useEffect(() => {
    if (!isUserTargetLangChange.current) return;
    isUserTargetLangChange.current = false;

    if (!settings.behavior.autoTranslateOnLanguageChange) return;
    if (isTranslating) return;
    if (isSwapping) return;

    const mode = formik.values.inputMode;

    if (!["text", "document", "voice", "image"].includes(mode)) return;

    if (["text", "document"].includes(mode) && !formik.values.text.trim()) {
      return;
    }

    if (mode === "voice" && !audioBlob) {
      return;
    }

    if (mode === "image" && !selectedImage) {
      return;
    }

    const timeout = setTimeout(() => {
      if (isTranslatingRef.current) return;
      translate();
    }, 300);

    return () => clearTimeout(timeout);
  }, [formik.values.targetLang]);

  useEffect(() => {
    // Only play if we have a new translation and auto-play is enabled
    if (
      translated &&
      settings.behavior.autoPlayAudio &&
      translateMutation.isSuccess &&
      !translateMutation.isPending
    ) {
      handleTTS();
    }
  }, [
    translated,
    settings.behavior.autoPlayAudio,
    translateMutation.isSuccess,
  ]);

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      <main className="flex-1 flex flex-col px-4 md:px-6 py-4 md:py-8 relative overflow-y-auto">
        <div className="mx-auto max-w-7xl flex flex-col flex-1 w-full">
          <motion.div
            {...enter(0)}
            className="flex flex-row items-center justify-center gap-2 sm:gap-3 md:gap-4 w-full"
          >
            <div className="flex flex-col items-center">
              <LangSelect
                className="w-32 sm:w-40 shrink-0"
                options={getAvailableSourceLanguages()}
                value={formik.values.sourceLang}
                onChange={(value) => {
                  if (
                    value.code !== formik.values.sourceLang.code &&
                    translated
                  ) {
                    if (documentProcessed) {
                      resetDocumentTranslationState();
                    } else {
                      resetTranslationState();
                    }
                    // resetTranslationState();
                  }
                  formik.setFieldValue("sourceLang", value);
                }}
              />
            </div>

            <Button
              aria-label="Swap languages"
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 shrink-0"
              disabled={formik.values.sourceLang.code === "auto"}
              size="icon"
              title="Swap languages"
              type="button"
              variant="outline"
              onClick={swap}
            >
              <ArrowLeftRight className="size-4 sm:size-5" />
            </Button>

            <div className="flex flex-col items-center">
              <LangSelect
                className="w-32 sm:w-40 shrink-0"
                data-testid="target-lang"
                options={getAvailableTargetLanguages()}
                value={formik.values.targetLang}
                onChange={(value) => {
                  if (value.code !== formik.values.targetLang.code) {
                    isUserTargetLangChange.current = true;
                    if (translated) {
                      if (documentProcessed) {
                        resetDocumentTranslationState();
                      } else {
                        resetTranslationState();
                      }
                    }
                  }
                  formik.setFieldValue("targetLang", value);
                }}
              />
            </div>
          </motion.div>

          <div
            className={`flex-1 mt-4 md:mt-6 grid grid-cols-1 ${
              isWebsite ? "md:grid-cols-1" : "md:grid-cols-2"
            } ${useCompactMobilePanelLayout ? "mt-3 gap-3 md:mt-6 md:gap-6" : "gap-4 md:gap-6"}`}
          >
            <motion.form
              {...enter(0.1)}
              className={`panel flex ${useCompactMobilePanelLayout ? "min-h-[210px] max-h-[220px]" : "min-h-[210px] max-h-[50svh]"} flex-col overflow-hidden md:max-h-[400px] lg:max-h-[460px]`}
              onSubmit={formik.handleSubmit}
            >
              <div className="p-2 md:p-3 flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {FEATURES.map(({ id, label, icon: Icon }) => (
                      <Button
                        key={id}
                        aria-label={label}
                        className="shrink-0 hover:shadow-xs"
                        data-testid={
                          label === "Document"
                            ? "document-upload-tab"
                            : undefined
                        }
                        size="icon"
                        type="button"
                        variant={
                          formik.values.inputMode === id ? "default" : "outline"
                        }
                        onClick={() => {
                          if (formik.values.inputMode !== id) {
                            resetTranslationState();
                          }
                          formik.setFieldValue("inputMode", id);
                        }}
                      >
                        <Icon className="size-5" />
                      </Button>
                    ))}
                  </div>
                  {formik.values.inputMode != "voice" && (
                    <Button
                      className="text-xs"
                      size="sm"
                      type="button"
                      onClick={clearText}
                      // disabled={!formik.values.text}
                      variant="ghost"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                {formik.values.inputMode === "text" && (
                  <div className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
                    <Textarea
                      className={`flex-1 w-full resize-none bg-transparent h-full pr-8 placeholder:opacity-50 ${
                        formik.touched.text && formik.errors.text
                          ? "border-red-500"
                          : ""
                      }`}
                      data-testid="input-box"
                      name="text"
                      placeholder={`Hi ${user?.displayName || "Guest"},\n${
                        placeholderTexts[placeholderIndex]
                      }${isCurrentPlaceholderAd(placeholderIndex) ? "" : " [Press Space]"}`}
                      value={formik.values.text}
                      onBlur={formik.handleBlur}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX);

                        if (
                          translated ||
                          currentTranslationId ||
                          translationFeedback !== null ||
                          isBookmarked
                        ) {
                          resetTranslationState();
                        }
                        formik.setFieldValue("text", value);
                        if (currentInputAudio && isPlayingInputText)
                          stopInputTextPlayback();
                      }}
                    />

                    {/* X ICON TO CLEAR TEXT */}
                    {formik.values.text.length > 0 && (
                      <button
                        aria-label="Clear text"
                        className="absolute right-2 top-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        title="Clear text"
                        type="button"
                        onClick={() => formik.setFieldValue("text", "")}
                      >
                        <X className="text-gray-500" size={16} />
                      </button>
                    )}

                    {formik.touched.text && formik.errors.text && (
                      <div className="mt-1 text-xs text-red-500">
                        {formik.errors.text}
                      </div>
                    )}
                  </div>
                )}
                {formik.values.inputMode === "document" && (
                  <DocumentUpload
                    clearCounter={documentClearCounter}
                    onTextExtracted={handleDocumentTextExtracted}
                    // onError={handleDocumentError}
                    disabled={isTranslating}
                  />
                )}
                {formik.values.inputMode === "image" && (
                  <ImageUpload
                    clearCounter={imageClearCounter}
                    imagePreviewUrl={imagePreviewUrl}
                    selectedImage={selectedImage}
                    onImageSelected={(file, url) => {
                      setSelectedImage(file);
                      setImagePreviewUrl(url);
                    }}
                  >
                    <Button
                      disabled={
                        extractTextFromImageMutation.isPending || isTranslating
                      }
                      loading={extractTextFromImageMutation.isPending}
                      type="button"
                      onClick={() => {
                        if (selectedImage) {
                          extractTextFromImageMutation.mutate({
                            file: selectedImage,
                          });
                        }
                      }}
                    >
                      Use as Text
                    </Button>
                  </ImageUpload>
                )}
                {formik.values.inputMode === "voice" && (
                  <AudioUpload
                    audioBlob={audioBlob}
                    clearCounter={audioClearCounter}
                    disabled={isTranslating}
                    isConverting={speechToTextMutation.isPending}
                    isRecording={isRecording}
                    recordingTime={recordingTime}
                    onAudioSelected={(blob) => {
                      setAudioBlob(blob);
                    }}
                    onClear={handleClearAudio}
                    onConvertAndTranslate={() => handleCheckAudio(false)}
                    onStartRecording={handleStartRecording}
                    onStopRecording={stopRecording}
                  />
                )}
                {formik.values.inputMode === "website" && (
                  <div className="flex-1 min-h-0 h-full max-h-full w-full border border-input rounded-md px-4 py-6 bg-transparent flex flex-col items-start overflow-y-auto">
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <Globe className="size-6 text-theme-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-semibold">
                          HypaExtension — Web, Browser
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Translate website contents on the Hypa Translate
                          extension. Translate text directly on the page or
                          translate and read out the entire webpage.
                        </div>
                        <div
                          className="my-3"
                          onClick={() =>
                            window.open(
                              "https://chromewebstore.google.com/detail/hypa-intelligence/phokhpemncdemfdojbmoadodppgflcdj",
                              "_blank",
                            )
                          }
                        >
                          <img
                            alt=""
                            className="cursor-pointer"
                            src="/ext.svg"
                            width={160}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {formik.values.inputMode === "reality" && (
                  <div className="flex-1 min-h-0 h-full max-h-full w-full border border-input rounded-md px-4 py-6 bg-transparent flex flex-col items-start overflow-y-auto">
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <Globe className="size-6 text-theme-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-semibold">
                          HypaReality — AR, VR, MR
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Experience seamless translation in immersive
                          environments. Hypa Translate will soon be available on
                          virtual, augmented, and mixed reality devices,
                          bringing real-time language understanding to your
                          digital worlds.
                        </div>
                        <div className="my-3">
                          <img
                            alt="Coming Soon on XR Platforms"
                            src="/xr-badge.svg"
                            width={160}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-2 shrink-0 flex items-center justify-between text-muted-foreground">
                  {formik.values.inputMode === "voice" && (
                    <div className="flex items-center gap-2">
                      <Button
                        aria-label={
                          isRecording ? "Stop recording" : "Start recording"
                        }
                        className={
                          isRecording
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "hover:bg-accent"
                        }
                        disabled={!!audioBlob && !isRecording}
                        size="icon"
                        type="button"
                        variant={isRecording ? "default" : "outline"}
                        onClick={
                          isRecording ? stopRecording : handleStartRecording
                        }
                      >
                        {isRecording ? (
                          <Square className="size-5" />
                        ) : (
                          <Mic className="size-5" />
                        )}
                      </Button>

                      {isRecording && (
                        <span className="text-xs text-red-500 animate-pulse">
                          {formatTime(recordingTime)}
                        </span>
                      )}
                      {audioBlob && !isRecording && (
                        <div className="flex items-center gap-2">
                          <Button
                            aria-label={isPlaying ? "Pause" : "Play"}
                            className={
                              isPlaying
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "hover:bg-accent"
                            }
                            size="icon"
                            type="button"
                            variant="outline"
                            onClick={isPlaying ? pauseAudio : handlePlayAudio}
                          >
                            {isPlaying ? (
                              <Pause className="size-4" />
                            ) : (
                              <Play className="size-4" />
                            )}
                          </Button>
                          <Button
                            aria-label="Clear audio"
                            className="hover:bg-accent"
                            disabled={speechToTextMutation.isPending}
                            size="icon"
                            type="button"
                            variant="outline"
                            onClick={handleClearAudio}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {formik.values.inputMode === "text" &&
                    formik.values.text.trim() && (
                      <div className="flex items-center">
                        <Button
                          aria-label={
                            isPlayingInputText ? "Pause" : "Play input text"
                          }
                          className="hover:bg-accent"
                          disabled={
                            !formik.values.text.trim() ||
                            inputTtsMutation.isPending
                          }
                          loading={inputTtsMutation.isPending}
                          size="sm"
                          type="button"
                          variant="ghost"
                          onClick={
                            isPlayingInputText
                              ? stopInputTextPlayback
                              : handleInputTTS
                          }
                        >
                          {isPlayingInputText ? (
                            <Square className="size-4 mr-1" />
                          ) : (
                            <Volume2Icon className="size-4 mr-1" />
                          )}
                          {/* {isPlayingInputText ? "Stop" : "Play"} */}
                        </Button>
                        <Tooltip
                          key={copyInputStatus}
                          open={forceInputTooltipOpen || undefined}
                        >
                          <TooltipTrigger asChild>
                            <Button
                              className="text-xs"
                              disabled={!formik.values.text.trim()}
                              size="sm"
                              type="button"
                              variant="ghost"
                              onClick={copyInputToClipboard}
                            >
                              <Copy className="size-4" />
                              {/* Copy */}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {copyInputStatus === "copied"
                                ? "Copied!"
                                : "Copy to clipboard"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}

                  {formik.values.inputMode === "image" ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          aria-label="Image info"
                          size="icon"
                          variant="outline"
                        >
                          <Camera className="size-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Image Translate — Mobile app
                          </DialogTitle>
                          <DialogDescription>
                            Image translation (extracting text from photos) is
                            available in the Hypa Intelligence app. Download it to
                            translate text from your camera or photos.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          <GetAppButtons />
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    {(formik.values.inputMode === "text" ||
                      formik.values.inputMode === "document") && (
                      <div className="text-xs text-muted-foreground">
                        {remaining}
                      </div>
                    )}
                    {formik.values.inputMode !== "website" &&
                      formik.values.inputMode !== "reality" && (
                        <Button
                          className="text-xs"
                          data-testid="translate-button"
                          disabled={
                            isTranslating ||
                            (formik.values.inputMode === "image" &&
                              (!selectedImage ||
                                extractTextFromImageMutation.isPending)) ||
                            (formik.values.inputMode === "voice" &&
                              (!audioBlob || speechToTextMutation.isPending)) || // Voice mode
                            (formik.values.inputMode === "text" &&
                              !formik.values.text.trim()) || // Text mode
                            (formik.values.inputMode === "document" &&
                              !documentProcessed) // Document mode
                          }
                          loading={
                            isTranslating ||
                            (isTranscribingToTranslate.current &&
                              speechToTextMutation.isPending)
                          }
                          size="sm"
                          type="submit"
                        >
                          Translate
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            </motion.form>

            {!isWebsite && (
              <motion.div
                {...enter(0.2)}
                className={`panel bg-muted/50 flex ${useCompactMobilePanelLayout ? "min-h-[210px] max-h-[220px]" : "min-h-[210px] max-h-[50svh]"} flex-col overflow-hidden md:max-h-[400px] lg:max-h-[460px]`}
              >
                <div className="p-2 md:p-3 flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 h-9">
                      <img
                        // src="/logo.svg"
                        alt="HypaTranslate"
                        className="size-5 shrink-0"
                        src={getThemeAwareLogo("hypaintelligence", theme)}
                      />
                      <span className="text-sm font-medium text-muted-foreground">
                        {isTranslating
                          ? `Translating to ${translatingToLang.current || formik.values.targetLang.name}`
                          : translated
                            ? `Translated to ${translatingToLang.current || formik.values.targetLang.name}`
                            : `Translate to ${formik.values.targetLang.name}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        className="text-xs h-7 px-2"
                        disabled={!canBookmark || bookmarkMutation.isPending}
                        loading={bookmarkMutation.isPending}
                        size="sm"
                        title={
                          isBookmarked
                            ? "Remove from bookmarks"
                            : "Save to bookmarks"
                        }
                        type="button"
                        variant={isBookmarked ? "default" : "ghost"}
                        onClick={handleBookmarkToggle}
                      >
                        <Bookmark
                          className="size-4"
                          data-testid="bookmark-button"
                        />
                      </Button>
                      <Button
                        className="text-xs h-7 px-2"
                        disabled={!canGiveFeedback}
                        size="sm"
                        title="Like this translation"
                        type="button"
                        variant={
                          translationFeedback === true ? "default" : "ghost"
                        }
                        onClick={() => handleFeedback(true)}
                      >
                        <ThumbsUp className="size-4" />
                      </Button>
                      <Button
                        className="text-xs h-7 px-2"
                        disabled={!canGiveFeedback}
                        size="sm"
                        title="Dislike this translation"
                        type="button"
                        variant={
                          translationFeedback === false ? "default" : "ghost"
                        }
                        onClick={() => handleFeedback(false)}
                      >
                        <ThumbsDown className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0 overflow-y-auto border border-input rounded-md px-3 py-2 bg-transparent text-lg">
                    {isTranslating ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-muted-foreground">
                          Translating...
                        </div>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-red-500 text-center">
                          <p>{error}</p>
                          <Button
                            className="mt-2"
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={translate}
                          >
                            Try Again
                          </Button>
                        </div>
                      </div>
                    ) : translated ? (
                      <div className="space-y-3">
                        {thinkingContent &&
                        formik.values.thinkingMode &&
                        hasThinking(settings.llmModel) ? (
                          <div className="h-full flex-1 rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-2">
                              <BrainIcon className="size-4 text-primary" />
                              <span className="text-sm font-semibold text-primary">
                                Thinking Process
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                              {thinkingContent}
                            </div>
                          </div>
                        ) : (
                          <div
                            className="text-foreground whitespace-pre-wrap"
                            data-testid="translated-text"
                          >
                            {mainContent}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        Translation will appear here
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <Button
                        className="text-xs"
                        disabled={!translated || ttsMutation.isPending}
                        loading={ttsMutation.isPending}
                        size="sm"
                        variant="ghost"
                        onClick={
                          isPlayingTranslation
                            ? stopTranslationPlayback
                            : () => handleTTS()
                        }
                      >
                        {isPlayingTranslation ? (
                          <Square className="size-4" />
                        ) : (
                          <Volume2Icon className="size-4" />
                        )}
                        {/* {isPlayingTranslation ? "Stop" : "Play"} */}
                      </Button>
                      <Tooltip
                        key={copyTranslatedStatus}
                        open={forceTranslatedTooltipOpen || undefined}
                      >
                        <TooltipTrigger asChild>
                          <Button
                            className="text-xs"
                            disabled={!translated}
                            size="sm"
                            variant="ghost"
                            onClick={copyTranslatedToClipboard}
                          >
                            <Copy className="size-4" />
                            {/* Copy */}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {copyTranslatedStatus === "copied"
                              ? "Copied!"
                              : "Copy to clipboard"}
                          </p>
                        </TooltipContent>
                      </Tooltip>

                    </div>

                    <div className="flex items-center gap-2">
                      {/* Voice Dropdown - Show based on mode */}
                      {translated &&
                        (() => {
                          // In AUTO mode: show language-specific voices (TLVS)
                          if (settings.voiceSelectionMode === "auto") {
                            const availableVoices = getVoicesForLanguage
                              ? getVoicesForLanguage(
                                  formik.values.targetLang.code,
                                )
                              : [];

                            if (availableVoices.length === 0) return null;

                            return (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    className="text-xs gap-2"
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Volume2Icon className="size-4" />
                                    <span>
                                      {tlvsVoice || availableVoices[0]}
                                    </span>
                                    <ChevronDown className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {availableVoices.map((voice: string) => (
                                    <DropdownMenuItem
                                      key={voice}
                                      className={
                                        tlvsVoice === voice ? "bg-accent" : ""
                                      }
                                      onClick={() => {
                                        const changed = voice !== tlvsVoice;

                                        setTlvsVoice(voice);
                                        if (updateTargetLanguageVoice) {
                                          updateTargetLanguageVoice(
                                            formik.values.targetLang.code,
                                            voice,
                                          );
                                        }
                                        if (changed && !ttsMutation.isPending)
                                          handleTTS(voice);
                                      }}
                                    >
                                      <span className="flex-1 min-w-0">
                                        {voice}
                                      </span>
                                      {tlvsVoice === voice && (
                                        <Check className="size-4 ml-auto shrink-0" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          }

                          // In FAVORITES mode: show favorite voices
                          if (settings.voiceSelectionMode === "favorites") {
                            const favoriteVoices =
                              settings.favoriteVoices || [];

                            if (favoriteVoices.length === 0) return null;

                            return (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    className="text-xs gap-2"
                                    size="sm"
                                    variant="outline"
                                  >
                                    <span>{settings.voice.voice}</span>
                                    <ChevronDown className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {favoriteVoices.map((voice: string) => (
                                    <DropdownMenuItem
                                      key={voice}
                                      className={
                                        settings.voice.voice === voice
                                          ? "bg-accent"
                                          : ""
                                      }
                                      onClick={() => {
                                        const changed =
                                          voice !== settings.voice.voice;

                                        updateVoiceSetting("voice", voice);
                                        if (changed && !ttsMutation.isPending)
                                          handleTTS(voice);
                                      }}
                                    >
                                      <span className="flex-1 min-w-0">
                                        {voice}
                                      </span>
                                      {settings.voice.voice === voice && (
                                        <Check className="size-4 ml-auto shrink-0" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          }

                          // In CELEBRITY mode: show favorite celebrity voices
                          if (settings.voiceSelectionMode === "celebrity") {
                            const favoriteCelebs =
                              settings.favoriteCelebrityVoices || [];

                            if (favoriteCelebs.length === 0) return null;

                            return (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    className="text-xs gap-2"
                                    size="sm"
                                    variant="outline"
                                  >
                                    <span>{settings.voice.voice}</span>
                                    <ChevronDown className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {favoriteCelebs.map((voice: string) => (
                                    <DropdownMenuItem
                                      key={voice}
                                      className={
                                        settings.voice.voice === voice
                                          ? "bg-accent"
                                          : ""
                                      }
                                      onClick={() => {
                                        const changed =
                                          voice !== settings.voice.voice;

                                        updateVoiceSetting("voice", voice);
                                        if (changed && !ttsMutation.isPending)
                                          handleTTS(voice);
                                      }}
                                    >
                                      <span className="flex-1 min-w-0">
                                        {voice}
                                      </span>
                                      {settings.voice.voice === voice && (
                                        <Check className="size-4 ml-auto shrink-0" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          }

                          return null;
                        })()}

                      {formik.values.inputMode !== "website" &&
                        formik.values.inputMode !== "reality" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                disabled={!hasThinking(settings.llmModel)}
                                type="button"
                                variant={
                                  formik.values.thinkingMode &&
                                  hasThinking(settings.llmModel)
                                    ? "default"
                                    : "outline"
                                }
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  formik.setFieldValue(
                                    "thinkingMode",
                                    !formik.values.thinkingMode,
                                  );
                                }}
                              >
                                <BrainIcon />
                              </Button>
                            </TooltipTrigger>
                            {!hasThinking(settings.llmModel) && (
                              <TooltipContent>
                                Thinking mode is not available for the selected
                                model.
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* App Store Button */}
        <motion.div
          {...enter(0.3)}
          className={`w-full max-w-7xl mx-auto flex-shrink-0 flex justify-center ${useCompactMobilePanelLayout ? "mt-2 pb-3" : "mt-6 pb-6"} md:mt-8 lg:mt-10 md:pb-6`}
        >
          <GetAppButtons />
        </motion.div>
      </main>

      {/* Feedback Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent
          className="sm:max-w-[500px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Improve Translation</DialogTitle>
            <DialogDescription>
              Help us improve by providing a better translation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Language Direction */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                {formik.values.sourceLang.name}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">
                {formik.values.targetLang.name}
              </span>
            </div>

            {/* Original Text */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Original Text
              </label>
              <div className="p-3 h-full overflow-y-auto bg-muted rounded-md text-sm">
                {formik.values.text || "No text provided"}
              </div>
            </div>

            {/* Correction Textarea */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Correction</label>
              <Textarea
                className="h-full resize-none"
                placeholder={placeholder || "Enter your correction here..."}
                value={feedbackCorrection}
                onChange={(e) => setFeedbackCorrection(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFeedbackModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitFeedback}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
      <MainFooter />
    </div>
  );
};

export default Home;
