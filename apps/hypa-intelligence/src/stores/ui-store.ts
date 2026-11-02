import { create } from "zustand";

interface UiStore {
  isHistoryOpen: boolean;
  isBookmarksOpen: boolean;
  openHistory: () => void;
  closeHistory: () => void;
  openBookmarks: () => void;
  closeBookmarks: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  isHistoryOpen: false,
  isBookmarksOpen: false,
  openHistory: () => set({ isHistoryOpen: true, isBookmarksOpen: false }),
  closeHistory: () => set({ isHistoryOpen: false }),
  openBookmarks: () => set({ isBookmarksOpen: true, isHistoryOpen: false }),
  closeBookmarks: () => set({ isBookmarksOpen: false }),
}));
