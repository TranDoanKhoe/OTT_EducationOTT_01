# 🏗️ KIẾN TRÚC - OTT EDUCATION MOBILE

## 📊 Tổng quan hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                    OTT EDUCATION SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Web App    │      │   Backend    │      │ Mobile App│ │
│  │  (React +    │◄────►│ (Spring Boot)│◄────►│ (React    │ │
│  │   Vite)      │      │              │      │  Native)  │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Luồng Authentication

```
┌─────────────┐
│   Mobile    │
│   Login     │
└──────┬──────┘
       │
       │ POST /auth/login
       │ { username, password }
       ▼
┌─────────────────────┐
│   Spring Boot       │
│   Backend           │
│   /auth/login       │
└──────┬──────────────┘
       │
       │ Return tokens
       │ { accessToken, refreshToken, userId, role }
       ▼
┌─────────────────────┐
│   authHeader.js     │
│   - Save to         │
│     AsyncStorage    │
│   - Cache in memory │
│     (global.__      │
│      accessToken)   │
└──────┬──────────────┘
       │
       │ Token ready
       ▼
┌─────────────────────┐
│   Navigate to       │
│   /(tabs)           │
└─────────────────────┘
```

---

## 🔄 Luồng Token Refresh

```
┌─────────────┐
│   API Call  │
│   (any)     │
└──────┬──────┘
       │
       │ Attach Bearer token
       │ (Axios Request Interceptor)
       ▼
┌─────────────────────┐
│   Backend           │
│   Validate token    │
└──────┬──────────────┘
       │
       │ 401/403 (Token expired)
       ▼
┌─────────────────────┐
│   Axios Response    │
│   Interceptor       │
│   - Detect 401/403  │
│   - Queue request   │
└──────┬──────────────┘
       │
       │ POST /auth/refresh
       │ { refreshToken }
       ▼
┌─────────────────────┐
│   Backend           │
│   /auth/refresh     │
└──────┬──────────────┘
       │
       │ Return new tokens
       │ { accessToken, refreshToken }
       ▼
┌─────────────────────┐
│   authHeader.js     │
│   - Save new tokens │
│   - Update cache    │
│   - Emit event      │
└──────┬──────────────┘
       │
       │ Retry queued requests
       ▼
┌─────────────────────┐
│   Original API      │
│   returns success   │
└─────────────────────┘
```

---

## 🔄 Luồng WebSocket

```
┌─────────────┐
│   App Start │
└──────┬──────┘
       │
       │ initAuth()
       │ Load token to memory
       ▼
┌─────────────────────┐
│   connectWebSocket  │
│   (messageApi.js)   │
│   - Get token       │
│   - Connect STOMP   │
└──────┬──────────────┘
       │
       │ WebSocket connection
       │ ws://backend/ws
       ▼
┌─────────────────────┐
│   Backend           │
│   WebSocket Server  │
└──────┬──────────────┘
       │
       │ Subscribe to queues
       │ /user/{userId}/queue/messages
       │ /user/{userId}/queue/call
       ▼
┌─────────────────────┐
│   Listen for        │
│   messages          │
│   - onMessage       │
│   - onDelete        │
│   - onTyping        │
│   - onCall          │
└─────────────────────┘

┌─────────────────────┐
│   Token Refresh     │
│   Event             │
└──────┬──────────────┘
       │
       │ eventEmitter.emit('auth:tokenRefreshed')
       ▼
┌─────────────────────┐
│   WebSocket         │
│   Listener          │
│   - Disconnect      │
│   - Reconnect with  │
│     new token       │
│   - Restore subs    │
└─────────────────────┘
```

---

## 🔄 Luồng Video Call (1-1)

```
┌─────────────┐                           ┌─────────────┐
│   Web User  │                           │ Mobile User │
│   (Caller)  │                           │  (Callee)   │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │ 1. Click "Video Call"                  │
       │                                         │
       │ 2. Create offer                        │
       │    - getUserMedia                      │
       │    - createOffer()                     │
       │                                         │
       │ 3. Send offer via WebSocket            │
       ├────────────────────────────────────────►│
       │    { type: 'offer',                    │
       │      data: { offer, isVideo } }        │
       │                                         │
       │                                         │ 4. Incoming call screen
       │                                         │    - Show caller info
       │                                         │    - Vibrate
       │                                         │
       │                                         │ 5. User taps "Accept"
       │                                         │
       │                                         │ 6. Request permissions
       │                                         │    - Camera
       │                                         │    - Microphone
       │                                         │
       │                                         │ 7. getUserMedia
       │                                         │    - Start local stream
       │                                         │
       │                                         │ 8. setRemoteDescription(offer)
       │                                         │
       │                                         │ 9. createAnswer()
       │                                         │
       │ 10. Receive answer                     │
       │◄────────────────────────────────────────┤
       │    { type: 'answer',                   │
       │      data: { answer } }                │
       │                                         │
       │ 11. setRemoteDescription(answer)       │
       │                                         │
       │ 12. ICE candidates exchange            │
       │◄───────────────────────────────────────►│
       │    { type: 'ice-candidate',            │
       │      data: { candidate } }             │
       │                                         │
       │ 13. Media streams connected            │
       │◄═══════════════════════════════════════►│
       │    Video + Audio                       │
       │                                         │
       │ 14. Active call                        │
       │    - Remote video (full screen)        │
       │    - Local video (PiP)                 │
       │    - Controls (mute, camera, end)      │
       │                                         │
       │ 15. End call                           │
       ├────────────────────────────────────────►│
       │    { type: 'call-end' }                │
       │                                         │
       │ 16. Cleanup                            │
       │    - Stop tracks                       │
       │    - Close peer connection             │
       │    - Navigate back                     │
       │                                         │
└──────┴──────┘                           └──────┴──────┘
```

