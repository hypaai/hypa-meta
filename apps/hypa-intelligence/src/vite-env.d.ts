/// <reference types="vite/client" />
/// <reference types="@react-three/fiber" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_URL: string;
  readonly VITE_HYPA_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
