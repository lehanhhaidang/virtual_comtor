# End-to-End Encryption (E2EE) — Data Flow Documentation

## 1. Bối cảnh & Tại sao cần E2EE

Virtual Comtor là ứng dụng dịch thuật cuộc họp real-time giữa khách hàng Nhật và đội ngũ Việt Nam. Dữ liệu cuộc họp (biên bản, ghi âm) chứa **thông tin nhạy cảm** về dự án, khách hàng, chiến lược kinh doanh.

### Vấn đề với mô hình truyền thống

| Mô hình | Rủi ro |
|---------|--------|
| Server lưu plaintext | DB bị hack → lộ toàn bộ nội dung cuộc họp |
| Mã hóa server-side | Server giữ key → admin/attacker truy cập server = đọc được hết |
| HTTPS only | Chỉ bảo vệ đường truyền, không bảo vệ data tại rest |

### Giải pháp: End-to-End Encryption

> **Nguyên tắc:** Server chỉ lưu dữ liệu đã mã hóa. Key giải mã chỉ tồn tại trên thiết bị của user. Ngay cả admin hệ thống cũng không đọc được.

---

## 2. Lợi ích

- **Zero-knowledge server**: Server không bao giờ thấy plaintext
- **Database breach protection**: DB bị dump → attacker chỉ thấy ciphertext vô nghĩa
- **Compliance**: Đáp ứng yêu cầu bảo mật dữ liệu khách hàng Nhật (rất nghiêm ngặt)
- **Trust**: User tin tưởng hệ thống vì chỉ họ mới truy cập được data
- **Selective deletion**: User xóa key = data trở thành vô giá trị vĩnh viễn

---

## 3. Các loại dữ liệu được mã hóa

| Dữ liệu | Nơi lưu | Mã hóa? | Ghi chú |
|----------|---------|---------|---------|
| Transcript (originalText) | MongoDB | ✅ AES-256-GCM | Từng entry mã hóa riêng |
| Transcript (translatedText) | MongoDB | ✅ AES-256-GCM | Từng entry mã hóa riêng |
| Audio recording | Local Storage (`Vcomtor/storage/`) | ✅ AES-256-GCM | Toàn bộ blob mã hóa |
| Data Key (AES-256) | MongoDB | ✅ AES-KW wrapped | Wrapped bằng password-derived key |
| Key Salt (PBKDF2) | MongoDB | ❌ Plaintext | Salt không cần bảo mật, mỗi user 1 salt riêng |
| Email, Name | MongoDB | ❌ Plaintext | Không phải dữ liệu cuộc họp |
| Password | MongoDB | ❌ Hashed (bcrypt) | Không lưu plaintext |

---

## 4. Kiến trúc Key Management

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│                                                          │
│  Password ──► PBKDF2(600K iterations, salt) ──► Wrapping Key   │
│                                                          │
│  Wrapping Key ──► unwrap(encryptedDataKey) ──► Data Key  │
│                                                          │
│  Data Key ──► AES-256-GCM encrypt/decrypt ──► Plaintext  │
│                                                          │
│  Data Key lưu IndexedDB (persist qua F5)                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    SERVER / DATABASE                      │
│                                                          │
│  Chỉ lưu:                                               │
│  - encryptedDataKey (wrapped, không giải được nếu        │
│    không có password)                                    │
│  - keySalt (public, mỗi user riêng)                     │
│  - Ciphertext (transcript + audio đã mã hóa)            │
│                                                          │
│  ⛔ KHÔNG CÓ: plaintext, password, data key             │
└─────────────────────────────────────────────────────────┘
```

### Thuật toán sử dụng

| Mục đích | Thuật toán | Chi tiết |
|----------|-----------|----------|
| Derive key từ password | PBKDF2-SHA256 | 600,000 iterations, 16-byte salt |
| Wrap/Unwrap data key | AES-KW (Key Wrap) | 256-bit |
| Encrypt/Decrypt data | AES-256-GCM | Random 12-byte IV, auth tag |
| Hash password | bcrypt | Server-side, cho authentication |

---

## 5. Luồng xử lý chi tiết

### 5.1. Đăng ký (Register)

```
[Client]
1. User nhập name, email, password
2. generateSalt()          → salt (16 bytes random)
3. deriveWrappingKey(password, salt) → wrappingKey (PBKDF2)
4. generateDataKey()       → dataKey (AES-256, random)
5. wrapDataKey(dataKey, wrappingKey) → encryptedDataKey (AES-KW)
6. POST /api/auth/register { name, email, password, encryptedDataKey, keySalt }

