// ============================================
// UPDATED GROUP POLLS SCREEN
// Replace app/group/polls.tsx with this version
// ============================================

// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getGroupPolls, createPoll, votePoll } from '../../src/api/groupFeaturesApi';
import localStorage from '../../src/utils/localStoragePolyfill';

// ✅ NEW: Import components
import { PollItem, CreatePollModal } from '../../src/components/group';

export default function GroupPollsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ✅ NEW: Modal state
    const [createVisible, setCreateVisible] = useState(false);

    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    const loadPolls = useCallback(async () => {
        try {
            const data = await getGroupPolls(id, token);
            setPolls(Array.isArray(data) ? data : (data?.data || []));
        } catch (e) {
            console.error('Lỗi tải bình chọn:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, token]);

    useEffect(() => { loadPolls(); }, [loadPolls]);

    const onRefresh = () => { setRefreshing(true); loadPolls(); };

    // ✅ NEW: Handle create poll
    const handleCreatePoll = async (question: string, options: string[], allowMultiple: boolean) => {
        try {
            await createPoll(id, question, options, allowMultiple, token);
            setCreateVisible(false);
            await loadPolls();
            Alert.alert('Thành công', 'Đã tạo bình chọn');
        } catch {
            Alert.alert('Lỗi', 'Không thể tạo bình chọn');
        }
    };

    // ✅ NEW: Handle vote
    const handleVote = async (pollId: string, optionIndex: number) => {
        try {
            await votePoll(pollId, optionIndex, token);
            await loadPolls();
        } catch {
            Alert.alert('Lỗi', 'Không thể bình chọn');
        }
    };

    // ✅ NEW: Render poll using PollItem component
    const renderPoll = ({ item }) => (
        <PollItem
            poll={item}
            currentUserId={userId}
            onVote={(optionIndex) => handleVote(item.id || item._id, optionIndex)}
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
                <Text style={styles.headerTitle}>Bình chọn nhóm</Text>
                <TouchableOpacity onPress={() => setCreateVisible(true)} style={styles.addBtn}>
                    <MaterialIcons name="add" size={26} color="#10b981" />
                </TouchableOpacity>
            </View>

            {polls.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="poll" size={60} color="#d1fae5" />
                    <Text style={styles.emptyTitle}>Chưa có bình chọn nào</Text>
                    <Text style={styles.emptySubtitle}>Nhấn + để tạo bình chọn cho nhóm</Text>
                    <TouchableOpacity style={styles.createBtn} onPress={() => setCreateVisible(true)}>
                        <MaterialIcons name="add" size={18} color="#fff" />
                        <Text style={styles.createBtnText}>Tạo bình chọn</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={polls}
                    keyExtractor={(item) => String(item.id || item._id)}
                    renderItem={renderPoll}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} tintColor="#10b981" />
                    }
                    contentContainerStyle={{ padding: 16, gap: 12 }}
                />
            )}

            {/* ✅ NEW: Use CreatePollModal component */}
            <CreatePollModal
                visible={createVisible}
                onClose={() => setCreateVisible(false)}
                onSubmit={handleCreatePoll}
                groupId={id}
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
