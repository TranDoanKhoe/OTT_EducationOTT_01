# 🪞 MIRROR SYNC ANALYSIS - WEB TO MOBILE

## 📋 DANH SÁCH CHỨC NĂNG TỪ WEB (ChatWindow.jsx)

### ✅ ĐÃ CÓ TRÊN MOBILE (Completed in previous steps)

#### 1. Authentication & Token Management
- ✅ Login/Logout
- ✅ Token auto-refresh
- ✅ AsyncStorage for persistence

#### 2. Real-time Messaging
- ✅ Send/Receive messages
- ✅ WebSocket connection
- ✅ Auto reconnect

#### 3. WebRTC Calls
- ✅ 1-1 Video/Audio calls
- ✅ Group Video/Audio calls
- ✅ Call controls (mute, camera, end)
- ✅ Permission handling

---

## ❌ CHƯA CÓ TRÊN MOBILE (Need to implement)

### A. MESSAGE ACTIONS (Priority: HIGH 🔴)

#### 1. **Message Reactions** 
**Web:** `handleReaction()`, `handleOpenReactionPicker()`, `ReactionList` component
- [ ] Quick reactions: 👍 ❤️ 😂 😮 😢 🙏
- [ ] Reaction picker modal
- [ ] Toggle reaction (add/remove)
- [ ] Display reaction count
- [ ] Show who reacted
- [ ] Optimistic UI update
- [ ] WebSocket sync

**Implementation needed:**
```typescript
// Mobile: src/components/chat/MessageReactions.tsx
- ReactionPicker component
- ReactionList component
- handleReaction function
- Optimistic updates
```

#### 2. **Forward Message**
**Web:** `handleForwardMessage()`, `forwardDialogOpen` state
- [ ] Select message to forward
- [ ] Show contact/group list
- [ ] Multi-select recipients
- [ ] Forward to multiple chats
- [ ] Show forwarded indicator

**Implementation needed:**
```typescript
// Mobile: app/chat/forward.tsx
- ForwardModal component
- Contact/Group selector
- Multi-select UI
- Forward API call
```

#### 3. **Reply to Message**
**Web:** `replyingToMessage` state, reply preview UI
- [ ] Long press to reply
- [ ] Show reply preview above input
- [ ] Cancel reply
- [ ] Display replied message in bubble
- [ ] Navigate to original message on tap

**Implementation needed:**
```typescript
// Mobile: Update ChatInput.tsx
- Reply preview component
- handleReply function
- Reply indicator in MessageBubble
```

#### 4. **Edit Message**
**Web:** `handleEditMessage()`, `editDialogOpen` state
- [ ] Edit own messages
- [ ] Show "edited" indicator
- [ ] Edit history (optional)
- [ ] Cancel edit

**Implementation needed:**
```typescript
// Mobile: Update ChatInput.tsx
- Edit mode state
- handleEditMessage function
- Edited indicator in MessageBubble
```

#### 5. **Pin Message**
**Web:** `handlePinMessage()`, `handleShowPinnedMessages()`, `pinnedMessages` state
- [ ] Pin/Unpin messages
- [ ] View all pinned messages
- [ ] Pin indicator in bubble
- [ ] Navigate to pinned message
- [ ] Admin-only for groups

**Implementation needed:**
```typescript
// Mobile: app/chat/pinned.tsx
- PinnedMessagesModal
- Pin/Unpin actions
- Pin indicator UI
```

#### 6. **Recall Message**
**Web:** `handleRecallMessage()`
- [ ] Recall own messages
- [ ] Show "Tin nhắn đã thu hồi"
- [ ] Time limit (e.g., 5 minutes)

**Implementation needed:**
```typescript
// Mobile: Update MessageBubble.tsx
- Recall action
- Recalled message UI
```

#### 7. **Delete Message**
**Web:** `handleDeleteMessage()`
- [ ] Delete for self
- [ ] Delete for everyone (if sender)
- [ ] Confirmation dialog

**Implementation needed:**
```typescript
// Mobile: Update MessageBubble.tsx
- Delete action
- Confirmation alert
```

---

### B. MULTIMEDIA MESSAGES (Priority: HIGH 🔴)

#### 8. **Image Messages**
**Web:** `handleFileUpload()`, Cloudinary integration
- [ ] Send images
- [ ] Image preview before send
- [ ] Thumbnail in chat
- [ ] Full-screen view on tap
- [ ] Download image

**Implementation needed:**
```typescript
// Mobile: src/components/chat/ImageMessage.tsx
- Image picker (Expo ImagePicker)
- Cloudinary upload
- Image preview modal
- Download function
```

