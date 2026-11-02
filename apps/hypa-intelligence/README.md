# Hypa Intelligence web

Web app for Hypa Intelligence, with dictionary, translation and an assistant chat for African languages. Vite + React + HeroUI, deployed on Vercel.

## Develop

```bash
yarn workspace hypa-intelligence dev     # http://localhost:5181
yarn workspace hypa-intelligence build
```

Copy `.env.example` to `.env`. It sets the hypa-api URL and PostHog analytics (leave the key empty to send nothing).

## Layout

- `/`: landing page. "Four tools, one app" is a carousel that shows 3 of the 4 tools at a time on desktop and rotates (paused on hover or focus, off for reduced motion), with swipe on mobile.
- `/dictionary`: dictionary module (`src/pages/dictionary`, `src/components/modules/dictionary`), with languages, search, word, and settings pages
- `/translate`: translate module (`src/pages/translate`), with a settings page
- `/chat`: Chat tab (`src/pages/chat`, `src/components/modules/chat`). Text, voice and photos go to `POST /v2/agent` through the shared client in `@hypa/intelligence-core/agent-stream`. There is no sign-in and no history: a chat lives in memory until reload or "New chat", and the API saves nothing for anonymous turns. The assistant picker lists `getAssistantModels()` (default Muse Spark 1.3). Tools use Auto unless the prompt asks for a model.
- `/privacy`: privacy policy. `/policy` and `/translate/privacy` redirect here.

Models, languages, and voices come from `packages/@hypa-config/json/models.json`. Translate requests use `@hypa/translate-core`.
