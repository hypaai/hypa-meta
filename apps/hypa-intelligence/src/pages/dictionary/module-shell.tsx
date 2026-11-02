import { Outlet } from "react-router-dom";
import { Provider } from "@/providers/dictionary-provider";
import { ToastProvider } from "@/components/shared/toast";

export function DictionaryModuleShell() {
  return (
    <Provider>
      <Outlet />
      <ToastProvider />
    </Provider>
  );
}
