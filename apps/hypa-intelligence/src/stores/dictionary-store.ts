import type { DictionaryResponse } from "@/lib/api";

import { create } from "zustand";


interface RecentSearch {
  word: string;
  language: string;
  result: DictionaryResponse;
  timestamp: number;
}

interface DictionaryStore {
  recentSearches: RecentSearch[];
  currentResult: DictionaryResponse | null;
  actions: {
    setCurrentResult: (result: DictionaryResponse | null) => void;
    addRecentSearch: (
      word: string,
      language: string,
      result: DictionaryResponse,
    ) => void;
    getCachedResult: (
      word: string,
      language: string,
    ) => DictionaryResponse | null;
    clearRecentSearches: () => void;
  };
}

const RECENT_SEARCHES_KEY = "hypa_dictionary_recent";
const MAX_RECENT = 15;

const getStorage = (): Storage => localStorage;

const loadRecent = (): RecentSearch[] => {
  try {
    // Check both storages and merge — user may have searched before logging in
    const local = localStorage.getItem(RECENT_SEARCHES_KEY);
    const session = sessionStorage.getItem(RECENT_SEARCHES_KEY);
    const localItems: RecentSearch[] = local ? JSON.parse(local) : [];
    const sessionItems: RecentSearch[] = session ? JSON.parse(session) : [];

    // Merge: local takes precedence over session for same word+language
    const map = new Map<string, RecentSearch>();

    for (const item of sessionItems) {
      map.set(
        `${item.word.toLowerCase()}::${item.language.toLowerCase()}`,
        item,
      );
    }
    for (const item of localItems) {
      map.set(
        `${item.word.toLowerCase()}::${item.language.toLowerCase()}`,
        item,
      );
    }

    return [...map.values()]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[.!\u2026]+$/g, "");

const isCompleteResult = (result: DictionaryResponse): boolean => {
  return (result.definitions ?? []).some(
    (d) =>
      normalizeText(d.text) !== "no definition available" &&
      normalizeText(d.text) !== "search failed",
  );
};

export const useDictionaryStore = create<DictionaryStore>((set, get) => ({
  recentSearches: loadRecent(),
  currentResult: null,

  actions: {
    setCurrentResult: (result) => set({ currentResult: result }),

    addRecentSearch: (word, language, result) => {
      if (!isCompleteResult(result)) return;

      const current = get().recentSearches.filter(
        (s) =>
          !(
            s.word.toLowerCase() === word.toLowerCase() &&
            s.language.toLowerCase() === language.toLowerCase()
          ),
      );
      const updated = [
        { word, language, result, timestamp: Date.now() },
        ...current,
      ].slice(0, MAX_RECENT);

      const storage = getStorage();

      storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      set({ recentSearches: updated });
    },

    getCachedResult: (word, language) => {
      const entry = get().recentSearches.find(
        (s) =>
          s.word.toLowerCase() === word.toLowerCase() &&
          s.language.toLowerCase() === language.toLowerCase(),
      );

      return entry?.result ?? null;
    },

    clearRecentSearches: () => {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      sessionStorage.removeItem(RECENT_SEARCHES_KEY);
      set({ recentSearches: [] });
    },
  },
}));
