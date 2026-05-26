// @ts-nocheck
// VoiceRecorder - Component ghi âm tin nhắn thoại
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { Toast } from 'react-native-toast-message/lib/src/Toast';

interface VoiceRecorderProps {
    onSend: (uri: string, duration: number) => void;
    onCancel: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        startRecording();
        return () => {
            stopRecording();
        };
    }, []);

    useEffect(() => {
        if (isRecording && !isPaused) {
            // Pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Timer
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } else {
            pulseAnim.setValue(1);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRecording, isPaused]);

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({
                    type: 'error',
                    text1: 'Cần quyền truy cập microphone',
                });
                onCancel();
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
            Toast.show({
                type: 'error',
                text1: 'Không thể ghi âm',
            });
            onCancel();
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            setIsRecording(false);
            return uri;
        } catch (error) {
            console.error('Failed to stop recording:', error);
            return null;
        }
    };

    const handlePauseResume = async () => {
        if (!recording) return;

        try {
            if (isPaused) {
                await recording.startAsync();
                setIsPaused(false);
            } else {
                await recording.pauseAsync();
                setIsPaused(true);
            }
        } catch (error) {
            console.error('Failed to pause/resume recording:', error);
        }
    };

    const handleSend = async () => {
        const uri = await stopRecording();
        if (uri) {
            onSend(uri, duration);
        } else {
            Toast.show({
                type: 'error',
                text1: 'Không thể lưu ghi âm',
            });
            onCancel();
        }
    };

    const handleCancel = async () => {
        await stopRecording();
        onCancel();
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Recording indicator */}
                <Animated.View
                    style={[
                        styles.recordingIndicator,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    <MaterialIcons name="mic" size={24} color="#fff" />
                </Animated.View>

                {/* Duration */}
                <Text style={styles.duration}>{formatDuration(duration)}</Text>

                {/* Status */}
                <Text style={styles.status}>
                    {isPaused ? 'Đã tạm dừng' : 'Đang ghi âm...'}
                </Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    onPress={handleCancel}
                    style={styles.cancelButton}
                >
                    <MaterialIcons name="close" size={28} color="#ef4444" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handlePauseResume}
                    style={styles.pauseButton}
                >
                    <MaterialIcons
                        name={isPaused ? 'play-arrow' : 'pause'}
                        size={28}
                        color="#3b82f6"
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSend}
                    style={styles.sendButton}
                >
                    <MaterialIcons name="send" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    content: {
        alignItems: 'center',
        marginBottom: 20,
    },
    recordingIndicator: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    duration: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    status: {
        fontSize: 14,
        color: '#6b7280',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
    },
    cancelButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pauseButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default VoiceRecorder;
