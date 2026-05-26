// ============================================
// REPLACE renderMessage FUNCTION
// Find the old renderMessage and replace with this
// ============================================

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
