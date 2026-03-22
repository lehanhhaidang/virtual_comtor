# Virtual Comtor — Implementation Plan

Ứng dụng dịch thuật real-time cho cuộc họp Nhật-Việt.

> [!NOTE]
> Xem thêm: [tech-stack.md](tech-stack.md) và [architecture.md](architecture.md) để hiểu chi tiết tech stack và kiến trúc.

## Status Overview

| Phase | Tên | Trạng thái |
|-------|-----|-----------|
| 1 | Project Foundation | ✅ Done |
| 2 | Authentication | ✅ Done |
| 3 | Project & Meeting Management | ✅ Done |
| 4 | Real-time Translation (Core) | ✅ Done |
| 5 | Reply Feature | ⬜ Planned |
| 6 | Recording & Export | ✅ Done (E2EE audio + transcript + export) |
| 7 | AI Meeting Summary | ✅ Done |
| 8 | Polish & Enhancement | ⬜ Future |

---

## Phase 1 — Project Foundation ✅

> Setup Docker, Next.js, MongoDB, ShadCN dark theme, base structure.

### Infrastructure

#### `docker-compose.yml`
- Next.js app service (Node 20, port 3000)
- MongoDB 7 service (internal network only)
- mongo-express GUI (localhost:8081 only)
- Volume: `./Vcomtor/mongodb` → MongoDB data
- Volume: `./Vcomtor/storage` → file storage
- Networks: internal (db-only) + external

#### `Dockerfile`
- Multi-stage build (deps → build → production)
- Node 20 Alpine base, standalone output

#### `.env.example`
- Tất cả env vars cần thiết (xem tech-stack.md)

### Next.js Setup

#### `src/app/layout.tsx`
- Root layout, ThemeProvider (dark-only), fonts (JetBrains Mono + Noto Sans JP)

#### `src/app/globals.css`
- CSS variables cho dark theme (colors, spacing, typography)
- ShadCN dark theme overrides

#### `components.json`
- ShadCN config, dark mode class strategy

#### `next.config.ts`
- Standalone output, CSP headers, security headers

### Core Libraries

#### `src/lib/db.ts`
- MongoDB connection singleton (Mongoose)
- Connection retry logic

#### `src/lib/api-response.ts`
- `successResponse()`, `errorResponse()`, `validationError()`, `unauthorizedError()`, `notFoundError()`, `serverError()`
- Standardized response format: `{ success, data, error, message }`

#### `src/lib/storage.ts`
- File system helpers
- `getStoragePath(userId, projectId, meetingId, subdir)`

#### `src/lib/storage-provider.ts`
- `StorageProvider` interface (upload, download, delete, exists)
- `LocalStorageProvider` implementation
- Future: `S3StorageProvider`
- `audioStorageKey()` helper

#### `src/lib/utils.ts`
- `cn()` utility for classnames

### Shared Components

#### `src/components/ThemeProvider.tsx`
- next-themes wrapper, dark mode only

#### `src/components/LoadingSpinner.tsx`
- Reusable loading indicator

#### `src/components/ErrorBoundary.tsx`
- Error boundary component for graceful error handling

#### `src/components/LanguageSwitcher.tsx`
- UI locale switcher (🇻🇳/🇺🇸/🇯🇵)

### UI Components (ShadCN)

