// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Modal,
    Pressable,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchFriendsList, blockUser, unblockUser, deleteFriend } from '../../src/api/user';

export default function ContactsScreen() {
    const router = useRouter();
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState(null);

    const getFriendDisplayName = (friend) => {
        const firstLast =
            `${friend?.firstName || ''} ${friend?.lastName || ''}`.trim();
        return (
            friend?.name ||
            friend?.fullName ||
            firstLast ||
            friend?.username ||
            friend?.phone ||
            friend?.email ||
            'Bạn bè'
        );
    };

    // Tải danh sách bạn bè từ API
    const loadFriends = useCallback(async () => {
        try {
            const data = await fetchFriendsList();
            // Sắp xếp theo Alphabet
            const sorted = (data || []).sort((a, b) => {
                const nameA = getFriendDisplayName(a);
                const nameB = getFriendDisplayName(b);
                return nameA.localeCompare(nameB, 'vi');
            });
            setFriends(sorted);
        } catch (error) {
            console.error('Lỗi tải danh bạ:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadFriends();
    }, [loadFriends]);

    const onRefresh = () => {
        setRefreshing(true);
        loadFriends();
    };

    // Chuyển sang màn hình nhắn tin với bạn bè này
    const openChat = (friend) => {
        const friendName = getFriendDisplayName(friend);
        router.push({
            pathname: `/chat/${friend.id}`,
            params: { name: friendName, isPrivate: 'true' },
        });
    };

    const openMenu = (friend) => {
        setSelectedFriend(friend);
        setMenuVisible(true);
    };

    const handleBlock = async () => {
        if (!selectedFriend) return;
        setMenuVisible(false);
        Alert.alert(
            'Chặn người dùng',
            `Bạn có chắc muốn chặn ${getFriendDisplayName(selectedFriend)}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Chặn',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await blockUser(selectedFriend.id);
                            await loadFriends();
                            Alert.alert('Thành công', 'Đã chặn người dùng');
                        } catch (e) {
                            Alert.alert('Lỗi', 'Không thể chặn người dùng');
                        }
                    },
                },
            ],
        );
    };

    const handleUnfriend = async () => {
        if (!selectedFriend) return;
        setMenuVisible(false);
        Alert.alert(
            'Xóa bạn bè',
            `Bạn có chắc muốn xóa ${getFriendDisplayName(selectedFriend)} khỏi danh sách bạn bè?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteFriend(selectedFriend.id);
                            await loadFriends();
                            Alert.alert('Thành công', 'Đã xóa bạn bè');
                        } catch (e) {
                            Alert.alert('Lỗi', 'Không thể xóa bạn bè');
                        }
                    },
                },
            ],
        );
    };

    const filteredFriends = friends.filter((f) => {
        const name = getFriendDisplayName(f).toLowerCase();
        return (
            name.includes(search.toLowerCase()) ||
            (f.phone || '').includes(search)
        );
    });

    // Nhóm bạn bè theo chữ cái đầu tên
    const groupedFriends = filteredFriends.reduce((acc, friend) => {
        const name = getFriendDisplayName(friend).trim();
        const letter = name.charAt(0).toUpperCase();
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(friend);
        return acc;
    }, {});

    const sections = Object.keys(groupedFriends)
        .sort()
        .map((letter) => ({
            letter,
            data: groupedFriends[letter],
        }));

    const renderItem = (friend) => (
        <View key={friend.id} style={styles.contactItem}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {getFriendDisplayName(friend).charAt(0).toUpperCase() ||
                        '?'}
                </Text>
                {friend.isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>
                    {getFriendDisplayName(friend)}
                </Text>
                <Text style={styles.contactSub}>
                    {friend.phone || friend.email || ''}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => openChat(friend)}
            >
                <MaterialIcons name="chat" size={20} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn} onPress={() => openMenu(friend)}>
                <MaterialIcons name="more-vert" size={20} color="#9ca3af" />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Danh bạ</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => router.push('/friends/search')}
                        style={styles.headerBtn}
                    >
                        <MaterialIcons
                            name="person-search"
                            size={24}
                            color="#10b981"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/friends/requests')}
                        style={styles.headerBtn}
                    >
                        <MaterialIcons
                            name="group-add"
                            size={24}
                            color="#10b981"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/group/invites')}
                        style={styles.headerBtn}
                    >
                        <MaterialIcons
                            name="mail"
                            size={24}
                            color="#10b981"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/friends/contacts-import')}
                        style={styles.headerBtn}
                    >
                        <MaterialIcons
                            name="contacts"
                            size={24}
                            color="#10b981"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <MaterialIcons
                    name="search"
                    size={20}
                    color="#9ca3af"
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm theo tên, số điện thoại..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor="#9ca3af"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <MaterialIcons
                            name="cancel"
                            size={18}
                            color="#9ca3af"
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Stats badge */}
            <View style={styles.statsBadge}>
                <MaterialIcons name="people" size={16} color="#059669" />
                <Text style={styles.statsText}>{friends.length} bạn bè</Text>
            </View>

            {sections.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBg}>
                        <MaterialIcons
                            name="people-outline"
                            size={40}
                            color="#10b981"
                        />
                    </View>
                    <Text style={styles.emptyTitle}>Chưa có bạn bè</Text>
                    <Text style={styles.emptySubtitle}>
                        Tìm kiếm và thêm bạn bè để bắt đầu nhắn tin!
                    </Text>
                    <TouchableOpacity
                        style={styles.findBtn}
                        onPress={() => router.push('/friends/search')}
                    >
                        <MaterialIcons
                            name="person-add"
                            size={18}
                            color="#fff"
                        />
                        <Text style={styles.findBtnText}>Tìm bạn bè</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={sections}
                    keyExtractor={(item) => item.letter}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#10b981']}
                            tintColor="#10b981"
                        />
                    }
                    renderItem={({ item: section }) => (
                        <View>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionLetter}>
                                    {section.letter}
                                </Text>
                            </View>
                            {section.data.map((friend) => renderItem(friend))}
                        </View>
                    )}
                />
            )}

            {/* Context menu bạn bè */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
                    <View style={styles.menuCard}>
                        <Text style={styles.menuTitle}>
                            {selectedFriend ? getFriendDisplayName(selectedFriend) : ''}
                        </Text>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setMenuVisible(false);
                                if (selectedFriend) openChat(selectedFriend);
                            }}
                        >
                            <MaterialIcons name="chat" size={20} color="#111827" />
                            <Text style={styles.menuItemText}>Nhắn tin</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
                            <MaterialIcons name="block" size={20} color="#f59e0b" />
                            <Text style={[styles.menuItemText, { color: '#f59e0b' }]}>Chặn người dùng</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleUnfriend}>
                            <MaterialIcons name="person-remove" size={20} color="#ef4444" />
                            <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Xóa bạn bè</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0fdf9' },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0fdf9',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#d1fae5',
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#065f46' },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerBtn: { padding: 4 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 10,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#d1fae5',
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 15, color: '#111827' },
    statsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    statsText: { fontSize: 13, color: '#059669', fontWeight: '500' },
    sectionHeader: {
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    sectionLetter: {
        fontSize: 12,
        fontWeight: '700',
        color: '#059669',
        textTransform: 'uppercase',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0fdf4',
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#059669',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    onlineDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: '#fff',
    },
    contactInfo: { flex: 1 },
    contactName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    contactSub: { fontSize: 12, color: '#6b7280' },
    chatBtn: { padding: 8, marginRight: 4 },
    moreBtn: { padding: 8 },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#d1fae5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    findBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#10b981',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    findBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-end',
    },
    menuCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingVertical: 8,
        paddingBottom: 28,
    },
    menuTitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        fontWeight: '600',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    menuItemText: {
        fontSize: 15,
        color: '#111827',
    },
});