#### 9. **Video Messages**
**Web:** Similar to images
- [ ] Send videos
- [ ] Video thumbnail
- [ ] Play inline or full-screen
- [ ] Download video

**Implementation needed:**
```typescript
// Mobile: src/components/chat/VideoMessage.tsx
- Video picker
- Video player
- Thumbnail generation
```

#### 10. **File Messages**
**Web:** Document upload
- [ ] Send files (PDF, DOC, etc.)
- [ ] File icon + name + size
- [ ] Download file
- [ ] Open with system app

**Implementation needed:**
```typescript
// Mobile: src/components/chat/FileMessage.tsx
- Document picker (Expo DocumentPicker)
- File upload
- Download & open
```

#### 11. **Voice Messages**
**Web:** `handleToggleVoiceRecording()`, `handleSendRecordedVoice()`
- [ ] Record voice
- [ ] Show recording timer
- [ ] Play/Pause voice
- [ ] Waveform visualization (optional)
- [ ] Cancel recording

**Implementation needed:**
```typescript
// Mobile: src/components/chat/VoiceRecorder.tsx
- Audio recorder (Expo AV)
- Recording UI
- Audio player
- Waveform (optional)
```

---

### C. TYPING INDICATOR (Priority: MEDIUM 🟡)

#### 12. **Typing Status**
**Web:** `handleInputChange()`, `emitTypingStatus()`, `isPeerTyping` state
- [ ] Send typing status
- [ ] Show "đang nhập..." indicator
- [ ] Auto-hide after 5s
- [ ] Typing heartbeat (every 3s)

**Implementation needed:**
```typescript
// Mobile: Update ChatInput.tsx & chat/[id].tsx
- Typing status emission
- TypingIndicator component (already created ✅)
- Heartbeat logic
```

---

### D. MESSAGE STATUS (Priority: MEDIUM 🟡)

#### 13. **Read Receipts**
**Web:** `MessageTimestamp` component, `isRead` state
- [ ] Single check (sent)
- [ ] Double check (delivered)
- [ ] Blue double check (read)
- [ ] Mark as read on open

**Implementation needed:**
```typescript
// Mobile: Update MessageBubble.tsx
- Read receipt icons
- Mark as read API call
```

#### 14. **Online Status**
**Web:** `getLastSeenText()`, online indicator
- [ ] Show online/offline
- [ ] Last seen time
- [ ] Real-time updates

**Implementation needed:**
```typescript
// Mobile: Update ChatHeader.tsx
- Online indicator
- Last seen text
```

---

### E. GROUP FEATURES (Priority: HIGH 🔴)

#### 15. **Group Polls**
**Web:** `PollModal`, `handlePollEvent()`, `createPollApi()`, `votePollApi()`
- [ ] Create poll
- [ ] Vote on poll
- [ ] View results
- [ ] Real-time updates
- [ ] Admin-only creation

**Implementation needed:**
```typescript
// Mobile: app/group/polls.tsx (already exists, need to enhance)
- Poll creation modal
- Poll voting UI
- Results visualization
- WebSocket events
```

#### 16. **Group Notes**
**Web:** `NoteModal`, `handleNoteEvent()`, `getGroupNotes()`, `createGroupNote()`
- [ ] Create note
- [ ] Edit note
- [ ] Delete note
- [ ] View all notes
- [ ] Real-time updates

**Implementation needed:**
```typescript
// Mobile: app/group/notes.tsx (already exists, need to enhance)
- Note creation modal
- Note list
- Edit/Delete actions
- WebSocket events
```

#### 17. **Group Info Panel**
**Web:** `GroupInfoPanel` component
- [ ] View members
- [ ] Add/Remove members
- [ ] Change group name
- [ ] Change group avatar
- [ ] Leave group
- [ ] Dissolve group (admin)
- [ ] Assign roles (admin)

**Implementation needed:**
```typescript
// Mobile: app/chat/info.tsx (already exists, need to enhance)
- Member list
- Add member modal
- Edit group modal
- Role management
```

---

### F. SEARCH & NAVIGATION (Priority: MEDIUM 🟡)

#### 18. **Search Messages**
**Web:** `SearchMessages` component, `showSearchBar` state
- [ ] Search in conversation
- [ ] Highlight results
- [ ] Navigate to message
- [ ] Search by date

**Implementation needed:**
```typescript
// Mobile: src/components/chat/SearchMessages.tsx
- Search input
- Results list
- Navigate to message
```

#### 19. **Jump to Latest**
**Web:** `handleJumpToLatestMessage()`, floating button
- [ ] Show when scrolled up
- [ ] Unread count badge
- [ ] Smooth scroll to bottom

