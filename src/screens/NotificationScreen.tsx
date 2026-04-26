// src/screens/NotificationScreen.tsx
// NOTE: This file is superseded by app/(tabs)/notifications.tsx in the Expo Router project.
// Kept for legacy navigation compatibility only.
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getPendingNotifications, acceptNotification, rejectNotification } from '../services/notificationService';

interface NotificationItem {
  id: string;
  type: 'friend' | 'group';
  title: string;
  subtitle: string;
  raw: any;
}

export default function NotificationScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPendingNotifications();
      const combined: NotificationItem[] = [
        ...(data.friendRequests || []).map((r: any) => ({ ...r, type: 'friend' as const })),
        ...(data.groupInvites || []).map((r: any) => ({ ...r, type: 'group' as const })),
      ];
      setNotifications(combined);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onAccept = async (item: NotificationItem) => {
    try {
      await acceptNotification(item);
      setNotifications(prev => prev.filter(n => n.id !== item.id));
    } catch (e) {
      console.error('Failed to accept notification', e);
    }
  };

  const onReject = async (item: NotificationItem) => {
    try {
      await rejectNotification(item);
      setNotifications(prev => prev.filter(n => n.id !== item.id));
    } catch (e) {
      console.error('Failed to reject notification', e);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.subtitle}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={() => onAccept(item)} style={styles.acceptBtn}>
          <Text style={styles.acceptText}>Đồng ý</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onReject(item)} style={styles.rejectBtn}>
          <Text style={styles.rejectText}>Từ chối</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      {notifications.length === 0 ? (
        <Text style={styles.empty}>Bạn không có thông báo nào.</Text>
      ) : (
        <FlatList data={notifications} keyExtractor={it => `${it.type}-${it.id}`} renderItem={renderItem} />
      )}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutTxt}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 12 },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 14, color: '#555', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  acceptBtn: { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  acceptText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  rejectBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  rejectText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  logoutBtn: { marginTop: 20, padding: 12, backgroundColor: '#e53935', borderRadius: 6, alignItems: 'center' },
  logoutTxt: { color: '#fff', fontWeight: '600' },
});