---

## 🔄 Luồng Group Call

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web User  │     │ Mobile User │     │ Mobile User │
│ (Initiator) │     │  (Member 1) │     │  (Member 2) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Create group call                 │
       │    - getUserMedia                    │
       │                                       │
       │ 2. Send offers to all members        │
       ├──────────────────►│                  │
       ├───────────────────┼─────────────────►│
       │                   │                  │
       │                   │ 3. Accept call   │
       │                   │    - Request     │
       │                   │      permissions │
       │                   │    - getUserMedia│
       │                   │                  │
       │                   │ 4. Send answer   │
       │◄──────────────────┤                  │
       │                   │                  │
       │                   │                  │ 5. Accept call
       │                   │                  │
       │◄──────────────────┼──────────────────┤
       │                   │                  │
       │ 6. Full-mesh: Members connect to each other
       │                   │                  │
       │                   │ 7. Create offer  │
       │                   ├─────────────────►│
       │                   │                  │
       │                   │ 8. Send answer   │
       │                   │◄─────────────────┤
       │                   │                  │
       │ 9. All connected (full-mesh)         │
       │◄═════════════════►│◄════════════════►│
       │                   │                  │
       │ 10. Group active screen              │
       │     - Grid layout (2 columns)        │
       │     - VideoView for each peer        │
       │     - Local PiP                      │
       │     - Controls                       │
       │                   │                  │
