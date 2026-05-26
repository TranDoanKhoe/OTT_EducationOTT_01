#!/usr/bin/env python3
"""
Script to merge chat screen updates
Handles file with brackets in name that PowerShell can't process
"""

import re

# Read the current chat screen file
with open('app/chat/[id].tsx', 'r', encoding='utf-8') as f:
    content = f.read()

print("✅ File đã đọc thành công!")
print(f"📊 Tổng số dòng: {len(content.splitlines())}")

# Check if already updated
if 'MessageBubble' in content and 'handleReaction' in content:
    print("⚠️  File đã được update rồi!")
    exit(0)

print("\n🔧 Bắt đầu merge code...")

# Step 1: Add new functions after handleUpdateConvSetting
new_functions = '''
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
    try:
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
'''

# Find handleUpdateConvSetting and add new functions after it
pattern = r'(const handleUpdateConvSetting = async.*?\n\s*\};)'
match = re.search(pattern, content, re.DOTALL)
if match:
    insert_pos = match.end()
    content = content[:insert_pos] + '\n' + new_functions + content[insert_pos:]
    print("✅ Step 1: Đã thêm handleReaction, updateReactions, handleSendVoice")
else:
    print("⚠️  Không tìm thấy handleUpdateConvSetting, thêm functions vào cuối phần functions")
    # Find last function before return statement
    pattern = r'(\n\s*return \()'
    match = re.search(pattern, content)
    if match:
        insert_pos = match.start()
        content = content[:insert_pos] + '\n' + new_functions + content[insert_pos:]
        print("✅ Step 1: Đã thêm functions trước return statement")

# Step 2: Replace renderMessage function
new_render_message = '''const renderMessage = ({ item }) => {
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
};'''

# Find and replace renderMessage
pattern = r'const renderMessage = \(\{ item \}\).*?^\s*\};'
match = re.search(pattern, content, re.DOTALL | re.MULTILINE)
if match:
    content = content[:match.start()] + new_render_message + content[match.end():]
    print("✅ Step 2: Đã replace renderMessage với MessageBubble")
else:
    print("⚠️  Không tìm thấy renderMessage function")

# Write the updated content
with open('app/chat/[id].tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ HOÀN THÀNH! File đã được update.")
print("📝 Lưu ý: Còn 3 bước cần làm thủ công:")
print("   1. Replace header với ChatHeader component")
print("   2. Update FlatList với infinite scroll")
print("   3. Replace input với ChatInput component")
print("\n📖 Xem hướng dẫn chi tiết trong CHAT_SCREEN_INTEGRATION_COMPLETE.md")
