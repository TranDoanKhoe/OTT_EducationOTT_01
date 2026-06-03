// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchGroupInvites, acceptGroupInvite, rejectGroupInvite } from '../../src/api/groupApi';
import localStorage from '../../src/utils/localStoragePolyfill';

export default function GroupInvitesScreen() {
    const router = useRouter();
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    const loadInvites = useCallback(async () => {
        try {
            const data = await fetchGroupInvites(token);
            setInvites(data || []);
        } catch (e) {
            console.error('Lỗi tải lời mời nhóm:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        loadInvites();
    }, [loadInvites]);

    const onRefresh = () => {
        setRefreshing(true);
        loadInvites();
    };

    const handleAccept = async (invite) => {
        const inviteId = invite.id || invite._id;
        setProcessingId(inviteId);
        try {
            await acceptGroupInvite(inviteId, token);
            setInvites((prev) => prev.filter((i) => (i.id || i._id) !== inviteId));
            Alert.alert('Thành công', `Đã tham gia nhóm ${invite.groupName || 'nhóm'}`);
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể chấp nhận lời mời');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (invite) => {
        const inviteId = invite.id || invite._id;
        Alert.alert(
            'Từ chối lời mời',
            `Bạn có chắc muốn từ chối lời mời vào nhóm ${invite.groupName || ''}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Từ chối',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingId(inviteId);
                        try {
                            await rejectGroupInvite(inviteId, token);
                            setInvites((prev) => prev.filter((i) => (i.id || i._id) !== inviteId));
                        } catch (e) {
                            Alert.alert('Lỗi', 'Không thể từ chối lời mời');
                        } finally {
                            setProcessingId(null);
                        }
                    },
                },
            ],
        );
    };

    const renderInvite = ({ item }) => {
        const inviteId = item.id || item._id;
        const isProcessing = processingId === inviteId;

        return (
            <View style={styles.inviteCard}>
                <View style={styles.groupAvatar}>
                    {item.groupAvatar ? (
                        <Image source={{ uri: item.groupAvatar }} style={styles.groupAvatarImg} />
                    ) : (
                        <MaterialIcons name="group" size={28} color="#047857" />
                    )}
                </View>
                <View style={styles.inviteInfo}>
                    <Text style={styles.groupName}>{item.groupName || 'Nhóm không tên'}</Text>
                    <Text style={styles.invitedBy}>
                        Được mời bởi: {item.inviterName || item.senderName || 'Ai đó'}
                    </Text>
                    {item.memberCount !== undefined && (
                        <Text style={styles.memberCount}>{item.memberCount} thành viên</Text>
                    )}
                </View>
                <View style={styles.actions}>
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.acceptBtn}
                                onPress={() => handleAccept(item)}
                            >
                                <MaterialIcons name="check" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.rejectBtn}
                                onPress={() => handleReject(item)}
                            >
                                <MaterialIcons name="close" size={18} color="#fff" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#065f46" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lời mời vào nhóm</Text>
                <View style={{ width: 32 }} />
            </View>

            {invites.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="group" size={60} color="#d1fae5" />
                    <Text style={styles.emptyTitle}>Không có lời mời nào</Text>
                    <Text style={styles.emptySubtitle}>
                        Khi ai đó mời bạn vào nhóm, lời mời sẽ xuất hiện ở đây
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={invites}
                    keyExtractor={(item) => String(item.id || item._id)}
                    renderItem={renderInvite}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#10b981']}
                            tintColor="#10b981"
                        />
                    }
                    contentContainerStyle={{ paddingVertical: 8 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#d1fae5',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#065f46' },
    inviteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 14,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    groupAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#d1fae5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    groupAvatarImg: { width: '100%', height: '100%' },
    inviteInfo: { flex: 1 },
    groupName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
    invitedBy: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
    memberCount: { fontSize: 12, color: '#9ca3af' },
    actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    acceptBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rejectBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
