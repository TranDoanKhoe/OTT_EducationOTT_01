// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar,
    FlatList, Dimensions,
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

const { width: SCREEN_W } = Dimensions.get('window');

export default function GroupActiveCallScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const groupId = params.groupId as string;
    const groupName = params.groupName as string;
    const isVideo = params.isVideo === 'true';
    const memberIdsParam = params.memberIds as string;
    const isInitiator = params.isInitiator !== 'false'; // default true for caller
    const answeredCallerId = params.callerId as string; // peer we already answered (non-initiator only)

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const myUserId = localStorage.getItem('userId');

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [remoteStreams, setRemoteStreams] = useState([]); // [{peerId, streamUrl}]
    const [localStreamUrl, setLocalStreamUrl] = useState(null);

    const timerRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        const local = webrtcService.getGroupLocalStream();
        if (local) setLocalStreamUrl(local.toURL());

        // Full-mesh: if we're a non-initiator, send offers to all other members
        // (we already answered the caller, so skip them)
        if (!isInitiator) {
            const memberIds = memberIdsParam ? JSON.parse(memberIdsParam) : [];
            const peersToOffer = memberIds.filter(
                (pid: string) => pid !== myUserId && pid !== answeredCallerId
                    && String(myUserId) < String(pid), // avoid offer collision: smaller userId initiates
            );
            peersToOffer.forEach(async (peerId: string) => {
                try {
                    webrtcService.initializeGroupPeerConnection(
                        peerId,
                        (pid: string, candidate: any) => {
                            sendCallSignal('ice-candidate', { candidate, isGroupCall: true, groupId }, pid, token);
                        },
                        (pid: string, stream: any) => {
                            setRemoteStreams((prev) => {
                                const exists = prev.find((s) => s.peerId === pid);
                                if (exists) return prev.map((s) => s.peerId === pid ? { ...s, url: stream.toURL() } : s);
                                return [...prev, { peerId: pid, url: stream.toURL() }];
                            });
                        },
                    );
                    const offer = await webrtcService.createGroupOffer(peerId);
                    await webrtcService.enableGroupIceProcessing(peerId);
                    sendCallSignal('offer', { offer, isGroupCall: true, groupId, allMemberIds: memberIds }, peerId, token);
                } catch (e) {
                    console.error('Mesh offer error to', peerId, e);
                }
            });
        }

        timerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);

        // Poll for new remote streams becoming available
        pollRef.current = setInterval(() => {
            const streams = webrtcService.getGroupRemoteStreams();
            if (streams.length > 0) {
                setRemoteStreams(streams.map((s) => ({ peerId: s.peerId, url: s.stream.toURL() })));
            }
        }, 500);

        // Listen for signals while in group call
        registerCallSignalHandler((signal) => {
            if (!signal || String(signal.data?.groupId) !== String(groupId)) return;
            const { type, data, senderId } = signal;

            if (type === 'answer' && data?.answer) {
                webrtcService.setGroupRemoteDescription(senderId, data.answer)
                    .then(() => webrtcService.enableGroupIceProcessing(senderId))
                    .catch((e) => console.error('Group answer error:', e));
            } else if (type === 'ice-candidate' && data?.candidate) {
                webrtcService.addGroupIceCandidate(senderId, data.candidate)
                    .catch((e) => console.error('Group ICE error:', e));
            } else if (type === 'offer' && data?.offer) {
                // New participant joined — accept their offer
                handleIncomingPeerOffer(senderId, data.offer);
            } else if (type === 'call-end' || type === 'call-cancel') {
                webrtcService.closeGroupPeerConnection(senderId);
                setRemoteStreams((prev) => prev.filter((s) => s.peerId !== senderId));
            }
        });

        return () => {
            clearInterval(timerRef.current);
            clearInterval(pollRef.current);
            unregisterCallSignalHandler();
        };
    }, []);

    const handleIncomingPeerOffer = async (peerId, offer) => {
        webrtcService.initializeGroupPeerConnection(
            peerId,
            (pid, candidate) => {
                sendCallSignal('ice-candidate', { candidate, isGroupCall: true, groupId }, pid, token);
            },
            (pid, stream) => {
                setRemoteStreams((prev) => {
                    const exists = prev.find((s) => s.peerId === pid);
                    if (exists) return prev.map((s) => s.peerId === pid ? { ...s, url: stream.toURL() } : s);
                    return [...prev, { peerId: pid, url: stream.toURL() }];
                });
            },
        );
        const answer = await webrtcService.createGroupAnswer(peerId, offer);
        await webrtcService.enableGroupIceProcessing(peerId);
        sendCallSignal('answer', { answer, isGroupCall: true, groupId }, peerId, token);
    };

    const formatDuration = (s) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        return `${m}:${(s % 60).toString().padStart(2, '0')}`;
    };

    const handleToggleMute = () => {
        const enabled = webrtcService.toggleGroupAudio();
        setIsMuted(!enabled);
    };

    const handleToggleCamera = () => {
        const enabled = webrtcService.toggleGroupVideo();
        setIsCameraOff(!enabled);
    };

    const handleEndCall = () => {
        clearInterval(timerRef.current);
        clearInterval(pollRef.current);
        unregisterCallSignalHandler();

        // Notify all peers
        const memberIds = memberIdsParam ? JSON.parse(memberIdsParam) : [];
        memberIds.forEach((pid) => {
            if (pid !== myUserId) {
                sendCallSignal('call-end', { isGroupCall: true, groupId }, pid, token);
            }
        });
        remoteStreams.forEach(({ peerId }) => {
            sendCallSignal('call-end', { isGroupCall: true, groupId }, peerId, token);
        });

        webrtcService.endGroupCall();
        router.back();
    };

    const renderRemoteStream = ({ item, index }) => {
        const isSingle = remoteStreams.length === 1;
        const tileW = isSingle ? SCREEN_W : SCREEN_W / 2;
        return (
            <View style={[styles.peerTile, { width: tileW, flex: isSingle ? 1 : undefined, height: isSingle ? undefined : tileW * 0.9 }]}>
                {item.url ? (
                    <RTCView streamURL={item.url} style={styles.peerVideo} objectFit="cover" />
                ) : (
                    <View style={styles.peerPlaceholder}>
                        <MaterialIcons name="person" size={36} color="#475569" />
                    </View>
                )}
                <Text style={styles.peerLabel}>Thành viên {index + 1}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.groupName}>{groupName || 'Cuộc gọi nhóm'}</Text>
                <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
                <Text style={styles.participantCount}>
                    {remoteStreams.length + 1} thành viên
                </Text>
            </View>

            {/* Remote streams grid */}
            <View style={styles.streamGrid}>
                {remoteStreams.length === 0 ? (
                    <View style={styles.waitingBox}>
                        <MaterialIcons name="group" size={48} color="#334155" />
                        <Text style={styles.waitingText}>Đang chờ thành viên tham gia...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={remoteStreams}
                        keyExtractor={(item) => item.peerId}
                        numColumns={remoteStreams.length > 1 ? 2 : 1}
                        key={remoteStreams.length > 1 ? 'two-col' : 'one-col'}
                        renderItem={renderRemoteStream}
                        scrollEnabled={remoteStreams.length > 4}
                        style={{ flex: 1 }}
                        contentContainerStyle={remoteStreams.length === 1 ? { flex: 1 } : undefined}
                    />
                )}
            </View>

            {/* Local PiP */}
            {localStreamUrl && isVideo && !isCameraOff && (
                <RTCView
                    streamURL={localStreamUrl}
                    style={styles.localPip}
                    objectFit="cover"
                    mirror={true}
                />
            )}

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                    onPress={handleToggleMute}
                >
                    <MaterialIcons name={isMuted ? 'mic-off' : 'mic'} size={26} color={isMuted ? '#ef4444' : '#fff'} />
                    <Text style={styles.controlLabel}>{isMuted ? 'Tắt tiếng' : 'Micro'}</Text>
                </TouchableOpacity>

                {isVideo && (
                    <TouchableOpacity
                        style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
                        onPress={handleToggleCamera}
                    >
                        <MaterialIcons name={isCameraOff ? 'videocam-off' : 'videocam'} size={26} color={isCameraOff ? '#ef4444' : '#fff'} />
                        <Text style={styles.controlLabel}>{isCameraOff ? 'Camera tắt' : 'Camera'}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
                    <MaterialIcons name="call-end" size={30} color="#fff" />
                    <Text style={styles.controlLabel}>Kết thúc</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 12,
        alignItems: 'center',
        gap: 4,
    },
    groupName: { fontSize: 20, fontWeight: 'bold', color: '#f1f5f9' },
    duration: { fontSize: 14, color: '#94a3b8' },
    participantCount: { fontSize: 12, color: '#64748b' },
    streamGrid: { flex: 1 },
    waitingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
    waitingText: { color: '#475569', fontSize: 15 },
    peerTile: { backgroundColor: '#1e293b', overflow: 'hidden', position: 'relative' },
    peerVideo: { flex: 1 },
    peerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    peerLabel: {
        position: 'absolute',
        bottom: 6,
        left: 8,
        fontSize: 11,
        color: '#f1f5f9',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    localPip: {
        position: 'absolute',
        top: 100,
        right: 12,
        width: 90,
        height: 120,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#1e293b',
        overflow: 'hidden',
        zIndex: 20,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 28,
        paddingVertical: 28,
        backgroundColor: 'rgba(15,23,42,0.92)',
    },
    controlBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlBtnActive: { backgroundColor: '#2d1a1a' },
    endCallBtn: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
});
