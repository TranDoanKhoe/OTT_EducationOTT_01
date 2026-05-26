// ============================================
// NEW FUNCTIONS TO ADD TO app/chat/[id].tsx
// Add these after handleUpdateConvSetting function
// ============================================

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
