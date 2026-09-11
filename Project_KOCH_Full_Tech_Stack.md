# 🦠 Project K.O.C.H. — Consolidated Tech Stack Specification

**Kinetic Operator for Culturomics & Handling**

This document consolidates the architecture and Prisma persistence specs into a single, definitive tech stack reference. It reflects only what is stated in the two source documents (`Project_K_O_C_H__README.md` and `prisma.md`) — no new hardware, sensors, or capabilities have been introduced. The hardware footprint is intentionally minimal: a standard laptop/browser camera via `navigator.mediaDevices`, nothing more. The focus throughout is the software layer.

---

## 🎯 Core Problem This Stack Solves

- Over 99% of environmental/human-associated microorganisms cannot be grown under standard lab conditions, requiring multi-factorial growth environments.
- Scientists in high-containment, sterile environments cannot safely interact with keyboards, mice, or touchscreens.
- **Solution:** a hands-free, voice-first AI lab agent with browser-based computer vision and automated data logging.

---

## 🏗️ Four-Layer Architecture

### Layer 1 — Hands-Free Voice & Interaction Edge Pipeline
- Hosted cloud voice agent APIs (LiveKit Cloud or Pipecat Cloud) integrated directly into the browser client, with **AssemblyAI** plugged in as the speech-to-text (STT) engine inside that pipeline.
- Browser-native audio chunking plus cloud-based active noise cancellation to strip lab/equipment noise.
- Low-latency (<500 ms) 3–5 word spoken audio confirmations to keep operator attention focused.

### Layer 2 — Central Orchestration & AI Perception Core
- TanStack state management holds real-time active state for tube IDs, plate coordinates, and experiment timers.
- Heavy computer vision processing is offloaded to cloud vision APIs or WebAssembly (WASM) wrappers, targeting early micro-colony detection.
- Biological pathway database queries run through type-safe server functions to recommend recipe adjustments from growth velocities.

### Layer 3 — Camera Feed & Vision Telemetry Interface
- Live RGB video streamed directly from a connected laptop camera using standard browser media APIs (`navigator.mediaDevices`) — no dedicated or external vision hardware.
- Frame chunks are ingested and buffered over WebSockets managed by the TanStack Start server runtime.
- Voice commands (e.g., "Mark plate 4 well C7") are correlated with visual timestamps and plate coordinate zones.

### Layer 4 — Data Persistence & Automated ELN Engine
- An immutable event stream logs every voice utterance, intent payload, and system state change.
- Post-experiment, server-side TypeScript rendering engines compile structured PDF and Markdown ELN reports automatically.
- Bio-database outputs are standardized into ISA-Tab and JSON for LIMS integration and repository archiving.

---

## ⚡ The All-TypeScript & TanStack Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| Core Language | **TypeScript** | Universal language across frontend, backend server functions, and data pipelines |
| Full-Stack Framework | **TanStack Start** & **TanStack Router** | File-based routing, type-safe server execution (`createServerFn`), streaming SSR, zero platform lock-in via Nitro |
| State & Data Sync | **TanStack Query** | Reactive data caching, background refetching, proxy-based real-time state sync |
| UI & Styling | **Tailwind CSS** | High-density, real-time dark-mode lab dashboard for live camera feeds and telemetry |
| Voice & Vision APIs | **LiveKit / Pipecat Cloud SDKs** (audio transport + noise cancellation) with **AssemblyAI** as the STT engine + hosted Computer Vision REST/WebSocket endpoints | Audio transport, noise cancellation, speech-to-text transcription, image segmentation — no local Python model runtimes |
| Report & Document Engine | **React-PDF** or Node-based PDF generators (inside TanStack server functions) | Compiles automated ELN Markdown/PDF reports |
| Persistence & ELN Storage | **Prisma ORM** + **Turso (SQLite)** or **Supabase (PostgreSQL)** | Schema-first, type-safe data layer for voice intent logs, telemetry metadata, ELN records |

---

## 💎 Prisma Persistence Layer (Layer 4 detail)

- **Integration role:** Prisma is the type-safe ORM bridging server functions to the free-tier edge database (Turso/SQLite or Supabase/PostgreSQL). It handles schema definition, migrations, and type-safe queries for voice intent logs, telemetry metadata, and ELN records — no Python.
- **Why Prisma:**
  1. End-to-end TypeScript type safety, generated straight from `schema.prisma`, keeping biological payloads aligned from database to server functions to frontend.
  2. Runs natively in Node.js/edge runtimes, integrating directly into server execution handlers and route loaders.
  3. Declarative schema modeling and migrations for complex relationships (Experiments → Multi-Well Plates → Telemetry Events), avoiding schema drift.
