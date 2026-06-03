import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import Card from '../components/Card';
import { getAll as getCourses } from '../services/courseService';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (e) {
        console.error('Failed to load courses', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const renderItem = ({ item }) => (
    <Card
      title={item.title}
      subtitle={item.description}
      imageUri={item.thumbnailUrl}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
    />
  );

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Courses</Text>
      <FlatList
        data={courses}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
});

export default HomeScreen;
