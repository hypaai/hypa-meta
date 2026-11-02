import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import DictionaryMainLayout from "@/layouts/main-layout";
import DictionaryIndexPage from "@/pages/dictionary/index";
import DictionarySettingsPage from "@/pages/dictionary/settings";
import DictionaryLanguagesPage from "@/pages/dictionary/languages";
import DictionarySearchPage from "@/pages/dictionary/search";
import DictionaryWordPage from "@/pages/dictionary/word";
import TranslateHomePage from "@/pages/translate/home";
import TranslateSettingsPage from "@/pages/translate/settings";
import PolicyPage from "@/pages/policy";
import ChatPage from "@/pages/chat";
import { TranslateModuleShell } from "@/pages/translate/module-shell";
import { DictionaryModuleShell } from "@/pages/dictionary/module-shell";
import IndexPage from "@/pages/index";
import Navbar from "@/components/modules/nav/navbar";

function App() {
  const isChat = useLocation().pathname.replace(/\/$/, "") === "/chat";
  const [viewportHeight, setViewportHeight] = useState<number>();

  useEffect(() => {
    if (!isChat) return;
    const viewport = window.visualViewport;
    const resize = () =>
      setViewportHeight(viewport?.height ?? window.innerHeight);

    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);

    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, [isChat]);

  return (
    <div
      className={`flex flex-col bg-[var(--background)] ${isChat ? "h-dvh overflow-hidden" : "min-h-dvh"}`}
      style={isChat && viewportHeight ? { height: viewportHeight } : undefined}
    >
      <Navbar />
      <div className="flex-1 min-h-0 flex flex-col relative">
        <Routes>
          <Route element={<IndexPage />} path="/" />
          <Route element={<PolicyPage />} path="/privacy" />
          <Route element={<ChatPage />} path="/chat" />
          <Route element={<Navigate replace to="/privacy" />} path="/policy" />

          <Route element={<DictionaryModuleShell />} path="/dictionary">
            <Route element={<DictionaryMainLayout />}>
              <Route index element={<DictionaryIndexPage />} />
              <Route element={<DictionaryLanguagesPage />} path="languages" />
              <Route element={<DictionarySearchPage />} path="search" />
              <Route element={<DictionaryWordPage />} path="word/:word" />
              <Route element={<DictionarySettingsPage />} path="settings" />
            </Route>
          </Route>

          <Route element={<TranslateModuleShell />} path="/translate">
            <Route index element={<TranslateHomePage />} />
            <Route
              element={<Navigate replace to="/privacy" />}
              path="privacy"
            />
            <Route element={<Navigate replace to="/privacy" />} path="policy" />
            <Route element={<TranslateSettingsPage />} path="settings" />
          </Route>
        </Routes>
      </div>
    </div>
  );
}

export default App;
