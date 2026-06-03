// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchGroupDetail, fetchEligibleFriends, addGroupMembers } from '../../src/api/groupApi';
import { fetchFriendsList } from '../../src/api/user';
import { getClassMembers } from '../../src/services/classService';
import localStorage from '../../src/utils/localStoragePolyfill';

export default function ClassDetailScreen() {
    const router = useRouter();
    const { id, name, classCode } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [members, setMembers] = useState([]);

    // Quyền giáo viên
    const role = useMemo(
        () =>
            String(localStorage.getItem('userRole') || 'STUDENT')
                .toUpperCase()
                .replace(/^ROLE_/, ''),
        [],
    );
    const isTeacher = role === 'TEACHER';

    // Thêm thành viên
    const [addMemberVisible, setAddMemberVisible] = useState(false);
    const [eligibleFriends, setEligibleFriends] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [eligibleLoading, setEligibleLoading] = useState(false);
    const [addingMembers, setAddingMembers] = useState(false);

    const load = useCallback(async () => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            const [detailRes, memberRes] = await Promise.all([
                fetchGroupDetail(id, token),
                getClassMembers(id),
            ]);
            setDetail(detailRes);
            setMembers(Array.isArray(memberRes) ? memberRes : []);
        } catch (error) {
            Alert.alert('Lỗi', error?.message || 'Không thể tải thông tin lớp học');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const handleOpenAddMember = async () => {
        setAddMemberVisible(true);
        setEligibleLoading(true);
        setSelectedIds([]);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            let friends = [];
            try {
                // Thử lấy danh sách học sinh khả dụng trực tiếp từ API nhóm
                friends = await fetchEligibleFriends(id, token);
            } catch (apiErr) {
                console.warn('fetchEligibleFriends lỗi, chuyển sang fallback fetchFriendsList:', apiErr.message);
                
                // Fallback: Lấy toàn bộ bạn bè của giáo viên
                const allFriends = await fetchFriendsList();
                
                // Tập hợp các ID đã có trong lớp để loại trừ
                const currentMemberIds = new Set((members || []).map(m => String(m.id || m._id || '')));
                
                // Lọc ra các bạn bè chưa là thành viên lớp
                friends = (allFriends || []).filter(friend => {
                    const friendId = String(friend.id || friend.userId || friend._id || friend.friendId || '');
                    return friendId && !currentMemberIds.has(friendId);
                });
            }
            setEligibleFriends(friends || []);
        } catch (error) {
            console.error('Không thể tải danh sách học sinh khả dụng:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách học sinh khả dụng: ' + error.message);
        } finally {
            setEligibleLoading(false);
        }
    };

    const toggleSelectFriend = (friendId) => {
        setSelectedIds((prev) =>
            prev.includes(friendId) ? prev.filter((x) => x !== friendId) : [...prev, friendId],
        );
    };

    const handleAddMembers = async () => {
        if (selectedIds.length === 0) {
            Alert.alert('Chưa chọn', 'Vui lòng chọn ít nhất một học sinh');
            return;
        }
        setAddingMembers(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            await addGroupMembers(id, selectedIds, token);
            setAddMemberVisible(false);
            await load();
            Alert.alert('Thành công', `Đã thêm ${selectedIds.length} học sinh vào lớp`);
        } catch {
            Alert.alert('Lỗi', 'Không thể thêm thành viên');
        } finally {
            setAddingMembers(false);
        }
    };

    const openClassChat = () => {
        router.push({
            pathname: '/chat/[id]',
            params: {
                id,
                name: detail?.name || name || 'Chat lớp học',
                isPrivate: 'false',
            },
        });
    };

    const renderMember = ({ item }) => (
        <View style={styles.memberItem}>
            <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                    {(item?.firstName || item?.username || '?').charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                    {`${item?.firstName || ''} ${item?.lastName || ''}`.trim() || item?.username || 'Người dùng'}
                </Text>
                <Text style={styles.memberMeta}>{item?.email || item?.phone || '-'}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {detail?.name || name || 'Chi tiết lớp học'}
                </Text>
                <TouchableOpacity onPress={openClassChat}>
                    <MaterialIcons name="chat" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{detail?.name || name}</Text>
                <Text style={styles.summaryMeta}>Mã lớp: {detail?.classCode || classCode || '-'}</Text>
                <Text style={styles.summaryMeta}>Thành viên: {members.length}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity style={styles.chatBtn} onPress={openClassChat}>
                        <MaterialIcons name="chat" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.chatBtnText}>Mở chat</Text>
                    </TouchableOpacity>
                    {isTeacher && (
                        <TouchableOpacity style={[styles.chatBtn, { backgroundColor: '#0f766e' }]} onPress={handleOpenAddMember}>
                            <MaterialIcons name="person-add" size={16} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.chatBtnText}>Thêm thành viên</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <Text style={styles.sectionTitle}>Danh sách thành viên ({members.length})</Text>
            <FlatList
                data={members}
                keyExtractor={(item, idx) => String(item?.id || idx)}
                renderItem={renderMember}
                contentContainerStyle={styles.memberList}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="people-outline" size={40} color="#d1fae5" />
                        <Text style={styles.emptyText}>Chưa có thành viên nào</Text>
                    </View>
                }
            />

            {/* Modal thêm thành viên */}
            <Modal visible={addMemberVisible} transparent animationType="slide" onRequestClose={() => setAddMemberVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setAddMemberVisible(false)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Thêm học sinh vào lớp</Text>
                            <TouchableOpacity onPress={() => setAddMemberVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        {eligibleLoading ? (
                            <ActivityIndicator size="large" color="#10b981" style={{ padding: 24 }} />
                        ) : eligibleFriends.length === 0 ? (
                            <Text style={styles.emptyText}>Không có học sinh nào khả dụng để thêm</Text>
                        ) : (
                            <FlatList
                                data={eligibleFriends}
                                keyExtractor={(item) => String(item.id || item._id)}
                                style={{ maxHeight: 320 }}
                                renderItem={({ item }) => {
                                    const fid = item.id || item._id;
                                    const selected = selectedIds.includes(fid);
                                    const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.username || item.name || 'Học sinh';
                                    const initial = (item.firstName || item.username || item.name || '?').charAt(0).toUpperCase();
                                    return (
                                        <TouchableOpacity style={styles.friendRow} onPress={() => toggleSelectFriend(fid)}>
                                            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                                                {selected && <MaterialIcons name="check" size={14} color="#fff" />}
                                            </View>
                                            <View style={styles.friendAvatar}>
                                                <Text style={styles.friendAvatarText}>
                                                    {initial}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.friendName}>{fullName}</Text>
                                                <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.email || item.phone || '-'}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                        <TouchableOpacity
                            style={[styles.confirmBtn, (selectedIds.length === 0 || addingMembers) && styles.confirmBtnDisabled]}
                            onPress={handleAddMembers}
                            disabled={selectedIds.length === 0 || addingMembers}
                        >
                            {addingMembers ? <ActivityIndicator size="small" color="#fff" /> : (
                                <Text style={styles.confirmBtnText}>
                                    Xác nhận thêm {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0fdf9' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#0f766e',
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
    summaryCard: {
        margin: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1fae5',
        padding: 14,
    },
    summaryTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
    summaryMeta: { fontSize: 13, color: '#4b5563', marginBottom: 2 },
    chatBtn: {
        marginTop: 12,
        alignSelf: 'flex-start',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
    },
    chatBtnText: { color: '#fff', fontWeight: '600' },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#065f46',
        paddingHorizontal: 12,
        paddingTop: 4,
        paddingBottom: 8,
    },
    memberList: { paddingHorizontal: 12, paddingBottom: 16 },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1fae5',
        padding: 10,
        marginBottom: 8,
    },
    memberAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#99f6e4',
        marginRight: 10,
    },
    memberAvatarText: { color: '#134e4a', fontWeight: '700' },
    memberName: { fontSize: 14, fontWeight: '600', color: '#111827' },
    memberMeta: { marginTop: 2, fontSize: 12, color: '#6b7280' },
    emptyWrap: { paddingTop: 30, alignItems: 'center', gap: 8 },
    // Styles cho Modal thêm thành viên
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
    checkboxSelected: { backgroundColor: '#10b981', borderColor: '#10b981' },
    friendAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
    friendAvatarText: { color: '#047857', fontWeight: 'bold' },
    friendName: { fontSize: 15, color: '#111827', fontWeight: '500' },
    confirmBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
    confirmBtnDisabled: { backgroundColor: '#a7f3d0' },
    confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    emptyText: { textAlign: 'center', color: '#6b7280', fontSize: 14, padding: 24 },
});
