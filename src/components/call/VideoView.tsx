// @ts-nocheck
// VideoView - Component hiển thị video stream
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { MaterialIcons } from '@expo/vector-icons';

interface VideoViewProps {
    stream: any;
    isLocal?: boolean;
    isMuted?: boolean;
    userName?: string;
    style?: any;
}

const VideoView: React.FC<VideoViewProps> = ({
    stream,
    isLocal = false,
    isMuted = false,
    userName,
    style,
}) => {
    if (!stream) {
        return (
            <View style={[styles.container, styles.noStream, style]}>
                <MaterialIcons name="videocam-off" size={48} color="#9ca3af" />
                <Text style={styles.noStreamText}>
                    {isLocal ? 'Camera tắt' : 'Đang chờ...'}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <RTCView
                streamURL={stream.toURL()}
                style={styles.video}
                objectFit="cover"
                mirror={isLocal}
                zOrder={isLocal ? 1 : 0}
            />

            {/* User name label */}
            {userName && (
                <View style={styles.nameLabel}>
                    <Text style={styles.nameText}>{userName}</Text>
                </View>
            )}

            {/* Muted indicator */}
            {isMuted && (
                <View style={styles.mutedIndicator}>
                    <MaterialIcons name="mic-off" size={16} color="#fff" />
                </View>
            )}

            {/* Local indicator */}
            {isLocal && (
                <View style={styles.localIndicator}>
                    <Text style={styles.localText}>Bạn</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1f2937',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    noStream: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    noStreamText: {
        fontSize: 14,
        color: '#9ca3af',
    },
    nameLabel: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    nameText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    mutedIndicator: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#ef4444',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    localIndicator: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    localText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
});

export default VideoView;
