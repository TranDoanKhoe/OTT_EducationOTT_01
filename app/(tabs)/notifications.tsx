// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
    acceptNotification,
    getPendingNotifications,
    rejectNotification,
} from '../../src/services/notificationService';

export default function NotificationsTabScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [friendRequests, setFriendRequests] = useState([]);
    const [groupInvites, setGroupInvites] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await getPendingNotifications();
            setFriendRequests(data.friendRequests || []);
            setGroupInvites(data.groupInvites || []);
        } catch (error) {
            Alert.alert('Lỗi', error?.message || 'Không thể tải thông báo');
            setFriendRequests([]);
            setGroupInvites([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const combined = useMemo(() => [...friendRequests, ...groupInvites], [friendRequests, groupInvites]);

    const visibleNotifications = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return combined.filter((item) => {
            const matchesType = filter === 'all' || item.type === filter;
            const haystack = `${item.title || ''} ${item.subtitle || ''}`.toLowerCase();
            const matchesSearch = !keyword || haystack.includes(keyword);
            return matchesType && matchesSearch;
        });
    }, [combined, filter, search]);

    const filters = useMemo(() => {
        return [
            { key: 'all', label: 'Tất cả', count: combined.length },
            { key: 'friend', label: 'Kết bạn', count: friendRequests.length },
            { key: 'group', label: 'Nhóm', count: groupInvites.length },
        ];
    }, [combined.length, friendRequests.length, groupInvites.length]);

    const handleAction = async (item, action) => {
        try {
            if (action === 'accept') {
                await acceptNotification(item);
            } else {
                await rejectNotification(item);
            }
            setFriendRequests((prev) => prev.filter((x) => x.id !== item.id));
            setGroupInvites((prev) => prev.filter((x) => x.id !== item.id));
        } catch (error) {
            Alert.alert('Lỗi', error?.response?.data?.message || error?.message || 'Thao tác thất bại');
        }
    };

    const renderItem = ({ item }) => {
        const icon = item.type === 'group' ? 'groups' : 'person-add';
        return (
            <View style={styles.card}>
                <View style={styles.top}>
                    <View style={styles.iconWrap}>
                        <MaterialIcons name={icon} size={18} color="#0f766e" />
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={styles.subtitle} numberOfLines={1}>
                            {item.subtitle}
                        </Text>
                    </View>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleAction(item, 'accept')}
                    >
                        <Text style={styles.acceptText}>Đồng ý</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleAction(item, 'reject')}
                    >
                        <Text style={styles.rejectText}>Từ chối</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

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
                <Text style={styles.headerTitle}>Thông báo</Text>
                <Text style={styles.headerSub}>Lời mời kết bạn và nhóm</Text>
            </View>

            <View style={styles.controls}>
                <View style={styles.searchBox}>
                    <MaterialIcons name="search" size={18} color="#9ca3af" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm theo tên, nhóm..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <MaterialIcons name="cancel" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.filterRow}>
                    {filters.map((item) => {
                        const active = filter === item.key;
                        return (
                            <TouchableOpacity
                                key={item.key}
                                style={[styles.filterChip, active && styles.filterChipActive]}
                                onPress={() => setFilter(item.key)}
                            >
                                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                                    {item.label}
                                </Text>
                                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                                    <Text style={[styles.countText, active && styles.countTextActive]}>
                                        {item.count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <FlatList
                data={visibleNotifications}
                keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#10b981']}
                        tintColor="#10b981"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="notifications-none" size={44} color="#9ca3af" />
                        <Text style={styles.emptyText}>
                            {combined.length ? 'Không tìm thấy thông báo phù hợp' : 'Không có thông báo nào'}
                        </Text>
                    </View>
                }
                contentContainerStyle={visibleNotifications.length ? styles.list : styles.emptyGrow}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0fdf9' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#d1fae5',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#065f46' },
    headerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    controls: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#d1fae5',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        paddingHorizontal: 10,
        minHeight: 42,
    },
    searchInput: {
        flex: 1,
        color: '#111827',
        fontSize: 14,
        marginLeft: 8,
        paddingVertical: 8,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    filterChip: {
        flex: 1,
        minHeight: 36,
        borderRadius: 18,
        backgroundColor: '#f3f4f6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 8,
    },
    filterChipActive: { backgroundColor: '#10b981' },
    filterText: { color: '#374151', fontWeight: '600', fontSize: 13 },
    filterTextActive: { color: '#fff' },
    countBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
    countText: { color: '#374151', fontSize: 11, fontWeight: '700' },
    countTextActive: { color: '#fff' },
    list: { paddingHorizontal: 12, paddingVertical: 10 },
    card: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1fae5',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    top: { flexDirection: 'row', alignItems: 'center' },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#ccfbf1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    info: { flex: 1 },
    title: { fontSize: 14, fontWeight: '600', color: '#111827' },
    subtitle: { marginTop: 2, fontSize: 12, color: '#6b7280' },
    actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    actionBtn: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    acceptBtn: { backgroundColor: '#10b981' },
    rejectBtn: { backgroundColor: '#f3f4f6' },
    acceptText: { color: '#fff', fontWeight: '600' },
    rejectText: { color: '#374151', fontWeight: '600' },
    emptyGrow: { flexGrow: 1 },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyText: { marginTop: 10, color: '#6b7280' },
});
