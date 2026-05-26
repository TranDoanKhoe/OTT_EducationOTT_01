# 🔧 CHAT SCREEN UPDATE INSTRUCTIONS

## ✅ COMPLETED SO FAR:

1. ✅ Added imports for MessageBubble, ChatInput, ChatHeader
2. ✅ Added imports for useMessageReactions, useInfiniteScroll hooks
3. ✅ Added import for reactToMessage API
4. ✅ Setup hooks after refs declaration
5. ✅ Added resetPagination() call in fetchHistory
6. ✅ Updated fetchHistory dependencies

---

## ⏳ REMAINING MANUAL UPDATES:

Due to file path issues with brackets in PowerShell, the following updates need to be done manually or via a different approach.

### 1. Add handleReaction Function
**Location:** After `handleUpdateConvSetting` function

```typescript
// ✅ NEW: Handle message reactions
const handleReaction = async (message: any, emoji: string) => {
    try {
        const messageId = getMessageId(message);
        if (!messageId) return;
        
        // Optimistic update
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
        
        // Call API
        await reactToMessage(messageId, emoji, userId, token);
    } catch (error) {
        console.error('Reaction error:', error);
        // Rollback on error
        fetchHistory();
    }
};

// Helper function to update reactions array
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

### 2. Add handleSendVoice Function
**Location:** After `handleReaction` function

```typescript
// ✅ NEW: Handle voice message sending
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

### 3. Replace renderMessage Function
**Find:** The entire `renderMessage` function (starts with `const renderMessage = ({ item }) =>`)

**Replace with:**

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

### 4. Update FlatList Component
**Find:** `<FlatList` component in the return statement

**Add these props:**

```typescript
<FlatList
    ref={flatListRef}
    data={messages}
    keyExtractor={(item) => item.id?.toString() || item.tempKey}
    renderItem={renderMessage}
    inverted
    // ✅ ADD THESE:
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
    // KEEP EXISTING:
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

### 5. Replace Header Section
**Find:** The entire header `<View style={styles.header}>` section

**Replace with:**

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

### 6. Replace Input Section
**Find:** The entire input container section (starts with `<View style={styles.inputContainer}>`)

**Replace with:**

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

### 7. Remove Old Voice Recording Code
**Remove these:**
- `const [isRecording, setIsRecording] = useState(false);`
- `const [recordingDuration, setRecordingDuration] = useState(0);`
- `const recordingRef = useRef(null);`
- `const recordTimerRef = useRef(null);`
- `startRecording` function
- `stopRecording` function

**Note:** Voice recording is now handled by ChatInput component

---

### 8. Keep Reply Bar
**Keep this section** (it's still needed for image preview):

```typescript
{replyToMessage && (
    <View style={styles.replyBar}>
        {/* ... existing code ... */}
    </View>
)}
```

**Note:** ChatInput will also show reply preview, but this one is for when images are selected

---

## 🎯 ALTERNATIVE APPROACH

Since PowerShell has issues with bracket filenames, I'll create a complete updated version of the critical sections and save them to separate files that can be manually merged.

---

**Status:** Partial completion - Manual merge required  
**Next:** Create complete function definitions in separate files

