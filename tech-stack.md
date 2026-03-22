# Virtual Comtor — Tech Stack

## Core Framework

| Layer         | Technology           | Version | Lý do chọn                                          |
| ------------- | -------------------- | ------- | --------------------------------------------------- |
| **Framework** | Next.js (App Router) | 16.x    | SSR, API routes, proxy (auth guard), server actions |
| **Language**  | TypeScript           | 5.x     | Strict mode, type safety toàn bộ codebase           |
| **Runtime**   | Node.js              | 20 LTS  | Stable, Docker-friendly                             |

---

## Frontend

| Thành phần           | Technology                                   | Ghi chú                                                        |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| **UI Library**       | [ShadCN/ui](https://ui.shadcn.com)           | Component primitives, customizable, dark theme native          |
| **Styling**          | Tailwind CSS 4                               | ShadCN dependency, utility-first, CSS variables cho dark theme |
| **State Management** | React hooks + Context                        | Không cần Redux — state đơn giản, real-time data qua WebSocket |
| **i18n**             | Custom i18n (Context + localStorage)         | 3 ngôn ngữ: 🇻🇳 Tiếng Việt, 🇺🇸 English, 🇯🇵 日本語               |
| **Icons**            | Lucide React                                 | ShadCN default icon set                                        |
| **Fonts**            | Google Fonts (JetBrains Mono + Noto Sans JP) | Hỗ trợ cả Latin + Japanese characters                          |
| **Animation**        | Framer Motion                                | Micro-interactions, transcript entry animations                |

### Design Direction

- **Aesthetic**: _Industrial Dark_ — UI tối, contrast cao, tập trung vào nội dung text
- **Theme**: Dark-only (phù hợp dùng trong phòng họp, giảm mỏi mắt)
- **Color System**:
  - Background: `hsl(220, 20%, 8%)` → gần đen, hơi xanh navy
  - Card/Surface: `hsl(220, 15%, 12%)`
  - Japanese text: `hsl(35, 90%, 65%)` → vàng ấm (dễ đọc kanji)
  - Vietnamese text: `hsl(160, 70%, 55%)` → xanh mint
  - Accent: `hsl(265, 80%, 65%)` → tím cho actions

---

## Backend

| Thành phần     | Technology | Ghi chú                                        |
| -------------- | ---------- | ---------------------------------------------- |
| **Database**   | MongoDB 7  | Document-based, flexible schema cho transcript |
| **ODM**        | Mongoose   | Schema validation, middleware, type support    |
| **Auth**       | JWT (jose) | Stateless auth, access + refresh token         |
| **Validation** | Zod        | Schema validation cho API inputs               |
| **Password**   | bcryptjs   | Hash password                                  |

### Kiến trúc phân tầng (Layered Architecture)

```
Request → Proxy (auth guard) → Route/Action → Service → Repository → DB
```

Mỗi tầng **chỉ biết tầng ngay dưới nó**, không nhảy cóc.

---

## External APIs

### Soniox — Speech-to-Text + Translation

| Feature         | Config                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| **WS Endpoint** | `wss://stt-rt.soniox.com/transcribe-websocket`                        |
| **REST API**    | `https://api.soniox.com/v1`                                           |
| **Model**       | `stt-rt-v4` (latest, Feb 2026)                                        |
| **Translation** | `translation: { type: "two_way", language_a: "ja", language_b: "vi" }` |
| **Diarization** | `enable_speaker_diarization: true`                                     |
| **Language ID** | `enable_language_identification: true`                                 |
| **Temp Key**    | `POST /v1/auth/temporary-api-key` → response: `api_key`               |

> [!IMPORTANT]
> **Soniox WebSocket gotchas:**
> - Connect to bare URL first → send JSON config as **first message** (NOT URL params)
> - PCM: must specify `audio_format: "pcm_s16le"`, `sample_rate`, `num_channels`
> - Translation tokens arrive in **separate WS messages** after original tokens
> - `translation_status: "original"` (NOT `"source"`), `"translation"`, or `"none"`
> - No `enable_streaming_translation` field — `translation` object is sufficient
> - Ref: [Soniox WebSocket API](https://soniox.com/docs/stt/api-reference/websocket-api)

### OpenAI — Meeting Summary (GPT-4o-mini)

| Feature       | Ghi chú                                              |
| ------------- | ---------------------------------------------------- |
| **Model**     | `gpt-4o-mini`                                        |
| **Mục đích**  | Tạo tóm tắt cuộc họp (summary, key points, actions) |
| **Input**     | Plaintext transcript (speaker: text format)          |
| **Output**    | JSON: `{ summary, keyPoints[], actionItems[] }`      |
| **Đa ngôn ngữ** | Output theo locale hiện tại (vi/en/ja)             |

### ElevenLabs — Text-to-Speech (Future, chưa implement)

| Feature      | Ghi chú                               |
| ------------ | ------------------------------------- |
| **SDK**      | `elevenlabs` npm package              |
| **Mục đích** | Phát giọng Nhật từ text reply đã dịch |
| **Trigger**  | Sau khi user confirm reply            |

---

## Security

### E2EE (End-to-End Encryption)

| Feature            | Detail                                                |
| ------------------ | ----------------------------------------------------- |
| **Algorithm**      | AES-256-GCM (Web Crypto API)                         |
| **Key Derivation** | PBKDF2-SHA256, 600,000 iterations (OWASP 2024)       |
| **Key Wrapping**   | AES-KW for protecting data keys                      |
| **Implementation** | `src/lib/crypto.ts` + `src/lib/crypto-worker.ts`     |
| **Scope**          | Audio recordings encrypted client-side before upload |

### Content Security Policy

Configured in `next.config.ts` — includes CSP headers, X-Frame-Options, nosniff.

---

## Infrastructure

### Docker Compose

```yaml
services:
  app:           # Next.js standalone build (port 3000)
  mongodb:       # MongoDB 7 (internal network only, no exposed ports)
  mongo-express: # MongoDB GUI (localhost:8081 only)
```

> [!WARNING]
> - Dockerfile builds **standalone** (`node server.js`) → no `node_modules` in runner
> - Do NOT override CMD with `npm run dev` in docker-compose
> - `.env` uses `localhost` for local dev; docker-compose overrides with `mongodb` hostname
> - MongoDB port is NOT exposed to host — only accessible via Docker internal network

### Data Storage (Volume Mount)

```
Vcomtor/
├── mongodb/               # MongoDB data (volume mount)
└── storage/
    └── {userId}/
        └── {meetingId}/
            └── audio.enc  # E2EE encrypted audio
```

- `StorageProvider` interface (`src/lib/storage-provider.ts`) abstracts storage backend
- Current: `LocalStorageProvider` (filesystem)
- Future: `S3StorageProvider` (AWS S3)
- Switch via `STORAGE_PROVIDER` env variable

---

## Dev & Test Tools

| Tool                      | Mục đích                                |
| ------------------------- | --------------------------------------- |
| **ESLint**                | Linting (Next.js config + custom rules) |
| **Vitest**                | Unit & integration tests                |
| **React Testing Library** | Component tests                         |
| **Docker Compose**        | Local development environment           |
| **Git**                   | Version control                         |

---

## Environment Variables

```env
# MongoDB (localhost for local dev; docker-compose overrides to mongodb://mongodb:27017/...)
MONGODB_URI=mongodb://localhost:27017/virtual_comtor

# Soniox
SONIOX_API_KEY=your_soniox_api_key

# Auth
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OpenAI (meeting summary)
OPENAI_API_KEY=your_openai_api_key

# ElevenLabs (Future)
# ELEVENLABS_API_KEY=your_elevenlabs_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Storage
STORAGE_PATH=./Vcomtor/storage
```
