// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Vibration,
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

export default function IncomingCallScreen() {
    const router = useRouter();

    const params = useLocalSearchParams();
    const callerId = params.callerId as string;
    const callerName = params.callerName as string;
    const callerAvatar = params.callerAvatar as string;
    const isVideo = params.isVideo === 'true';
    const conversationId = params.conversationId as string;
    const offer = params.offer ? JSON.parse(params.offer as string) : null;
    const isGroupCall = params.isGroupCall === 'true';
    const groupId = params.groupId as string;
    const groupName = params.groupName as string;
    const allMemberIds: string[] = params.allMemberIds
        ? JSON.parse(params.allMemberIds as string)
        : [];

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const myUserId = localStorage.getItem('userId');

    // Buffer for group ICE candidates received before peer connection is initialized
    const groupIceBufRef = useRef([]);

    useEffect(() => {
        Vibration.vibrate([0, 1000, 500, 1000, 500], true);

        // Listen for call-cancel, call-end, and ICE candidates while ringing
        registerCallSignalHandler((signal) => {
            if (!signal) return;
            if (signal.type === 'call-cancel' || signal.type === 'call-end') {
                Vibration.cancel();
                unregisterCallSignalHandler();
                if (isGroupCall) webrtcService.endGroupCall();
                else webrtcService.endCall();
                router.back();
            } else if (signal.type === 'ice-candidate' && signal.data) {
                if (isGroupCall) {
                    // Buffer group ICE candidates; flushed after initializeGroupPeerConnection
                    const candidate = signal.data.candidate || signal.data;
                    groupIceBufRef.current.push(candidate);
                } else {
                    webrtcService.addIceCandidate(signal.data).catch(() => {});
                }
            }
        });

        return () => {
            Vibration.cancel();
            unregisterCallSignalHandler();
        };
    }, []);

    const handleAccept = async () => {
        Vibration.cancel();
        unregisterCallSignalHandler();
        try {
            if (isGroupCall) {
                // ── Group call accept ──
                await webrtcService.startGroupCall(isVideo);
                webrtcService.initializeGroupPeerConnection(
                    callerId,
                    (peerId, candidate) => {
                        sendCallSignal('ice-candidate', { candidate, isGroupCall: true, groupId }, peerId, token);
                    },
                    (_peerId, _stream) => { /* group-active polls getGroupRemoteStreams() */ },
                );
                // Flush ICE candidates that arrived while ringing
                for (const candidate of groupIceBufRef.current) {
                    webrtcService.addGroupIceCandidate(callerId, candidate).catch(() => {});
                }
                groupIceBufRef.current = [];
                if (offer) {
                    const answer = await webrtcService.createGroupAnswer(callerId, offer);
                    await webrtcService.enableGroupIceProcessing(callerId);
                    sendCallSignal('answer', { answer, isGroupCall: true, groupId }, callerId, token);
                }
                if (myUserId && myUserId !== callerId) {
                    sendCallSignal('call-cancel', { reason: 'answered_elsewhere' }, myUserId, token);
                }
                router.replace({
                    pathname: '/call/group-active',
                    params: {
                        groupId: groupId || conversationId,
                        groupName: groupName || callerName || 'Nhóm',
                        isVideo: String(isVideo),
                        memberIds: JSON.stringify(allMemberIds.length ? allMemberIds : [callerId]),
                        callerId,       // who we already answered (to skip re-offering)
                        isInitiator: 'false',
                    },
                });
            } else {
                // ── 1-1 call accept ──
                webrtcService.initializePeerConnection(
                    (candidate) => { sendCallSignal('ice-candidate', candidate, callerId, token); },
                    () => {},
                );
                await webrtcService.startCall(isVideo);
                if (offer) {
                    await webrtcService.setRemoteDescription(offer);
                    await webrtcService.enableIceProcessing();
                    const answer = await webrtcService.createAnswer();
                    sendCallSignal('answer', { answer }, callerId, token);
                }
                if (myUserId && myUserId !== callerId) {
                    sendCallSignal('call-cancel', { reason: 'answered_elsewhere' }, myUserId, token);
                }
                router.replace({
                    pathname: '/call/active',
                    params: {
                        callerId,
                        callerName,
                        callerAvatar: callerAvatar || '',
                        isVideo: String(isVideo),
                        conversationId,
                        role: 'callee',
                    },
                });
            }
        } catch (err) {
            console.error('Error accepting call:', err);
            handleReject();
        }
    };

    const handleReject = () => {
        Vibration.cancel();
        unregisterCallSignalHandler();
        if (isGroupCall) {
            sendCallSignal('call-reject', { isGroupCall: true, groupId }, callerId, token);
            webrtcService.endGroupCall();
        } else {
            sendCallSignal('call-reject', {}, callerId, token);
            webrtcService.endCall();
        }
        if (myUserId && myUserId !== callerId) {
            sendCallSignal('call-cancel', { reason: 'rejected' }, myUserId, token);
        }
        router.back();
    };

    return (
        <View style={styles.container}>
            <View style={styles.callerSection}>
                <View style={styles.avatarWrapper}>
                    {callerAvatar ? (
                        <Image source={{ uri: callerAvatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Text style={styles.avatarInitial}>
                                {callerName?.[0]?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.pulseRing} />
                </View>

                <Text style={styles.callerName}>
                    {isGroupCall ? (groupName || callerName || 'Cuộc gọi nhóm') : (callerName || 'Người dùng')}
                </Text>
                {isGroupCall && (
                    <Text style={styles.callerSub}>Từ {callerName || 'thành viên nhóm'}</Text>
                )}
                <Text style={styles.callType}>
                    {isVideo
                        ? (isGroupCall ? 'Cuộc gọi video nhóm đến...' : 'Cuộc gọi video đến...')
                        : (isGroupCall ? 'Cuộc gọi thoại nhóm đến...' : 'Cuộc gọi thoại đến...')}
                </Text>
            </View>

            <View style={styles.actions}>
                <View style={styles.btnGroup}>
                    <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
                        <MaterialIcons name="call-end" size={36} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.actionLabel}>Từ chối</Text>
                </View>

                <View style={styles.btnGroup}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                        <MaterialIcons name={isVideo ? 'videocam' : 'call'} size={36} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.actionLabel}>Chấp nhận</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'space-between',
        paddingVertical: 80,
        alignItems: 'center',
    },
    callerSection: {
        alignItems: 'center',
        gap: 16,
    },
    avatarWrapper: {
        position: 'relative',
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#10b981',
    },
    avatarFallback: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#10b981',
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#10b981',
    },
    pulseRing: {
        position: 'absolute',
        width: 148,
        height: 148,
        borderRadius: 74,
        borderWidth: 2,
        borderColor: 'rgba(16, 185, 129, 0.35)',
    },
    callerName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#f1f5f9',
        textAlign: 'center',
    },
    callerSub: {
        fontSize: 13,
        color: '#64748b',
    },
    callType: {
        fontSize: 15,
        color: '#94a3b8',
    },
    actions: {
        flexDirection: 'row',
        gap: 64,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnGroup: {
        alignItems: 'center',
        gap: 10,
    },
    rejectBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        fontSize: 13,
        color: '#94a3b8',
    },
});
