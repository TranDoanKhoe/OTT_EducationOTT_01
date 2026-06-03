import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-nocheck
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchUserGroups } from '../../src/api/groupApi';
import { getChatHistory, getGroupChatHistory, connectWebSocket, disconnectWebSocket } from '../../src/api/messageApi';
import {
    fetchFriendsList,
    fetchPendingFriendRequests,
    acceptFriendRequest,
    cancelFriendRequest,
} from '../../src/api/user';
import localStorage from '../../src/utils/localStoragePolyfill';

export default function ChatListScreen() {
    const EMPTY_PREVIEW = 'Nhấn để bắt đầu trò chuyện';
    const router = useRouter();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [serverWaking, setServerWaking] = useState(false);
    const [unreadMap, setUnreadMap] = useState({});
    const chatsRef = useRef([]);

    const getMessagePreview = (raw) => {
        if (!raw) return '';
        if (typeof raw === 'string') return raw.trim();

        const text =
            raw?.content ||
            raw?.text ||
            raw?.message ||
            raw?.body ||
            raw?.lastMessage ||
            raw?.latestMessage;
        if (typeof text === 'string' && text.trim()) return text.trim();

        if (raw?.type && raw.type !== 'TEXT') return 'Tin nhắn tệp';
        if (raw?.fileName || raw?.thumbnail || raw?.publicId)
            return 'Tin nhắn tệp';
        if (raw?.recalled) return 'Tin nhắn đã thu hồi';

        return '';
    };

    const normalizeGroupChats = (raw) => {
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        if (Array.isArray(raw?.groups)) return raw.groups;
        if (Array.isArray(raw?.content)) return raw.content;
        return [];
    };

    const normalizeFriendChats = (friends = []) => {
        return (Array.isArray(friends) ? friends : [])
            .map((friend) => {
                const friendId =
                    friend?.id ||
                    friend?.userId ||
                    friend?._id ||
                    friend?.friendId;
                if (!friendId) return null;

                const fullName =
                    friend?.name ||
                    friend?.fullName ||
                    `${friend?.firstName || ''} ${friend?.lastName || ''}`.trim() ||
                    friend?.username ||
                    friend?.phone ||
                    'Bạn bè';

                return {
                    id: String(friendId),
                    name: fullName,
                    avatar:
                        friend?.avatar ||
                        friend?.avatarUrl ||
                        friend?.profilePicture ||
                        null,
                    lastMessage:
                        getMessagePreview(friend?.lastMessage) ||
                        getMessagePreview(friend?.latestMessage) ||
                        getMessagePreview(friend?.lastChatMessage) ||
                        '',
                    isPrivate: true,
                };
            })
            .filter(Boolean);
    };

    const enrichChatsWithLastMessage = useCallback(async (items, token) => {
        const jobs = items.map(async (chat) => {
            const existingPreview = getMessagePreview(chat?.lastMessage);
            if (existingPreview && existingPreview !== EMPTY_PREVIEW) {
                return { ...chat, lastMessage: existingPreview };
            }

            try {
                const history = chat?.isPrivate
                    ? await getChatHistory(chat.id, token)
                    : await getGroupChatHistory(chat.id, token);
                const rows = Array.isArray(history) ? history : [];
                const last = rows[rows.length - 1];
                const preview = getMessagePreview(last);
                return {
                    ...chat,
                    lastMessage: preview || '',
                };
            } catch (_e) {
                return {
                    ...chat,
                    lastMessage: chat?.lastMessage || '',
                };
            }
        });

        return Promise.all(jobs);
    }, []);

    // Ping server để wake-up Render.com trước khi fetch data thật
    const wakeServer = async () => {
        const BACKEND_URL =
            process.env.EXPO_PUBLIC_BACKEND_URL ||
            'https://ott-education-be.onrender.com';
        try {
            await fetch(`${BACKEND_URL}/actuator/health`, { method: 'GET' });
        } catch {
            // Bỏ qua lỗi ping - chỉ mục đích wake server
        }
    };

    // Tải danh sách cuộc trò chuyện từ API với retry khi timeout
    const loadChats = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const userId = localStorage.getItem('userId');
            if (!token || !userId) {
                router.replace('/login');
                return;
            }

            let raw = [];

            // Lần thử đầu
            try {
                raw = await fetchUserGroups(userId, token);
            } catch (err) {
                const status = err?.response?.status;

                // Chỉ redirect login khi 401 (token thực sự không hợp lệ)
                if (status === 401) {
                    console.warn(
                        '🔒 401 - Token không hợp lệ, chuyển về Login',
                    );
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('token');
                    localStorage.removeItem('userId');
                    router.replace('/login');
                    return;
                }

                // 403 = không có quyền truy cập endpoint này → hiện danh sách trống, không redirect
                if (status === 403) {
                    console.warn(
                        '⚠️ 403 - Không có quyền truy cập danh sách nhóm, hiện danh sách trống',
                    );
                    raw = [];
                }

                // Timeout → server đang sleep → wake và thử lại
                if (
                    err?.message?.includes('timeout') ||
                    err?.code === 'ECONNABORTED'
                ) {
                    setServerWaking(true);
                    await wakeServer();
                    await new Promise((resolve) => setTimeout(resolve, 8000));

                    try {
                        raw = await fetchUserGroups(userId, token);
                    } catch (err2) {
                        const status2 = err2?.response?.status;
                        if (status2 === 401) {
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('token');
                            localStorage.removeItem('userId');
                            router.replace('/login');
                            return;
                        }
                        if (status2 === 403) {
                            raw = [];
                        } else {
                            throw err2;
                        }
                    }
                } else {
                    if (status !== 403) {
                        throw err;
                    }
                }
            }

            setServerWaking(false);

            const groupChats = normalizeGroupChats(raw).map((group) => ({
                ...group,
                id: String(group?.id || group?._id),
                avatar:
                    group?.avatarGroup ||
                    group?.groupAvatar ||
                    group?.avatar ||
                    null,
                isPrivate: false,
            }));

            let friendChats = [];
            try {
                const friendRaw = await fetchFriendsList();
                friendChats = normalizeFriendChats(friendRaw);
            } catch (friendErr) {
                console.warn(
                    '⚠️ Không tải được danh sách chat cá nhân:',
                    friendErr?.message,
                );
            }

            const mergedChats = [...groupChats, ...friendChats];
            const dedupedChats = mergedChats.filter(
                (item, idx, arr) =>
                    item?.id &&
                    arr.findIndex(
                        (x) =>
                            x.id === item.id && x.isPrivate === item.isPrivate,
                    ) === idx,
            );

            const chatsWithPreview = await enrichChatsWithLastMessage(
                dedupedChats,
                token,
            );
            setChats(chatsWithPreview);
        } catch (error) {
            setServerWaking(false);
            console.error('Lỗi khi tải danh sách chat:', error.message);
            setChats([]); // Hiện trống thay vì crash
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    // Tải lời mời kết bạn đang chờ
    const loadPendingRequests = useCallback(async () => {
        try {
            const data = await fetchPendingFriendRequests();
            setPendingRequests(data || []);
        } catch {}
    }, []);

    const stompConnectedRef = useRef(false);
    const [focusCount, setFocusCount] = useState(0);

    useEffect(() => {
        chatsRef.current = chats;
    }, [chats]);

    useEffect(() => {
        loadChats();
        loadPendingRequests();
    }, [loadChats, loadPendingRequests]);

    // Connect STOMP once chats are first loaded
    useEffect(() => {
        if (chats.length === 0 || stompConnectedRef.current) return;
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        if (!token || !userId) return;

        const groupIds = chats.filter((c) => !c.isPrivate).map((c) => c.id).filter(Boolean);

        const handleNewMessage = (msg) => {
            const chatId = msg.groupId ? String(msg.groupId)
                : String(msg.senderId !== userId ? msg.senderId : msg.receiverId || '');
            if (!chatId) return;
            const preview = msg.recalled ? 'Tin nhắn đã thu hồi'
                : msg.type && msg.type !== 'TEXT' ? 'Tin nhắn tệp'
                : (msg.content || '');
            setChats((prev) => prev.map((c) =>
                String(c.id) === chatId ? { ...c, lastMessage: preview } : c
            ));
            setUnreadMap((prev) => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
        };

        // Cập nhật trạng thái online/offline realtime
        const handleStatusChange = (statusEvent) => {
            if (!statusEvent?.userId) return;
            setChats((prev) => prev.map((c) =>
                c.isPrivate && String(c.id) === String(statusEvent.userId)
                    ? { ...c, isOnline: statusEvent.online === true || statusEvent.status === 'ONLINE' }
                    : c,
            ));
        };

        connectWebSocket(
            token, userId,
            handleNewMessage,
            null, null, null, null,
            groupIds,
            null, null,
            handleStatusChange,
        )
            .then(() => { stompConnectedRef.current = true; })
            .catch(() => {});
    }, [chats, focusCount]);

    // Reconnect STOMP when screen regains focus (after returning from chat screen)
    useFocusEffect(
        useCallback(() => {
            stompConnectedRef.current = false;
            setFocusCount((n) => n + 1);
            return () => {
                disconnectWebSocket();
                stompConnectedRef.current = false;
            };
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadChats();
        loadPendingRequests();
    };

    // Chấp nhận lời mời kết bạn
    const handleAccept = async (requestId) => {
        try {
            await acceptFriendRequest(requestId);
            setPendingRequests((prev) =>
                prev.filter((r) => (r.requestId || r.id) !== requestId),
            );
        } catch {}
    };

    // Từ chối lời mời kết bạn
    const handleDecline = async (requestId) => {
        try {
            await cancelFriendRequest(requestId);
            setPendingRequests((prev) =>
                prev.filter((r) => (r.requestId || r.id) !== requestId),
            );
        } catch {}
    };

    const allMatchedChats = chats.filter((c) =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()),
    );

    const filteredChats = allMatchedChats.filter((chat) => {
        if (filterType === 'private') return chat.isPrivate;
        if (filterType === 'group') return !chat.isPrivate;
        return true;
    });

    const privateCount = allMatchedChats.filter((c) => c.isPrivate).length;
    const groupCount = allMatchedChats.filter((c) => !c.isPrivate).length;

    // Điều hướng vào khung chat
    const openChat = (chatItem) => {
        setUnreadMap((prev) => { const next = { ...prev }; delete next[String(chatItem.id)]; return next; });
        router.push({
            pathname: `/chat/${chatItem.id}`,
            params: {
                name: chatItem.name,
                isPrivate: chatItem.isPrivate ? 'true' : 'false',
            },
        });
    };

    // Render item danh sách chat
    const renderChatItem = ({ item }) => {
        const initial = (item.name || 'G').charAt(0).toUpperCase();
        const isGroup = !item.isPrivate;
        const unread = unreadMap[String(item.id)] || 0;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => openChat(item)}
                activeOpacity={0.7}
            >
                <View
                    style={[
                        styles.avatar,
                        { backgroundColor: isGroup ? '#7c3aed' : '#059669' },
                    ]}
                >
                    {item?.avatar ? (
                        <Image
                            source={{ uri: item.avatar }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <Text style={styles.avatarText}>{initial}</Text>
                    )}
                    {!isGroup && item.isOnline && <View style={styles.onlineDot} />}
                    {isGroup && (
                        <View style={styles.groupBadge}>
                            <MaterialIcons name="group" size={8} color="#fff" />
                        </View>
                    )}
                    {unread > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.chatInfo}>
                    <View style={styles.chatNameRow}>
                        <Text style={[styles.chatName, unread > 0 && { fontWeight: '700' }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        {isGroup && (
                            <Text style={styles.groupTagText}>Nhóm</Text>
                        )}
                    </View>
                    <Text style={[styles.lastMessage, unread > 0 && { color: '#111', fontWeight: '600' }]} numberOfLines={1}>
                        {item.lastMessage || EMPTY_PREVIEW}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Render phần lời mời kết bạn
    const renderPendingRequests = () => {
        if (!pendingRequests.length) return null;
        return (
            <View style={styles.pendingSection}>
                <Text style={styles.pendingSectionTitle}>
                    🔔 Lời mời kết bạn ({pendingRequests.length})
                </Text>
                {pendingRequests.slice(0, 3).map((req) => {
                    const reqId = req.requestId || req.id;
                    const sender = req.sender || {};
                    const name =
                        sender.name ||
                        sender.fullName ||
                        `${sender.firstName || ''} ${sender.lastName || ''}`.trim() ||
                        sender.username ||
                        sender.phone ||
                        req.senderName ||
                        'Người dùng';
                    return (
                        <View key={reqId} style={styles.pendingItem}>
                            <View
                                style={[
                                    styles.avatar,
                                    {
                                        backgroundColor: '#059669',
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.avatarText,
                                        { fontSize: 16 },
                                    ]}
                                >
                                    {name.charAt(0)}
                                </Text>
                            </View>
                            <View style={styles.pendingInfo}>
                                <Text style={styles.pendingName}>{name}</Text>
                                <Text style={styles.pendingSubtitle}>
                                    Muốn kết nối với bạn
                                </Text>
                            </View>
                            <View style={styles.pendingActions}>
                                <TouchableOpacity
                                    style={styles.acceptBtn}
                                    onPress={() => handleAccept(reqId)}
                                >
                                    <Text style={styles.acceptBtnText}>✓</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.declineBtn}
                                    onPress={() => handleDecline(reqId)}
                                >
                                    <Text style={styles.declineBtnText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                {serverWaking ? (
                    <>
                        <Text style={styles.wakingTitle}>
                            ⏳ Server đang khởi động...
                        </Text>
                        <Text style={styles.wakingSubtitle}>
                            Render.com free tier cần 30–60 giây để thức dậy.
                            {'\n'}Vui lòng đợi, đang kết nối lại...
                        </Text>
                    </>
                ) : (
                    <Text style={styles.wakingSubtitle}>
                        Đang tải dữ liệu...
                    </Text>
                )}
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Cuộc trò chuyện</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => router.push('/contacts')}
                        style={styles.headerBtn}
                    >
                        <MaterialIcons
                            name="contacts"
                            size={20}
                            color="#10b981"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/notifications')}
                        style={styles.headerBtn}
                    >
                        <MaterialIcons
                            name="notifications-none"
                            size={22}
                            color="#10b981"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/group/create')}
                        style={styles.headerBtnPrimary}
                    >
                        <MaterialIcons
                            name="group-add"
                            size={20}
                            color="#fff"
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
                    placeholder="Tìm cuộc trò chuyện..."
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

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterRow}
            >
                <TouchableOpacity
                    style={[
                        styles.filterChip,
                        filterType === 'all' && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterType('all')}
                >
                    <Text
                        style={[
                            styles.filterChipText,
                            filterType === 'all' && styles.filterChipTextActive,
                        ]}
                    >
                        Tất cả ({allMatchedChats.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.filterChip,
                        filterType === 'private' && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterType('private')}
                >
                    <Text
                        style={[
                            styles.filterChipText,
                            filterType === 'private' &&
                                styles.filterChipTextActive,
                        ]}
                    >
                        Cá nhân ({privateCount})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.filterChip,
                        filterType === 'group' && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterType('group')}
                >
                    <Text
                        style={[
                            styles.filterChipText,
                            filterType === 'group' &&
                                styles.filterChipTextActive,
                        ]}
                    >
                        Nhóm ({groupCount})
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            <FlatList
                data={filteredChats}
                keyExtractor={(item, idx) =>
                    `${item.isPrivate ? 'p' : 'g'}-${item.id || idx}`
                }
                renderItem={renderChatItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#10b981']}
                        tintColor="#10b981"
                    />
                }
                ListHeaderComponent={renderPendingRequests}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBg}>
                            <MaterialIcons
                                name="chat-bubble-outline"
                                size={40}
                                color="#10b981"
                            />
                        </View>
                        <Text style={styles.emptyTitle}>
                            Chưa có cuộc trò chuyện
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            Hãy kết nối với bạn bè hoặc tạo nhóm học tập!
                        </Text>
                    </View>
                }
                contentContainerStyle={
                    filteredChats.length === 0
                        ? styles.emptyList
                        : styles.listContent
                }
                ItemSeparatorComponent={() => (
                    <View style={styles.rowDivider} />
                )}
            />
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
        paddingHorizontal: 32,
    },
    wakingTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#065f46',
        marginTop: 16,
        textAlign: 'center',
    },
    wakingSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#d1fae5',
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#065f46' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerBtn: {
        padding: 7,
        borderRadius: 10,
        backgroundColor: '#ecfdf5',
    },
    headerBtnPrimary: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#d1fae5',
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: '#111827' },
    filterScroll: {
        maxHeight: 42,
    },
    filterRow: {
        paddingHorizontal: 12,
        paddingBottom: 8,
        alignItems: 'center',
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        height: 32,
        justifyContent: 'center',
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: '#f7faf9',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    filterChipActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
    },
    filterChipText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    filterChipTextActive: { color: '#065f46' },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf9',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
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
    groupBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    unreadText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    chatInfo: { flex: 1 },
    chatNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    groupTagText: { fontSize: 11, color: '#7c3aed', fontWeight: '600' },
    chatName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
    lastMessage: { fontSize: 12, color: '#9ca3af' },
    rowDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginLeft: 72,
        marginRight: 12,
        opacity: 0.55,
    },
    pendingSection: {
        backgroundColor: '#fffbeb',
        marginHorizontal: 12,
        marginTop: 10,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    pendingSectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#92400e',
        marginBottom: 8,
    },
    pendingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    pendingInfo: { flex: 1, marginLeft: 8 },
    pendingName: { fontSize: 14, fontWeight: '600', color: '#111827' },
    pendingSubtitle: { fontSize: 12, color: '#6b7280' },
    pendingActions: { flexDirection: 'row', gap: 6 },
    acceptBtn: {
        backgroundColor: '#10b981',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptBtnText: { color: '#fff', fontWeight: 'bold' },
    declineBtn: {
        backgroundColor: '#f3f4f6',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    declineBtnText: { color: '#4b5563', fontWeight: 'bold' },
    emptyList: { flexGrow: 1 },
    listContent: { paddingBottom: 18 },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
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
        paddingHorizontal: 40,
    },
});