#### `src/components/ui/`
- `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `separator.tsx`

---

## Phase 2 — Authentication ✅

> JWT auth: register, login, logout, password change, middleware, protected routes.

### Models

#### `src/models/User.ts`
- Mongoose schema: email (unique), password (hashed), name, timestamps
- Pre-save hook: bcrypt hash password

### Backend Layers

#### `src/repositories/user.repository.ts`
- `findByEmail()`, `findById()`, `create()`, `updatePassword()`

#### `src/services/auth.service.ts`
- `register(email, password, name)` → validate unique, create user, generate tokens
- `login(email, password)` → verify credentials, generate tokens
- `refreshToken(token)` → verify refresh, issue new access token
- `changePassword(userId, currentPassword, newPassword)` → validate + update
- `getCurrentUser(userId)` → return user data

#### `src/lib/auth.ts`
- `signAccessToken()`, `signRefreshToken()`, `verifyAccessToken()`, `verifyRefreshToken()`
- Using `jose` library (Edge-compatible)
- Type: `TokenPayload { userId, email, name }`

#### `src/lib/api-auth.ts`
- `getAuthUser(request)` → extract + verify user from cookies
- `isAuthError(result)` → type guard for Response errors

#### `src/validations/auth.schema.ts`
- Zod schemas: `loginSchema`, `registerSchema`, `changePasswordSchema`

### API Routes

#### `src/app/api/auth/register/route.ts`
- POST: validate → `authService.register()` → set cookies → response

#### `src/app/api/auth/login/route.ts`
- POST: validate → `authService.login()` → set cookies → response

#### `src/app/api/auth/refresh/route.ts`
- POST: verify refresh token → issue new access token

#### `src/app/api/auth/logout/route.ts`
- POST: clear auth cookies

#### `src/app/api/auth/me/route.ts`
- GET: return current user info

#### `src/app/api/auth/change-password/route.ts`
- PUT: validate → change password

#### `src/proxy.ts`
- Protect routes under `/(dashboard)/`, `/projects`, `/meetings`, `/api/projects`, `/api/meetings`, `/api/soniox`
- Verify access token from cookie
- Redirect to login if invalid
- Redirect auth pages to dashboard if already logged in

### Frontend

#### `src/features/auth/components/LoginForm.tsx`
- Email + password inputs (ShadCN), submit handler, dark theme styling

#### `src/features/auth/components/RegisterForm.tsx`
- Name + email + password + confirm password

#### `src/features/auth/api/authApi.ts`
- `login()`, `register()`, `logout()`, `refreshToken()`, `getMe()`, `changePassword()`

#### `src/features/auth/hooks/useAuth.tsx`
- User state, login/logout actions

#### `src/app/(auth)/layout.tsx`
- Auth pages layout

#### `src/app/(auth)/login/page.tsx`
- Render LoginForm

#### `src/app/(auth)/register/page.tsx`
- Render RegisterForm

---

## Phase 3 — Project & Meeting Management ✅

> CRUD cho projects và meetings, dashboard UI.

### Models

#### `src/models/Project.ts`
- userId (ref), name, description, clientName, timestamps

#### `src/models/Meeting.ts`
- projectId (ref), userId (ref), title, status, startedAt, endedAt, audioPath, speakerMapping, timestamps

### Backend Layers

#### `src/repositories/project.repository.ts`
- `findByUserId()`, `findById()`, `create()`, `update()`, `delete()`

#### `src/repositories/meeting.repository.ts`
- `findByProjectId()`, `findById()`, `create()`, `update()`, `delete()`

#### `src/services/project.service.ts`
- CRUD + ownership validation

#### `src/services/meeting.service.ts`
- CRUD + status management (scheduled → in_progress → completed)

#### `src/validations/project.schema.ts` + `meeting.schema.ts`
- Zod schemas

### API Routes

#### `src/app/api/projects/route.ts`
- GET: list user's projects
- POST: create project

#### `src/app/api/projects/[projectId]/route.ts`
- GET, PUT, DELETE

#### `src/app/api/projects/[projectId]/meetings/route.ts`
- GET: list meetings for project
- POST: create meeting

#### `src/app/api/meetings/[meetingId]/route.ts`
- GET, PUT, DELETE

### Frontend

#### `src/features/projects/api/projectApi.ts`
- API client for projects CRUD

#### `src/features/meetings/api/meetingApi.ts`
- API client for meetings CRUD

#### `src/app/(dashboard)/layout.tsx`
- Dashboard layout + AppSidebar

#### `src/app/(dashboard)/dashboard/page.tsx`
- Dashboard home: recent projects, recent meetings, stats

#### `src/app/(dashboard)/projects/page.tsx`
- Project list page

#### `src/app/(dashboard)/projects/[projectId]/page.tsx`
- Project detail + meeting list

#### `src/app/(dashboard)/settings/page.tsx`
- User settings page

#### `src/components/AppSidebar.tsx`
- Navigation: Dashboard, Projects, Settings

---

## Phase 4 — Real-time Translation (Core) ✅

> Soniox integration, live transcript, speaker diarization with labeling.

### Backend

#### `src/lib/soniox.ts`
- Soniox config object (model, languages, features)

#### `src/app/api/soniox/temp-key/route.ts`
- POST: auth check → generate temp key → return

### Models

#### `src/models/TranscriptEntry.ts`
- meetingId, speakerId, speakerLabel, language, originalText, translatedText, startMs, endMs, confidence, isReply

### Frontend — Translation Feature

#### `src/features/translation/hooks/useSonioxRealtime.ts`
**Core hook — quản lý toàn bộ WebSocket lifecycle**
- Request temp API key
- Init Soniox SDK (`SonioxClient`)
- Config: `two_way` translation (ja↔vi), diarization, lang-id
- Stream microphone audio
- Parse token responses
- Emit structured "transcript entry" events
- Cleanup on unmount

#### `src/features/translation/hooks/useSpeakerMapping.ts`
**Speaker labeling logic**
- Track first-seen speakers per language group
- Japanese speakers → "Customer 1", "Customer 2", ...
- Vietnamese speakers → "Our 1", "Our 2", ...
- Persist mapping to meeting document

#### `src/features/translation/hooks/useTranscript.ts`
- Accumulate transcript entries
- Auto-group tokens into sentences
- Support for non-final → final token updates

#### `src/features/translation/helpers/speakerLabeler.ts`
- `SpeakerLabeler` class: assign Customer/Our labels based on language

#### `src/features/translation/components/MeetingRoom.tsx`
**Main meeting room container**
- Layout: TranscriptPanel (top 80%) + Controls (bottom 20%)
- Connect hooks: useSonioxRealtime, useSpeakerMapping, useTranscript

#### `src/features/translation/components/TranscriptPanel.tsx`
- Scrollable list of transcript entries
- Auto-scroll to bottom on new entries
- Visual distinction: Japanese (warm gold text), Vietnamese (mint text)

#### `src/features/translation/components/TranscriptEntryItem.tsx`
- Single transcript line:
  - `[Speaker Badge] [Lang Badge] Original text`
  - `↳ Translation text (muted color)`

#### `src/features/translation/components/SpeakerBadge.tsx`
- "Customer 1" (orange) / "Our 2" (blue)

#### `src/features/translation/components/LanguageBadge.tsx`
- 🇯🇵 or 🇻🇳 icon badge

#### `src/features/translation/components/MeetingControls.tsx`
- Start Meeting / End Meeting buttons
- Status indicator (recording, connected, etc.)

#### `src/app/(dashboard)/meetings/[meetingId]/page.tsx`
- Render MeetingRoom component

---

## Phase 5 — Reply Feature ⬜

> Push-to-talk recording, Vietnamese → Japanese preview, confirm flow.

#### `src/features/translation/hooks/useReplyRecorder.ts` [PLANNED]
- Riêng biệt với main transcript stream
- Khi nhấn Reply: tạo session Soniox mới (chỉ vi→ja)
- Thu âm → STT → hiển thị preview
- Khi confirm: thêm entry vào transcript (marked `isReply: true`)

#### `src/features/translation/components/ReplyButton.tsx` [PLANNED]
- Press & hold: ghi âm
- Release: dừng ghi, chờ kết quả
- Disabled khi meeting chưa start
- Microphone animation khi đang ghi

#### `src/features/translation/components/ReplyPreview.tsx` [PLANNED]
- Hiển thị: Vietnamese text (original), Japanese text (translated)
- Buttons: ✅ Confirm / ❌ Cancel / 🔄 Re-record
- (Future: + 🔊 Play Japanese audio via TTS)

---

## Phase 6 — Recording & Export ✅

> E2EE audio recording, transcript persistence, CSV/XLSX export.

### Audio Recording (E2EE)

#### `src/features/translation/hooks/useAudioRecorder.ts`
- MediaRecorder API
- Start/stop khi meeting start/stop
- Output: WebM blob → encrypted via Web Crypto API

#### `src/features/translation/hooks/useCryptoWorker.ts`
- Web Worker for E2EE operations
- Offloads PBKDF2 key derivation + AES-GCM encryption

#### `src/lib/crypto.ts`
- `generateSalt()`, `deriveWrappingKey()`, `generateDataKey()`
- `wrapDataKey()`, `unwrapDataKey()`
- `encrypt()`, `decrypt()` — AES-256-GCM
- `toBase64()`, `fromBase64()` helpers

#### `src/lib/crypto-worker.ts`
- Web Worker script for crypto operations

#### `src/app/api/meetings/[meetingId]/audio/route.ts`
- POST: receive encrypted audio blob → save via StorageProvider

### Transcript Persistence

#### `src/repositories/transcript.repository.ts`
- `createMany(entries)`, `findByMeetingId()`, `deleteByMeetingId()`

#### `src/services/transcript.service.ts`
- `saveTranscript(meetingId, entries)` → bulk create
- `getTranscript(meetingId)` → return formatted entries

#### `src/app/api/meetings/[meetingId]/transcript/route.ts`
- POST: save transcript entries
- GET: retrieve transcript

### Export

#### `src/features/translation/helpers/exportTranscript.ts`
- `exportToCSV(entries)` → CSV string
- `exportToXLSX(entries)` → XLSX buffer (using `xlsx` library)
- Columns: Time, Speaker, Language, Original Text, Translation

### Meeting Review

#### `src/features/translation/components/TranscriptViewer.tsx`
- View completed meeting transcript in review mode

---

## Phase 7 — AI Meeting Summary ✅

> OpenAI GPT-4o-mini meeting summary generation.

#### `src/services/openai.service.ts`
- `generateMeetingSummary(transcript, locale)` → structured summary
- Output: `{ summary, keyPoints[], actionItems[] }`
- Supports multilingual output (vi/en/ja based on locale)

#### `src/app/api/meetings/[meetingId]/summary/route.ts`
- POST: fetch transcript → generate AI summary → return

#### `src/features/translation/components/MeetingSummary.tsx`
- Display AI-generated summary with key points and action items

---

## Phase 8 — Polish & Enhancement (Future)

- [ ] ElevenLabs TTS integration cho reply playback
- [ ] Reply feature (Phase 5)
- [ ] Mobile responsive (meeting room phải hoạt động tốt trên tablet)
- [ ] Error boundaries + reconnect logic cho WebSocket
- [ ] Meeting scheduling (set date/time)
- [ ] Notification khi meeting sắp bắt đầu
- [ ] S3 storage provider

---

## Verification Plan

### Phase 1 Verification ✅
- `docker compose up` → app chạy tại `localhost:3000`
- MongoDB connected log
- Dark theme render đúng

### Phase 2 Verification ✅
- Register → Login → Redirect to dashboard
- Access `/projects` without login → redirect to `/login`
- JWT refresh flow hoạt động
- Change password, logout working

### Phase 3 Verification ✅
- Create project → appears in list
- Create meeting → appears in project detail
- Edit/delete project/meeting

### Phase 4 Verification ✅ (Yêu cầu Soniox API key + mic)
- Start meeting → microphone activated
- Nói tiếng Nhật → hiện transcript + translation
- 2 người nói → phân biệt "Customer 1" / "Customer 2"
- Nói tiếng Việt → hiện "Our 1"

### Phase 5 Verification ⬜
- Press Reply → microphone recording
- Nói tiếng Việt → hiện preview VN + JP
- Confirm → entry added to transcript

### Phase 6 Verification ✅
- End meeting → encrypted audio file saved via StorageProvider
- Transcript saved to MongoDB
- Export CSV/XLSX → file downloads correctly

### Phase 7 Verification ✅
- Generate summary → AI returns structured summary
- Summary displays with key points and action items
- Multilingual output works (vi/en/ja)
