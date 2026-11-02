// @ts-nocheck
import "@fontsource-variable/geist";

import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/modules/theme/theme-provider";
import { SettingsProvider } from "@/context/settings-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

export function TranslateModuleShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <Outlet />
        <Toaster />
      </SettingsProvider>
    </QueryClientProvider>
  );
}
