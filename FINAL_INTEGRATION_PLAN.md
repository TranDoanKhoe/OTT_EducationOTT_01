# 🎯 FINAL INTEGRATION EXECUTION PLAN

## STATUS: EXECUTING NOW

**Mode:** Auto-Pilot Maximum  
**Target:** 100% Phase 5 Complete  
**Action:** Direct file updates without confirmation

---

## 📋 INTEGRATION TASKS

### ✅ TASK 1: Backup Original Files
- [x] Backup `app/chat/[id].tsx` → `[id].tsx.backup`
- File size: 93KB (large file, needs careful handling)

### ⏳ TASK 2: Update Chat Screen Imports
**File:** `app/chat/[id].tsx`

**Add imports:**
```typescript
// New component imports
import { MessageBubble, ChatInput, ChatHeader } from '../../src/components/chat';

// New hook imports  
import { useMessageReactions } from '../../src/hooks/useMessageReactions';
import { useInfiniteScroll } from '../../src/hooks/useInfiniteScroll';

// API import for reactions
import { reactToMessage } from '../../src/api/messageApi';
```

**Note:** useTypingIndicator already implemented inline, no need to import

---

### ⏳ TASK 3: Setup Hooks in Component
**Location:** After state declarations, before fetchHistory

```typescript
// Message Reactions Hook
const { handleReaction: handleReactionHook, getReactions } = useMessageReactions(userId);

// Infinite Scroll Hook
const { loadMoreMessages, isLoadingMore, hasMoreHistory, resetPagination } = useInfiniteScroll(
    id,
    isPrivate === 'true',
    userId
);
```

---

### ⏳ TASK 4: Add handleReaction Function
**Location:** After handleSend function

```typescript
const handleReaction = async (message: any, emoji: string) => {
    try {
        const messageId = getMessageId(message);
        if (!messageId) return;
        
        // Call API
        await reactToMessage(messageId, emoji, userId, token);
        
        // Update local state optimistically
        setMessages((prev) =>
            prev.map((m) =>
                getMessageId(m) === messageId
                    ? {
                          ...m,
                          reactions: updateReactions(m.reactions || [], emoji, userId),
                      }
                    : m,
            ),
        );
    } catch (error) {
        console.error('Reaction error:', error);
    }
};

// Helper function
const updateReactions = (reactions: any[], emoji: string, userId: string) => {
    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing) {
        const hasUserReacted = existing.userIds?.includes(userId);
        if (hasUserReacted) {
            // Remove reaction
            return reactions
                .map((r) =>
                    r.emoji === emoji
                        ? {
                              ...r,
                              count: r.count - 1,
                              userIds: r.userIds.filter((id: string) => id !== userId),
                          }
                        : r,
                )
                .filter((r) => r.count > 0);
        } else {
            // Add reaction
            return reactions.map((r) =>
                r.emoji === emoji
                    ? {
                          ...r,
                          count: r.count + 1,
                          userIds: [...(r.userIds || []), userId],
                      }
                    : r,
            );
        }
    } else {
        // New reaction
        return [...reactions, { emoji, count: 1, userIds: [userId] }];
    }
};
```

---

### ⏳ TASK 5: Add handleSendVoice Function
**Location:** After handleSend function

```typescript
const handleSendVoice = async (uri: string, duration: number) => {
    try {
        await uploadFile(
            [{ uri, name: `voice_${Date.now()}.m4a`, type: 'audio/m4a' }],
            isPrivate === 'true' ? id : null,
            token,
            isPrivate === 'true' ? null : id,
            replyToMessage ? getMessageId(replyToMessage) : null,
        );
        setReplyToMessage(null);
    } catch (e) {
        console.error('Upload voice error:', e);
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn thoại');
    }
};
```

---

### ⏳ TASK 6: Update fetchHistory - Add resetPagination
**Location:** In fetchHistory function, at the beginning

```typescript
const fetchHistory = useCallback(async () => {
    try {
        resetPagination(); // ✅ ADD THIS LINE
        let data = [];
        // ... rest of code
    }
}, [id, isPrivate, token, markMessagesAsRead, resetPagination]); // ✅ ADD resetPagination to deps
```

---

### ⏳ TASK 7: Replace renderMessage with MessageBubble
**Location:** Replace entire renderMessage function

```typescript
const renderMessage = ({ item }) => {
    const isMe = String(item.senderId) === String(userId);
    const senderAvatar = !isMe && isPrivate !== 'true' 
        ? memberAvatarMap[String(item.senderId)] 
        : undefined;
    const senderName = !isMe && isPrivate !== 'true'
        ? item.senderName || 'Unknown'
        : undefined;

    return (
        <MessageBubble
            message={item}
            isOwnMessage={isMe}
            onLongPress={handleLongPressMessage}
            onReaction={handleReaction}
            showAvatar={isPrivate !== 'true'}
            senderName={senderName}
            senderAvatar={senderAvatar}
            currentUserId={userId}
        />
    );
};
```

