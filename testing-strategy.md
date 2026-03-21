# Virtual Comtor — Testing Strategy

## Tech Stack Testing

| Tool | Mục đích | Layer |
|---|---|---|
| **Vitest** | Unit & integration tests | Backend + Frontend |
| **React Testing Library** | Component tests | Frontend |
| **MSW (Mock Service Worker)** | Mock API calls trong tests | Frontend |
| **Playwright** | End-to-end tests | Full stack |
| **mongodb-memory-server** | In-memory MongoDB cho tests | Backend |

### Cài đặt

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event msw mongodb-memory-server \
  @playwright/test @vitejs/plugin-react jsdom
```

---

## Cấu trúc file test

```
src/
├── repositories/
│   ├── user.repository.ts
│   └── __tests__/
│       └── user.repository.test.ts
├── services/
│   ├── auth.service.ts
│   └── __tests__/
│       └── auth.service.test.ts
├── features/
│   └── translation/
│       ├── hooks/
│       │   ├── useSpeakerMapping.ts
│       │   └── __tests__/
│       │       └── useSpeakerMapping.test.ts
│       ├── helpers/
│       │   ├── speakerLabeler.ts
│       │   └── __tests__/
│       │       └── speakerLabeler.test.ts
│       └── components/
│           ├── TranscriptEntry.tsx
│           └── __tests__/
│               └── TranscriptEntry.test.tsx
│
tests/
├── setup.ts                    # Global test setup
├── helpers/
│   ├── db.ts                   # mongodb-memory-server helper
│   └── mocks.ts                # Shared mock factories
└── e2e/
    ├── auth.spec.ts
    ├── project-crud.spec.ts
    ├── meeting-flow.spec.ts
    └── translation.spec.ts
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
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/app/**', 'src/components/ui/**'],
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

## Testing theo Layer

### 1. Repository Tests

> Test data access thuần túy, dùng `mongodb-memory-server`.

```typescript
// src/repositories/__tests__/user.repository.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, closeTestDB, clearTestDB } from '../../../tests/helpers/db';
import { userRepository } from '../user.repository';

describe('UserRepository', () => {
  beforeAll(async () => await connectTestDB());
  afterAll(async () => await closeTestDB());
  beforeEach(async () => await clearTestDB());

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const user = await userRepository.create({
        email: 'test@example.com',
        password: 'hashedPassword123',
        name: 'Test User',
      });

      expect(user._id).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should reject duplicate email', async () => {
      await userRepository.create({ email: 'a@b.com', password: 'x', name: 'A' });
      await expect(
        userRepository.create({ email: 'a@b.com', password: 'y', name: 'B' })
      ).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should return null for non-existent email', async () => {
      const user = await userRepository.findByEmail('none@test.com');
      expect(user).toBeNull();
    });
  });
});
```

### 2. Service Tests

> Test business logic, mock repository layer.

```typescript
// src/services/__tests__/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth.service';
import { userRepository } from '@/repositories/user.repository';

vi.mock('@/repositories/user.repository');

describe('AuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        _id: 'user123',
        email: 'test@example.com',
        password: '$2b$10$hashedPassword',
        name: 'Test',
      });

      const result = await authService.login('test@example.com', 'password');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw for invalid email', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      await expect(authService.login('bad@email.com', 'pw')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should hash password before saving', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue({ _id: 'new' } as any);

      await authService.register('new@test.com', 'password', 'New User');

      const callArgs = vi.mocked(userRepository.create).mock.calls[0][0];
      expect(callArgs.password).not.toBe('password'); // Should be hashed
    });
  });
});
```

### 3. API Route Tests

> Test HTTP behavior: status codes, validation, response format.

```typescript
// src/app/api/auth/login/__tests__/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { POST } from '../route';
import { authService } from '@/services/auth.service';

vi.mock('@/services/auth.service');

describe('POST /api/auth/login', () => {
  it('should return 400 for missing email', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'test' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should return 200 with tokens for valid login', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: 'at', refreshToken: 'rt', user: { id: '1', name: 'Test' },
    });

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
```

### 4. Helper / Pure Function Tests

> Test deterministic logic — nhanh nhất, dễ viết nhất, nên có nhiều nhất.

```typescript
// src/features/translation/helpers/__tests__/speakerLabeler.test.ts
import { describe, it, expect } from 'vitest';
import { SpeakerLabeler } from '../speakerLabeler';

describe('SpeakerLabeler', () => {
  it('should label first Japanese speaker as Customer 1', () => {
    const labeler = new SpeakerLabeler();
    const label = labeler.getLabel('1', 'ja');
    expect(label).toBe('Customer 1');
  });

  it('should label first Vietnamese speaker as Our 1', () => {
    const labeler = new SpeakerLabeler();
    const label = labeler.getLabel('2', 'vi');
    expect(label).toBe('Our 1');
  });

  it('should increment number for new speakers in same group', () => {
    const labeler = new SpeakerLabeler();
    labeler.getLabel('1', 'ja');
    const label = labeler.getLabel('3', 'ja');
    expect(label).toBe('Customer 2');
  });

  it('should return same label for same speaker on subsequent calls', () => {
    const labeler = new SpeakerLabeler();
    labeler.getLabel('1', 'ja');
    const label = labeler.getLabel('1', 'ja');
    expect(label).toBe('Customer 1');
  });

  it('should use first language to classify mixed-language speaker', () => {
    const labeler = new SpeakerLabeler();
    labeler.getLabel('1', 'ja'); // First seen as Japanese
    const label = labeler.getLabel('1', 'vi'); // Now speaks Vietnamese
    expect(label).toBe('Customer 1'); // Still Customer
  });
});
```

### 5. Hook Tests

> Test custom hooks dùng `renderHook` từ React Testing Library.

```typescript
// src/features/translation/hooks/__tests__/useSpeakerMapping.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeakerMapping } from '../useSpeakerMapping';

describe('useSpeakerMapping', () => {
  it('should map speakers correctly', () => {
    const { result } = renderHook(() => useSpeakerMapping());

    act(() => {
      result.current.assignSpeaker('1', 'ja');
      result.current.assignSpeaker('2', 'vi');
    });

    expect(result.current.getLabel('1')).toBe('Customer 1');
    expect(result.current.getLabel('2')).toBe('Our 1');
    expect(result.current.mapping).toEqual({
      '1': { label: 'Customer 1', language: 'ja' },
      '2': { label: 'Our 1', language: 'vi' },
    });
  });
});
```

### 6. Component Tests

> Test render output + user interactions, mock API calls.

```typescript
// src/features/translation/components/__tests__/TranscriptEntry.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranscriptEntry } from '../TranscriptEntry';

describe('TranscriptEntry', () => {
  const mockEntry = {
    speakerLabel: 'Customer 1',
    language: 'ja' as const,
    originalText: 'こんにちは',
    translatedText: 'Xin chào',
    startMs: 1000,
  };

  it('should render original and translated text', () => {
    render(<TranscriptEntry entry={mockEntry} />);
    expect(screen.getByText('こんにちは')).toBeInTheDocument();
    expect(screen.getByText('Xin chào')).toBeInTheDocument();
  });

  it('should display speaker badge', () => {
    render(<TranscriptEntry entry={mockEntry} />);
    expect(screen.getByText('Customer 1')).toBeInTheDocument();
  });

  it('should show Japanese flag for ja language', () => {
    render(<TranscriptEntry entry={mockEntry} />);
    expect(screen.getByLabelText('Japanese')).toBeInTheDocument();
  });
});
```

### 7. E2E Tests (Playwright)

> Full user flow tests, chạy trên browser thật.

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should register and login', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="email"]', `test-${Date.now()}@e2e.com`);
    await page.fill('[name="password"]', 'TestPass123!');
    await page.fill('[name="confirmPassword"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/login');

    // Login
    await page.fill('[name="email"]', `test-${Date.now()}@e2e.com`);
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL('/login');
  });
});
```

```typescript
// tests/e2e/project-crud.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Project CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login helper
    await page.goto('/login');
    await page.fill('[name="email"]', 'e2e@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should create a new project', async ({ page }) => {
    await page.goto('/projects');
    await page.click('button:has-text("New Project")');
    await page.fill('[name="name"]', 'E2E Project');
    await page.fill('[name="clientName"]', 'Toyota');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=E2E Project')).toBeVisible();
  });
});
```

---

## Mock Patterns

### MongoDB (In-memory)

```typescript
// tests/helpers/db.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

export async function connectTestDB(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function closeTestDB(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
}

export async function clearTestDB(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
```

### Soniox SDK Mock

```typescript
// tests/helpers/mocks.ts
export function createMockSonioxClient() {
  return {
    realtime: {
      start: vi.fn(),
      stop: vi.fn(),
      record: vi.fn(),
      on: vi.fn(),
    },
  };
}

// Usage in tests
vi.mock('@soniox/speech-to-text-web', () => ({
  SonioxClient: vi.fn(() => createMockSonioxClient()),
}));
```

### MediaRecorder Mock

```typescript
// tests/helpers/mocks.ts
export function mockMediaRecorder() {
  const mock = {
    start: vi.fn(),
    stop: vi.fn(),
    ondataavailable: null as any,
    onstop: null as any,
    state: 'inactive',
  };

  global.MediaRecorder = vi.fn(() => mock) as any;
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(new MediaStream()),
  } as any;

  return mock;
}
```

---

## npm Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
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
| **E2E** | Critical paths | Auth, CRUD, translation flow |

---

## Test theo Phase

### Phase 2 (Auth) — ✅ 57 tests passing
- [x] `auth.schema.test.ts` (15 tests) — login/register Zod validation, email normalize, password rules
- [x] `api-response.test.ts` (9 tests) — success, error, validation, unauthorized, notFound, server responses
- [x] `storage.test.ts` (4 tests) — getStoragePath with userId/projectId/meetingId/subdir
- [x] `auth.test.ts` (7 tests) — sign/verify access+refresh tokens, token isolation, invalid tokens
- [x] `translations.test.ts` (22 tests) — key parity across 3 locales, non-empty values, invariants
- [ ] `user.repository.test.ts` — create, findByEmail, duplicate reject (needs MongoDB)
- [ ] `auth.service.test.ts` — login, register, password hashing, token gen (needs mocks)
- [ ] `e2e/auth.spec.ts` — register → login → redirect (Phase 6+)

### Phase 3 (Project & Meeting)
- [ ] `project.repository.test.ts` — CRUD operations
- [ ] `meeting.repository.test.ts` — CRUD + status transitions
- [ ] `project.service.test.ts` — ownership validation
- [ ] `e2e/project-crud.spec.ts` — create/edit/delete project
- [ ] `e2e/meeting-flow.spec.ts` — create meeting in project

### Phase 4 (Translation)
- [ ] `speakerLabeler.test.ts` — labeling logic (Customer/Our)
- [ ] `useSpeakerMapping.test.ts` — hook state management
- [ ] `TranscriptEntry.test.tsx` — render entry correctly
- [ ] `SpeakerBadge.test.tsx` — correct badge color/text

### Phase 5 (Reply)
- [ ] `ReplyButton.test.tsx` — press/release behavior
- [ ] `ReplyPreview.test.tsx` — show VN + JP text, confirm/cancel

### Phase 6 (Recording & Export)
- [ ] `exportHelpers.test.ts` — CSV/XLSX generation
- [ ] `transcript.service.test.ts` — save/retrieve
- [ ] `useAudioRecorder.test.ts` — MediaRecorder lifecycle
