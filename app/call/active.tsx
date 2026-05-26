// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as webrtcService from '../../src/services/webrtcService';
import {
    sendCallSignal,
    registerCallSignalHandler,
    unregisterCallSignalHandler,
} from '../../src/api/messageApi';
import localStorage from '../../src/utils/localStoragePolyfill';
import { CallControls, VideoView } from '../../src/components/call';

export default function ActiveCallScreen() {
    const router = useRouter();

    const params = useLocalSearchParams();
    const callerId = params.callerId as string;
    const callerName = params.callerName as string;
    const isVideo = params.isVideo === 'true';
    const conversationId = params.conversationId as string;

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    const role = params.role as string; // 'caller' | 'callee'

    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [callDuration, setCallDuration] = useState(0);
    const [remoteStream, setRemoteStream] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [callAccepted, setCallAccepted] = useState(role !== 'caller');

    const timerRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        const local = webrtcService.getLocalStream();
        if (local) setLocalStream(local);

        const remote = webrtcService.getRemoteStream();
        if (remote) setRemoteStream(remote);

        // Poll until remote stream becomes available
        pollRef.current = setInterval(() => {
            const remoteStream = webrtcService.getRemoteStream();
            if (remoteStream) {
                setRemoteStream(remoteStream);
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

    const handleToggleAudio = () => {
        const enabled = webrtcService.toggleAudio();
        setIsAudioEnabled(enabled);
    };

    const handleToggleVideo = () => {
        const enabled = webrtcService.toggleVideo();
        setIsVideoEnabled(enabled);
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
                <View style={styles.waitingArea}>
                    <View style={styles.avatarCircle}>
                        <MaterialIcons name="person" size={64} color="#10b981" />
                    </View>
                    <Text style={styles.nameText}>{callerName || 'Người dùng'}</Text>
                    <Text style={styles.statusText}>Đang gọi...</Text>
                </View>
                <CallControls
                    isAudioEnabled={isAudioEnabled}
                    isVideoEnabled={isVideoEnabled}
                    onToggleAudio={handleToggleAudio}
                    onEndCall={() => handleEndCall(true)}
                    showVideo={false}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            {isVideo ? (
                <>
                    {/* Remote video (full screen) */}
                    <VideoView
                        stream={remoteStream}
                        isLocal={false}
                        userName={callerName}
                        style={styles.remoteVideo}
                    />

                    {/* Local video (PiP) */}
                    {isVideoEnabled && (
                        <VideoView
                            stream={localStream}
                            isLocal={true}
                            isMuted={!isAudioEnabled}
                            style={styles.localVideo}
                        />
                    )}

                    {/* Call info overlay */}
                    <View style={styles.videoOverlay}>
                        <Text style={styles.overlayName}>{callerName}</Text>
                        <Text style={styles.overlayDuration}>{formatDuration(callDuration)}</Text>
                    </View>
                </>
            ) : (
                <View style={styles.audioCallArea}>
                    <View style={styles.avatarCircle}>
                        <MaterialIcons name="person" size={64} color="#10b981" />
                    </View>
                    <Text style={styles.nameText}>{callerName || 'Người dùng'}</Text>
                    <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
                </View>
            )}

            <CallControls
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                onToggleAudio={handleToggleAudio}
                onToggleVideo={isVideo ? handleToggleVideo : undefined}
                onEndCall={() => handleEndCall(true)}
                showVideo={isVideo}
                callDuration={formatDuration(callDuration)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    waitingArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    audioCallArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    avatarCircle: {
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
    nameText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#f1f5f9',
    },
    statusText: {
        fontSize: 18,
        color: '#94a3b8',
    },
    durationText: {
        fontSize: 18,
        color: '#94a3b8',
    },
    remoteVideo: {
        flex: 1,
    },
    localVideo: {
        position: 'absolute',
        top: 60,
        right: 16,
        width: 100,
        height: 140,
        zIndex: 10,
    },
    videoOverlay: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    overlayName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f1f5f9',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    overlayDuration: {
        fontSize: 14,
        color: '#94a3b8',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});