[Server]
7. Hash password (bcrypt)
8. Lưu { name, email, hashedPassword, encryptedDataKey, keySalt } vào MongoDB
9. Trả về user info
```

**Lưu ý:** Server nhận `encryptedDataKey` nhưng **không có password gốc** (chỉ có hash) → không giải wrap được.

### 5.2. Đăng nhập (Login)

```
[Client]
1. User nhập email, password
2. POST /api/auth/login { email, password }

[Server]
3. Tìm user, so sánh bcrypt hash
4. Trả về { user, encryptedDataKey, keySalt }

[Client]
5. deriveWrappingKey(password, keySalt) → wrappingKey
6. unwrapDataKey(encryptedDataKey, wrappingKey) → dataKey
7. Lưu dataKey vào IndexedDB (persist qua F5)
8. Redirect → /projects
```

**Nếu password sai:** `unwrapDataKey` throw error → không có data key → không đọc được data.

### 5.3. Tạo cuộc họp (Standard Mode)

```
[Client]
1. User chọn Standard mode → POST /api/projects/{id}/meetings { title, mode: 'standard' }

[Server]
2. Tạo meeting document với mode: 'standard'
```

### 5.4. Trong cuộc họp — Real-time STT

```
[Client - MeetingRoom]
1. Soniox WebSocket nhận audio → STT → transcript entries (plaintext trong memory)
2. MediaRecorder ghi âm audio (plaintext blob trong memory)
3. Hiển thị realtime trên UI

⚠️ Tại thời điểm này, data CHỈ nằm trong browser memory, chưa gửi server.
```

### 5.5. Kết thúc cuộc họp — Encrypt & Save

```
[Client - handleStop()]
1. Stop Soniox STT
2. Stop MediaRecorder → audio blob ready

── SAVE TRANSCRIPT ──
3. Lấy dataKey từ IndexedDB
4. Với MỖI transcript entry:
   a. encrypt(originalText, dataKey)    → ciphertext (iv + AES-GCM)
   b. encrypt(translatedText, dataKey)  → ciphertext (iv + AES-GCM)
5. POST /api/meetings/{id}/transcript { entries: [...encryptedEntries] }

── SAVE AUDIO ──
6. audioBlob.arrayBuffer() → raw bytes
7. Generate random IV (12 bytes)
8. crypto.subtle.encrypt(AES-GCM, dataKey, rawBytes) → encryptedAudio
9. Combine: [IV (12 bytes)] + [encryptedAudio]
10. POST /api/meetings/{id}/audio → body: combined binary

── UPDATE STATUS ──
11. PATCH /api/meetings/{id} { status: 'completed' }

[Server]
12. Lưu encrypted entries vào MongoDB (transcripts collection)
13. Lưu encrypted audio vào Vcomtor/storage/{userId}/{meetingId}/audio.enc
14. Update meeting status = 'completed'
```

### 5.6. Xem lại cuộc họp — Decrypt & Display

```
[Client - TranscriptViewer]
1. GET /api/meetings/{id}/transcript → encrypted entries
2. Lấy dataKey từ IndexedDB
3. Với MỖI entry:
   a. decrypt(encryptedOriginal, dataKey) → originalText
   b. decrypt(encryptedTranslated, dataKey) → translatedText
4. Hiển thị plaintext trên UI
5. Hỗ trợ: search (client-side), export CSV/XLSX, delete
```

### 5.7. Đổi mật khẩu (Change Password)

```
[Client]
1. User nhập currentPassword, newPassword
2. Lấy dataKey từ IndexedDB (đang có sẵn vì đã login)
3. deriveWrappingKey(newPassword, existingSalt) → newWrappingKey
4. wrapDataKey(dataKey, newWrappingKey) → newEncryptedDataKey
5. POST /api/auth/change-password { currentPassword, newPassword, newEncryptedDataKey }

[Server]
6. Verify currentPassword (bcrypt)
7. Hash newPassword (bcrypt)
8. Update { password: newHash, encryptedDataKey: newEncryptedDataKey }
   → Thực hiện ATOMIC trong 1 mongoose save()
9. Trả về success

⚠️ Data key KHÔNG thay đổi → tất cả data cũ vẫn đọc được.
⚠️ Chỉ "vỏ bọc" (wrapping) thay đổi.
```

### 5.8. Quên mật khẩu

```
⛔ KHÔNG CÓ CÁCH KHÔI PHỤC.

