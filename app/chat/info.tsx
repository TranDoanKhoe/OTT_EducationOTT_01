// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getFriendById } from '../../src/api/user';
import { sendCallSignal } from '../../src/api/messageApi';
import * as webrtcService from '../../src/services/webrtcService';
import localStorage from '../../src/utils/localStoragePolyfill';
import { requestMediaPermissions } from '../../src/utils/mediaPermissions';

export default function ChatInfoScreen() {
    const router = useRouter();
    const { id, name } = useLocalSearchParams();

    const [loading, setLoading] = useState(true);
    const [friend, setFriend] = useState(null);
    const [calling, setCalling] = useState(false);

    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

    useEffect(() => {
        const loadFriend = async () => {
            if (!id) {
                setLoading(false);
                return;
            }

            try {
                const data = await getFriendById(String(id));
                setFriend(data || null);
            } catch (error) {
                setFriend(null);
            } finally {
                setLoading(false);
            }
        };

        loadFriend();
    }, [id]);

    const displayName =
        friend?.name || (typeof name === 'string' ? name : '') || 'Người dùng';
    const avatarUri = friend?.avatar || null;
    const initial = displayName.charAt(0).toUpperCase();

    const initiateCall = async (isVideo) => {
        if (!token) {
            Alert.alert('Lỗi', 'Vui lòng đăng nhập lại.');
            return;
        }
        if (calling) return;
        setCalling(true);
        try {
            const hasPermissions = await requestMediaPermissions(isVideo);
            if (!hasPermissions) return;

            webrtcService.initializePeerConnection(
                (candidate) => { sendCallSignal('ice-candidate', candidate, String(id), token); },
                () => {},
            );
            await webrtcService.startCall(isVideo);
            const offer = await webrtcService.createOffer();
            sendCallSignal('offer', { offer, isVideoCall: isVideo }, String(id), token);
            await webrtcService.enableIceProcessing();
            router.push({
                pathname: '/call/active',
                params: {
                    callerId: String(id),
                    callerName: displayName,
                    callerAvatar: avatarUri || '',
                    isVideo: String(isVideo),
                    conversationId: String(id),
                    role: 'caller',
                },
            });
        } catch (err) {
            webrtcService.endCall();
            Alert.alert('Lỗi', err.message || 'Không thể khởi tạo cuộc gọi.');
        } finally {
            setCalling(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.iconBtn}
                >
                    <MaterialIcons
                        name="arrow-back"
                        size={24}
                        color="#111827"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    Thông tin cuộc trò chuyện
                </Text>
                <View style={styles.iconBtn} />
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            ) : (
                <View style={styles.content}>
                    <View style={styles.avatarWrap}>
                        {avatarUri ? (
                            <Image
                                source={{ uri: avatarUri }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Text style={styles.avatarText}>{initial}</Text>
                        )}
                    </View>

                    <Text style={styles.nameText}>{displayName}</Text>
                    <Text style={styles.subText}>
                        {friend?.phone || 'Chưa có số điện thoại'}
                    </Text>

                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, calling && styles.actionBtnDisabled]}
                            onPress={() => initiateCall(false)}
                            disabled={calling}
                        >
                            {calling ? (
                                <ActivityIndicator size="small" color="#10b981" />
                            ) : (
                                <MaterialIcons
                                    name="call"
                                    size={22}
                                    color="#10b981"
                                />
                            )}
                            <Text style={styles.actionText}>Gọi</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, calling && styles.actionBtnDisabled]}
                            onPress={() => initiateCall(true)}
                            disabled={calling}
                        >
                            {calling ? (
                                <ActivityIndicator size="small" color="#10b981" />
                            ) : (
                                <MaterialIcons
                                    name="videocam"
                                    size={22}
                                    color="#10b981"
                                />
                            )}
                            <Text style={styles.actionText}>Video</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    iconBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
        paddingTop: 28,
        paddingHorizontal: 20,
    },
    avatarWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 38,
    },
    nameText: {
        marginTop: 14,
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    subText: {
        marginTop: 6,
        fontSize: 14,
        color: '#6b7280',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    actionBtn: {
        width: 110,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnDisabled: {
        opacity: 0.5,
    },
    actionText: {
        marginTop: 6,
        color: '#047857',
        fontWeight: '600',
        fontSize: 13,
    },
});
