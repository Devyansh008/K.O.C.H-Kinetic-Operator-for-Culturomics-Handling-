Here is the complete **Project Setup Specification (`project_setup_specification.md`)** for **Project K.O.C.H.** (Kinetic Operator for Culturomics & Handling), followed by the **Claude Code Prompt**.

---

# Project K.O.C.H. — Project Setup & Environment Specification

## 1. Architectural Blueprint
Project K.O.C.H. is a hands-free, voice-first AI lab agent designed for high-containment culturomics environments. It uses browser-native camera feeds (`navigator.mediaDevices`) for visual telemetry, hosted WebRTC voice pipelines (LiveKit/Pipecat Cloud + AssemblyAI) for low-latency speech processing (<500ms), and an automated Electronic Lab Notebook (ELN) engine.

The architecture follows a unified, type-safe full-stack structure:
* **Framework**: TanStack Start & TanStack Router running on the Nitro universal server engine (Node/Bun runtime).
* **Persistence Layer**: Prisma ORM bridging to serverless edge datastores (Turso/SQLite or Supabase/PostgreSQL).
* **Validation & Types**: `zod-prisma` auto-generating Zod schema validators from `schema.prisma` for zero-boilerplate type safety.
* **API Key & Auth Model**: Dedicated environment key management for LiveKit, AssemblyAI, Cloud Vision services, and internal application API key authentication for webhook ingestion endpoints.

---

## 2. Directory & Layout Structure

```text
project-koch/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tsr.config.json
├── project_setup_specification.md
├── Project_KOCH_Backend_PRD.md
├── Project_KOCH_Full_Tech_Stack.md
├── prisma/
│   └── schema.prisma
├── public/
│   └── favicon.ico
├── src/
│   ├── routeTree.gen.ts
│   ├── router.tsx
│   ├── styles.css
│   ├── components/
│   │   ├── ui/
│   │   └── lab/
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   └── utils.ts
│   ├── schemas/
│   │   └── index.ts
│   ├── server/
│   │   ├── functions/
│   │   ├── services/
│   │   └── webhooks/
│   └── routes/
│       ├── __root.tsx
│       ├── index.tsx
│       ├── experiment.tsx
│       └── api/
```

---

## 3. Environment Variables & API Key Architecture (`.env.example`)

The backend requires key management for third-party integrations and internal endpoint security:

```ini
# Core Server Config
NODE_ENV=development
PORT=3000
APP_SECRET=your-app-secret-key-min-32-chars

# Internal System API Keys (For secure server-to-server & ingestion authentication)
KOCH_API_KEY_SECRET=koch_live_sk_sample_secret_key_12345

# Database Connection (Turso / Supabase)
DATABASE_URL="file:./dev.db" # Or "libsql://your-turso-db.turso.io" / "postgresql://..."
TURSO_AUTH_TOKEN="your-turso-auth-token-if-using-turso"

# Voice Pipeline (LiveKit / Pipecat Cloud)
LIVEKIT_API_KEY="your-livekit-api-key"
LIVEKIT_API_SECRET="your-livekit-api-secret"
LIVEKIT_URL="wss://your-project.livekit.cloud"

# Speech-to-Text (AssemblyAI)
ASSEMBLYAI_API_KEY="your-assemblyai-api-key"

# Computer Vision Cloud Integration
CLOUD_VISION_API_KEY="your-cloud-vision-api-key"
CLOUD_VISION_ENDPOINT="https://api.cloudvision.provider/v1/detect"

# Biological Pathway DB Integration
PATHWAY_DB_API_KEY="your-pathway-database-api-key"
```

---

## 4. Dependencies Specification (`package.json`)

### Core Runtime Dependencies
* `@tanstack/react-start` & `@tanstack/react-router` — Full-stack framework & routing.
* `@tanstack/react-query` — Reactive state & server sync.
* `react` & `react-dom` — UI framework.
* `@prisma/client` — Database ORM client.
* `zod` — Schema validation.
* `@livekit/components-react` & `livekit-client` — Audio streaming SDKs.
* `@react-pdf/renderer` — Server-side ELN PDF report generation.
* `clsx` & `tailwind-merge` — UI utility helpers.

### Development Dependencies
* `typescript` & `@types/node` — Type safety.
* `prisma` — Schema management & migrations.
* `zod-prisma-types` (or `zod-prisma`) — Auto-generation of Zod schemas from Prisma.
* `tailwindcss` & `postcss` & `autoprefixer` — Styling engine.
* `vite` — Bundler engine.
```

---