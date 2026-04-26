// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RTCView } from 'react-native-webrtc';
import { MaterialIcons } from '@expo/vector-icons';
import * as webrtcService from '../../src/services/webrtcService';
import {
    sendCallSignal,
    registerCallSignalHandler,
    unregisterCallSignalHandler,
} from '../../src/api/messageApi';
import localStorage from '../../src/utils/localStoragePolyfill';

export default function ActiveCallScreen() {
    const router = useRouter();

    const params = useLocalSearchParams();
    const callerId = params.callerId as string;
    const callerName = params.callerName as string;
    const isVideo = params.isVideo === 'true';
    const conversationId = params.conversationId as string;

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    const role = params.role as string; // 'caller' | 'callee'

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [remoteStreamUrl, setRemoteStreamUrl] = useState(null);
    const [localStreamUrl, setLocalStreamUrl] = useState(null);
    const [callAccepted, setCallAccepted] = useState(role !== 'caller');

    const timerRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        const local = webrtcService.getLocalStream();
        if (local) setLocalStreamUrl(local.toURL());

        const remote = webrtcService.getRemoteStream();
        if (remote) setRemoteStreamUrl(remote.toURL());

        // Poll until remote stream becomes available
        pollRef.current = setInterval(() => {
            const remoteStream = webrtcService.getRemoteStream();
            if (remoteStream) {
                setRemoteStreamUrl(remoteStream.toURL());
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        }, 500);

        // Listen for remote call-end / call-reject via the global registry
        registerCallSignalHandler((signal) => {
            if (!signal) return;
            const { type } = signal;
            if (type === 'call-end' || type === 'call-reject' || type === 'call-cancel') {
                handleEndCall(false);
            } else if (type === 'answer' && signal.data?.answer) {
                webrtcService.setRemoteDescription(signal.data.answer)
                    .then(() => webrtcService.enableIceProcessing())
                    .catch((e) => console.error('setRemoteDescription error:', e));
                setCallAccepted(true);
            } else if (type === 'ice-candidate' && signal.data) {
                webrtcService.addIceCandidate(signal.data)
                    .catch((e) => console.error('addIceCandidate error:', e));
            }
        });

        return () => {
            clearInterval(timerRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
            unregisterCallSignalHandler();
        };
    }, []);

    // Bắt đầu đếm giờ khi cuộc gọi được chấp nhận
    useEffect(() => {
        if (callAccepted) {
            timerRef.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [callAccepted]);

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleToggleMute = () => {
        const enabled = webrtcService.toggleAudio();
        setIsMuted(!enabled);
    };

    const handleToggleCamera = () => {
        const enabled = webrtcService.toggleVideo();
        setIsCameraOff(!enabled);
    };

    const handleEndCall = (sendSignal = true) => {
        clearInterval(timerRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
        unregisterCallSignalHandler();

        if (sendSignal) {
            sendCallSignal('call-end', {}, callerId, token);
        }

        webrtcService.endCall();
        router.back();
    };

    // Màn hình đang chờ người kia bắt máy
    if (!callAccepted) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
                <View style={styles.audioCallArea}>
                    <View style={styles.audioAvatar}>
                        <MaterialIcons name="person" size={64} color="#10b981" />
                    </View>
                    <Text style={styles.callerNameText}>{callerName || 'Người dùng'}</Text>
                    <Text style={styles.durationText}>Đang gọi...</Text>
                </View>
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.endCallBtn} onPress={() => handleEndCall(true)}>
                        <MaterialIcons name="call-end" size={32} color="#fff" />
                        <Text style={styles.controlLabel}>Hủy</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            {isVideo ? (
                <>
                    {remoteStreamUrl ? (
                        <RTCView
                            streamURL={remoteStreamUrl}
                            style={styles.remoteVideo}
                            objectFit="cover"
                            mirror={false}
                        />
                    ) : (
                        <View style={styles.remoteVideoPlaceholder}>
                            <MaterialIcons name="videocam-off" size={48} color="#475569" />
                            <Text style={styles.waitingText}>Đang kết nối...</Text>
                        </View>
                    )}

                    {localStreamUrl && !isCameraOff && (
                        <RTCView
                            streamURL={localStreamUrl}
                            style={styles.localVideo}
                            objectFit="cover"
                            mirror={true}
                        />
                    )}
                </>
            ) : (
                <View style={styles.audioCallArea}>
                    <View style={styles.audioAvatar}>
                        <MaterialIcons name="person" size={64} color="#10b981" />
                    </View>
                    <Text style={styles.callerNameText}>{callerName || 'Người dùng'}</Text>
                    <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
                </View>
            )}

            {isVideo && (
                <View style={styles.videoOverlayTop}>
                    <Text style={styles.callerNameOverlay}>{callerName}</Text>
                    <Text style={styles.durationOverlay}>{formatDuration(callDuration)}</Text>
                </View>
            )}

            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                    onPress={handleToggleMute}
                >
                    <MaterialIcons
                        name={isMuted ? 'mic-off' : 'mic'}
                        size={28}
                        color={isMuted ? '#ef4444' : '#fff'}
                    />
                    <Text style={styles.controlLabel}>{isMuted ? 'Tắt tiếng' : 'Micro'}</Text>
                </TouchableOpacity>

                {isVideo && (
                    <TouchableOpacity
                        style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
                        onPress={handleToggleCamera}
                    >
                        <MaterialIcons
                            name={isCameraOff ? 'videocam-off' : 'videocam'}
                            size={28}
                            color={isCameraOff ? '#ef4444' : '#fff'}
                        />
                        <Text style={styles.controlLabel}>{isCameraOff ? 'Camera tắt' : 'Camera'}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.endCallBtn} onPress={() => handleEndCall(true)}>
                    <MaterialIcons name="call-end" size={32} color="#fff" />
                    <Text style={styles.controlLabel}>Kết thúc</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    remoteVideo: {
        flex: 1,
    },
    remoteVideoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    waitingText: {
        color: '#64748b',
        fontSize: 16,
    },
    localVideo: {
        position: 'absolute',
        top: 60,
        right: 16,
        width: 100,
        height: 140,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#1e293b',
        overflow: 'hidden',
        zIndex: 10,
    },
    audioCallArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    audioAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#10b981',
        marginBottom: 8,
    },
    callerNameText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#f1f5f9',
    },
    durationText: {
        fontSize: 18,
        color: '#94a3b8',
    },
    videoOverlayTop: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    callerNameOverlay: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f1f5f9',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    durationOverlay: {
        fontSize: 14,
        color: '#94a3b8',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
        paddingVertical: 32,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
    },
    controlBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    controlBtnActive: {
        backgroundColor: '#2d1a1a',
    },
    endCallBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    controlLabel: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
    },
});
