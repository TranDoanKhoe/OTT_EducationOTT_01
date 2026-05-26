// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, Modal, Pressable, TextInput,
    RefreshControl, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
    getGroupNotes, createGroupNote, updateGroupNote, deleteGroupNote,
} from '../../src/api/groupFeaturesApi';
import localStorage from '../../src/utils/localStoragePolyfill';

export default function GroupNotesScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal tạo/sửa note
    const [noteModalVisible, setNoteModalVisible] = useState(false);
    const [editingNote, setEditingNote] = useState(null); // null = tạo mới
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [saving, setSaving] = useState(false);

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    const loadNotes = useCallback(async () => {
        try {
            const data = await getGroupNotes(id, token);
            setNotes(Array.isArray(data) ? data : (data?.data || []));
        } catch (e) {
            console.error('Lỗi tải ghi chú:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, token]);

    useEffect(() => { loadNotes(); }, [loadNotes]);

    const onRefresh = () => { setRefreshing(true); loadNotes(); };

    const openCreateModal = () => {
        setEditingNote(null);
        setNoteTitle('');
        setNoteContent('');
        setNoteModalVisible(true);
    };

    const openEditModal = (note) => {
        setEditingNote(note);
        setNoteTitle(note.title || '');
        setNoteContent(note.content || '');
        setNoteModalVisible(true);
    };

    const handleSaveNote = async () => {
        if (!noteTitle.trim()) {
            Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề ghi chú');
            return;
        }
        setSaving(true);
        try {
            if (editingNote) {
                const noteId = editingNote.id || editingNote._id;
                await updateGroupNote(noteId, noteTitle.trim(), noteContent.trim(), token);
            } else {
                await createGroupNote(id, noteTitle.trim(), noteContent.trim(), token);
            }
            setNoteModalVisible(false);
            await loadNotes();
            Alert.alert('Thành công', editingNote ? 'Đã cập nhật ghi chú' : 'Đã tạo ghi chú mới');
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể lưu ghi chú');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteNote = (note) => {
        const noteId = note.id || note._id;
        Alert.alert('Xóa ghi chú', `Xóa ghi chú "${note.title}"?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteGroupNote(noteId, token);
                        setNotes((prev) => prev.filter((n) => (n.id || n._id) !== noteId));
                    } catch { Alert.alert('Lỗi', 'Không thể xóa ghi chú'); }
                },
            },
        ]);
    };

    const renderNote = ({ item }) => (
        <View style={styles.noteCard}>
            <View style={styles.noteCardTop}>
                <Text style={styles.noteTitle}>{item.title || 'Không có tiêu đề'}</Text>
                <View style={styles.noteActions}>
                    <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                        <MaterialIcons name="edit" size={18} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteNote(item)} style={styles.iconBtn}>
                        <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
            {item.content ? (
                <Text style={styles.noteContent} numberOfLines={3}>{item.content}</Text>
            ) : null}
            <Text style={styles.noteDate}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
            </Text>
        </View>
    );

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#065f46" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ghi chú nhóm</Text>
                <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
                    <MaterialIcons name="add" size={26} color="#10b981" />
                </TouchableOpacity>
            </View>

            {notes.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="note" size={60} color="#d1fae5" />
                    <Text style={styles.emptyTitle}>Chưa có ghi chú nào</Text>
                    <Text style={styles.emptySubtitle}>Nhấn + để tạo ghi chú đầu tiên cho nhóm</Text>
                    <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
                        <MaterialIcons name="add" size={18} color="#fff" />
                        <Text style={styles.createBtnText}>Tạo ghi chú</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={notes}
                    keyExtractor={(item) => String(item.id || item._id)}
                    renderItem={renderNote}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} tintColor="#10b981" />
                    }
                    contentContainerStyle={{ padding: 16, gap: 12 }}
                />
            )}

            {/* Modal tạo/sửa ghi chú */}
            <Modal visible={noteModalVisible} transparent animationType="slide" onRequestClose={() => setNoteModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setNoteModalVisible(false)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingNote ? 'Sửa ghi chú' : 'Tạo ghi chú mới'}</Text>
                            <TouchableOpacity onPress={() => setNoteModalVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Tiêu đề</Text>
                        <TextInput
                            style={styles.textInput}
                            value={noteTitle}
                            onChangeText={setNoteTitle}
                            placeholder="Nhập tiêu đề ghi chú..."
                            maxLength={200}
                        />

                        <Text style={styles.inputLabel}>Nội dung</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={noteContent}
                            onChangeText={setNoteContent}
                            placeholder="Nhập nội dung ghi chú..."
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSaveNote}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                                <Text style={styles.saveBtnText}>{editingNote ? 'Lưu thay đổi' : 'Tạo ghi chú'}</Text>
                            )}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#d1fae5' },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#065f46' },
    addBtn: { padding: 4 },
    noteCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    noteCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    noteTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
    noteActions: { flexDirection: 'row', gap: 4 },
    iconBtn: { padding: 6 },
    noteContent: { fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 8 },
    noteDate: { fontSize: 11, color: '#9ca3af' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
    createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
    createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    inputLabel: { fontSize: 13, color: '#6b7280', marginBottom: 6, marginTop: 12 },
    textInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
    textArea: { height: 120, paddingTop: 10 },
    saveBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
