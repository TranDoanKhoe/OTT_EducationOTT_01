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
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import localStorage from '../../src/utils/localStoragePolyfill';
import {
    createNewClass,
    joinClassWithCode,
    listClassesByKeyword,
    listMyClasses,
} from '../../src/services/classService';

export default function ClassesTabScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [classes, setClasses] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [classCode, setClassCode] = useState('');
    const [newClassName, setNewClassName] = useState('');
    const role = useMemo(
        () =>
            String(localStorage.getItem('userRole') || 'STUDENT')
                .toUpperCase()
                .replace(/^ROLE_/, ''),
        [],
    );
    const isTeacher = role === 'TEACHER';

    const load = useCallback(async (searchText = '') => {
        try {
            const rows = searchText.trim()
                ? await listClassesByKeyword(searchText.trim())
                : await listMyClasses();
            setClasses(rows || []);
        } catch (error) {
            Alert.alert('Lỗi', error?.message || 'Không thể tải danh sách lớp học');
            setClasses([]);
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
        load(keyword);
    };

    const onSearch = () => {
        setLoading(true);
        load(keyword);
    };

    const onJoinByCode = async () => {
        if (!classCode.trim()) {
            Alert.alert('Thiếu mã lớp', 'Vui lòng nhập mã lớp học');
            return;
        }
        try {
            await joinClassWithCode(classCode.trim());
            setClassCode('');
            await load(keyword);
            Alert.alert('Thành công', 'Đã tham gia lớp học');
        } catch (error) {
            Alert.alert('Lỗi', error?.response?.data?.message || error?.message || 'Không thể tham gia lớp');
        }
    };

    const onCreateClass = async () => {
        if (!newClassName.trim()) {
            Alert.alert('Thiếu tên lớp', 'Vui lòng nhập tên lớp học');
            return;
        }
        try {
            await createNewClass(newClassName.trim(), []);
            setNewClassName('');
            await load(keyword);
            Alert.alert('Thành công', 'Đã tạo lớp học mới');
        } catch (error) {
            Alert.alert('Lỗi', error?.response?.data?.message || error?.message || 'Không thể tạo lớp');
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() =>
                router.push({
                    pathname: '/class/[id]',
                    params: { id: item.id, name: item.name, classCode: item.classCode || '' },
                })
            }
        >
            <View style={styles.cardHeader}>
                <MaterialIcons name="school" size={20} color="#0f766e" />
                <Text style={styles.cardName} numberOfLines={1}>
                    {item.name}
                </Text>
            </View>
            <Text style={styles.cardMeta}>Mã lớp: {item.classCode || '-'}</Text>
            <Text style={styles.cardMeta}>Thành viên: {(item.memberIds || []).length}</Text>
        </TouchableOpacity>
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
                <Text style={styles.title}>Lớp học</Text>
            </View>

            <View style={styles.searchRow}>
                <TextInput
                    value={keyword}
                    onChangeText={setKeyword}
                    placeholder="Tìm tên lớp học..."
                    style={styles.input}
                    returnKeyType="search"
                    onSubmitEditing={onSearch}
                    placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={onSearch}>
                    <MaterialIcons name="search" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.joinRow}>
                <TextInput
                    value={classCode}
                    onChangeText={setClassCode}
                    placeholder="Nhập mã lớp để tham gia..."
                    style={styles.input}
                    placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity style={styles.secondaryBtn} onPress={onJoinByCode}>
                    <Text style={styles.secondaryBtnText}>Tham gia</Text>
                </TouchableOpacity>
            </View>

            {isTeacher && (
                <View style={styles.joinRow}>
                    <TextInput
                        value={newClassName}
                        onChangeText={setNewClassName}
                        placeholder="Tên lớp học mới..."
                        style={styles.input}
                        placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity style={styles.secondaryBtn} onPress={onCreateClass}>
                        <Text style={styles.secondaryBtnText}>Tạo lớp</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={classes}
                keyExtractor={(item) => String(item.id)}
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
                        <MaterialIcons name="school" size={48} color="#d1fae5" />
                        <Text style={styles.emptyText}>Chưa có lớp học nào</Text>
                        <Text style={styles.emptySubText}>Nhập mã lớp để tham gia hoặc tạo lớp mới</Text>
                    </View>
                }
                contentContainerStyle={classes.length ? styles.list : styles.emptyGrow}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0fdf9' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#d1fae5',
    },
    title: { fontSize: 20, fontWeight: '700', color: '#065f46' },
    searchRow: { flexDirection: 'row', gap: 8, padding: 12 },
    joinRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#a7f3d0',
        borderRadius: 10,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
    },
    primaryBtn: {
        width: 42,
        borderRadius: 10,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtn: {
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#0f766e',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 42,
    },
    secondaryBtnText: { color: '#fff', fontWeight: '600' },
    list: { paddingHorizontal: 12, paddingBottom: 18 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#d1fae5',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    cardName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
    cardMeta: { fontSize: 12, color: '#4b5563', marginTop: 2 },
    emptyGrow: { flexGrow: 1 },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 70, gap: 8 },
    emptyText: { color: '#374151', fontWeight: '600', fontSize: 15 },
    emptySubText: { color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
