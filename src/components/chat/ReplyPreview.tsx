// @ts-nocheck
// ReplyPreview - Component hiển thị preview tin nhắn đang reply
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ReplyPreviewProps {
    message: any;
    onCancel: () => void;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ message, onCancel }) => {
    if (!message) return null;

    const getPreviewText = () => {
        if (message.type === 'IMAGE') return '📷 Hình ảnh';
        if (message.type === 'VIDEO') return '🎥 Video';
        if (message.type === 'FILE') return '📎 File';
        if (message.type === 'VOICE') return '🎤 Tin nhắn thoại';
        return message.content || '';
    };

    return (
        <View style={styles.container}>
            <View style={styles.indicator} />
            <View style={styles.content}>
                <Text style={styles.label}>Đang trả lời</Text>
                <Text style={styles.senderName} numberOfLines={1}>
                    {message.senderName || 'Người dùng'}
                </Text>
                <Text style={styles.messageText} numberOfLines={2}>
                    {getPreviewText()}
                </Text>
            </View>
            <TouchableOpacity
                onPress={onCancel}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <MaterialIcons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    indicator: {
        width: 3,
        height: 40,
        backgroundColor: '#3b82f6',
        borderRadius: 2,
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: '600',
        marginBottom: 2,
    },
    senderName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    messageText: {
        fontSize: 13,
        color: '#6b7280',
    },
    closeButton: {
        padding: 4,
        marginLeft: 8,
    },
});

export default ReplyPreview;