└──────┴──────┘     └──────┴──────┘     └──────┴──────┘
```

---

## 📦 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App                            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Screens (Container)                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │   │
│  │  │ active.tsx  │  │group-active │  │incoming │ │   │
│  │  │             │  │    .tsx     │  │  .tsx   │ │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────┬────┘ │   │
│  └─────────┼─────────────────┼──────────────┼──────┘   │
│            │                 │              │           │
│            │ Use components  │              │           │
│            ▼                 ▼              ▼           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Components (Presentation)                │   │
│  │  ┌──────────────┐  ┌──────────────┐            │   │
│  │  │CallControls  │  │  VideoView   │            │   │
│  │  │  .tsx        │  │    .tsx      │            │   │
│  │  └──────────────┘  └──────────────┘            │   │
│  └─────────────────────────────────────────────────┘   │
│            │                 │                          │
│            │ Use services    │                          │
│            ▼                 ▼                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Services                            │   │
│  │  ┌──────────────┐  ┌──────────────┐            │   │
│  │  │webrtcService │  │ messageApi   │            │   │
│  │  │    .js       │  │    .js       │            │   │
│  │  └──────────────┘  └──────────────┘            │   │
│  └─────────────────────────────────────────────────┘   │
│            │                 │                          │
│            │ Use utils       │                          │
│            ▼                 ▼                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │                Utils                             │   │
│  │  ┌──────────────┐  ┌──────────────┐            │   │
│  │  │ authHeader   │  │mediaPermis-  │            │   │
│  │  │    .js       │  │  sions.js    │            │   │
│  │  └──────────────┘  └──────────────┘            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

```
OTT_EducationOTT_01/
├── app/                          # Screens (Expo Router)
│   ├── (tabs)/                   # Tab navigation
│   │   ├── index.tsx             # Home
│   │   ├── classes.tsx           # Classes
│   │   ├── contacts.tsx          # Contacts
│   │   └── ...
│   ├── call/                     # Call screens
│   │   ├── active.tsx            # 1-1 call (UPDATED ✅)
│   │   ├── group-active.tsx      # Group call (UPDATED ✅)
│   │   └── incoming.tsx          # Incoming call (UPDATED ✅)
│   ├── chat/                     # Chat screens
│   │   └── [id].tsx              # Chat detail
│   ├── _layout.tsx               # Root layout (UPDATED ✅)
│   └── login.tsx                 # Login (UPDATED ✅)
│
├── src/
│   ├── components/               # Reusable components
│   │   ├── chat/                 # Chat components (NEW ✅)
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── TypingIndicator.tsx
│   │   │   ├── EmojiPicker.tsx
│   │   │   └── index.ts
│   │   └── call/                 # Call components (NEW ✅)
│   │       ├── CallControls.tsx
│   │       ├── VideoView.tsx
│   │       └── index.ts
│   │
│   ├── api/                      # API layer
│   │   ├── axiosConfig.js        # Axios setup (UPDATED ✅)
│   │   ├── messageApi.js         # WebSocket (UPDATED ✅)
│   │   ├── user.js               # User API (UPDATED ✅)
│   │   ├── groupApi.js           # Group API (UPDATED ✅)
│   │   └── ...                   # Other APIs (UPDATED ✅)
│   │
│   ├── services/                 # Business logic
│   │   └── webrtcService.js      # WebRTC logic (EXISTING)
│   │
│   └── utils/                    # Utilities
│       ├── authHeader.js         # Token management (NEW ✅)
│       ├── eventEmitter.js       # Event system (NEW ✅)
│       └── mediaPermissions.js   # Permissions (NEW ✅)
│
├── SYNC_PROGRESS.md              # Progress tracking (NEW ✅)
├── TESTING_GUIDE.md              # Testing guide (NEW ✅)
├── WEBRTC_INTEGRATION_SUMMARY.md # WebRTC summary (NEW ✅)
├── QUICK_REFERENCE.md            # Code reference (NEW ✅)
├── CHANGELOG_WEBRTC.md           # Changelog (NEW ✅)
├── README_WEBRTC.md              # Quick readme (NEW ✅)
└── ARCHITECTURE.md               # This file (NEW ✅)
```

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Security Layers                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Authentication                                        │
│     ┌─────────────────────────────────────────────┐     │
│     │ - JWT tokens (access + refresh)             │     │
│     │ - Stored in AsyncStorage (encrypted)        │     │
│     │ - Cached in memory for performance          │     │
│     └─────────────────────────────────────────────┘     │
│                                                           │
│  2. Authorization                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │ - Bearer token in every request             │     │
│     │ - Backend validates token                   │     │
│     │ - Role-based access control                 │     │
│     └─────────────────────────────────────────────┘     │
│                                                           │
│  3. Token Refresh                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │ - Auto-refresh on 401/403                   │     │
│     │ - Refresh token rotation                    │     │
│     │ - Logout if refresh fails                   │     │
│     └─────────────────────────────────────────────┘     │
│                                                           │
│  4. WebSocket Security                                    │
│     ┌─────────────────────────────────────────────┐     │
│     │ - Token in connection headers               │     │
│     │ - User-specific queues                      │     │
│     │ - Auto reconnect with new token             │     │
│     └─────────────────────────────────────────────┘     │
│                                                           │
│  5. WebRTC Security                                       │
│     ┌─────────────────────────────────────────────┐     │
│     │ - DTLS-SRTP encryption                      │     │
│     │ - TURN server authentication                │     │
│     │ - Signaling via secure WebSocket            │     │
│     └─────────────────────────────────────────────┘     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Performance Optimizations

```
┌─────────────────────────────────────────────────────────┐
│              Performance Optimizations                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Token Caching                                         │
│     - Store in memory (global.__accessToken)             │
│     - Avoid AsyncStorage reads on every request          │
│     - ~10x faster than AsyncStorage                      │
│                                                           │
│  2. Component Memoization                                 │
│     - React.memo for VideoView                           │
│     - React.memo for MessageBubble                       │
│     - Prevent unnecessary re-renders                     │
│                                                           │
│  3. Stream Management                                     │
│     - Use stream objects (not URLs)                      │
│     - Avoid toURL() conversion overhead                  │
│     - Direct RTCView rendering                           │
│                                                           │
│  4. WebSocket Reconnect                                   │
│     - Event-driven (not polling)                         │
│     - Restore subscriptions efficiently                  │
│     - No message loss                                    │
│                                                           │
│  5. Lazy Loading                                          │
│     - Components loaded on demand                        │
│     - Expo Router code splitting                         │
│     - Faster initial load                                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      Data Flow                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  User Action                                              │
│      ↓                                                    │
│  Component (Screen)                                       │
│      ↓                                                    │
│  Event Handler                                            │
│      ↓                                                    │
│  Service/API Call                                         │
│      ↓                                                    │
│  Axios (with interceptors)                                │
│      ↓                                                    │
│  Backend (Spring Boot)                                    │
│      ↓                                                    │
│  Response                                                 │
│      ↓                                                    │
│  Update State                                             │
│      ↓                                                    │
│  Re-render Component                                      │
│      ↓                                                    │
│  User sees result                                         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Design Decisions

### 1. Token Management
**Decision:** Cache in memory + AsyncStorage  
**Reason:** Performance (memory) + Persistence (AsyncStorage)

### 2. Component Architecture
**Decision:** Separate presentation from container  
**Reason:** Reusability, testability, maintainability

### 3. Stream Management
**Decision:** Use objects instead of URLs  
**Reason:** Performance, avoid conversion overhead

### 4. Permission Handling
**Decision:** Request before accepting call  
**Reason:** Better UX, clear error messages

### 5. WebSocket Reconnect
**Decision:** Event-driven reconnect  
**Reason:** Automatic, no polling, efficient

---

**📚 For implementation details, see `SYNC_PROGRESS.md`**
