// @ts-nocheck
// MessageBubble - Component hiển thị từng tin nhắn (tương tự MessageItem trên Web)
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ImageMessage from './ImageMessage';
import VideoMessage from './VideoMessage';
import FileMessage from './FileMessage';
import VoicePlayer from './VoicePlayer';
import MessageReactions from './MessageReactions';

interface MessageBubbleProps {
    message: any;
    isOwnMessage: boolean;
    onLongPress?: (message: any) => void;
    onPress?: (message: any) => void;
    onReaction?: (message: any, emoji: string) => void;
    showAvatar?: boolean;
    senderName?: string;
    senderAvatar?: string;
    currentUserId?: string;
}

const MessageBubble = memo(({
    message,
    isOwnMessage,
    onLongPress,
    onPress,
    onReaction,
    showAvatar = false,
    senderName,
    senderAvatar,
    currentUserId,
}: MessageBubbleProps) => {
    const renderMessageContent = () => {
        if (message.recalled) {
            return (
                <View style={styles.recalledContainer}>
                    <MaterialIcons name="block" size={14} color="#9ca3af" />
                    <Text style={styles.recalledText}>
                        {message.content || 'Tin nhắn đã được thu hồi'}
                    </Text>
                </View>
            );
        }

        switch (message.type) {
            case 'IMAGE':
                return <ImageMessage imageUrl={message.content} />;
            case 'VIDEO':
                return <VideoMessage videoUrl={message.content} />;
            case 'FILE':
            case 'DOCUMENT':
                return (
                    <FileMessage
                        fileUrl={message.content}
                        fileName={message.fileName || message.content?.split('/').pop() || 'File'}
                        fileSize={message.fileSize}
                    />
                );
            case 'AUDIO':
            case 'VOICE':
                return <VoicePlayer voiceUrl={message.content} />;
            default:
                return (
                    <Text style={[
                        styles.messageText,
                        isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                    ]}>
                        {message.content}
                    </Text>
                );
        }
    };

    return (
        <TouchableOpacity
            onLongPress={() => onLongPress?.(message)}
            onPress={() => onPress?.(message)}
            activeOpacity={0.7}
            style={[
                styles.container,
                isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
            ]}
        >
            {/* Avatar cho tin nhắn nhóm */}
            {showAvatar && !isOwnMessage && (
                <View style={styles.avatarContainer}>
                    {senderAvatar ? (
                        <Image source={{ uri: senderAvatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                                {senderName?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.bubbleWrapper}>
                {/* Tên người gửi (cho nhóm) */}
                {showAvatar && !isOwnMessage && senderName && (
                    <Text style={styles.senderName}>{senderName}</Text>
                )}

                {/* Bubble chính */}
                <View style={[
                    styles.bubble,
                    isOwnMessage ? styles.ownBubble : styles.otherBubble,
                    message.recalled && styles.recalledBubble,
                ]}>
                    {/* Tin nhắn được reply */}
                    {message.replyTo && (
                        <View style={styles.replyContainer}>
                            <View style={styles.replyBar} />
                            <Text style={styles.replyText} numberOfLines={1}>
                                {message.replyTo.content}
                            </Text>
                        </View>
                    )}

                    {/* Nội dung tin nhắn */}
                    {renderMessageContent()}

                    {/* Thời gian & trạng thái */}
                    <View style={styles.metaContainer}>
                        <Text style={styles.timeText}>
                            {new Date(message.createAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                        {message.isEdited && (
                            <Text style={styles.editedText}> (đã chỉnh sửa)</Text>
                        )}
                        {isOwnMessage && (
                            <MaterialIcons
                                name={message.isRead ? 'done-all' : 'done'}
                                size={14}
                                color={message.isRead ? '#0091ff' : '#9ca3af'}
                                style={styles.readIcon}
                            />
                        )}
                    </View>
                </View>

                {/* Reactions - hiển thị dưới bubble */}
                {message.reactions && message.reactions.length > 0 && (
                    <MessageReactions
                        reactions={message.reactions}
                        currentUserId={currentUserId}
                        onToggle={onReaction ? (emoji) => onReaction(message, emoji) : undefined}
                    />
                )}

                {/* Pin indicator */}
                {message.isPinned && (
                    <View style={styles.pinIndicator}>
                        <MaterialIcons name="push-pin" size={12} color="#f59e0b" />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginVertical: 4,
        marginHorizontal: 12,
    },
    ownMessageContainer: {
        justifyContent: 'flex-end',
    },
    otherMessageContainer: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        marginRight: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    bubbleWrapper: {
        maxWidth: '75%',
    },
    senderName: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
        marginLeft: 4,
    },
    bubble: {
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    ownBubble: {
        backgroundColor: '#10b981',
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
    },
    recalledBubble: {
        backgroundColor: '#f3f4f6',
    },
    recalledContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    recalledText: {
        fontSize: 14,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    ownMessageText: {
        color: '#fff',
    },
    otherMessageText: {
        color: '#111827',
    },
    replyContainer: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingLeft: 8,
    },
    replyBar: {
        width: 3,
        backgroundColor: '#10b981',
        marginRight: 8,
        borderRadius: 2,
    },
    replyText: {
        fontSize: 13,
        color: '#6b7280',
        fontStyle: 'italic',
        flex: 1,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        color: '#9ca3af',
    },
    editedText: {
        fontSize: 11,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    readIcon: {
        marginLeft: 2,
    },
    pinIndicator: {
        position: 'absolute',
        top: -8,
        right: 8,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
});

export default MessageBubble;