- **Production best practices:**
  - Singleton Prisma Client instance, globally cached across serverless cold starts, to prevent connection pool exhaustion against Turso/Supabase.
  - Schema-driven validation via `zod-prisma`, auto-generating Zod schemas from `schema.prisma` for search-parameter and mutation validation.
  - Granular payload projection — explicit `select`/`include` clauses to pull only needed fields (well coordinates, timestamp subsets), minimizing payload size and edge memory footprint.

### Persistence tool comparison (as specified)

| Persistence Tool | Philosophy | Why Prisma wins here |
| :--- | :--- | :--- |
| **Prisma ORM** | Schema-first, auto-generated type-safe client, robust migrations | Matches the data architecture's developer experience; flawless type sync for complex lab event logs |
| **Drizzle ORM** | SQL-like query builder, zero-runtime overhead | Smaller bundle size, but Prisma's declarative schema and tooling accelerate structured scientific data modeling |
| **Raw SQL** (`pgtyped`/`node-postgres`) | Direct query execution, manual typing | Avoids abstraction overhead but risks type drift across server actions |
| **TypeORM** | Decorator-based active-record/data-mapper | Heavy configuration, legacy syntax, poor fit for edge-native TypeScript runtimes |

---

## ⚡ Advanced TanStack Production Patterns

### Granular subscription via tracked properties (proxies)
- TanStack Query uses JS Proxies to track which properties of a query result are actually read in a component (e.g., `data` vs `isFetching`/`isStale`).
- **Hidden trap:** rest-destructuring (`const { data, ...rest } = useQuery(...)`) triggers gets on all properties, destroying the proxy optimization and causing unnecessary re-renders.
- **Best practice:** access query properties directly (`query.data`), or lint against rest-destructuring on query hooks.

```ts
export const userQueries = {
  detail: (id: string) => queryOptions({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
  }),
}
```

---

## ⚡ TanStack Efficiency & Code Reduction Patterns

1. **File-Based Routing (TanStack Router):** route tree is generated from file/folder structure — no manual route configs; a new dashboard view is just a new file, fully typed.
2. **Type-Safe Search Parameters:** URL search params are first-class, parsed/serialized/type-checked automatically — no manual `useState` + URL-sync boilerplate for tabs, pagination, filters.
3. **Query Options Factory Pattern:** centralize `queryKey`/fetcher/stale-time into reusable factories shared between router loaders and components — eliminates magic-string duplication.
4. **Server Functions (`createServerFn`):** backend logic lives adjacent to UI code — no separate API routes, client wrappers, or duplicated type definitions.

---

## ⚖️ Why This Stack Wins (as specified)

### TanStack ecosystem vs. traditional SPA + separate backend
Traditional setups pair a frontend with an independent Node/Express or Python/FastAPI backend, needing manual API clients, separate types, and CORS/state complexity. TanStack Start puts `createServerFn` logic adjacent to components, with Zod-validated search params as global state — eliminating the separate API layer.

### Browser-native & cloud APIs vs. local Python runtimes ($0 budget)
Traditional pipelines run local Python/PyTorch CV (YOLO/U-Net) and time-series DBs (InfluxDB) on local servers. This stack offloads AI compute to hosted free-tier cloud APIs and uses `navigator.mediaDevices` for camera ingestion — zero local resource consumption, no Python, no dedicated hardware.

### TanStack Query proxy architecture vs. standard state management
Redux/Context-style global stores re-render broadly on any property change. TanStack Query's proxy-based tracking (only `data`, ignoring `isFetching`) keeps high-frequency live lab feeds fluid without degradation.

---

## 🔩 Hardware Footprint (minimal, as specified)

Per the source documents, the only physical input is a **standard connected laptop camera**, accessed through the browser's native `navigator.mediaDevices` API. No dedicated machine-vision cameras, IoT sensors, microcontrollers, or lab instrumentation are part of this stack — all intelligence (voice, vision, orchestration) runs through hosted software APIs and the browser, keeping the software layer as the sole focus and hardware cost at zero.