---

### ⏳ TASK 8: Update FlatList - Add Infinite Scroll
**Location:** In FlatList component

```typescript
<FlatList
    ref={flatListRef}
    data={messages}
    keyExtractor={(item) => item.id?.toString() || item.tempKey}
    renderItem={renderMessage}
    inverted
    // ✅ ADD INFINITE SCROLL
    onEndReached={async () => {
        if (hasMoreHistory && !isLoadingMore) {
            const olderMessages = await loadMoreMessages();
            if (olderMessages && olderMessages.length > 0) {
                setMessages((prev) => [...prev, ...olderMessages]);
            }
        }
    }}
    onEndReachedThreshold={0.5}
    ListFooterComponent={
        isLoadingMore ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={{ color: '#6b7280', marginTop: 8, fontSize: 12 }}>
                    Đang tải tin nhắn cũ...
                </Text>
            </View>
        ) : null
    }
    onScrollToIndexFailed={({ index }) => {
        const safeIndex = Math.max(0, index - 1);
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({
                index: safeIndex,
                animated: true,
            });
        }, 250);
    }}
    contentContainerStyle={styles.messageList}
    showsVerticalScrollIndicator={false}
/>
```

---

### ⏳ TASK 9: Replace Header with ChatHeader Component
**Location:** Replace entire header View

```typescript
<ChatHeader
    name={String(name || '')}
    avatar={undefined}
    isOnline={false}
    isTyping={isPeerTyping}
    onBack={() => router.back()}
    onOpenInfo={handleOpenInfo}
    onAudioCall={handleAudioCall}
    onVideoCall={handleVideoCall}
    onSearch={() => {
        setSearchBarVisible((v) => !v);
        setSearchKeyword('');
        setSearchResults([]);
    }}
    subtitle={isPrivate === 'true' ? undefined : 'Nhóm chat'}
/>
```

---

### ⏳ TASK 10: Replace Input with ChatInput Component
**Location:** Replace entire input container

```typescript
<ChatInput
    value={inputText}
    onChangeText={handleInputChange}
    onSend={handleSend}
    onAttachFile={pickFile}
    onAttachImage={pickImage}
    onOpenEmoji={() => setShowEmojiPicker((v) => !v)}
    onSendVoice={handleSendVoice}
    placeholder="Nhập tin nhắn..."
    disabled={false}
    replyTo={replyToMessage}
    onCancelReply={() => setReplyToMessage(null)}
/>
```

---

### ⏳ TASK 11: Remove Old Voice Recording Code
**Remove:**
- `isRecording` state (now handled by ChatInput)
- `recordingDuration` state
- `recordingRef` ref
- `recordTimerRef` ref
- `startRecording` function
- `stopRecording` function
- Voice recording UI in input section

**Keep:**
- All other states and functions

---

### ⏳ TASK 12: Update Group Polls Screen
**File:** `app/group/polls.tsx`

**Changes:**
1. Import PollItem and CreatePollModal
2. Replace poll rendering with PollItem
3. Add CreatePollModal
4. Add FAB button

---

### ⏳ TASK 13: Update Group Notes Screen
**File:** `app/group/notes.tsx`

**Changes:**
1. Import NoteItem and CreateNoteModal
2. Replace note rendering with NoteItem
3. Add CreateNoteModal
4. Add FAB button

---

## 🎯 EXECUTION STRATEGY

### Phase 1: Chat Screen (Priority 1)
1. Create updated version with all changes
2. Test imports
3. Verify no syntax errors
4. Document changes

### Phase 2: Group Features (Priority 2)
1. Update polls screen
2. Update notes screen
3. Test integration

### Phase 3: Final Testing (Priority 3)
1. Create test checklist
2. Document all changes
3. Create final report

---

## 📝 NOTES

### Critical Points:
- File is 93KB - need to handle carefully
- Keep all existing functionality
- Only replace specific sections
- Maintain all WebSocket logic
- Keep all modal logic intact

### Breaking Changes:
- Voice recording now handled by ChatInput
- renderMessage completely replaced
- Header replaced with ChatHeader
- Input replaced with ChatInput

### Non-Breaking:
- All WebSocket logic unchanged
- All modal logic unchanged
- All state management unchanged
- All API calls unchanged

---

**Status:** READY TO EXECUTE  
**Next:** Start file updates

