// @ts-nocheck
// ChatHeader - Component header của chat (tương tự header trên Web)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ChatHeaderProps {
    name: string;
    avatar?: string;
    isOnline?: boolean;
    isTyping?: boolean;
    onBack?: () => void;
    onOpenInfo?: () => void;
    onAudioCall?: () => void;
    onVideoCall?: () => void;
    onSearch?: () => void;
    subtitle?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
    name,
    avatar,
    isOnline = false,
    isTyping = false,
    onBack,
    onOpenInfo,
    onAudioCall,
    onVideoCall,
    onSearch,
    subtitle,
}) => {
    return (
        <View style={styles.container}>
            {/* Left: Back button + Avatar + Name */}
            <View style={styles.leftSection}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={onOpenInfo}
                    style={styles.userInfo}
                    activeOpacity={0.7}
                >
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarText}>
                                    {name?.charAt(0)?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                        {isOnline && <View style={styles.onlineIndicator} />}
                    </View>

                    {/* Name & Status */}
                    <View style={styles.nameContainer}>
                        <Text style={styles.name} numberOfLines={1}>
                            {name}
                        </Text>
                        {isTyping ? (
                            <Text style={styles.typingText}>đang nhập...</Text>
                        ) : subtitle ? (
                            <Text style={styles.subtitle} numberOfLines={1}>
                                {subtitle}
                            </Text>
                        ) : isOnline ? (
                            <Text style={styles.onlineText}>Đang hoạt động</Text>
                        ) : null}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Right: Action buttons */}
            <View style={styles.rightSection}>
                {onAudioCall && (
                    <TouchableOpacity onPress={onAudioCall} style={styles.iconButton}>
                        <MaterialIcons name="phone" size={22} color="#10b981" />
                    </TouchableOpacity>
                )}

                {onVideoCall && (
                    <TouchableOpacity onPress={onVideoCall} style={styles.iconButton}>
                        <MaterialIcons name="videocam" size={24} color="#10b981" />
                    </TouchableOpacity>
                )}

                {onSearch && (
                    <TouchableOpacity onPress={onSearch} style={styles.iconButton}>
                        <MaterialIcons name="search" size={22} color="#10b981" />
                    </TouchableOpacity>
                )}

                {onOpenInfo && (
                    <TouchableOpacity onPress={onOpenInfo} style={styles.iconButton}>
                        <MaterialIcons name="info-outline" size={22} color="#10b981" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        padding: 8,
        marginRight: 4,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: '#fff',
    },
    nameContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    onlineText: {
        fontSize: 12,
        color: '#10b981',
    },
    typingText: {
        fontSize: 12,
        color: '#10b981',
        fontStyle: 'italic',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    iconButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ChatHeader;
