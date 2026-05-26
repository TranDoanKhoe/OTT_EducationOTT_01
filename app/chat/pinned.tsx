// @ts-nocheck
// Pinned Messages Screen - Xem tất cả tin nhắn đã ghim
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getPinnedMessages, unpinMessage } from '../../src/api/messageApi';
import { getAccessTokenSync, getUserId } from '../../src/utils/authHeader';
import { Toast } from 'react-native-toast-message/lib/src/Toast';

export default function PinnedMessagesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const conversationId = params.conversationId as string;
    const isGroup = params.isGroup === 'true';

    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUnpinning, setIsUnpinning] = useState<string | null>(null);

    useEffect(() => {
        loadPinnedMessages();
    }, []);

    const loadPinnedMessages = async () => {
        const token = getAccessTokenSync();
        const userId = getUserId();

        if (!token || !userId) {
            Toast.show({
                type: 'error',
                text1: 'Vui lòng đăng nhập',
            });
            setIsLoading(false);
            return;
        }

        try {
            const messages = await getPinnedMessages(
                isGroup ? null : conversationId,
                isGroup ? conversationId : null,
                userId,
                token
            );
            setPinnedMessages(messages || []);
        } catch (error) {
            console.error('Error loading pinned messages:', error);
            Toast.show({
                type: 'error',
                text1: 'Không thể tải tin nhắn đã ghim',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnpin = async (message: any) => {
        const token = getAccessTokenSync();
        const userId = getUserId();

        if (!token || !userId) {
            Toast.show({
                type: 'error',
                text1: 'Vui lòng đăng nhập',
            });
            return;
        }

        setIsUnpinning(message.id);

        try {
            const success = await unpinMessage(message.id, userId, token);
            if (success) {
                setPinnedMessages((prev) =>
                    prev.filter((msg) => msg.id !== message.id)
                );
                Toast.show({
                    type: 'success',
                    text1: 'Đã bỏ ghim',
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Không thể bỏ ghim tin nhắn',
                });
            }
        } catch (error) {
            console.error('Error unpinning message:', error);
            Toast.show({
                type: 'error',
                text1: 'Lỗi bỏ ghim tin nhắn',
            });
        } finally {
            setIsUnpinning(null);
        }
    };

    const handleNavigateToMessage = (message: any) => {
        // Navigate back to chat and scroll to message
        router.back();
        // TODO: Implement scroll to message functionality
    };

    const renderMessage = ({ item }: { item: any }) => {
        const getMessagePreview = () => {
            if (item.type === 'IMAGE') return '📷 Hình ảnh';
            if (item.type === 'VIDEO') return '🎥 Video';
            if (item.type === 'FILE') return '📎 File';
            if (item.type === 'VOICE') return '🎤 Tin nhắn thoại';
            return item.content || '';
        };

        return (
            <TouchableOpacity
                style={styles.messageItem}
                onPress={() => handleNavigateToMessage(item)}
                activeOpacity={0.7}
            >
                <View style={styles.messageContent}>
                    <View style={styles.messageHeader}>
                        <Text style={styles.senderName} numberOfLines={1}>
                            {item.senderName || 'Người dùng'}
                        </Text>
                        <Text style={styles.messageTime}>
                            {new Date(item.createAt).toLocaleDateString('vi-VN')}
                        </Text>
                    </View>
                    <Text style={styles.messageText} numberOfLines={3}>
                        {getMessagePreview()}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => handleUnpin(item)}
                    style={styles.unpinButton}
                    disabled={isUnpinning === item.id}
                >
                    {isUnpinning === item.id ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                        <MaterialIcons name="push-pin" size={20} color="#ef4444" />
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tin nhắn đã ghim</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            ) : pinnedMessages.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="push-pin" size={64} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>Chưa có tin nhắn ghim</Text>
                    <Text style={styles.emptyText}>
                        Ghim tin nhắn quan trọng để dễ dàng tìm lại
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={pinnedMessages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    placeholder: {
        width: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 15,
        color: '#6b7280',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    listContent: {
        paddingVertical: 8,
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    messageContent: {
        flex: 1,
        marginRight: 12,
    },
    messageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    senderName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
    },
    messageTime: {
        fontSize: 12,
        color: '#9ca3af',
        marginLeft: 8,
    },
    messageText: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    unpinButton: {
        padding: 8,
    },
});
