# Virtual Comtor

Ứng dụng dịch thuật real-time cho cuộc họp Nhật-Việt, hỗ trợ nhận diện người nói và AI tóm tắt cuộc họp.

## ✨ Tính năng chính

- 🎤 **Dịch thuật real-time** — Soniox STT (ja↔vi), diarization, language identification
- 👥 **Nhận diện người nói** — Tự động phân biệt "Customer 1", "Our 2" theo ngôn ngữ
- 🤖 **AI Meeting Summary** — Tóm tắt cuộc họp bằng GPT-4o-mini (vi/en/ja)
- 🔐 **E2EE** — Ghi âm mã hóa client-side (AES-256-GCM)
- 📊 **Export** — Xuất transcript CSV/XLSX
- 🌐 **Đa ngôn ngữ** — UI hỗ trợ 🇻🇳 Tiếng Việt, 🇺🇸 English, 🇯🇵 日本語
- 🌙 **Dark theme** — Industrial Dark design, tối ưu cho phòng họp

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| UI | ShadCN/ui + Tailwind CSS 4 |
| Database | MongoDB 7 + Mongoose |
| Auth | JWT (jose) + bcryptjs |
| STT | Soniox (WebSocket) |
| AI Summary | OpenAI GPT-4o-mini |
| Encryption | Web Crypto API (AES-256-GCM) |
| Testing | Vitest + React Testing Library |
| Deploy | Docker + Docker Compose |

## 📋 Tài liệu

- [Architecture](architecture.md) — Kiến trúc, data models, luồng xử lý
- [Tech Stack](tech-stack.md) — Chi tiết công nghệ, cấu hình
- [Implementation Plan](implementation_plan.md) — Kế hoạch triển khai theo phase
- [Testing Strategy](testing-strategy.md) — Chiến lược testing, kết quả

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (cho MongoDB)
- Soniox API key ([console.soniox.com](https://console.soniox.com))
- OpenAI API key (cho AI summary)

### Local Development

```bash
# 1. Clone & install
git clone <repo-url>
cd virtual_comtor
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env — fill in API keys

# 3. Start MongoDB
docker compose up mongodb mongo-express -d

# 4. Start dev server
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

### Docker (Production)

```bash
docker compose up --build -d
```

## 🧪 Tests

```bash
# Run all tests
npm test

# Run once (CI mode)
npm run test:run

# With coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

**Status**: 152 tests passing (15 test files)

## 📁 Project Structure

```
src/
├── app/           # Next.js App Router (pages + API routes)
├── features/      # Feature modules (auth, projects, meetings, translation)
├── components/    # Shared UI components (ShadCN)
├── services/      # Business logic (server-side)
├── repositories/  # Data access layer
├── models/        # Mongoose schemas
├── validations/   # Zod schemas
├── lib/           # Utilities (db, auth, crypto, i18n, storage)
├── types/         # Shared TypeScript types
└── proxy.ts       # Auth guard (Next.js 16 proxy)
```
