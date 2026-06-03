import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchFriendsList } from '../../src/api/user';
import { createGroup } from '../../src/api/groupApi';
import localStorage from '../../src/utils/localStoragePolyfill';

export default function CreateGroupScreen() {
    const router = useRouter();
    const [groupName, setGroupName] = useState('');
    const [friends, setFriends] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const normalizeFriend = (item) => {
        const id = item?.id || item?.userId || item?._id || item?.friendId;
        if (!id) return null;

        const fullName =
            item?.name ||
            item?.fullName ||
            `${item?.firstName || ''} ${item?.lastName || ''}`.trim() ||
            item?.username ||
            item?.phone ||
            item?.email ||
            'Bạn bè';

        return {
            id: String(id),
            name: fullName,
            subtitle: item?.phone || item?.email || '',
        };
    };

    useEffect(() => {
        const loadFriends = async () => {
            try {
                const data = await fetchFriendsList();
                const normalized = (Array.isArray(data) ? data : [])
                    .map(normalizeFriend)
                    .filter(Boolean);
                setFriends(normalized);
            } catch (error) {
                console.error('Lỗi tải danh bạ:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadFriends();
    }, []);

    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filteredFriends = friends.filter((friend) => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return true;
        return (
            friend.name.toLowerCase().includes(keyword) ||
            friend.subtitle.toLowerCase().includes(keyword)
        );
    });

    const handleCreate = async () => {
        if (!groupName.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
            return;
        }
        if (selectedIds.size === 0) {
            Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 thành viên');
            return;
        }

        setIsCreating(true);
        try {
            const token =
                localStorage.getItem('token') ||
                localStorage.getItem('accessToken');
            await createGroup(
                groupName.trim(),
                Array.from(selectedIds),
                null,
                token,
            );

            Alert.alert('Thành công', 'Đã tạo nhóm nhắn tin');
            router.back();
        } catch (error) {
            Alert.alert('Lỗi tạo nhóm', error.message || 'Hệ thống đang bận');
        } finally {
            setIsCreating(false);
        }
    };

    const renderFriend = ({ item }) => {
        const isSelected = selectedIds.has(item.id);
        const initial = item.name?.charAt(0)?.toUpperCase() || '?';

        return (
            <TouchableOpacity
                style={[
                    styles.friendItem,
                    isSelected && styles.friendItemSelected,
                ]}
                onPress={() => toggleSelect(item.id)}
            >
                <View
                    style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                    ]}
                >
                    {isSelected && (
                        <MaterialIcons name="check" size={16} color="#fff" />
                    )}
                </View>
                <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>{initial}</Text>
                </View>
                <View style={styles.friendMeta}>
                    <Text style={styles.friendName} numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.subtitle ? (
                        <Text style={styles.friendSubtitle} numberOfLines={1}>
                            {item.subtitle}
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo nhóm mới</Text>
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={isCreating || selectedIds.size === 0}
                    style={styles.createBtnWrap}
                >
                    {isCreating ? (
                        <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                        <Text
                            style={[
                                styles.createBtnText,
                                selectedIds.size === 0 &&
                                    styles.createBtnDisabled,
                            ]}
                        >
                            Tạo
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
                <View style={styles.groupIconPlaceholder}>
                    <MaterialIcons
                        name="camera-alt"
                        size={24}
                        color="#9ca3af"
                    />
                </View>
                <View style={styles.formColumn}>
                    <TextInput
                        style={styles.nameInput}
                        placeholder="Tên nhóm (Bắt buộc)"
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                    <View style={styles.searchBox}>
                        <MaterialIcons
                            name="search"
                            size={18}
                            color="#9ca3af"
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm thành viên..."
                            value={search}
                            onChangeText={setSearch}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
                </View>
            </View>

            <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>
                    Chọn thành viên ({selectedIds.size})
                </Text>
                {isLoading ? (
                    <ActivityIndicator
                        size="large"
                        color="#10b981"
                        style={{ marginTop: 20 }}
                    />
                ) : (
                    <FlatList
                        data={filteredFriends}
                        keyExtractor={(item) => item.id}
                        renderItem={renderFriend}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                Không tìm thấy thành viên phù hợp
                            </Text>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    createBtnWrap: { minWidth: 36, alignItems: 'flex-end' },
    createBtnText: {
        color: '#10b981',
        fontWeight: 'bold',
        fontSize: 16,
        padding: 4,
    },
    createBtnDisabled: { color: '#9ca3af' },
    inputSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        backgroundColor: '#fff',
    },
    groupIconPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderStyle: 'dashed',
        marginRight: 16,
    },
    formColumn: { flex: 1 },
    nameInput: {
        fontSize: 16,
        height: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#10b981',
    },
    searchBox: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        paddingHorizontal: 10,
        backgroundColor: '#f9fafb',
    },
    searchInput: {
        flex: 1,
        height: 38,
        marginLeft: 8,
        fontSize: 14,
        color: '#111827',
    },
    listSection: { flex: 1, backgroundColor: '#f9fafb' },
    sectionTitle: {
        padding: 16,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6b7280',
        textTransform: 'uppercase',
    },
    list: { paddingHorizontal: 16, paddingBottom: 20 },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    friendItemSelected: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#d1d5db',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: { backgroundColor: '#10b981', borderColor: '#10b981' },
    avatarMini: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e7ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarMiniText: { color: '#4338ca', fontWeight: 'bold', fontSize: 16 },
    friendMeta: { flex: 1 },
    friendName: { fontSize: 16, color: '#111827', fontWeight: '600' },
    friendSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#6b7280' },
});
