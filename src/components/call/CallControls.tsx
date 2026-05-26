// @ts-nocheck
// CallControls - Component điều khiển cuộc gọi (mute, video, end call)
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CallControlsProps {
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    onToggleAudio: () => void;
    onToggleVideo?: () => void;
    onEndCall: () => void;
    showVideo?: boolean;
    callDuration?: string;
}

const CallControls: React.FC<CallControlsProps> = ({
    isAudioEnabled,
    isVideoEnabled,
    onToggleAudio,
    onToggleVideo,
    onEndCall,
    showVideo = true,
    callDuration,
}) => {
    return (
        <View style={styles.container}>
            {/* Call duration */}
            {callDuration && (
                <View style={styles.durationContainer}>
                    <Text style={styles.durationText}>{callDuration}</Text>
                </View>
            )}

            {/* Control buttons */}
            <View style={styles.controlsRow}>
                {/* Mute/Unmute Audio */}
                <TouchableOpacity
                    onPress={onToggleAudio}
                    style={[
                        styles.controlButton,
                        !isAudioEnabled && styles.controlButtonDisabled,
                    ]}
                >
                    <MaterialIcons
                        name={isAudioEnabled ? 'mic' : 'mic-off'}
                        size={28}
                        color="#fff"
                    />
                    <Text style={styles.controlLabel}>
                        {isAudioEnabled ? 'Tắt mic' : 'Bật mic'}
                    </Text>
                </TouchableOpacity>

                {/* End Call */}
                <TouchableOpacity
                    onPress={onEndCall}
                    style={[styles.controlButton, styles.endCallButton]}
                >
                    <MaterialIcons name="call-end" size={32} color="#fff" />
                    <Text style={styles.controlLabel}>Kết thúc</Text>
                </TouchableOpacity>

                {/* Toggle Video (if video call) */}
                {showVideo && onToggleVideo && (
                    <TouchableOpacity
                        onPress={onToggleVideo}
                        style={[
                            styles.controlButton,
                            !isVideoEnabled && styles.controlButtonDisabled,
                        ]}
                    >
                        <MaterialIcons
                            name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                            size={28}
                            color="#fff"
                        />
                        <Text style={styles.controlLabel}>
                            {isVideoEnabled ? 'Tắt camera' : 'Bật camera'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    durationContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    durationText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
    },
    controlButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    controlButtonDisabled: {
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
    },
    endCallButton: {
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    controlLabel: {
        fontSize: 11,
        color: '#fff',
        marginTop: 4,
        textAlign: 'center',
    },
});

export default CallControls;
