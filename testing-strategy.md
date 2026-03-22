# Virtual Comtor — Testing Strategy

## Tech Stack Testing

| Tool | Mục đích | Layer |
|---|---|---|
| **Vitest** | Unit & integration tests | Backend + Frontend |
| **React Testing Library** | Component tests | Frontend |
| **jsdom** | DOM environment for tests | Frontend |

### Cài đặt (đã có trong devDependencies)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event @vitejs/plugin-react jsdom
```

---

## Cấu trúc file test

```
src/
├── lib/
│   └── __tests__/
│       ├── api-response.test.ts
│       ├── auth.test.ts
│       ├── crypto.test.ts
│       └── storage.test.ts
├── lib/i18n/
│   └── __tests__/
│       └── translations.test.ts
├── repositories/
│   └── __tests__/
│       └── transcript.repository.test.ts
├── validations/
│   └── __tests__/
│       └── auth.schema.test.ts
├── features/
│   └── translation/
│       ├── hooks/
│       │   └── __tests__/
│       │       ├── useAudioRecorder.test.ts
│       │       ├── useSpeakerMapping.test.ts
│       │       └── useTranscript.test.ts
│       ├── helpers/
│       │   └── __tests__/
│       │       ├── speakerLabeler.test.ts
│       │       └── exportTranscript.test.ts
│       └── components/
│           └── __tests__/
│               ├── LanguageBadge.test.tsx
│               ├── SpeakerBadge.test.tsx
│               └── TranscriptEntryItem.test.tsx
│
tests/
└── setup.ts                    # Global test setup (@testing-library/jest-dom)
```

**Convention**: File test đặt trong `__tests__/` cạnh source file, cùng tên + `.test.ts(x)`.

---

## Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/app/**',
        'src/components/ui/**',
        'src/types/**',
        'src/lib/i18n/vi.ts',
        'src/lib/i18n/en.ts',
        'src/lib/i18n/ja.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

---

## Kết quả tests hiện tại

**152 tests passing across 15 test files** (as of 2026-03-22)

```
 ✓ 15 test files passed
 ✓ 152 tests passed
 Duration: ~4s
```

---

## npm Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## Test Coverage Target

| Layer | Target | Lý do |
|---|---|---|
| **Helpers / Utils** | ≥ 90% | Pure functions, dễ test, logic quan trọng |
| **Services** | ≥ 80% | Business logic core |
| **Repositories** | ≥ 70% | CRUD đơn giản, integration test |
| **Hooks** | ≥ 70% | State logic, side effects |
| **Components** | ≥ 50% | Render + interactions chính |
| **API Routes** | ≥ 60% | Request/response format |

---

## Test theo Phase — Status

### Phase 1 (Foundation)
- [x] `api-response.test.ts` (9 tests) — success, error, validation, unauthorized, notFound, server responses
- [x] `storage.test.ts` (4 tests) — getStoragePath with userId/projectId/meetingId/subdir

### Phase 2 (Auth) — ✅ Tested
- [x] `auth.schema.test.ts` (15 tests) — login/register Zod validation, email normalize, password rules
- [x] `auth.test.ts` (7 tests) — sign/verify access+refresh tokens, token isolation, invalid tokens
- [x] `translations.test.ts` (22 tests) — key parity across 3 locales, non-empty values, invariants

### Phase 4 (Translation) — ✅ Tested
- [x] `speakerLabeler.test.ts` — labeling logic (Customer/Our), mixed language, same speaker
- [x] `useSpeakerMapping.test.ts` — hook state management, speaker mapping
- [x] `useTranscript.test.ts` — transcript accumulation, grouping
- [x] `LanguageBadge.test.tsx` — correct flag display
- [x] `SpeakerBadge.test.tsx` — correct badge color/text
- [x] `TranscriptEntryItem.test.tsx` — render entry correctly

### Phase 6 (Recording & Export) — ✅ Tested
- [x] `exportTranscript.test.ts` — CSV/XLSX generation
- [x] `useAudioRecorder.test.ts` — MediaRecorder lifecycle
- [x] `crypto.test.ts` — E2EE: encryption/decryption, key derivation, key wrapping
- [x] `transcript.repository.test.ts` — createMany, findByMeetingId

### Chưa có tests (Future)
- [ ] `project.repository.test.ts` — CRUD operations
- [ ] `meeting.repository.test.ts` — CRUD + status transitions
- [ ] `project.service.test.ts` — ownership validation
- [ ] `auth.service.test.ts` — login, register, password hashing
- [ ] `openai.service.test.ts` — summary generation
- [ ] `MeetingRoom.test.tsx` — main container rendering
- [ ] E2E tests (Playwright) — authentication, CRUD, translation flows
