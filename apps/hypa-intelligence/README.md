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
- `/chat`: Chat tab (`src/pages/chat`, `src/components/modules/chat`). Text, voice and photos go to `POST /v2/agent` through the shared client in `@hypa/intelligence-core/agent-stream`. There is no sign-in or saved chat history: prior turns and structured tool results are supplied from tab memory until reload or "New chat". The API does not save anonymous conversations. The assistant picker lists `getAssistantModels()` (default Muse Spark 1.3). Tools use Auto unless the prompt asks for a model.
- `/privacy`: privacy policy. `/policy` and `/translate/privacy` redirect here.

Models, languages, and voices come from `packages/@hypa-config/json/models.json`. Translate requests use `@hypa/translate-core`.

## Chat tool activity

Chat shows a quiet tool line above each reply: a shimmering "Transcribing…",
"Translating…" or "Thinking…" while work runs, then a one-line summary such as
"Transcribed, translated" with the step count. It stays
collapsed, including on failures or interruptions, until the user expands it. Expanding it shows a plain
chain of the tools used, each with a short result. Media payloads
and playback links are never shown.
Pictures the agent makes appear under the reply in a grid that adapts to the count
and screen width (up to four tiles, then "+N"); tapping one opens a full-screen
viewer with swipe, arrows and download. The viewer zooms up to 5x (wheel, pinch, double
tap or click, +/- keys or buttons) and pans by drag or arrow keys; it resets for each picture. Each spoken clip gets its own player card
named from its tool call, and playing one pauses the others. A message may create
up to `AGENT_MAX_PICTURES` pictures (see `apps/hypa-api`).
The message area follows streamed replies while pinned to the bottom. Scrolling up
pauses following; scrolling back down, choosing "Jump to latest", or sending a new
message resumes it. Tool disclosures do not change following on their own. Content,
composer and viewport resizing are observed, including mobile keyboard changes.
Following uses instant updates rather than repeated smooth animations.
Previous complete turns, tool traces, voice transcripts and photos are sent as
conversation context from tab memory. The shared API rebuilds tool exchanges and
fits the latest complete turns to the selected model. Transport history is bounded
to 100 messages and 1,000,000 serialized characters; large historical images are
omitted before dropping older complete turns. Reload or "New chat" clears context.

## Chat tests

`yarn workspace hypa-intelligence test` runs the unit tests (chat history and tool
activity). CI runs it with the other workspaces' `yarn test`.

The browser checks open the real page in Chrome and mock every agent response, so
they never call a model. Start the Vite server, then run:

```bash
yarn playwright install chromium
yarn workspace hypa-intelligence test:browser
```

Set `CHROME_BIN` to an existing Chrome executable instead of installing Chromium, or
`CHAT_TEST_URL` for a different local origin. The browser checks cover scrolling, media,
recordings and attached files, and the audio players. CI does not run them.

Generated pictures and audio players appear only after the assistant reply ends.
Pictures reveal first, followed by audio players; reduced-motion preferences
skip the animation. User-uploaded photo thumbnails remain visible immediately.

The composer's plus menu has Upload (images and audio files) and Capture (the
camera). The mic records in place: the row becomes a recording bar with a timer
and moving waveform, Stop adds the take as a "Recording N" card (converted to a 16 kHz mono WAV, because
a phone's WebM has no length and the per-minute speech models reject it; a take stops
at 150 s to stay under 5 MB) and Discard drops it. Photos, recordings and uploaded audio all sit as cards above the text, so a
message can carry several of each. They are sent as `files` on `POST /v2/agent`
(up to 4 files, 5 MB each, 7 MB together; PNG, JPG, WebP, MP3, WAV, M4A, OGG,
FLAC, WebM). The agent receives them as numbered files and decides what to do: it
transcribes a recording with `speech_to_text` (`attachedAudio`) or reads a photo
with `attachedImage`, and nothing is transcribed up front. Hypa Labs still reads
attached files before the model runs. Recordings and uploaded audio are resent in the
conversation history while they fit, numbered across the whole chat, so a later
message can ask for "the second recording"; steps then read "Transcribed Recording 2",
using the names saved on each reply in the order the server numbered them. A failed
turn's recordings are not resent, and a history recording that no longer checks out is
left out instead of failing the new message. Attaching an audio file checks its real
bytes first, so a mislabeled file is refused with a clear message.

Photos are numbered across the chat the same way (`attachedImage`). A model that can
see images (`"vision": true` in `models.json`) keeps getting earlier photos; any other
model gets only "Picture N" notes and can read one with `extract_text_from_image`.

Paste clipboard images into the chat input with Ctrl+V (Cmd+V on macOS). They are
resized and attached like picked photos. Text-only paste and text accompanying a
pasted image keep native input behavior.

Uploaded photo thumbnails in the composer and sent messages open the same
full-screen picture viewer as generated images, including zoom, pan and navigation.

During a response, Send becomes Stop. Stop explicitly cancels the server run,
keeps the partial reply, and returns the composer to Send. Accidental disconnects
still use the existing reconnect flow.
