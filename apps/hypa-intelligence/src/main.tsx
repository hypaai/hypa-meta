import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";

import { ThemeProvider } from "@/components/modules/theme/theme-provider";
import "@/styles/globals.css";
import { analytics } from "@/lib/analytics";

analytics.start();

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <BrowserRouter>
    <ThemeProvider defaultTheme="system" storageKey="hypa-intelligence-theme" attribute="class">
      <App />
    </ThemeProvider>
  </BrowserRouter>,
  // </React.StrictMode>,
);
