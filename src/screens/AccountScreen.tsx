// src/screens/AccountScreen.tsx
// NOTE: This file is superseded by app/(tabs)/profile.tsx in the Expo Router project.
// Kept for legacy navigation compatibility only.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, Alert } from 'react-native';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id?: string;
  name: string;
  email?: string;
}

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [updating, setUpdating] = useState(false);

  // Load profile from stored user data
  useEffect(() => {
    (async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        const storedEmail = await AsyncStorage.getItem('userEmail');
        const mockProfile: User = {
          name: storedName || (user as any)?.name || '',
          email: storedEmail || (user as any)?.email || '',
        };
        setProfile(mockProfile);
        setName(mockProfile.name);
      } catch (e) {
        console.error('Failed to load profile', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async () => {
    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ott-education-be.onrender.com';
      const response = await fetch(`${backendUrl}/user/update-json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      Alert.alert('Cập nhật thành công');
      // Refresh local user info
      setProfile({ ...(profile as User), name });
    } catch (e) {
      console.error(e);
      Alert.alert('Cập nhật thất bại');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Email (không thay đổi)</Text>
      <Text style={styles.value}>{profile?.email}</Text>

      <Text style={styles.label}>Họ và tên</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Nhập họ và tên"
      />

      {/* @ts-ignore */}
      <Button title="Lưu thay đổi" onPress={onSave} loading={updating} />

      <View style={styles.divider} />

      {/* @ts-ignore */}
      <Button title="Đăng xuất" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  label: { fontSize: 14, color: '#777', marginTop: 12 },
  value: { fontSize: 16, color: '#000', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 24 },
});