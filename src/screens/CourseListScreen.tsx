// src/screens/CourseListScreen.tsx
// NOTE: This file is superseded by app/(tabs)/classes.tsx in the Expo Router project.
// Kept for legacy navigation compatibility only.
import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { listMyClasses } from '../services/classService';

export default function CourseListScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyClasses()
      .then((rows) => setCourses(rows || []))
      .catch((e) => console.error('Failed to load classes', e))
      .finally(() => setLoading(false));
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.cardName}>{item.name}</Text>
      <Text style={styles.cardMeta}>Thành viên: {(item.memberIds || []).length}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={it => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có lớp học nào</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 10 },
  card: { backgroundColor: '#f0fdf9', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#d1fae5' },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#4b5563' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
});