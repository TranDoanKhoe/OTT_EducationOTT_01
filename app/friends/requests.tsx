import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
    View, Text, FlatList, TouchableOpacity, StyleSheet, 
    ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
    acceptFriendRequest,
    cancelFriendRequest,
    fetchPendingFriendRequests,
} from '../../src/api/user';

export default function FriendRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const data = await fetchPendingFriendRequests();
            if (data && Array.isArray(data)) {
                setRequests(data);
            }
        } catch (error) {
            console.error('Lỗi tải yêu cầu:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleAccept = async (reqId) => {
        try {
            await acceptFriendRequest(reqId);
            setRequests(prev => prev.filter(req => (req.requestId || req.id) !== reqId));
            Alert.alert('Thành công', 'Đã thêm bạn mới');
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Không thể chấp nhận yêu cầu này');
        }
    };

    const handleReject = async (reqId) => {
        try {
            await cancelFriendRequest(reqId);
            setRequests(prev => prev.filter(req => (req.requestId || req.id) !== reqId));
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Không thể xóa yêu cầu này');
        }
    };

    const renderItem = ({ item }) => {
        const reqId = item.requestId || item.id;
        const sender = item.sender || {};
        const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || item.senderName || 'Người dùng';
        return (
            <View style={styles.card}>
                <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>
                        {senderName.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{senderName}</Text>
                    <Text style={styles.phone}>{sender.phone || item.phone || ''}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(reqId)}>
                        <Text style={styles.btnText}>Đồng ý</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(reqId)}>
                        <Text style={[styles.btnText, styles.rejectBtnText]}>Từ chối</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lời mời kết bạn</Text>
            </View>

            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            ) : requests.length === 0 ? (
                <View style={styles.centerContainer}>
                    <MaterialIcons name="person-add-disabled" size={64} color="#d1d5db" />
                    <Text style={styles.emptyText}>Bạn không có lời mời kết bạn nào</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => String(item.requestId || item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { marginTop: 16, color: '#6b7280', fontSize: 16 },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    avatarMini: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarMiniText: { color: '#047857', fontSize: 20, fontWeight: 'bold' },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    phone: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    actions: { flexDirection: 'row', gap: 8 },
    acceptBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
    rejectBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    rejectBtnText: { color: '#4b5563' }
});
