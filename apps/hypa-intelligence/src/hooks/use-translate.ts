import { useState, useEffect, useRef } from "react";
import { showToast } from "@/components/shared/toast";
import { useSettingsStore } from "@/stores/settings-store";
import { tp } from "@/lib/api";

function getTranslationErrorMessage(err: unknown): string {
  let message = "Translation failed. Tap to retry.";

  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as {
      response?: { data?: { message?: string } | string };
    };
    const payload = axiosErr.response?.data;

    if (typeof payload === "string") {
      message = payload;
    } else if (typeof payload?.message === "string") {
      message = payload.message;
    }
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (/endpoint\s+is\s+paused/i.test(message)) {
    return "This model endpoint is paused. Select a different LLM model in Settings.";
  }

  return message;
}

export function useTranslateWord(
  text: string | undefined,
  sourceLanguage: string,
  enabled = true,
  targetLang?: string,
) {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!enabled || !text?.trim()) return;

    // Single-target mode: skip if target === source
    if (targetLang && targetLang.toLowerCase() === sourceLanguage.toLowerCase())
      return;

    abortRef.current = false;
    setIsLoading(true);
    setError(null);
    setTranslations({});

    let targets: string[];

    if (targetLang) {
      targets = [targetLang];
    } else {
      const mtLanguages = useSettingsStore.getState().actions.getMtLanguages();

      targets = mtLanguages.filter(
        (lang) => lang.toLowerCase() !== sourceLanguage.toLowerCase(),
      );
    }

    if (targets.length === 0) {
      setIsLoading(false);

      return;
    }

    const results: Record<string, string> = {};
    let didNotifyError = false;

    const promises = targets.map(async (lang) => {
      try {
        const result = await tp.translate({
          text,
          source_lang: sourceLanguage,
          target_lang: lang,
        });

        results[lang] = result.output_text;
      } catch (err) {
        console.error(`[MT] Translation to ${lang} failed:`, err);
        results[lang] = "\u2014";

        if (!didNotifyError) {
          didNotifyError = true;
          const message = getTranslationErrorMessage(err);

          setError(message);
          showToast(message, "error");
        }
      }
    });

    Promise.allSettled(promises).then(() => {
      if (!abortRef.current) {
        console.log("[MT] Translation results:", results);
        setTranslations({ ...results });
        setIsLoading(false);
      }
    });

    return () => {
      abortRef.current = true;
    };
  }, [enabled, text, sourceLanguage, targetLang]);

  const refetch = () => {
    if (!text?.trim()) return;

    if (targetLang && targetLang.toLowerCase() === sourceLanguage.toLowerCase())
      return;

    setIsLoading(true);
    setError(null);
    setTranslations({});

    let targets: string[];

    if (targetLang) {
      targets = [targetLang];
    } else {
      const mtLanguages = useSettingsStore.getState().actions.getMtLanguages();

      targets = mtLanguages.filter(
        (lang) => lang.toLowerCase() !== sourceLanguage.toLowerCase(),
      );
    }

    const results: Record<string, string> = {};
    let didNotifyError = false;

    const promises = targets.map(async (lang) => {
      try {
        const result = await tp.translation({
          text,
          source_lang: sourceLanguage,
          target_lang: lang,
        });

        results[lang] = result.output_text;
      } catch (err) {
        console.error(`[MT] Refetch translation to ${lang} failed:`, err);
        results[lang] = "\u2014";

        if (!didNotifyError) {
          didNotifyError = true;
          const message = getTranslationErrorMessage(err);

          setError(message);
          showToast(message, "error");
        }
      }
    });

    Promise.allSettled(promises)
      .then(() => {
        console.log("[MT] Refetch results:", results);
        setTranslations({ ...results });
      })
      .catch((err) => {
        const message = getTranslationErrorMessage(err);

        setError(message);
        showToast(message, "error");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return { translations, isLoading, error, refetch };
}
