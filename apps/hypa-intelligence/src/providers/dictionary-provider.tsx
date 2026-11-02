// import type { NavigateOptions } from "react-router-dom";

import { HeroUIProvider } from "@heroui/system";
import { useHref, useNavigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { DictionarySearchProvider } from "@/providers/dictionary-search-provider";


// declare module "@react-types/shared" {
//   interface RouterConfig {
//     routerOptions: NavigateOptions;
//   }
// }

export function Provider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider navigate={navigate} useHref={useHref}>
        <DictionarySearchProvider>{children}</DictionarySearchProvider>
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
