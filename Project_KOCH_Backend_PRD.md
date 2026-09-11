# Product Requirements Document
## Project K.O.C.H. (Kinetic Operator for Culturomics & Handling) — Backend

**Version:** 1.0
**Status:** Draft for review
**Scope of this PRD:** Backend / server-side systems only. Frontend UI/UX is out of scope except where it defines a contract the backend must satisfy.

---

## 1. Background & Problem Statement

Over 99% of environmental and human-associated microorganisms cannot be cultured under standard lab conditions — they require multi-factorial, tightly monitored growth environments. Operators working in high-containment or sterile environments cannot safely touch keyboards, mice, or touchscreens mid-procedure.

K.O.C.H. is a hands-free, voice-first lab agent: operators speak commands, a browser camera provides visual telemetry, and the system logs everything into an automated Electronic Lab Notebook (ELN). The frontend is a TanStack Start application; **this document specifies the backend that powers it** — the server functions, real-time pipelines, persistence layer, and third-party integrations.

Budget constraint: **$0 infrastructure cost**, achieved via free-tier hosted APIs and edge databases — no self-hosted Python ML runtimes, no dedicated hardware.

---

## 2. Goals

1. Provide a type-safe, low-latency backend for real-time voice-command intake and visual telemetry correlation.
2. Persist an **immutable, auditable event log** of every voice utterance, intent, and system state change.
3. Automatically compile structured ELN reports (PDF + Markdown) and standardized bio-data exports (ISA-Tab, JSON) with zero manual data entry.
4. Keep round-trip latency for spoken confirmations under **500 ms**.
5. Run entirely on serverless/edge infrastructure within free-tier limits (Turso or Supabase, TanStack Start's Nitro-based server functions).

## 3. Non-Goals

- No on-prem or local Python CV/ML model hosting.
- No custom-built ASR/TTS models — STT is provided by AssemblyAI; noise cancellation and audio transport by LiveKit/Pipecat Cloud.
- No dedicated machine-vision hardware integration — camera input is limited to `navigator.mediaDevices` from a standard laptop.
- No support for multi-tenant billing/subscription infrastructure in v1.

---

## 4. Backend Architecture Overview

The backend lives entirely inside **TanStack Start server functions** (`createServerFn`), deployed via Nitro to avoid platform lock-in, plus a WebSocket-capable runtime for streaming ingestion. It corresponds to Layers 2–4 of the overall system:

```
┌─────────────────────────────────────────────────────────────┐
│  Browser Client (out of scope)                               │
│  navigator.mediaDevices → camera frames                      │
│  LiveKit/Pipecat client SDK → mic audio                      │
└───────────────┬───────────────────────────┬──────────────────┘
                │ WebSocket (frames)        │ WebRTC (audio)
                ▼                           ▼
┌─────────────────────────────┐   ┌───────────────────────────┐
│ Layer 3: Ingestion Gateway    │   │ LiveKit / Pipecat Cloud    │
│ - Frame buffer + timestamping │   │  + AssemblyAI STT plugin   │
│ - WS session mgmt (TanStack   │   │  (external, managed)       │
│   Start server runtime)       │   └──────────────┬────────────┘
└───────────────┬───────────────┘                  │ transcript + intent
                │ correlated frame+timestamp        │ webhook/callback
                ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Orchestration & Perception Core                     │
│ - Intent resolution (voice text → structured command)        │
│ - Cloud CV API calls (micro-colony detection)                │
│ - Biological pathway lookups (server functions)              │
└───────────────┬────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Persistence & ELN Engine                             │
│ - Prisma ORM → Turso (SQLite) / Supabase (Postgres)           │
│ - Immutable event stream (append-only)                        │
│ - Report compiler (React-PDF / Node PDF) → PDF + Markdown      │
│ - Export compiler → ISA-Tab + JSON                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Backend Responsibilities by Layer

### 5.1 Layer 2 — Orchestration & Perception Core (backend portion)

| Responsibility | Detail |
| :--- | :--- |
| Intent resolution | Receive transcript text (from AssemblyAI, via LiveKit/Pipecat callback) and resolve it to a structured intent payload (e.g. `{ action: "MARK_WELL", plate: 4, well: "C7" }`) via a server function. |
| Active-state tracking | Maintain server-side source of truth for current tube IDs, plate coordinates, and running experiment timers, synced to the client via TanStack Query. |
| Vision offload | Forward buffered frames to cloud CV endpoints (or WASM wrapper) for micro-colony detection; receive structured detection results, not raw model inference locally. |
| Recipe recommendation | Query a biological pathway database through a type-safe server function; return growth-velocity-based recipe adjustments to the frontend. |

### 5.2 Layer 3 — Ingestion Gateway (backend portion)

| Responsibility | Detail |
| :--- | :--- |
| Frame ingestion | Accept chunked video frames over WebSocket, buffer them server-side (TanStack Start server runtime), discard/rotate buffer per configurable retention window. |
| Timestamp correlation | Tag every ingested frame and every resolved voice intent with a shared monotonic timestamp so a command like "Mark plate 4 well C7" can be matched to the exact frame and plate coordinate zone active at that moment. |
| Backpressure handling | Drop or downsample frames under load rather than blocking the voice pipeline — voice confirmation latency (<500 ms) takes priority over frame completeness. |

### 5.3 Layer 4 — Persistence & Automated ELN Engine

| Responsibility | Detail |
| :--- | :--- |
| Immutable event log | Every voice utterance, resolved intent, and state transition is written as an append-only event row — no updates/deletes on historical rows (corrections are new compensating events, not mutations). |
| Report compilation | Post-experiment server function assembles the event log + telemetry + CV detections into a PDF and Markdown ELN report via React-PDF / Node PDF generators, all server-side. |
| Standardized export | Compile bio-data outputs into ISA-Tab and JSON for LIMS integration and repository archiving. |

---

## 6. Data Model (Prisma Schema — Backend of Record)

This is the authoritative shape for `schema.prisma`. Field lists are representative, not exhaustive; exact types get finalized during implementation.

```prisma
model Experiment {
  id            String   @id @default(cuid())
  name          String
  startedAt     DateTime @default(now())
  endedAt       DateTime?
  status        ExperimentStatus @default(ACTIVE)
  plates        Plate[]
  events        TelemetryEvent[]
  elnReports    ElnReport[]
}

model Plate {
  id            String   @id @default(cuid())
  experimentId  String
  experiment    Experiment @relation(fields: [experimentId], references: [id])
  label         String      // e.g. "Plate 4"
  wells         Well[]
}

model Well {
  id            String   @id @default(cuid())
  plateId       String
  plate         Plate    @relation(fields: [plateId], references: [id])
  coordinate    String   // e.g. "C7"
  events        TelemetryEvent[]
  detections    ColonyDetection[]
}

model TelemetryEvent {
  id            String   @id @default(cuid())
  experimentId  String
  experiment    Experiment @relation(fields: [experimentId], references: [id])
  wellId        String?
  well          Well?    @relation(fields: [wellId], references: [id])
  type          EventType   // VOICE_UTTERANCE | INTENT | FRAME_MARK | STATE_CHANGE
  rawPayload    Json        // transcript, intent object, or state diff
  frameTimestamp DateTime?
  createdAt     DateTime @default(now())
  // append-only: no update/delete paths exposed via server functions
}

model ColonyDetection {
  id            String   @id @default(cuid())
  wellId        String
  well          Well     @relation(fields: [wellId], references: [id])
  detectedAt    DateTime @default(now())
  confidence    Float
  growthVelocity Float?
  cvProvider    String   // which cloud CV endpoint produced this
}

model ElnReport {
  id            String   @id @default(cuid())
  experimentId  String
  experiment    Experiment @relation(fields: [experimentId], references: [id])
  format        ReportFormat // PDF | MARKDOWN | ISA_TAB | JSON
  storageUrl    String
  generatedAt   DateTime @default(now())
}

enum ExperimentStatus {
  ACTIVE
  COMPLETED
  ABORTED
}

enum EventType {
  VOICE_UTTERANCE
  INTENT
  FRAME_MARK
  STATE_CHANGE
}

enum ReportFormat {
  PDF
  MARKDOWN
  ISA_TAB
  JSON
}
```

**Validation:** `zod-prisma` generates Zod schemas from this file for every server-function input/output boundary — no hand-maintained duplicate validators.

**Production practice:** a single cached Prisma Client instance (globally scoped) is reused across serverless invocations to avoid exhausting the Turso/Supabase connection pool on cold starts.

---

## 7. Backend API Surface (Server Functions)

All endpoints are `createServerFn` calls, not a separate REST/GraphQL layer — colocated with route loaders.

| Server Function | Purpose | Input → Output |
| :--- | :--- | :--- |
| `startExperiment` | Create a new experiment record | `{ name }` → `Experiment` |
| `ingestVoiceIntent` | Receive resolved intent from the voice pipeline, persist as event | `{ experimentId, transcript, intent }` → `TelemetryEvent` |
| `ingestFrameMark` | Correlate a buffered frame timestamp with a well/coordinate | `{ experimentId, wellId, frameTimestamp }` → `TelemetryEvent` |
| `requestColonyDetection` | Forward a frame reference to cloud CV, persist result | `{ wellId, frameRef }` → `ColonyDetection` |
| `getRecipeRecommendation` | Query pathway DB for growth-velocity-based adjustments | `{ wellId }` → recommendation payload |
| `getActiveState` | Return current tube IDs, plate coordinates, running timers | `{ experimentId }` → active-state snapshot |
| `endExperiment` | Mark experiment complete, trigger report generation | `{ experimentId }` → `Experiment` |
| `generateElnReport` | Compile PDF/Markdown ELN from event log | `{ experimentId, format }` → `ElnReport` |
| `exportStandardized` | Compile ISA-Tab / JSON export | `{ experimentId, format }` → `ElnReport` |

All inputs/outputs are validated at the boundary via the `zod-prisma`-generated schemas described in §6.

---

## 8. Third-Party Backend Integrations

| Service | Role | Integration point |
| :--- | :--- | :--- |
| **LiveKit Cloud / Pipecat Cloud** | Audio transport (WebRTC), cloud-based active noise cancellation | Client connects directly; backend receives resolved transcript + intent via webhook/callback, not raw audio |
| **AssemblyAI** | Speech-to-text engine, plugged into the LiveKit/Pipecat pipeline | Transcription events arrive at the backend through the same LiveKit/Pipecat callback channel — the backend does not call AssemblyAI directly |
| **Cloud Vision APIs / WASM CV** | Micro-colony detection from frame buffers | Backend server function `requestColonyDetection` forwards frame references and receives structured detections |
| **Biological pathway database** | Recipe/growth recommendation source | Queried via type-safe server function, no direct client access |
| **Turso (SQLite) or Supabase (Postgres)** | Primary datastore | Accessed exclusively through Prisma Client from server functions |

---

## 9. Non-Functional Requirements

| Category | Requirement |
| :--- | :--- |
| Latency | Voice confirmation round-trip (utterance → 3–5 word spoken confirmation) < 500 ms end-to-end, including backend intent resolution |
| Data integrity | Event log is append-only; no destructive updates exposed through any server function |
| Cost | $0 infra spend — free-tier Turso/Supabase, free-tier LiveKit/Pipecat/AssemblyAI/CV API tiers |
| Type safety | End-to-end TypeScript types from `schema.prisma` through server functions to the frontend — no `any` at integration boundaries |
| Auditability | Every ELN report and export is traceable back to the exact set of `TelemetryEvent` rows used to generate it |
| Portability | No platform lock-in — Nitro-based deployment target should be swappable (Vercel, Cloudflare, Node) without server-function rewrites |

---

## 10. Risks & Open Questions

- **Webhook reliability:** if LiveKit/Pipecat → AssemblyAI → backend callback chain drops a transcript event, does the system retry, or does the operator get an audible failure confirmation? Needs a defined fallback.
- **Frame buffer retention:** how long are raw frames retained server-side before rotation, and does that conflict with the "correlate voice command to frame" requirement if a command arrives late?
- **CV provider variability:** `cvProvider` is stored per detection — confirm whether one or multiple CV vendors are in play, since accuracy/cost tradeoffs affect the free-tier budget.
- **Free-tier ceilings:** Turso/Supabase and LiveKit/Pipecat free tiers have connection/usage caps — need concrete usage projections to confirm $0 budget holds at expected experiment volume.

---

## 11. Milestones (Backend)

1. **M1 — Schema & persistence:** finalize `schema.prisma`, Prisma singleton setup, Turso/Supabase provisioning, `zod-prisma` validation wired in.
2. **M2 — Event ingestion:** `ingestVoiceIntent`, `ingestFrameMark` server functions + WebSocket frame gateway.
3. **M3 — Voice pipeline integration:** LiveKit/Pipecat + AssemblyAI callback wired to intent resolution.
4. **M4 — Vision pipeline integration:** `requestColonyDetection` against chosen cloud CV API.
5. **M5 — ELN engine:** `generateElnReport` (PDF/Markdown) and `exportStandardized` (ISA-Tab/JSON).
6. **M6 — Load & latency validation:** confirm <500 ms voice round-trip under realistic frame-ingestion load.
