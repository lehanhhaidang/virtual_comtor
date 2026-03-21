# Virtual Comtor — Kiến trúc dự án

## 1. Tổng quan kiến trúc

```mermaid
graph TB
    subgraph "Client (Browser)"
        UI["React UI<br/>(ShadCN + Dark Theme)"]
        SDK["Soniox Web SDK"]
        REC["MediaRecorder API"]
    end

    subgraph "Next.js Server"
        ROUTE["API Routes / Server Actions"]
        SVC["Services (Business Logic)"]
        REPO["Repositories (Data Access)"]
    end

    subgraph "External APIs"
        SONIOX["Soniox Cloud<br/>(WebSocket STT)"]
        ELEVEN["ElevenLabs<br/>(TTS - Phase 2)"]
    end

    subgraph "Infrastructure"
        MONGO[(MongoDB)]
        FS["File System<br/>(Vcomtor/)"]
    end

    UI --> ROUTE
    SDK <--> SONIOX
    REC --> FS
    ROUTE --> SVC
    SVC --> REPO
    REPO --> MONGO
    SVC --> FS
    ROUTE --> SONIOX
```

---

## 2. Cấu trúc thư mục

```
virtual_comtor/
├── docker-compose.yml
├── Dockerfile
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── components.json                 # ShadCN config
│
├── Vcomtor/                        # Data volume (mounted)
│   ├── mongodb/                    # MongoDB data
│   └── storage/                    # User files
│       └── {userId}/
│           └── {projectId}/
│               └── {meetingId}/
│                   ├── audio/      # .webm recordings
│                   ├── transcripts/# .json raw data
│                   └── exports/    # .csv/.xlsx
│
├── src/
│   ├── app/                        # Next.js App Router (mỏng nhất)
│   │   ├── (auth)/                 # Auth group (no layout)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/            # Protected routes group
│   │   │   ├── layout.tsx          # Dashboard layout + auth guard
│   │   │   ├── page.tsx            # Dashboard home
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx        # Project list
│   │   │   │   └── [projectId]/
│   │   │   │       ├── page.tsx    # Project detail + meeting list
│   │   │   │       └── meetings/
│   │   │   │           └── [meetingId]/
│   │   │   │               └── page.tsx  # Meeting room (live)
│   │   │   └── meetings/
│   │   │       └── [meetingId]/
│   │   │           └── review/
│   │   │               └── page.tsx  # Meeting review (after)
│   │   │
│   │   ├── api/                    # API Routes
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   └── refresh/route.ts
│   │   │   ├── projects/
│   │   │   │   ├── route.ts            # GET list, POST create
│   │   │   │   └── [projectId]/
│   │   │   │       ├── route.ts        # GET, PUT, DELETE
│   │   │   │       └── meetings/
│   │   │   │           └── route.ts    # GET list, POST create
│   │   │   ├── meetings/
│   │   │   │   └── [meetingId]/
│   │   │   │       ├── route.ts        # GET, PUT, DELETE
│   │   │   │       ├── transcript/route.ts  # GET/POST transcript
│   │   │   │       ├── audio/route.ts       # POST upload audio
│   │   │   │       └── export/route.ts      # GET export CSV/XLSX
│   │   │   └── soniox/
│   │   │       └── temp-key/route.ts   # POST get temp API key
│   │   │
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css             # Global + dark theme CSS vars
│   │
│   ├── features/                   # Feature-based organization
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   └── authApi.ts
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── projects/
│   │   │   ├── api/
│   │   │   │   └── projectApi.ts
│   │   │   ├── components/
│   │   │   │   ├── ProjectList.tsx
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   └── CreateProjectDialog.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useProjects.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── meetings/
│   │   │   ├── api/
│   │   │   │   └── meetingApi.ts
│   │   │   ├── components/
│   │   │   │   ├── MeetingList.tsx
│   │   │   │   ├── MeetingCard.tsx
│   │   │   │   └── CreateMeetingDialog.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useMeetings.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   └── translation/            # ⭐ Core feature
│   │       ├── api/
│   │       │   └── translationApi.ts
│   │       ├── components/
│   │       │   ├── MeetingRoom.tsx       # Main container
│   │       │   ├── TranscriptPanel.tsx   # Scrollable transcript
│   │       │   ├── TranscriptEntry.tsx   # Single transcript line
│   │       │   ├── SpeakerBadge.tsx      # "Customer 1" / "Our 2"
│   │       │   ├── LanguageBadge.tsx     # 🇯🇵 / 🇻🇳
│   │       │   ├── MeetingControls.tsx   # Start/Stop/Record
│   │       │   ├── ReplyButton.tsx       # Push-to-talk
│   │       │   └── ReplyPreview.tsx      # Preview + confirm
│   │       ├── hooks/
│   │       │   ├── useSonioxRealtime.ts  # WebSocket management
│   │       │   ├── useTranscript.ts      # Transcript state
│   │       │   ├── useSpeakerMapping.ts  # Speaker → label logic
│   │       │   ├── useAudioRecorder.ts   # MediaRecorder hook
│   │       │   └── useReplyRecorder.ts   # Reply recording
│   │       ├── helpers/
│   │       │   ├── speakerLabeler.ts     # Assign Customer/Our labels
│   │       │   ├── transcriptFormatter.ts# Format for display
│   │       │   └── exportHelpers.ts      # CSV/XLSX generation
│   │       ├── types/
│   │       │   └── index.ts
│   │       └── index.ts
│   │
│   ├── components/                 # Shared/reusable UI components
│   │   ├── ui/                     # ShadCN components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── AppSidebar.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── AuthGuard.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── services/                   # Business logic (server-side)
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── project.service.ts
│   │   ├── meeting.service.ts
│   │   ├── transcript.service.ts
│   │   └── soniox.service.ts
│   │
│   ├── repositories/              # Data access layer
│   │   ├── user.repository.ts
│   │   ├── project.repository.ts
│   │   ├── meeting.repository.ts
│   │   └── transcript.repository.ts
│   │
│   ├── models/                    # Mongoose models
│   │   ├── User.ts
│   │   ├── Project.ts
│   │   ├── Meeting.ts
│   │   └── TranscriptEntry.ts
│   │
│   ├── validations/               # Zod schemas
│   │   ├── auth.schema.ts
│   │   ├── project.schema.ts
│   │   └── meeting.schema.ts
│   │
│   ├── lib/                       # Utilities & SDK init
│   │   ├── db.ts                  # MongoDB connection singleton
│   │   ├── auth.ts                # JWT helpers (sign, verify)
│   │   ├── soniox.ts             # Soniox config
│   │   ├── storage.ts            # File system helpers
│   │   ├── i18n/                 # Internationalization
│   │   │   ├── types.ts          # TranslationSet interface
│   │   │   ├── vi.ts             # 🇻🇳 Tiếng Việt
│   │   │   ├── en.ts             # 🇺🇸 English
│   │   │   ├── ja.ts             # 🇯🇵 日本語
│   │   │   └── index.tsx         # I18nProvider + useI18n hook
│   │   └── api-response.ts       # Standardized API responses
│   │
│   ├── proxy.ts                  # Next.js 16 proxy (auth guard)
│   │
│   └── types/                     # Shared TypeScript types
│       ├── auth.types.ts
│       ├── api.types.ts
│       ├── meeting.types.ts
│       └── transcript.types.ts
```

