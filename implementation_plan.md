# Virtual Comtor — Implementation Plan

Ứng dụng dịch thuật real-time cho cuộc họp Nhật-Việt.

> [!NOTE]
> Xem thêm: [tech-stack.md](file:///C:/Users/PC/.gemini/antigravity/brain/0bebfc04-2465-45fa-9ef2-ea5c462ff2ad/tech-stack.md) và [architecture.md](file:///C:/Users/PC/.gemini/antigravity/brain/0bebfc04-2465-45fa-9ef2-ea5c462ff2ad/architecture.md) để hiểu chi tiết tech stack và kiến trúc.

## User Review Required

> [!IMPORTANT]
> **Soniox API Key**: Cần tạo account tại [console.soniox.com](https://console.soniox.com) để có API key.

> [!WARNING]
> **ElevenLabs TTS**: Chưa implement ở Phase 1-6. Kiến trúc được thiết kế sẵn slot cho TTS ở Phase 7.

---

## Phase 1 — Project Foundation

> Setup Docker, Next.js, MongoDB, ShadCN dark theme, base structure.

### Infrastructure

#### [NEW] `docker-compose.yml`
- Next.js app service (Node 20, port 3000)
- MongoDB 7 service (port 27017)
- Volume: `./Vcomtor/mongodb` → MongoDB data
- Volume: `./Vcomtor/storage` → file storage

#### [NEW] `Dockerfile`
- Multi-stage build (deps → build → production)
- Node 20 Alpine base

#### [NEW] `.env.example`
- Tất cả env vars cần thiết (xem tech-stack.md)

### Next.js Setup

#### [NEW] `src/app/layout.tsx`
- Root layout, ThemeProvider (dark-only), fonts (JetBrains Mono + Noto Sans JP)

#### [NEW] `src/app/globals.css`
- CSS variables cho dark theme (colors, spacing, typography)
- ShadCN dark theme overrides

#### [NEW] `tailwind.config.ts` + `components.json`
- ShadCN config, dark mode class strategy, custom color palette

### Core Libraries

#### [NEW] `src/lib/db.ts`
- MongoDB connection singleton (Mongoose)
- Connection retry logic

#### [NEW] `src/lib/api-response.ts`
- `successResponse()`, `errorResponse()` helper functions
- Standardized response format: `{ success, data, error, message }`

#### [NEW] `src/lib/storage.ts`
- File system helpers
- `ensureDir(userId, projectId, meetingId)`
- `getStoragePath(userId, projectId, meetingId, type)`

### Shared Components

#### [NEW] `src/components/ThemeProvider.tsx`
- next-themes wrapper, dark mode only

#### [NEW] `src/components/LoadingSpinner.tsx`
- Reusable loading indicator

---

## Phase 2 — Authentication

> JWT auth: register, login, middleware, protected routes.

### Models

#### [NEW] `src/models/User.ts`
- Mongoose schema: email (unique), password (hashed), name, timestamps
- Pre-save hook: bcrypt hash password

### Backend Layers

#### [NEW] `src/repositories/user.repository.ts`
- `findByEmail()`, `findById()`, `create()`

#### [NEW] `src/services/auth.service.ts`
- `register(email, password, name)` → validate unique, create user, generate tokens
- `login(email, password)` → verify credentials, generate tokens
- `refreshToken(token)` → verify refresh, issue new access token

#### [NEW] `src/lib/auth.ts`
- `signAccessToken()`, `signRefreshToken()`, `verifyToken()`
- Using `jose` library (Edge-compatible)

#### [NEW] `src/validations/auth.schema.ts`
- Zod schemas: `loginSchema`, `registerSchema`

### API Routes

#### [NEW] `src/app/api/auth/register/route.ts`
- POST: validate → `authService.register()` → set cookies → response

#### [NEW] `src/app/api/auth/login/route.ts`
- POST: validate → `authService.login()` → set cookies → response

#### [NEW] `src/app/api/auth/refresh/route.ts`
- POST: verify refresh token → issue new access token

#### [NEW] `src/middleware.ts`
- Protect routes under `/(dashboard)/`
- Verify access token from cookie
- Redirect to login if invalid

### Frontend

#### [NEW] `src/features/auth/components/LoginForm.tsx`
- Email + password inputs (ShadCN), submit handler
- Dark theme styling

#### [NEW] `src/features/auth/components/RegisterForm.tsx`
- Name + email + password + confirm password

#### [NEW] `src/features/auth/api/authApi.ts`
- `login()`, `register()`, `logout()`, `refreshToken()`

#### [NEW] `src/features/auth/hooks/useAuth.ts`
- User state, login/logout actions

#### [NEW] `src/app/(auth)/login/page.tsx`
- Render LoginForm

#### [NEW] `src/app/(auth)/register/page.tsx`
- Render RegisterForm

---

## Phase 3 — Project & Meeting Management

> CRUD cho projects và meetings, dashboard UI.

### Models

#### [NEW] `src/models/Project.ts`
- userId (ref), name, description, clientName, timestamps

#### [NEW] `src/models/Meeting.ts`
- projectId (ref), userId (ref), title, status, startedAt, endedAt, audioPath, speakerMapping, timestamps

### Backend Layers

#### [NEW] `src/repositories/project.repository.ts`
- `findByUserId()`, `findById()`, `create()`, `update()`, `delete()`

#### [NEW] `src/repositories/meeting.repository.ts`
- `findByProjectId()`, `findById()`, `create()`, `update()`, `delete()`

#### [NEW] `src/services/project.service.ts`
- CRUD + ownership validation

#### [NEW] `src/services/meeting.service.ts`
- CRUD + status management (scheduled → in_progress → completed)

#### [NEW] `src/validations/project.schema.ts` + `meeting.schema.ts`
- Zod schemas

### API Routes

#### [NEW] `src/app/api/projects/route.ts`
- GET: list user's projects
- POST: create project

#### [NEW] `src/app/api/projects/[projectId]/route.ts`
- GET, PUT, DELETE

#### [NEW] `src/app/api/projects/[projectId]/meetings/route.ts`
- GET: list meetings for project
- POST: create meeting

#### [NEW] `src/app/api/meetings/[meetingId]/route.ts`
- GET, PUT, DELETE

### Frontend

#### [NEW] `src/features/projects/components/ProjectList.tsx`
- Grid of project cards

#### [NEW] `src/features/projects/components/ProjectCard.tsx`
- Card: name, description, meeting count, created date

#### [NEW] `src/features/projects/components/CreateProjectDialog.tsx`
- Modal form: name, description, client name

#### [NEW] `src/features/meetings/components/MeetingList.tsx`
- List of meetings within a project

#### [NEW] `src/features/meetings/components/MeetingCard.tsx`
- Card: title, status badge, date, duration

#### [NEW] `src/features/meetings/components/CreateMeetingDialog.tsx`
- Modal form: title

#### [NEW] `src/app/(dashboard)/page.tsx`
- Dashboard home: recent projects, recent meetings, stats

#### [NEW] `src/app/(dashboard)/layout.tsx`
- Sidebar navigation + main content area

#### [NEW] `src/components/AppSidebar.tsx`
- Navigation: Dashboard, Projects, (future: Settings)

---

## Phase 4 — Real-time Translation (Core)

> Soniox integration, live transcript, speaker diarization with labeling.

### Backend

#### [NEW] `src/services/soniox.service.ts`
- `createTemporaryKey()` → call Soniox REST API

#### [NEW] `src/app/api/soniox/temp-key/route.ts`
- POST: auth check → generate temp key → return

#### [NEW] `src/lib/soniox.ts`
- Soniox config object (model, languages, features)

### Models

#### [NEW] `src/models/TranscriptEntry.ts`
- meetingId, speakerId, speakerLabel, language, originalText, translatedText, startMs, endMs, confidence, isReply

### Frontend — Translation Feature

#### [NEW] `src/features/translation/hooks/useSonioxRealtime.ts`
**Core hook — quản lý toàn bộ WebSocket lifecycle**
- Request temp API key
- Init Soniox SDK (`SonioxClient`)
- Config: `two_way` translation (ja↔vi), diarization, lang-id
- Stream microphone audio
- Parse token responses
- Emit structured "transcript entry" events
- Cleanup on unmount

#### [NEW] `src/features/translation/hooks/useSpeakerMapping.ts`
**Speaker labeling logic**
- Track first-seen speakers per language group
- Japanese speakers → "Customer 1", "Customer 2", ...
- Vietnamese speakers → "Our 1", "Our 2", ...
- Persist mapping to meeting document

#### [NEW] `src/features/translation/hooks/useTranscript.ts`
- Accumulate transcript entries
- Auto-group tokens into sentences
- Support for non-final → final token updates

#### [NEW] `src/features/translation/components/MeetingRoom.tsx`
**Main meeting room container**
- Layout: TranscriptPanel (top 80%) + Controls (bottom 20%)
- Connect hooks: useSonioxRealtime, useSpeakerMapping, useTranscript

#### [NEW] `src/features/translation/components/TranscriptPanel.tsx`
- Scrollable list of `TranscriptEntry` components
- Auto-scroll to bottom on new entries
- Visual distinction: Japanese (warm gold text), Vietnamese (mint text)

#### [NEW] `src/features/translation/components/TranscriptEntry.tsx`
- Single transcript line:
  - `[Speaker Badge] [Lang Badge] Original text`
  - `↳ Translation text (muted color)`

#### [NEW] `src/features/translation/components/SpeakerBadge.tsx`
- "Customer 1" (orange) / "Our 2" (blue)
- Tooltip with Soniox speaker ID

#### [NEW] `src/features/translation/components/LanguageBadge.tsx`
- 🇯🇵 or 🇻🇳 icon badge

#### [NEW] `src/features/translation/components/MeetingControls.tsx`
- Start Meeting / End Meeting buttons
- Status indicator (recording, connected, etc.)

#### [NEW] `src/app/(dashboard)/projects/[projectId]/meetings/[meetingId]/page.tsx`
- Render MeetingRoom component

---

## Phase 5 — Reply Feature

> Push-to-talk recording, Vietnamese → Japanese preview, confirm flow.

#### [NEW] `src/features/translation/hooks/useReplyRecorder.ts`
- Riêng biệt với main transcript stream
- Khi nhấn Reply: tạo session Soniox mới (chỉ vi→ja)
- Thu âm → STT → hiển thị preview
- Khi confirm: thêm entry vào transcript (marked `isReply: true`)

#### [NEW] `src/features/translation/components/ReplyButton.tsx`
- Press & hold: ghi âm
- Release: dừng ghi, chờ kết quả
- Disabled khi meeting chưa start
- Microphone animation khi đang ghi

#### [NEW] `src/features/translation/components/ReplyPreview.tsx`
- Hiển thị:
  - Vietnamese text (original)
  - Japanese text (translated)
- Buttons: ✅ Confirm (add to transcript) / ❌ Cancel / 🔄 Re-record
- (Phase 7: + 🔊 Play Japanese audio via TTS)

---

## Phase 6 — Ghi âm & Export

> Audio recording, transcript persistence, CSV/XLSX export.

### Audio Recording

#### [NEW] `src/features/translation/hooks/useAudioRecorder.ts`
- MediaRecorder API
- Start/stop khi meeting start/stop
- Output: WebM blob
- Upload to server on meeting end

#### [NEW] `src/app/api/meetings/[meetingId]/audio/route.ts`
- POST: receive audio blob → save to `Vcomtor/storage/`

### Transcript Persistence

#### [NEW] `src/repositories/transcript.repository.ts`
- `createMany(entries)`, `findByMeetingId()`, `deleteByMeetingId()`

#### [NEW] `src/services/transcript.service.ts`
- `saveTranscript(meetingId, entries)` → bulk create
- `getTranscript(meetingId)` → return formatted entries

#### [NEW] `src/app/api/meetings/[meetingId]/transcript/route.ts`
- POST: save transcript entries
- GET: retrieve transcript

### Export

#### [NEW] `src/features/translation/helpers/exportHelpers.ts`
- `exportToCSV(entries)` → CSV string
- `exportToXLSX(entries)` → XLSX buffer (using `xlsx` library)
- Columns: Time, Speaker, Language, Original Text, Translation

#### [NEW] `src/app/api/meetings/[meetingId]/export/route.ts`
- GET `?format=csv` or `?format=xlsx`
- Generate file → return as download

### Meeting Review Page

#### [NEW] `src/app/(dashboard)/meetings/[meetingId]/review/page.tsx`
- View completed meeting transcript
- Play audio recording
- Export buttons (CSV, XLSX)

---

## Phase 7 — Polish & Enhancement (Future)

- [ ] ElevenLabs TTS integration cho reply playback
- [ ] Mobile responsive (meeting room phải hoạt động tốt trên tablet)
- [ ] Error boundaries + reconnect logic cho WebSocket
- [ ] Meeting scheduling (set date/time)
- [ ] Notification khi meeting sắp bắt đầu

---

## Verification Plan

### Phase 1 Verification
- `docker compose up` → app chạy tại `localhost:3000`
- MongoDB connected log
- Dark theme render đúng

### Phase 2 Verification
- Register → Login → Redirect to dashboard
- Access `/projects` without login → redirect to `/login`
- JWT refresh flow hoạt động

### Phase 3 Verification
- Create project → appears in list
- Create meeting → appears in project detail
- Edit/delete project/meeting

### Phase 4 Verification (Yêu cầu Soniox API key + mic)
- Start meeting → microphone activated
- Nói tiếng Nhật → hiện transcript + translation
- 2 người nói → phân biệt "Customer 1" / "Customer 2"
- Nói tiếng Việt → hiện "Our 1"

### Phase 5 Verification
- Press Reply → microphone recording
- Nói tiếng Việt → hiện preview VN + JP
- Confirm → entry added to transcript

### Phase 6 Verification
- End meeting → audio file saved in `Vcomtor/storage/`
- Transcript saved to MongoDB
- Export CSV/XLSX → file downloads correctly
- Review page shows transcript + audio player
