// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchGroupDetail } from '../../src/api/groupApi';
import { getClassMembers } from '../../src/services/classService';
import localStorage from '../../src/utils/localStoragePolyfill';

export default function ClassDetailScreen() {
    const router = useRouter();
    const { id, name, classCode } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [members, setMembers] = useState([]);

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
                <TouchableOpacity style={styles.chatBtn} onPress={openClassChat}>
                    <MaterialIcons name="chat" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.chatBtnText}>Mở chat lớp học</Text>
                </TouchableOpacity>
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
    emptyText: { color: '#6b7280', fontSize: 14 },
});
