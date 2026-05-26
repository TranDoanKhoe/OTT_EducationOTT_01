// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
    getGroupNotes, createGroupNote, updateGroupNote, deleteGroupNote,
} from '../../src/api/groupFeaturesApi';
import localStorage from '../../src/utils/localStoragePolyfill';

// ✅ NEW: Import components
import { NoteItem, CreateNoteModal } from '../../src/components/group';

export default function GroupNotesScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ✅ NEW: Modal state
    const [noteModalVisible, setNoteModalVisible] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    const userId = localStorage.getItem('userId');
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
        setNoteModalVisible(true);
    };

    const openEditModal = (note) => {
        setEditingNote(note);
        setNoteModalVisible(true);
    };

    // ✅ NEW: Handle create/update note
    const handleSaveNote = async (title: string, content: string) => {
        try {
            if (editingNote) {
                const noteId = editingNote.id || editingNote._id;
                await updateGroupNote(noteId, title, content, token);
                Alert.alert('Thành công', 'Đã cập nhật ghi chú');
            } else {
                await createGroupNote(id, title, content, token);
                Alert.alert('Thành công', 'Đã tạo ghi chú mới');
            }
            setNoteModalVisible(false);
            setEditingNote(null);
            await loadNotes();
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể lưu ghi chú');
            throw e;
        }
    };

    // ✅ NEW: Handle delete note
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
                        Alert.alert('Thành công', 'Đã xóa ghi chú');
                    } catch { 
                        Alert.alert('Lỗi', 'Không thể xóa ghi chú'); 
                    }
                },
            },
        ]);
    };

    // ✅ NEW: Render note using NoteItem component
    const renderNote = ({ item }) => (
        <NoteItem
            note={item}
            currentUserId={userId}
            isAdmin={true} // TODO: Get from group info
            onEdit={() => openEditModal(item)}
            onDelete={() => handleDeleteNote(item)}
        />
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

            {/* ✅ NEW: Use CreateNoteModal component */}
            <CreateNoteModal
                visible={noteModalVisible}
                onClose={() => {
                    setNoteModalVisible(false);
                    setEditingNote(null);
                }}
                onSubmit={handleSaveNote}
                groupId={id}
                editingNote={editingNote}
            />
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
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
    createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
    createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
