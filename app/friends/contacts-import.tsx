// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { searchUsersByPhones, sendFriendRequest } from '../../src/api/user';

type MatchedUser = {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    requestSent?: boolean;
};

export default function ContactsImportScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [matches, setMatches] = useState<MatchedUser[]>([]);
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const loadContactMatches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') {
                setError('Ứng dụng cần quyền truy cập danh bạ để tìm bạn bè.');
                setLoading(false);
                return;
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers],
            });

            const phones: string[] = [];
            for (const contact of data) {
                if (contact.phoneNumbers) {
                    for (const p of contact.phoneNumbers) {
                        const normalized = normalizePhone(p.number);
                        if (normalized) phones.push(normalized);
                    }
                }
            }

            if (phones.length === 0) {
                setMatches([]);
                setLoading(false);
                return;
            }

            const uniquePhones = [...new Set(phones)];
            const users: MatchedUser[] = await searchUsersByPhones(uniquePhones);
            setMatches(Array.isArray(users) ? users : []);
        } catch (err) {
            console.error('ContactsImport error:', err);
            setError('Không thể tải danh bạ. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadContactMatches();
    }, []);

    const normalizePhone = (raw: string): string | null => {
        if (!raw) return null;
        const digits = raw.replace(/\D/g, '');
        if (digits.startsWith('84') && digits.length >= 11) return '0' + digits.slice(2);
        if (digits.startsWith('0') && digits.length >= 9) return digits;
        if (digits.length >= 9) return '0' + digits;
        return null;
    };

    const handleAddFriend = async (user: MatchedUser) => {
        try {
            await sendFriendRequest(user.phone);
            setSentIds(prev => new Set(prev).add(user.id));
        } catch (err) {
            Alert.alert('Lỗi', err?.message || 'Không thể gửi lời mời kết bạn');
        }
    };

    const renderItem = ({ item }: { item: MatchedUser }) => {
        const sent = sentIds.has(item.id);
        return (
            <View style={styles.card}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>
                            {item.name?.[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                )}
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.phone}>{item.phone}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addBtn, sent && styles.addBtnSent]}
                    onPress={() => !sent && handleAddFriend(item)}
                    disabled={sent}
                >
                    <MaterialIcons
                        name={sent ? 'check' : 'person-add'}
                        size={20}
                        color="#fff"
                    />
                    <Text style={styles.addBtnText}>
                        {sent ? 'Đã gửi' : 'Kết bạn'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#f1f5f9" />
                </TouchableOpacity>
                <Text style={styles.title}>Bạn bè từ danh bạ</Text>
                <TouchableOpacity onPress={loadContactMatches} style={styles.refreshBtn}>
                    <MaterialIcons name="refresh" size={24} color="#10b981" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>Đang tìm kiếm bạn bè...</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <MaterialIcons name="error-outline" size={48} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadContactMatches}>
                        <Text style={styles.retryBtnText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            ) : matches.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialIcons name="people-outline" size={64} color="#475569" />
                    <Text style={styles.emptyTitle}>Không tìm thấy ai</Text>
                    <Text style={styles.emptyDesc}>
                        Không có người dùng nào trong danh bạ của bạn đang sử dụng ứng dụng này.
                    </Text>
                </View>
            ) : (
                <>
                    <Text style={styles.countLabel}>
                        Tìm thấy {matches.length} người dùng từ danh bạ
                    </Text>
                    <FlatList
                        data={matches}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 48 : 56,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    backBtn: { padding: 4 },
    refreshBtn: { padding: 4 },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#f1f5f9',
        textAlign: 'center',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    loadingText: { color: '#94a3b8', fontSize: 15, marginTop: 8 },
    errorText: { color: '#ef4444', fontSize: 15, textAlign: 'center' },
    retryBtn: {
        marginTop: 8,
        backgroundColor: '#10b981',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryBtnText: { color: '#fff', fontWeight: '600' },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: '#94a3b8' },
    emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
    countLabel: {
        fontSize: 13,
        color: '#64748b',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 12,
        gap: 12,
    },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600', color: '#f1f5f9' },
    phone: { fontSize: 13, color: '#64748b', marginTop: 2 },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b981',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    addBtnSent: { backgroundColor: '#334155' },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