---

## 3. Data Models (MongoDB)

### User
```typescript
interface IUser {
  _id: ObjectId;
  email: string;
  password: string;        // bcrypt hashed
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Project
```typescript
interface IProject {
  _id: ObjectId;
  userId: ObjectId;        // ref: User
  name: string;
  description?: string;
  clientName?: string;     // Tên khách hàng Nhật
  createdAt: Date;
  updatedAt: Date;
}
```

### Meeting
```typescript
interface IMeeting {
  _id: ObjectId;
  projectId: ObjectId;     // ref: Project
  userId: ObjectId;        // ref: User
  title: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  startedAt?: Date;
  endedAt?: Date;
  audioPath?: string;      // Path to audio file
  speakerMapping: {        // Speaker ID → label mapping
    [speakerId: string]: {
      label: string;       // "Customer 1", "Our 2"
      language: 'ja' | 'vi';
    };
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### TranscriptEntry
```typescript
interface ITranscriptEntry {
  _id: ObjectId;
  meetingId: ObjectId;     // ref: Meeting
  speakerId: string;       // Soniox speaker ID ("1", "2", ...)
  speakerLabel: string;    // "Customer 1", "Our 2"
  language: 'ja' | 'vi';
  originalText: string;    // Văn bản gốc
  translatedText: string;  // Bản dịch
  startMs: number;         // Timestamp bắt đầu
  endMs: number;           // Timestamp kết thúc
  confidence: number;      // 0-1
  isReply: boolean;        // true nếu là reply từ phía Việt
  createdAt: Date;
}
```

---

## 4. Luồng xử lý chính

### 4.1 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Route
    participant SVC as AuthService
    participant REPO as UserRepository
    participant DB as MongoDB

    U->>FE: Submit login form
    FE->>API: POST /api/auth/login {email, password}
    API->>API: Validate (Zod)
    API->>SVC: authService.login(email, password)
    SVC->>REPO: userRepository.findByEmail(email)
    REPO->>DB: User.findOne({email})
    DB-->>REPO: user document
    REPO-->>SVC: user
    SVC->>SVC: bcrypt.compare(password, user.password)
    SVC->>SVC: Generate JWT (access + refresh)
    SVC-->>API: {accessToken, refreshToken, user}
    API-->>FE: Set httpOnly cookies + response
    FE->>FE: Redirect to dashboard
```

### 4.2 Real-time Translation Flow

```mermaid
sequenceDiagram
    participant MIC as 🎤 Microphone
    participant APP as React App
    participant HOOK as useSonioxRealtime
    participant SONIOX as Soniox WebSocket
    participant LABEL as useSpeakerMapping
    participant DB as MongoDB

    Note over APP: User clicks "Start Meeting"
    APP->>APP: GET /api/soniox/temp-key
    APP->>HOOK: Initialize with temp key

    HOOK->>SONIOX: WebSocket connect<br/>{ja↔vi, diarization, lang-id}
    MIC->>HOOK: Audio stream (getUserMedia)
    HOOK->>SONIOX: Binary audio frames

    loop Mỗi response từ Soniox
        SONIOX-->>HOOK: {tokens: [{text, speaker, language, ...}]}
        HOOK->>LABEL: Classify speaker
        Note over LABEL: speaker "1" + lang "ja" → "Customer 1"<br/>speaker "3" + lang "vi" → "Our 1"
        LABEL-->>APP: TranscriptEntry with labels
        APP->>APP: Render in TranscriptPanel
    end

    Note over APP: User clicks "End Meeting"
    HOOK->>SONIOX: Close WebSocket
    APP->>DB: Save all transcript entries
```

### 4.3 Speaker Labeling Logic

```
Input: speaker_id (từ Soniox), language (từ Soniox)

Logic:
1. Nếu language === "ja" → nhóm "Customer"
2. Nếu language === "vi" → nhóm "Our"
3. Trong mỗi nhóm, đánh số theo thứ tự xuất hiện
   - Speaker ID "1" nói tiếng Nhật đầu tiên → "Customer 1"
   - Speaker ID "3" nói tiếng Nhật → "Customer 2"
   - Speaker ID "2" nói tiếng Việt → "Our 1"
4. Mapping được lưu trong meeting.speakerMapping
5. Một speaker có thể nói cả 2 ngôn ngữ → dùng ngôn ngữ đầu tiên để classify
```

---

## 5. Coding Standards

### Backend (Server-side)

| Rule | Detail |
|---|---|
| **API Route** | Mỏng nhất: validate → gọi service → trả response |
| **Service** | Business logic thuần túy, không biết DB driver |
| **Repository** | Tất cả DB queries tập trung ở đây |
| **Validation** | Zod schema, validate ở API route level |
| **Error handling** | Custom error classes, catch ở API route |
| **Response format** | Chuẩn hóa: `{ success, data, error, message }` |

### Frontend (Client-side)

| Rule | Detail |
|---|---|
| **Feature-based** | Domain logic trong `features/`, shared UI trong `components/` |
| **Component size** | Max 300 lines, split nếu lớn hơn |
| **Hooks** | Custom hooks cho logic, không để logic trong component |
| **Data fetching** | TanStack Query (`useQuery`, `useMutation`) |
| **Type safety** | Strict TypeScript, no `any`, explicit return types |
| **Import** | `@/` cho src root, tương đối cho cùng feature |
| **Naming** | PascalCase components, camelCase utils/hooks |
| **Export** | Named + default export cho components |

### Component Structure Order
1. Imports
2. Types / Props interface
3. Component definition
4. Hooks
5. Derived values (`useMemo`)
6. Handlers (`useCallback`)
7. Render (JSX)
8. Default export

---

## 6. API Response Format

```typescript
// Thành công
{
  success: true,
  data: { ... },
  message: "Operation successful"
}

// Lỗi
{
  success: false,
  error: "VALIDATION_ERROR",
  message: "Email is required",
  details?: { ... }
}
```

---

## 7. File Storage Convention

```
Vcomtor/storage/{userId}/{projectId}/{meetingId}/
├── audio/
│   └── recording_{timestamp}.webm    # Full meeting audio
├── transcripts/
│   └── transcript_{timestamp}.json   # Raw transcript data
└── exports/
    ├── transcript_{timestamp}.csv
    └── transcript_{timestamp}.xlsx
```

- Audio format: WebM (MediaRecorder default, good quality/size ratio)
- Transcript JSON lưu raw data, bao gồm cả timing + confidence
- Export CSV/XLSX chỉ chứa readable columns: Time, Speaker, Language, Original, Translation
