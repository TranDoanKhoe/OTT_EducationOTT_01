# 📱 CHAT SCREEN INTEGRATION GUIDE

## Hướng dẫn integrate các components mới vào app/chat/[id].tsx

### 1. IMPORTS CẦN THÊM

```typescript
// Thêm vào phần imports
import { useMessageReactions } from '../../src/hooks/useMessageReactions';
import { useTypingIndicator } from '../../src/hooks/useTypingIndicator';
import { useInfiniteScroll } from '../../src/hooks/useInfiniteScroll';
import { MessageBubble, ChatInput, ChatHeader, SearchMessages } from '../../src/components/chat';
import { reactToMessage } from '../../src/api/messageApi';
```

### 2. SETUP HOOKS

```typescript
// Trong ChatScreen component, sau khi khai báo userId và token:

// Message Reactions Hook
const { handleReaction, getReactions } = useMessageReactions(userId);

// Typing Indicator Hook  
const { handleInputChange: handleTypingChange, cleanup: cleanupTyping } = useTypingIndicator(
    userId,
    id,
    isPrivate === 'true'
);

// Infinite Scroll Hook
const { loadMoreMessages, isLoadingMore, hasMoreHistory, resetPagination } = useInfiniteScroll(
    id,
    isPrivate === 'true',
    userId
);
```

### 3. UPDATE handleInputChange

```typescript
// Thay thế handleInputChange hiện tại bằng:
const handleInputChange = useCallback(
    (text) => {
        setInputText(text);
        handleTypingChange(Boolean(text?.trim())); // Gọi typing indicator hook
    },
    [handleTypingChange],
);
```

### 4. UPDATE handleSend - THÊM VOICE SUPPORT

```typescript
// Thêm function mới để handle voice messages
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

### 5. UPDATE FlatList - INFINITE SCROLL

```typescript
// Trong FlatList, thêm:
<FlatList
    ref={flatListRef}
    data={messages}
    keyExtractor={(item) => item.id?.toString() || item.tempKey}
    renderItem={renderMessage}
    inverted
    // ✅ THÊM INFINITE SCROLL
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
                <Text style={{ color: '#6b7280', marginTop: 8 }}>Đang tải...</Text>
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

### 6. UPDATE renderMessage - SỬ DỤNG MessageBubble

```typescript
// Thay thế renderMessage function bằng:
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
            onReaction={async (msg, emoji) => {
                // Handle reaction
                const success = await handleReaction(msg, emoji);
                if (success) {
                    // Update local message reactions
                    setMessages((prev) =>
                        prev.map((m) =>
                            getMessageId(m) === getMessageId(msg)
                                ? {
                                      ...m,
                                      reactions: getReactions(msg, emoji),
                                  }
                                : m,
                        ),
                    );
                }
            }}
            showAvatar={isPrivate !== 'true'}
            senderName={senderName}
            senderAvatar={senderAvatar}
            currentUserId={userId}
        />
    );
};
```

### 7. REPLACE INPUT SECTION - SỬ DỤNG ChatInput

```typescript
// Thay thế phần input container cũ bằng:
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

### 8. REPLACE HEADER - SỬ DỤNG ChatHeader

```typescript
// Thay thế phần header cũ bằng:
<ChatHeader
    name={String(name || '')}
    avatar={undefined} // TODO: Get from contact/group info
    isOnline={false} // TODO: Implement online status
    isTyping={isPeerTyping}
    onBack={() => router.back()}
    onOpenInfo={handleOpenInfo}
    onAudioCall={handleAudioCall}
    onVideoCall={handleVideoCall}
    onSearch={() => setSearchBarVisible((v) => !v)}
    subtitle={isPrivate === 'true' ? undefined : 'Nhóm chat'}
/>
```

### 9. INTEGRATE SearchMessages

```typescript
// Thay thế search bar hiện tại bằng:
{searchBarVisible && (
    <SearchMessages
        conversationId={id}
        isGroup={isPrivate !== 'true'}
        userId={userId}
        token={token}
        onMessageSelect={(message) => {
            const index = messages.findIndex(
                (m) => String(getMessageId(m)) === String(getMessageId(message)),
            );
            if (index >= 0 && flatListRef.current) {
                flatListRef.current.scrollToIndex({ index, animated: true });
            }
            setSearchBarVisible(false);
        }}
        onClose={() => setSearchBarVisible(false)}
    />
)}
```

### 10. CLEANUP

```typescript
// Trong useEffect cleanup, thêm:
useEffect(() => {
    // ... existing code ...

    return () => {
        // ... existing cleanup ...
        cleanupTyping(); // ✅ Cleanup typing indicator
    };
}, [/* dependencies */]);
```

### 11. RESET PAGINATION KHI CHUYỂN CHAT

```typescript
// Trong fetchHistory, thêm:
const fetchHistory = useCallback(async () => {
    try {
        resetPagination(); // ✅ Reset pagination khi load chat mới
        let data = [];
        if (isPrivate === 'true') {
            data = await getChatHistory(id, token);
        } else {
            data = await getGroupChatHistory(id, token);
        }
        // ... rest of code
    } catch (error) {
        console.error('Loi lay lich su chat:', error);
    } finally {
        setIsLoading(false);
    }
}, [id, isPrivate, token, resetPagination]);
```

---

## 🎯 KẾT QUẢ SAU KHI INTEGRATE

### Features hoạt động:
✅ Message Reactions - Click vào tin nhắn để react  
✅ Reply to Message - Long press → Reply  
✅ Forward Message - Long press → Forward  
✅ Pin Message - Long press → Pin/Unpin  
✅ Multimedia Messages - Image, Video, File, Voice  
✅ Voice Recording - Hold mic button to record  
✅ Typing Indicator - "đang nhập..." khi peer typing  
✅ Infinite Scroll - Load older messages on scroll up  
✅ Search Messages - Search icon in header  

### Components được sử dụng:
- MessageBubble (thay thế renderMessage cũ)
- ChatInput (thay thế input container cũ)
- ChatHeader (thay thế header cũ)
- SearchMessages (thay thế search bar cũ)
- MessageReactions (tự động render trong MessageBubble)
- ReplyPreview (tự động render trong ChatInput)
- VoiceRecorder (tự động render trong ChatInput)
- ImageMessage, VideoMessage, FileMessage, VoicePlayer (tự động render trong MessageBubble)

### Hooks được sử dụng:
- useMessageReactions (handle reactions)
- useTypingIndicator (handle typing status)
- useInfiniteScroll (handle pagination)

---

## ⚠️ LƯU Ý

1. **Breaking Changes:**
   - Phải update tất cả references đến input và message rendering
   - Voice recording logic đã thay đổi (không còn dùng recordingRef)

2. **Performance:**
   - MessageBubble đã được memo
   - Reactions được optimize với debounce
   - Infinite scroll có prevent duplicate loads

3. **Testing:**
   - Test trên real device để verify voice recording
   - Test infinite scroll với nhiều messages
   - Test reactions với WebSocket sync
   - Test typing indicator với multiple users

---

**Cập nhật:** May 6, 2026  
**Status:** Ready for implementation
