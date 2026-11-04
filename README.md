# Hypa Intelligence — Local Contest Setup

This guide help you run Hypa Intelligence locally . It covers the API, database, Redis, agent features, and mobile application.

The recommended review path is:

1. Install the project dependencies.
2. Start PostgreSQL and Redis.
3. Configure the API credentials.
4. Apply the Prisma schema and start the API.
5. Configure the mobile app to use the local API.
6. Run the app in a simulator/emulator or on a physical device.
7. Use a physical device for final keyboard validation.

## Table of contents

- [Project components](#project-components)
- [Prerequisites](#prerequisites)
- [1. Clone and install](#1-clone-and-install)
- [2. Start PostgreSQL](#2-start-postgresql)
  - [Option A: Docker PostgreSQL](#option-a-docker-postgresql)
  - [Option B: Local PostgreSQL installation](#option-b-local-postgresql-installation)
- [3. Start Redis](#3-start-redis)
- [4. Configure API environment variables](#4-configure-api-environment-variables)
  - [Required local values](#required-local-values)
  - [Provider keys](#provider-keys)
  - [Which Hypa key is required?](#which-hypa-key-is-required)
  - [How to obtain external provider keys](#how-to-obtain-external-provider-keys)
- [5. Prepare the database](#5-prepare-the-database)
- [6. Start and test the API](#6-start-and-test-the-api)
- [7. Configure the mobile app](#7-configure-the-mobile-app)
- [8. Run in a simulator or emulator](#8-run-in-a-simulator-or-emulator)
- [9. Run on a physical device](#9-run-on-a-physical-device)
- [10. Validate the keyboard](#10-validate-the-keyboard)
- [Useful commands](#useful-commands)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## Project components

| Component | Location | Purpose |
| --- | --- | --- |
| NestJS API | [`apps/hypa-api`](./apps/hypa-api) | Authentication, agent, translation, speech, dictionary, and storage APIs |
| Mobile app | [`apps/hypa-intelligence-mobile`](./apps/hypa-intelligence-mobile) | Expo application and native Hypa Keyboard |
| Shared agent client | [`packages/@hypa-intelligence-core`](./packages/@hypa-intelligence-core) | Streams `/v2/agent` responses |
| Shared configuration | [`packages/@hypa-config`](./packages/@hypa-config) | Model catalog and application configuration |
| On-device keyboard model | [`packages/@hypa-tiny-keys`](./packages/@hypa-tiny-keys) | Downloads the pinned Tiny Keys ONNX model |

## Prerequisites

Install:

- Node.js 22 or newer
- pnpm 11.25.0
- Git
- PostgreSQL compatible with the Prisma version used by this project
- Redis
- Xcode and CocoaPods for iOS development
- Android Studio, Android SDK tools, and a compatible JDK for Android development

The project declares Node.js `>=22` and pnpm `11.25.0` in the root [`package.json`](./package.json).

Verify the JavaScript toolchain:

```bash
node --version
pnpm --version
```

## 1. Clone and install

```bash
git clone https://github.com/hypaai/hypa-meta.git
cd hypa-meta
pnpm install
```

During installation:

- [`apps/hypa-intelligence-mobile/package.json`](./apps/hypa-intelligence-mobile/package.json) runs `generate:nitro`, which invokes Nitrogen in the Lens module and generates native bindings.
- [`packages/@hypa-tiny-keys/package.json`](./packages/@hypa-tiny-keys/package.json) runs `scripts/download-models.ts`, which downloads the pinned Tiny Keys model into [`packages/@hypa-tiny-keys/models`](./packages/@hypa-tiny-keys/models).

If installation fails while compiling native dependencies, install the platform prerequisites listed above and run `pnpm install` again.

## 2. Start PostgreSQL

Choose **one** of the following options. Do not configure both options for the same local database.

<details>
<summary><strong>Expand Docker PostgreSQL setup</strong></summary>

### Option A: Docker PostgreSQL

Use this option if Docker Desktop or Docker Engine is already installed:

```bash
export POSTGRES_PASSWORD='<choose-a-local-password>'
docker volume create hypa-postgres-data
docker run --name hypa-postgres \
  -e POSTGRES_USER=hypa \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -e POSTGRES_DB=hypa-v2 \
  -p 5432:5432 \
  -v hypa-postgres-data:/var/lib/postgresql/data \
  -d postgres
```

If the container already exists, start it instead:

```bash
docker start hypa-postgres
```

Set `POSTGRES_PASSWORD` to the same value used in the Docker command. The matching API connection string is:

```dotenv
DATABASE_URL=postgresql://hypa:<docker-password>@localhost:5432/hypa-v2?schema=public
```

Check the database:

```bash
docker exec hypa-postgres pg_isready -U hypa -d hypa-v2
```

</details>

<details>
<summary><strong>Expand local PostgreSQL setup</strong></summary>

### Option B: Local PostgreSQL installation

Use this option if PostgreSQL is installed directly on the development computer.

On macOS with Homebrew:

```bash
brew services start postgresql
createdb hypa-v2
```

If the database already exists, the `createdb` message can be ignored. Verify access:

```bash
psql postgresql://localhost:5432/hypa-v2 -c 'select 1;'
```

The matching API connection string is:

```dotenv
DATABASE_URL=postgresql://localhost:5432/hypa-v2?schema=public
```

For Windows or Linux, start PostgreSQL using the service manager for the installed distribution, then create a database named `hypa-v2`.

</details>

## 3. Start Redis

Redis is used by the API for caching, queues, and agent-related state.

### Docker Redis

```bash
docker run --name hypa-redis -p 6379:6379 -d redis
```

If the container already exists:

```bash
docker start hypa-redis
```

### Local Redis installation

On macOS with Homebrew:

```bash
brew services start redis
```

Verify Redis:

```bash
redis-cli ping
```

Expected output:

```text
PONG
```

## 4. Configure API environment variables

Create the API environment file:

```bash
cp apps/hypa-api/.env.example apps/hypa-api/.env
```

Open `apps/hypa-api/.env` and set the values appropriate for the PostgreSQL option you selected.

### Required local values

At minimum, configure:

```dotenv
DATABASE_URL=postgresql://localhost:5432/hypa-v2?schema=public
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TLS=false

JWT_SECRET=replace-with-a-long-random-local-secret
ENCRYPTION_KEY=replace-with-a-local-encryption-secret

NODE_ENV=development
BASE_URL=http://localhost:5678
```

For Docker PostgreSQL, replace `DATABASE_URL` with the Docker connection string shown in [Option A](#option-a-docker-postgresql).

### Provider keys

Only configure the providers needed for the review. The default agent flow uses Meta Muse Spark plus Hypa-hosted tools:

| Capability | Environment variable | Required for the default agent review? |
| --- | --- | --- |
| Agent planning (`meta/muse-spark-1.3`) | `META_MODEL_API_KEY` | Yes |
| Hypa-hosted translation, speech, and other tools | `HYPA_API_KEY` | Yes |
| OpenAI models | `OPENAI_API_KEY` | No |
| Google Gemini/Vertex models | `GOOGLE_CLOUD_PROJECT`, `GEMINI_API_KEY` | No |
| RunPod speech/model workloads | `RUNPOD_API_KEY`, `ASR_SEVERLESS_API_KEY` | No |
| Firebase audio/image storage | `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SERVICE_ACCOUNT_JSON` | Optional |
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional |

For the default review path, add:

```dotenv
META_MODEL_API_KEY=<your-meta-provider-key>
HYPA_API_KEY=<paste-the-hypa-api-key-here>
```

The `HYPA_API_KEY` line is intentionally a placeholder. Add the Hypa credential supplied for the contest; do not commit it.

Keep Mansa disabled unless you have a valid Mansa account:

```dotenv
MANSA_MT_ENABLED=false
MANSA_ASR_ENABLED=false
MANSA_TTS_ENABLED=false
```

### Which Hypa key is required?

`HYPA_API_KEY` is **not** a Hugging Face token.

The code uses these credentials for different purposes:

- `HYPA_API_KEY`: authorizes requests from this API to Hypa-hosted model/tool endpoints. Use the Hypa Labs/developer API key provided for the contest.
- `HF_TOKEN`: optionally authenticates the Tiny Keys model download from Hugging Face during dependency installation. It is not a replacement for `HYPA_API_KEY`.

The distinction is visible in:

- [`hypaai.ai.service.ts`](./apps/hypa-api/src/ai/hypaai.ai.service.ts), where `HYPA_API_KEY` is used for Hypa-hosted requests.
- [`download-models.ts`](./packages/@hypa-tiny-keys/scripts/download-models.ts), where `HF_TOKEN` is used only for the Hugging Face download.

For a public Tiny Keys model, `HF_TOKEN` is normally unnecessary. If the download requires authentication, export it before installation:

```bash
export HF_TOKEN=<your-hugging-face-token>
pnpm install
```

### How to obtain external provider keys

Use the provider's official developer console and create a key for local development. Do not use a production key if a separate development key can be created.

| Provider | Where to create the key | Environment variable |
| --- | --- | --- |
| Meta | Meta provider/developer console supplied with the contest access | `META_MODEL_API_KEY` |
| Hypa Labs | Hypa Labs/developer credentials supplied by the project owner or contest organizers | `HYPA_API_KEY` |
| Hugging Face | [Hugging Face Access Tokens](https://huggingface.co/settings/tokens) | `HF_TOKEN` |
| OpenAI | [OpenAI API keys](https://platform.openai.com/api-keys) | `OPENAI_API_KEY` |
| Google Gemini | [Google AI Studio API keys](https://aistudio.google.com/apikey) | `GEMINI_API_KEY` |
| Google Cloud | [Google Cloud Console](https://console.cloud.google.com/) | `GOOGLE_CLOUD_PROJECT` and related credentials |
| RunPod | [RunPod API keys](https://www.runpod.io/console/user/settings) | `RUNPOD_API_KEY` |
| Firebase | [Firebase Console](https://console.firebase.google.com/) | Firebase storage and service-account variables |

API keys may incur provider charges or require an enabled billing account. Review each provider's terms and quotas before creating a key.

## 5. Prepare the database

This repository currently does not include Prisma migration files. Apply the current Prisma schema to the local database:

```bash
pnpm --filter hypa-api exec prisma db push
pnpm --filter hypa-api exec prisma generate
```

`db push` is appropriate for this isolated local review environment. It should not replace a reviewed migration process for production.

## 6. Start and test the API

Start the API from the repository root:

```bash
pnpm --filter hypa-api dev
```

The API listens on `http://localhost:5678`. Keep this terminal running.

Create a local test account:

```bash
curl -sS -X POST http://localhost:5678/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "reviewer@example.com",
    "password": "use-a-local-password",
    "first_name": "Contest",
    "last_name": "Reviewer"
  }'
```

Save the returned token:

```bash
TOKEN='<access_token returned by the API>'
AUTH_HEADER=$(printf 'Authorization: %s %s' 'Bearer' "$TOKEN")
```

Test the streaming agent:

```bash
curl -N -X POST http://localhost:5678/v2/agent \
  -H "$AUTH_HEADER" \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{
    "requestId": "local-agent-test-001",
    "input": "Translate hello into Spanish and briefly explain the translation.",
    "provider": "meta",
    "model": "muse-spark-1.3",
    "surface": "app"
  }'
```

The response should contain `data: ...` Server-Sent Events. This confirms that the API, database, provider credentials, and agent pipeline are connected.

## 7. Configure the mobile app

Create the mobile environment file:

```bash
cp apps/hypa-intelligence-mobile/.env.example apps/hypa-intelligence-mobile/.env
```

Use an API URL reachable from the selected runtime:

| Runtime | `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_LIVE_BASE_URL` |
| --- | --- |
| iOS Simulator | `http://localhost:5678` |
| Android Emulator | `http://10.0.2.2:5678` |
| Physical device | `http://<your-computer-lan-ip>:5678` |

For a physical device, connect the device and computer to the same network and allow inbound TCP traffic on port `5678`. Do not use `localhost` on a physical device.

## 8. Run in a simulator or emulator

Use a simulator or emulator for application-level review:

### iOS Simulator

```bash
pnpm --filter @hypa/intelligence ios
```

### Android Emulator

```bash
pnpm --filter @hypa/intelligence android
```

Confirm that the app launches, authentication works, Chat reaches the local API, and Translate and Dictionary requests complete. Simulators and emulators are not the supported environment for complete keyboard validation.

## 9. Run on a physical device

Use a physical device for end-to-end keyboard review, including keyboard switching, microphone and camera permissions, interaction with other applications, and keyboard-to-app handoff.

1. Connect the device and computer to the same Wi-Fi network.
2. Set both mobile API URLs to the computer's LAN IP.
3. Confirm the API is running and port `5678` is accessible from the device.
4. Build and install the development app:

   ```bash
   pnpm --filter @hypa/intelligence ios
   ```

   or:

   ```bash
   pnpm --filter @hypa/intelligence android
   ```

5. Open Hypa Intelligence and complete its setup checklist.
6. Enable **Hypa Keyboard** in the device keyboard settings:
   - Android: **Settings → System → Keyboard → On-screen keyboard**.
   - iOS: **Settings → General → Keyboard → Keyboards → Add New Keyboard**. Enable **Allow Full Access** when required for network-backed features.
7. Open another application with a text field, switch to Hypa Keyboard, and test the keyboard features.

Operating-system labels vary by version and device manufacturer. The in-app setup screen can open keyboard settings, but the keyboard must still be enabled manually.

## 10. Validate the keyboard

The keyboard functionality should be reviewed on a physical device. Test:

- Switching to Hypa Keyboard from another application.
- Text entry and keyboard actions.
- Agent actions from the keyboard.
- Translation and dictionary actions.
- Microphone permissions and voice input.
- Camera permissions and camera-based flows.
- Returning from the keyboard to the main Hypa app.

If the keyboard is missing, verify that the development build installed successfully, enable Hypa Keyboard in system settings, select it from the keyboard picker, and restart the app.

## Useful commands

| Task | Command |
| --- | --- |
| Start API | `pnpm --filter hypa-api dev` |
| Build iOS app | `pnpm --filter @hypa/intelligence ios` |
| Build Android app | `pnpm --filter @hypa/intelligence android` |
| Check all workspace types | `pnpm check-types` |
| Check API types | `pnpm --filter hypa-api check-types` |
| Check mobile types | `pnpm --filter @hypa/intelligence check-types` |
| Generate Prisma client | `pnpm --filter hypa-api exec prisma generate` |
| Regenerate Lens bindings | `pnpm --filter @hypa/intelligence generate:nitro` |

## Troubleshooting

### The API reports a missing provider key

The default agent model is `meta/muse-spark-1.3`, which requires `META_MODEL_API_KEY`. Agent tools that use Hypa-hosted models require `HYPA_API_KEY`. These are separate credentials.

### The agent connects but tools are unavailable

Use a valid JWT from `/auth/register` or `/auth/login`. If testing anonymously, set `AGENT_ANONYMOUS_USER_ID` to the ID of a local user with a wallet, then restart the API.

### The mobile app cannot reach the API

Check the runtime-specific URL in `apps/hypa-intelligence-mobile/.env`. Use `localhost` only for iOS Simulator, `10.0.2.2` for Android Emulator, and the computer's LAN IP for physical devices.

### The keyboard does not appear

Install a native development build, enable Hypa Keyboard in the system keyboard settings, and select it from the keyboard picker. For iOS, enable **Allow Full Access** when required.

### Native build or generated-code errors

```bash
pnpm install
pnpm --filter @hypa/intelligence generate:nitro
```

Then rebuild the iOS or Android development app.

## Security

- Never commit `.env` files, API keys, passwords, private keys, or Firebase service-account JSON.
- Use local or contest-specific credentials, not production credentials.
- Do not point local development at production PostgreSQL or Redis.
- Rotate a credential immediately if it is exposed.