Password → Wrapping Key → unwrap Data Key.
Mất password = mất Wrapping Key = không unwrap được = DATA MẤT VĨNH VIỄN.

Đây là trade-off cần thiết của E2EE. Cần thông báo rõ cho user.
```

---

## 6. Cấu trúc dữ liệu mã hóa

### Text (transcript entry)

```
Plaintext: "今日はお疲れ様でした"

Encrypted format (Base64):
  ┌──────────────┬────────────────────────────┐
  │ IV (12 bytes)│ Ciphertext + GCM Tag       │
  └──────────────┴────────────────────────────┘

→ "dGVzdC1pdi1kYXRh..." (Base64 string, lưu MongoDB)
```

### Audio blob

```
Raw audio: [WebM bytes, ~5-50MB]

Encrypted format (Binary):
  ┌──────────────┬────────────────────────────┐
  │ IV (12 bytes)│ Ciphertext + GCM Tag       │
  └──────────────┴────────────────────────────┘

→ audio.enc (binary file, lưu filesystem)
```

### Wrapped Data Key

```
Data Key: [32 bytes AES-256 key]

Wrapped format:
  wrappingKey = PBKDF2(password, salt, 600K iterations)
  encryptedDataKey = AES-KW(wrappingKey, dataKey)

→ "YWVzLWt3LXdy..." (Base64 string, lưu MongoDB)
```

---

## 7. Key Persistence & Lifecycle

| Sự kiện | Data Key |
|---------|----------|
| Register | Tạo mới, wrap, gửi server |
| Login | Unwrap từ server, lưu IndexedDB |
| F5 / Refresh | Đọc từ IndexedDB ✅ |
| Multi-tab | IndexedDB shared giữa tabs ✅ |
| Logout | Xóa khỏi IndexedDB |
| Clear browser data | Mất key, phải login lại |
| Đổi password | Key giữ nguyên, re-wrap |
| Quên password | Key mất vĩnh viễn ⛔ |

---

## 8. Storage Provider — Backdoor S3

```
Hiện tại:
  STORAGE_PROVIDER=local
  Encrypted audio → Vcomtor/storage/{userId}/{meetingId}/audio.enc

Tương lai:
  STORAGE_PROVIDER=s3
  Encrypted audio → S3 bucket (cùng interface StorageProvider)
  Không cần đổi code API hoặc UI
```

### Interface

```typescript
interface StorageProvider {
  upload(key: string, data: Buffer | Uint8Array): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

---

## 9. Threat Model

| Threat | Được bảo vệ? | Giải thích |
|--------|-------------|-----------|
| Database leak | ✅ | Data là ciphertext, key không có trong DB |
| Server admin đọc data | ✅ | Server không có plaintext data key |
| Man-in-the-middle | ✅ | HTTPS + data đã encrypted trước khi gửi |
| XSS lấy key từ memory | ⚠️ Giảm thiểu | CryptoKey non-extractable (unwrap), CSP headers |
| Brute-force password | ⚠️ Giảm thiểu | PBKDF2 600K iterations (~1-3s mỗi lần thử) |
| User quên password | ⛔ Data mất | Trade-off của E2EE, không có backdoor |
| Physical device access | ⚠️ | Data key trong IndexedDB, cần login để unwrap |

---

## 10. File liên quan

| File | Vai trò |
|------|---------|
| `src/lib/crypto.ts` | Core crypto: PBKDF2, AES-GCM, AES-KW, Base64 |
| `src/lib/crypto-worker.ts` | Web Worker cho audio encrypt/decrypt |
| `src/lib/storage-provider.ts` | StorageProvider interface + LocalStorageProvider |
| `src/features/auth/hooks/useAuth.tsx` | IndexedDB key management, login/register flow |
| `src/features/translation/hooks/useTranscript.ts` | Encrypt entries, saveToServer |
| `src/features/translation/hooks/useCryptoWorker.ts` | React hook cho Web Worker |
| `src/features/translation/components/TranscriptViewer.tsx` | Fetch + decrypt + display |
| `src/features/translation/components/MeetingRoom.tsx` | handleStop: encrypt + upload |
| `src/app/api/meetings/[meetingId]/transcript/route.ts` | API: save/get/delete encrypted entries |
| `src/app/api/meetings/[meetingId]/audio/route.ts` | API: upload/download/delete encrypted audio |
| `src/app/api/auth/change-password/route.ts` | API: atomic password change + re-wrap |
| `src/models/User.ts` | encryptedDataKey, keySalt fields |
