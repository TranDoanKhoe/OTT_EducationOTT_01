// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Alert, Image, Modal, Pressable,
    TextInput, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
    fetchGroupDetail, fetchGroupMembers, removeGroupMember,
    leaveGroup, dissolveGroup, fetchEligibleFriends,
    addGroupMembers, assignGroupRole, updateGroupInfo,
} from '../../src/api/groupApi';
import localStorage from '../../src/utils/localStoragePolyfill';

const ROLES = [
    { key: 'ADMIN', label: 'Trưởng nhóm' },
    { key: 'MODERATOR', label: 'Phó nhóm' },
    { key: 'MEMBER', label: 'Thành viên' },
];

export default function GroupSettingsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Task 2.1 - Thêm thành viên
    const [addMemberVisible, setAddMemberVisible] = useState(false);
    const [eligibleFriends, setEligibleFriends] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [eligibleLoading, setEligibleLoading] = useState(false);
    const [addingMembers, setAddingMembers] = useState(false);

    // Task 2.2 - Sửa thông tin nhóm
    const [editVisible, setEditVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

    // Task 2.3 - Gán quyền
    const [roleMenuVisible, setRoleMenuVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [assigningRole, setAssigningRole] = useState(false);

    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    const loadGroupData = useCallback(async () => {
        try {
            const [groupData, membersData] = await Promise.all([
                fetchGroupDetail(id, token),
                fetchGroupMembers(id, token),
            ]);
            setGroup(groupData);
            setMembers(membersData || []);
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tải thông tin nhóm');
        } finally {
            setLoading(false);
        }
    }, [id, token]);

    useEffect(() => {
        if (!token || !id) return;
        loadGroupData();
    }, [id, token, loadGroupData]);

    // ── Task 2.1: Thêm thành viên ──────────────────────────────────
    const handleOpenAddMember = async () => {
        setAddMemberVisible(true);
        setEligibleLoading(true);
        setSelectedIds([]);
        try {
            const friends = await fetchEligibleFriends(id, token);
            setEligibleFriends(friends || []);
        } catch {
            Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè');
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
            Alert.alert('Chưa chọn', 'Vui lòng chọn ít nhất một người');
            return;
        }
        setAddingMembers(true);
        try {
            await addGroupMembers(id, selectedIds, token);
            setAddMemberVisible(false);
            await loadGroupData();
            Alert.alert('Thành công', `Đã thêm ${selectedIds.length} thành viên`);
        } catch {
            Alert.alert('Lỗi', 'Không thể thêm thành viên');
        } finally {
            setAddingMembers(false);
        }
    };

    // ── Task 2.2: Sửa thông tin nhóm ──────────────────────────────
    const handleOpenEdit = () => {
        setEditName(group?.name || '');
        setEditAvatar(null);
        setEditVisible(true);
    };

    const handlePickGroupAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.length) {
            const asset = result.assets[0];
            setEditAvatar({ uri: asset.uri, name: asset.fileName || `group-${Date.now()}.jpg`, type: asset.mimeType || 'image/jpeg' });
        }
    };

    const handleSaveGroupInfo = async () => {
        if (!editName.trim()) {
            Alert.alert('Thiếu thông tin', 'Tên nhóm không được để trống');
            return;
        }
        setSavingEdit(true);
        try {
            await updateGroupInfo(id, { name: editName.trim(), avatarGroup: editAvatar?.uri || null }, token);
            setEditVisible(false);
            await loadGroupData();
            Alert.alert('Thành công', 'Đã cập nhật thông tin nhóm');
        } catch {
            Alert.alert('Lỗi', 'Không thể cập nhật thông tin nhóm');
        } finally {
            setSavingEdit(false);
        }
    };

    // ── Task 2.3: Gán quyền ───────────────────────────────────────
    const handleOpenRoleMenu = (member) => {
        setSelectedMember(member);
        setRoleMenuVisible(true);
    };

    const handleAssignRole = async (role) => {
        if (!selectedMember) return;
        setAssigningRole(true);
        setRoleMenuVisible(false);
        try {
            await assignGroupRole(id, selectedMember.id, role, token);
            await loadGroupData();
            Alert.alert('Thành công', `Đã cập nhật quyền cho ${selectedMember.firstName}`);
        } catch {
            Alert.alert('Lỗi', 'Không thể thay đổi quyền thành viên');
        } finally {
            setAssigningRole(false);
        }
    };

    // ── Xóa/Rời nhóm ──────────────────────────────────────────────
    const handleLeaveGroup = () => {
        Alert.alert('Xác nhận', 'Bạn có chắc muốn rời nhóm này?', [
            { text: 'Huỷ', style: 'cancel' },
            {
                text: 'Rời nhóm', style: 'destructive',
                onPress: async () => {
                    try {
                        await leaveGroup(id, userId, token);
                        router.replace('/(tabs)');
                    } catch { Alert.alert('Lỗi', 'Rời nhóm thất bại'); }
                },
            },
        ]);
    };

    const handleDissolveGroup = () => {
        Alert.alert('Cảnh báo', 'Giải tán nhóm sẽ xoá toàn bộ tin nhắn. Tiếp tục?', [
            { text: 'Huỷ', style: 'cancel' },
            {
                text: 'Giải tán', style: 'destructive',
                onPress: async () => {
                    try {
                        await dissolveGroup(id, token);
                        router.replace('/(tabs)');
                    } catch { Alert.alert('Lỗi', 'Không thể giải tán nhóm'); }
                },
            },
        ]);
    };

    const handleRemoveMember = (memberId, memberName) => {
        Alert.alert('Xoá thành viên', `Mời ${memberName} ra khỏi nhóm?`, [
            { text: 'Huỷ', style: 'cancel' },
            {
                text: 'Xoá', style: 'destructive',
                onPress: async () => {
                    try {
                        await removeGroupMember(id, memberId, token);
                        loadGroupData();
                    } catch { Alert.alert('Lỗi', 'Xoá thành viên thất bại'); }
                },
            },
        ]);
    };

    const isGroupAdmin = group?.createId === userId;

    const getMemberRole = (member) => {
        if (group?.createId === member.id) return 'ADMIN';
        if (group?.moderators?.includes(member.id)) return 'MODERATOR';
        return 'MEMBER';
    };

    const renderMember = ({ item }) => {
        const isMe = item.id === userId;
        const role = getMemberRole(item);
        const roleLabel = ROLES.find((r) => r.key === role)?.label || 'Thành viên';

        return (
            <View style={styles.memberRow}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{item.firstName?.[0] || '?'}</Text>
                    </View>
                )}
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                        {item.firstName} {item.lastName}{isMe ? ' (Bạn)' : ''}
                    </Text>
                    <Text style={[styles.roleBadge, role === 'ADMIN' && styles.roleAdmin, role === 'MODERATOR' && styles.roleMod]}>
                        {roleLabel}
                    </Text>
                </View>
                {isGroupAdmin && !isMe && (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity onPress={() => handleOpenRoleMenu(item)} style={styles.actionIconBtn}>
                            <MaterialIcons name="manage-accounts" size={20} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleRemoveMember(item.id, `${item.firstName} ${item.lastName}`)}
                            style={styles.actionIconBtn}
                        >
                            <MaterialIcons name="person-remove" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10b981" /></View>;
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tuỳ chọn nhóm</Text>
                {isGroupAdmin && (
                    <TouchableOpacity onPress={handleOpenEdit} style={{ padding: 4 }}>
                        <MaterialIcons name="edit" size={22} color="#10b981" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Group Info */}
            <View style={styles.groupHeaderInfo}>
                <TouchableOpacity onPress={isGroupAdmin ? handleOpenEdit : undefined} activeOpacity={isGroupAdmin ? 0.7 : 1}>
                    {group?.avatarGroup ? (
                        <Image source={{ uri: group.avatarGroup }} style={styles.groupAvatar} />
                    ) : (
                        <View style={styles.groupAvatarPlaceholder}>
                            <MaterialIcons name="group" size={40} color="#fff" />
                        </View>
                    )}
                    {isGroupAdmin && (
                        <View style={styles.editAvatarBadge}>
                            <MaterialIcons name="photo-camera" size={14} color="#fff" />
                        </View>
                    )}
                </TouchableOpacity>
                <Text style={styles.groupName}>{group?.name}</Text>
                <Text style={styles.memberCount}>{members.length} thành viên</Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleOpenAddMember}>
                    <MaterialIcons name="person-add" size={24} color="#10b981" />
                    <Text style={styles.actionText}>Thêm thành viên</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/group/notes?id=${id}`)}>
                    <MaterialIcons name="note" size={24} color="#10b981" />
                    <Text style={styles.actionText}>Ghi chú nhóm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/group/polls?id=${id}`)}>
                    <MaterialIcons name="poll" size={24} color="#10b981" />
                    <Text style={styles.actionText}>Bình chọn</Text>
                </TouchableOpacity>
            </View>

            {/* Members */}
            <Text style={styles.sectionTitle}>Danh sách thành viên ({members.length})</Text>
            {assigningRole && <ActivityIndicator size="small" color="#10b981" style={{ margin: 8 }} />}
            {members.map((m) => <View key={m.id}>{renderMember({ item: m })}</View>)}

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
                <TouchableOpacity style={styles.dangerBtn} onPress={handleLeaveGroup}>
                    <MaterialIcons name="exit-to-app" size={24} color="#ef4444" />
                    <Text style={styles.dangerText}>Rời nhóm</Text>
                </TouchableOpacity>
                {isGroupAdmin && (
                    <TouchableOpacity style={[styles.dangerBtn, { marginTop: 12 }]} onPress={handleDissolveGroup}>
                        <MaterialIcons name="delete-forever" size={24} color="#ef4444" />
                        <Text style={styles.dangerText}>Giải tán nhóm</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Modal thêm thành viên (Task 2.1) ── */}
            <Modal visible={addMemberVisible} transparent animationType="slide" onRequestClose={() => setAddMemberVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setAddMemberVisible(false)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Thêm thành viên</Text>
                            <TouchableOpacity onPress={() => setAddMemberVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        {eligibleLoading ? (
                            <ActivityIndicator size="large" color="#10b981" style={{ padding: 24 }} />
                        ) : eligibleFriends.length === 0 ? (
                            <Text style={styles.emptyText}>Không có bạn bè nào chưa ở trong nhóm</Text>
                        ) : (
                            <FlatList
                                data={eligibleFriends}
                                keyExtractor={(item) => String(item.id || item._id)}
                                style={{ maxHeight: 320 }}
                                renderItem={({ item }) => {
                                    const fid = item.id || item._id;
                                    const selected = selectedIds.includes(fid);
                                    return (
                                        <TouchableOpacity style={styles.friendRow} onPress={() => toggleSelectFriend(fid)}>
                                            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                                                {selected && <MaterialIcons name="check" size={14} color="#fff" />}
                                            </View>
                                            <View style={styles.friendAvatar}>
                                                <Text style={styles.friendAvatarText}>
                                                    {(item.firstName || '?').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text style={styles.friendName}>{item.firstName} {item.lastName}</Text>
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
                                    Thêm {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Modal sửa thông tin nhóm (Task 2.2) ── */}
            <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setEditVisible(false)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chỉnh sửa nhóm</Text>
                            <TouchableOpacity onPress={() => setEditVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.avatarPickerBtn} onPress={handlePickGroupAvatar}>
                            {editAvatar ? (
                                <Image source={{ uri: editAvatar.uri }} style={styles.avatarPreview} />
                            ) : group?.avatarGroup ? (
                                <Image source={{ uri: group.avatarGroup }} style={styles.avatarPreview} />
                            ) : (
                                <View style={[styles.avatarPreview, { backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' }]}>
                                    <MaterialIcons name="group" size={32} color="#10b981" />
                                </View>
                            )}
                            <View style={styles.avatarEditBadge}>
                                <MaterialIcons name="photo-camera" size={16} color="#fff" />
                            </View>
                        </TouchableOpacity>

                        <Text style={styles.inputLabel}>Tên nhóm</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Nhập tên nhóm"
                            maxLength={100}
                        />

                        <TouchableOpacity
                            style={[styles.confirmBtn, savingEdit && styles.confirmBtnDisabled]}
                            onPress={handleSaveGroupInfo}
                            disabled={savingEdit}
                        >
                            {savingEdit ? <ActivityIndicator size="small" color="#fff" /> : (
                                <Text style={styles.confirmBtnText}>Lưu thay đổi</Text>
                            )}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Modal gán quyền (Task 2.3) ── */}
            <Modal visible={roleMenuVisible} transparent animationType="fade" onRequestClose={() => setRoleMenuVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setRoleMenuVisible(false)}>
                    <View style={[styles.modalCard, { paddingBottom: 12 }]}>
                        <Text style={styles.modalTitle}>
                            Phân quyền: {selectedMember?.firstName} {selectedMember?.lastName}
                        </Text>
                        {ROLES.filter((r) => r.key !== 'ADMIN').map((r) => (
                            <TouchableOpacity
                                key={r.key}
                                style={styles.roleRow}
                                onPress={() => handleAssignRole(r.key)}
                            >
                                <MaterialIcons
                                    name={r.key === 'MODERATOR' ? 'supervisor-account' : 'person'}
                                    size={20}
                                    color={r.key === 'MODERATOR' ? '#3b82f6' : '#6b7280'}
                                />
                                <Text style={styles.roleRowText}>{r.label}</Text>
                                {getMemberRole(selectedMember || {}) === r.key && (
                                    <MaterialIcons name="check" size={18} color="#10b981" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
    backButton: { marginRight: 8, padding: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', marginLeft: 4 },
    groupHeaderInfo: { alignItems: 'center', padding: 24, backgroundColor: '#fff', position: 'relative' },
    groupAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
    groupAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    editAvatarBadge: { position: 'absolute', bottom: 14, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    groupName: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    memberCount: { fontSize: 14, color: '#6b7280' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 8 },
    actionBtn: { alignItems: 'center', gap: 4 },
    actionText: { color: '#374151', fontSize: 12 },
    sectionTitle: { padding: 16, paddingBottom: 8, fontSize: 15, fontWeight: '700', color: '#374151', backgroundColor: '#f9fafb' },
    memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fff' },
    memberAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
    memberAvatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarInitial: { color: '#047857', fontWeight: 'bold', fontSize: 16 },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, color: '#111827', fontWeight: '500' },
    roleBadge: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    roleAdmin: { color: '#d97706', fontWeight: '600' },
    roleMod: { color: '#3b82f6', fontWeight: '600' },
    actionIconBtn: { padding: 6 },
    dangerZone: { padding: 16, marginTop: 16, marginBottom: 32 },
    dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#fef2f2', borderRadius: 10 },
    dangerText: { marginLeft: 8, color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
    checkboxSelected: { backgroundColor: '#10b981', borderColor: '#10b981' },
    friendAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
    friendAvatarText: { color: '#047857', fontWeight: 'bold' },
    friendName: { flex: 1, fontSize: 15, color: '#111827' },
    confirmBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
    confirmBtnDisabled: { backgroundColor: '#a7f3d0' },
    confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    emptyText: { textAlign: 'center', color: '#9ca3af', padding: 24 },
    // Edit modal
    avatarPickerBtn: { alignSelf: 'center', marginBottom: 16, position: 'relative' },
    avatarPreview: { width: 80, height: 80, borderRadius: 40 },
    avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    inputLabel: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
    textInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 4 },
    // Role menu
    roleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    roleRowText: { flex: 1, fontSize: 15, color: '#111827' },
});