**Implementation needed:**
```typescript
// Mobile: Update chat/[id].tsx
- Floating action button
- Unread count
- Scroll to bottom
```

---

### G. AI ASSISTANT (Priority: LOW 🟢)

#### 20. **AI Quick Suggestions**
**Web:** `aiSuggestedQuestions`, `handleQuickAiQuestion()`
- [ ] Show suggested questions
- [ ] Tap to send
- [ ] New conversation button

**Implementation needed:**
```typescript
// Mobile: app/(tabs)/ai.tsx (already exists, need to enhance)
- Quick suggestions UI
- New conversation
```

---

### H. DRAG & DROP (Priority: LOW 🟢)

#### 21. **Drag & Drop Files**
**Web:** `handleDragEnter()`, `handleDropFiles()`
- [ ] Drag files to chat
- [ ] Show drop zone
- [ ] Upload dropped files

**Implementation needed:**
```typescript
// Mobile: Not applicable (mobile doesn't have drag & drop)
// Alternative: Share intent / Share extension
```

---

### I. INFINITE SCROLL (Priority: MEDIUM 🟡)

#### 22. **Load Older Messages**
**Web:** `historyPage` state, `getChatHistory()`, Virtuoso component
- [ ] Load on scroll up
- [ ] Pagination
- [ ] Loading indicator
- [ ] Maintain scroll position

**Implementation needed:**
```typescript
// Mobile: Update chat/[id].tsx
- onEndReached for FlatList
- Load more API call
- Loading state
```

---

### J. SETTINGS & PREFERENCES (Priority: LOW 🟢)

#### 23. **Conversation Settings**
**Web:** `updateConversationSetting()`, `SettingGroup` component
- [ ] Mute notifications
- [ ] Block user
- [ ] Report user/group
- [ ] Clear chat history

**Implementation needed:**
```typescript
// Mobile: app/settings/notifications.tsx (already exists, need to enhance)
- Mute toggle
- Block action
- Report action
- Clear history
```

---

## 📊 PRIORITY MATRIX

### 🔴 HIGH PRIORITY (Implement First)
1. **Message Reactions** - Core chat feature
2. **Forward Message** - Frequently used
3. **Reply to Message** - Essential for context
4. **Pin Message** - Important for groups
5. **Image/Video/File Messages** - Multimedia support
6. **Group Polls & Notes** - Group engagement

### 🟡 MEDIUM PRIORITY (Implement Second)
7. **Typing Indicator** - UX enhancement
8. **Read Receipts** - Message status
9. **Online Status** - Presence awareness
10. **Search Messages** - Navigation
11. **Infinite Scroll** - Performance

### 🟢 LOW PRIORITY (Implement Last)
12. **Edit Message** - Nice to have
13. **Recall/Delete Message** - Less frequent
14. **AI Quick Suggestions** - AI-specific
15. **Conversation Settings** - Advanced features

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: Message Actions (Week 1)
- [ ] Message Reactions
- [ ] Reply to Message
- [ ] Forward Message
- [ ] Pin Message

### Phase 2: Multimedia (Week 2)
- [ ] Image Messages
- [ ] Video Messages
- [ ] File Messages
- [ ] Voice Messages

### Phase 3: Group Features (Week 3)
- [ ] Group Polls
- [ ] Group Notes
- [ ] Group Info enhancements

### Phase 4: UX Enhancements (Week 4)
- [ ] Typing Indicator
- [ ] Read Receipts
- [ ] Online Status
- [ ] Search Messages
- [ ] Infinite Scroll

### Phase 5: Polish (Week 5)
- [ ] Edit/Recall/Delete Message
- [ ] Conversation Settings
- [ ] AI enhancements
- [ ] Bug fixes & optimization

---

## 🔧 TECHNICAL NOTES

### Shared Patterns from Web:

1. **Optimistic Updates**
   - Update UI immediately
   - Send to backend
   - Rollback on error

2. **WebSocket Events**
   - Subscribe to events
   - Handle real-time updates
   - Unsubscribe on unmount

3. **Cloudinary Integration**
   - Upload files
   - Get URLs
   - Thumbnail generation

4. **State Management**
   - Local state for UI
   - Sync with backend
   - Handle conflicts

---

## 📝 NEXT STEPS

1. **Start with Phase 1** - Message Actions
2. **Create components** - Reusable UI
3. **Implement APIs** - Backend integration
4. **Test thoroughly** - Each feature
5. **Document** - Update this file

---

**Status:** 📊 Analysis Complete - Ready to implement  
**Updated:** May 6, 2026
