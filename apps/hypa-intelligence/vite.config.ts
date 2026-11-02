import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.API_BASE_URL || "https://api.hypaintelligence.com";

  return {
    define: { __APP_VERSION__: JSON.stringify(version) },
    plugins: [react(), tsconfigPaths(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          secure: true,
        },
      },
      allowedHosts: [
        "hypa-intelligence-web.up.railway.app",
        "hypa-intelligence-production.up.railway.app",
        "intelligence.hypaintelligence.com",
        "hypaintelligence.com",
      ],
    },
  };
});
