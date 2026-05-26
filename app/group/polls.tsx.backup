// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, Modal, Pressable, TextInput,
    RefreshControl, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getGroupPolls, createPoll, votePoll } from '../../src/api/groupFeaturesApi';
import localStorage from '../../src/utils/localStoragePolyfill';

export default function GroupPollsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal tạo poll
    const [createVisible, setCreateVisible] = useState(false);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [creating, setCreating] = useState(false);

    const [votingId, setVotingId] = useState(null);

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

    const addOption = () => {
        if (options.length >= 8) { Alert.alert('Tối đa 8 lựa chọn'); return; }
        setOptions((prev) => [...prev, '']);
    };

    const removeOption = (idx) => {
        if (options.length <= 2) { Alert.alert('Tối thiểu 2 lựa chọn'); return; }
        setOptions((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateOption = (idx, text) => {
        setOptions((prev) => prev.map((o, i) => (i === idx ? text : o)));
    };

    const handleCreatePoll = async () => {
        if (!question.trim()) { Alert.alert('Thiếu câu hỏi', 'Vui lòng nhập câu hỏi bình chọn'); return; }
        const validOptions = options.filter((o) => o.trim());
        if (validOptions.length < 2) { Alert.alert('Thiếu lựa chọn', 'Cần ít nhất 2 lựa chọn'); return; }

        setCreating(true);
        try {
            await createPoll(id, question.trim(), validOptions, allowMultiple, token);
            setCreateVisible(false);
            setQuestion('');
            setOptions(['', '']);
            setAllowMultiple(false);
            await loadPolls();
            Alert.alert('Thành công', 'Đã tạo bình chọn');
        } catch {
            Alert.alert('Lỗi', 'Không thể tạo bình chọn');
        } finally {
            setCreating(false);
        }
    };

    const handleVote = async (poll, optionIndex) => {
        const pollId = poll.id || poll._id;
        setVotingId(`${pollId}-${optionIndex}`);
        try {
            await votePoll(pollId, optionIndex, token);
            await loadPolls();
        } catch {
            Alert.alert('Lỗi', 'Không thể bình chọn');
        } finally {
            setVotingId(null);
        }
    };

    const getTotalVotes = (poll) =>
        (poll.options || []).reduce((sum, o) => sum + (o.votes?.length || o.voteCount || 0), 0);

    const hasVoted = (poll, optionIndex) => {
        const opt = poll.options?.[optionIndex];
        if (!opt) return false;
        return (opt.votes || []).includes(userId) || opt.voterIds?.includes(userId);
    };

    const renderPoll = ({ item }) => {
        const totalVotes = getTotalVotes(item);
        const isExpired = item.expired || item.closed;

        return (
            <View style={styles.pollCard}>
                <View style={styles.pollHeader}>
                    <MaterialIcons name="poll" size={20} color="#10b981" />
                    <Text style={styles.pollQuestion}>{item.question}</Text>
                    {isExpired && <Text style={styles.closedBadge}>Đã đóng</Text>}
                </View>
                {item.allowMultiple && (
                    <Text style={styles.multipleNote}>Có thể chọn nhiều đáp án</Text>
                )}

                {(item.options || []).map((opt, idx) => {
                    const votes = opt.votes?.length || opt.voteCount || 0;
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const voted = hasVoted(item, idx);
                    const isVoting = votingId === `${item.id || item._id}-${idx}`;

                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.optionBtn, voted && styles.optionBtnVoted]}
                            onPress={() => !isExpired && handleVote(item, idx)}
                            disabled={isExpired || isVoting}
                        >
                            <View style={[styles.optionBar, { width: `${pct}%` }]} />
                            <View style={styles.optionContent}>
                                <Text style={[styles.optionText, voted && styles.optionTextVoted]}>
                                    {opt.text || opt.content || `Lựa chọn ${idx + 1}`}
                                </Text>
                                {isVoting ? (
                                    <ActivityIndicator size="small" color="#10b981" />
                                ) : (
                                    <Text style={styles.optionPct}>{pct}% ({votes})</Text>
                                )}
                            </View>
                            {voted && (
                                <MaterialIcons name="check-circle" size={16} color="#10b981" style={{ position: 'absolute', right: 10 }} />
                            )}
                        </TouchableOpacity>
                    );
                })}

                <Text style={styles.totalVotes}>{totalVotes} lượt bình chọn</Text>
            </View>
        );
    };

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

            {/* Modal tạo poll */}
            <Modal visible={createVisible} transparent animationType="slide" onRequestClose={() => setCreateVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setCreateVisible(false)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tạo bình chọn</Text>
                            <TouchableOpacity onPress={() => setCreateVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Câu hỏi</Text>
                        <TextInput
                            style={styles.textInput}
                            value={question}
                            onChangeText={setQuestion}
                            placeholder="Nhập câu hỏi bình chọn..."
                            multiline
                        />

                        <Text style={styles.inputLabel}>Các lựa chọn</Text>
                        {options.map((opt, idx) => (
                            <View key={idx} style={styles.optionInputRow}>
                                <TextInput
                                    style={[styles.textInput, { flex: 1 }]}
                                    value={opt}
                                    onChangeText={(t) => updateOption(idx, t)}
                                    placeholder={`Lựa chọn ${idx + 1}`}
                                />
                                <TouchableOpacity onPress={() => removeOption(idx)} style={{ padding: 8 }}>
                                    <MaterialIcons name="remove-circle-outline" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addOptionBtn} onPress={addOption}>
                            <MaterialIcons name="add" size={18} color="#10b981" />
                            <Text style={styles.addOptionText}>Thêm lựa chọn</Text>
                        </TouchableOpacity>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Cho phép chọn nhiều đáp án</Text>
                            <Switch
                                value={allowMultiple}
                                onValueChange={setAllowMultiple}
                                trackColor={{ false: '#d1d5db', true: '#6ee7b7' }}
                                thumbColor={allowMultiple ? '#10b981' : '#9ca3af'}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, creating && { opacity: 0.6 }]}
                            onPress={handleCreatePoll}
                            disabled={creating}
                        >
                            {creating ? <ActivityIndicator size="small" color="#fff" /> : (
                                <Text style={styles.saveBtnText}>Tạo bình chọn</Text>
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
    pollCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    pollHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    pollQuestion: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
    closedBadge: { fontSize: 11, color: '#fff', backgroundColor: '#6b7280', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    multipleNote: { fontSize: 12, color: '#3b82f6', marginBottom: 8 },
    optionBtn: { position: 'relative', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginBottom: 8, overflow: 'hidden', minHeight: 44 },
    optionBtnVoted: { borderColor: '#10b981' },
    optionBar: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#ecfdf5', zIndex: 0 },
    optionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, zIndex: 1 },
    optionText: { flex: 1, fontSize: 14, color: '#374151' },
    optionTextVoted: { fontWeight: '600', color: '#065f46' },
    optionPct: { fontSize: 12, color: '#6b7280', marginLeft: 8 },
    totalVotes: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
    createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
    createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    inputLabel: { fontSize: 13, color: '#6b7280', marginBottom: 6, marginTop: 12 },
    textInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
    optionInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
    addOptionText: { fontSize: 14, color: '#10b981', fontWeight: '600' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 12 },
    switchLabel: { fontSize: 14, color: '#374151' },
    saveBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
