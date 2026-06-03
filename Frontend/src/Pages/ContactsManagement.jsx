import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    BiArrowBack,
    BiGroup,
    BiUserPlus,
    BiEnvelope,
    BiMailSend,
    BiRefresh,
    BiSearchAlt2,
    BiWifi,
    BiWifiOff,
} from 'react-icons/bi';
import { HiUserGroup } from 'react-icons/hi';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import FriendsList from '../components/Home/FriendsList';
import ContactList from '../components/Home/ContactList';
import NavSidebar from '../components/Home/NavSidebar';
import {
    fetchFriendsList,
    fetchPendingFriendRequests,
    acceptFriendRequest,
    deleteFriend,
} from '../api/user';
import {
    fetchUserGroups,
    fetchGroupInvites,
    acceptGroupInvite,
    rejectGroupInvite,
} from '../api/groupApi';
import { toast } from 'react-toastify';

const WS_URL = 'https://ott-education-be.onrender.com/ws';

const ContactsManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentView, setCurrentView] = useState('friends'); // friends, groups, friend-requests, group-invites
    const [contacts, setContacts] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [groupInvites, setGroupInvites] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [processingInviteId, setProcessingInviteId] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsLastEventAt, setWsLastEventAt] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [isMobileView, setIsMobileView] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 1024;
    });
    const socketRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 1024);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Get initial view from navigation state
    useEffect(() => {
        if (location.state?.view) {
            setCurrentView(location.state.view);
        }
    }, [location.state]);

    const loadContacts = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('accessToken');
            const userId = localStorage.getItem('userId');
            if (!token || !userId) return;

            // Fetch friends
            const friendsData = await fetchFriendsList();
            const friendsWithFlags = (friendsData || []).map((friend) => {
                const status =
                    friend.activeStatus?.toUpperCase() === 'ONLINE'
                        ? 'online'
                        : 'offline';
                return {
                    ...friend,
                    avatar:
                        friend.avatar ||
                        `https://i.pravatar.cc/150?img=${Math.floor(
                            Math.random() * 70,
                        )}`,
                    status: status,
                    lastMessage: '',
                    isGroup: false,
                };
            });

            // Fetch groups
            const groupsData = await fetchUserGroups(userId, token);
            const groupsWithFlags = (groupsData || []).map((group) => ({
                ...group,
                avatar:
                    group.avatarGroup ||
                    'https://th.bing.com/th/id/R.0fb6fad84621ac768796c2c228858678?rik=EZHn72rbvK8jkg&pid=ImgRaw&r=0',
                lastMessage: '',
                isGroup: true,
            }));

            setContacts([...friendsWithFlags, ...groupsWithFlags]);
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadPendingRequests = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const requests = await fetchPendingFriendRequests();
            setPendingRequests(requests || []);
        } catch (error) {
            console.error('Error loading pending requests:', error);
        }
    }, []);

    const loadGroupInvites = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const invites = await fetchGroupInvites(token);
            setGroupInvites(invites || []);
        } catch (error) {
            console.error('Error loading group invites:', error);
        }
    }, []);

    const refreshAllData = useCallback(async () => {
        await Promise.all([
            loadContacts(),
            loadPendingRequests(),
            loadGroupInvites(),
        ]);
    }, [loadContacts, loadGroupInvites, loadPendingRequests]);

    const normalizedSearch = searchText.trim().toLowerCase();

    const filteredFriends = useMemo(() => {
        const base = contacts.filter((c) => !c.isGroup);
        if (!normalizedSearch) return base;
        return base.filter((friend) =>
            (friend.name || friend.username || '')
                .toLowerCase()
                .includes(normalizedSearch),
        );
    }, [contacts, normalizedSearch]);

    const filteredGroups = useMemo(() => {
        const base = contacts.filter((c) => c.isGroup);
        if (!normalizedSearch) return base;
        return base.filter((group) =>
            (group.name || '').toLowerCase().includes(normalizedSearch),
        );
    }, [contacts, normalizedSearch]);

    const filteredPendingRequests = useMemo(() => {
        if (!normalizedSearch) return pendingRequests;
        return pendingRequests.filter((request) =>
            (request.name || request.lastName || request.senderName || '')
                .toLowerCase()
                .includes(normalizedSearch),
        );
    }, [pendingRequests, normalizedSearch]);

    const filteredGroupInvites = useMemo(() => {
        if (!normalizedSearch) return groupInvites;
        return groupInvites.filter((invite) =>
            `${invite.groupName || ''} ${invite.inviterName || ''}`
                .toLowerCase()
                .includes(normalizedSearch),
        );
    }, [groupInvites, normalizedSearch]);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const userId = localStorage.getItem('userId');
        if (!token || !userId) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
                userId,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        socketRef.current = client;

        const onLiveEvent = async (message, eventLabel) => {
            try {
                const payload = message?.body ? JSON.parse(message.body) : {};
                console.log('[Contacts realtime]', eventLabel, payload);
            } catch (error) {
                console.warn('[Contacts realtime] parse error:', error);
            }

            setWsLastEventAt(new Date().toISOString());
            await refreshAllData();
        };

        client.onConnect = () => {
            setWsConnected(true);

            client.subscribe(
                `/user/${userId}/queue/friend/request`,
                (message) => {
                    toast.info('Bạn có lời mời kết bạn mới');
                    onLiveEvent(message, 'FRIEND_REQUEST');
                },
                { Authorization: `Bearer ${token}` },
            );

            client.subscribe(
                `/user/${userId}/queue/friendRequest`,
                (message) => {
                    onLiveEvent(message, 'FRIEND_REQUEST_LEGACY');
                },
                { Authorization: `Bearer ${token}` },
            );

            client.subscribe(
                `/user/${userId}/queue/friend/request/accepted`,
                (message) => {
                    onLiveEvent(message, 'FRIEND_REQUEST_ACCEPTED');
                },
                { Authorization: `Bearer ${token}` },
            );

            client.subscribe(
                `/user/${userId}/queue/friend/request/rejected`,
                (message) => {
                    onLiveEvent(message, 'FRIEND_REQUEST_REJECTED');
                },
                { Authorization: `Bearer ${token}` },
            );

            client.subscribe(
                `/user/${userId}/queue/group/invite`,
                (message) => {
                    toast.info('Bạn có lời mời vào nhóm mới');
                    onLiveEvent(message, 'GROUP_INVITE');
                },
                { Authorization: `Bearer ${token}` },
            );

            client.subscribe(
                `/user/${userId}/queue/group/create`,
                (message) => onLiveEvent(message, 'GROUP_CREATE'),
                { Authorization: `Bearer ${token}` },
            );

            client.subscribe(
                `/user/${userId}/queue/group/updated`,
                (message) => onLiveEvent(message, 'GROUP_UPDATED'),
                { Authorization: `Bearer ${token}` },
            );

            client.subscribe(
                `/user/${userId}/queue/group/delete`,
                (message) => onLiveEvent(message, 'GROUP_DELETE'),
                { Authorization: `Bearer ${token}` },
            );
        };

        client.onWebSocketClose = () => {
            setWsConnected(false);
        };

        client.onStompError = () => {
            setWsConnected(false);
        };

        client.activate();

        return () => {
            setWsConnected(false);
            if (socketRef.current) {
                socketRef.current.deactivate();
                socketRef.current = null;
            }
        };
    }, [refreshAllData]);

    // Fetch friends and groups
    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    // Fetch pending friend requests
    useEffect(() => {
        loadPendingRequests();
        // Refresh every 30 seconds to get new requests
        const interval = setInterval(loadPendingRequests, 30000);
        return () => clearInterval(interval);
    }, [loadPendingRequests]);

    // Fetch group invites
    useEffect(() => {
        loadGroupInvites();
        // Refresh every 30 seconds
        const interval = setInterval(loadGroupInvites, 30000);
        return () => clearInterval(interval);
    }, [loadGroupInvites]);

    // Refresh ngay khi user đổi tab để không phải đợi interval
    useEffect(() => {
        if (currentView === 'friend-requests') {
            loadPendingRequests();
        }
        if (currentView === 'group-invites') {
            loadGroupInvites();
        }
        if (currentView === 'friends' || currentView === 'groups') {
            loadContacts();
        }
    }, [currentView, loadContacts, loadGroupInvites, loadPendingRequests]);

    const handleBackToHome = () => {
        navigate('/home');
    };

    const handleContactSelect = (contact) => {
        // Navigate back to home with contact id and type
        navigate('/home', {
            state: {
                selectedContactId: contact.id,
                selectedContactIsGroup: contact.isGroup,
            },
        });
    };

    const handleAcceptFriendRequest = async (requestId) => {
        try {
            await acceptFriendRequest(requestId);
            toast.success('Đã chấp nhận lời mời kết bạn');
            await Promise.all([loadPendingRequests(), loadContacts()]);
        } catch (error) {
            console.error('Error accepting friend request:', error);
            toast.error(
                error?.response?.data?.message ||
                    error?.message ||
                    'Chấp nhận lời mời kết bạn thất bại',
            );
        }
    };

    const handleRemoveFriend = async (friend) => {
        const friendId = friend?.id;
        const friendName = friend?.name || friend?.username || 'người dùng này';

        if (!friendId) {
            toast.error('Không xác định được người cần hủy kết bạn');
            return;
        }

        const confirmed = window.confirm(
            `Bạn có chắc muốn hủy kết bạn với ${friendName}?`,
        );
        if (!confirmed) return;

        try {
            setIsLoading(true);
            await deleteFriend(friendId);
            toast.success('Đã hủy kết bạn thành công');
            await loadContacts();
        } catch (error) {
            toast.error(
                error?.message || 'Hủy kết bạn thất bại. Vui lòng thử lại',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const refreshPendingRequests = async () => {
        try {
            await loadPendingRequests();
        } catch (error) {
            console.error('Error refreshing pending requests:', error);
        }
    };

    const handleAcceptGroupInvite = async (inviteId) => {
        try {
            setProcessingInviteId(inviteId);
            const token = localStorage.getItem('accessToken');
            await acceptGroupInvite(inviteId, token);
            toast.success('Đã tham gia nhóm thành công');
            await Promise.all([loadGroupInvites(), loadContacts()]);
        } catch (error) {
            console.error('Error accepting group invite:', error);
            toast.error(
                error?.response?.data?.message ||
                    error?.message ||
                    'Chấp nhận lời mời vào nhóm thất bại',
            );
        } finally {
            setProcessingInviteId(null);
        }
    };

    const handleRejectGroupInvite = async (inviteId) => {
        try {
            setProcessingInviteId(inviteId);
            const token = localStorage.getItem('accessToken');
            await rejectGroupInvite(inviteId, token);
            toast.success('Đã từ chối lời mời vào nhóm');
            await loadGroupInvites();
        } catch (error) {
            console.error('Error rejecting group invite:', error);
            toast.error(
                error?.response?.data?.message ||
                    error?.message ||
                    'Từ chối lời mời vào nhóm thất bại',
            );
        } finally {
            setProcessingInviteId(null);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[100dvh] bg-white pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0 overflow-hidden">
            {/* NavSidebar */}
            <NavSidebar
                userProfile={null}
                currentView="contacts"
                onViewChange={() => navigate('/home')}
                onProfileOpen={() => navigate('/home')}
                onLogout={() => navigate('/')}
                onOpenChangePasswordModal={() => {}}
            />

            {/* Left Sidebar - Menu List - Responsive width */}
            <div
                className={`${
                    isMobileView
                        ? 'w-full max-h-[42vh]'
                        : 'w-[350px] xl:w-[380px]'
                } border-r border-gray-200 flex flex-col bg-white`}
            >
                <div className="p-4 border-b border-gray-100 bg-gradient-to-br from-cyan-50 via-white to-emerald-50">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                                Realtime sync
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                                {wsConnected ? (
                                    <BiWifi className="text-emerald-600" />
                                ) : (
                                    <BiWifiOff className="text-rose-500" />
                                )}
                                <span
                                    className={`text-sm font-semibold ${
                                        wsConnected
                                            ? 'text-emerald-700'
                                            : 'text-rose-600'
                                    }`}
                                >
                                    {wsConnected
                                        ? 'Đang kết nối'
                                        : 'Mất kết nối'}
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                                {wsLastEventAt
                                    ? `Sự kiện gần nhất: ${new Date(wsLastEventAt).toLocaleTimeString('vi-VN')}`
                                    : 'Chưa nhận sự kiện realtime'}
                            </p>
                        </div>
                        <button
                            onClick={refreshAllData}
                            className="h-10 w-10 rounded-xl bg-white text-cyan-700 border border-cyan-100 hover:bg-cyan-50 transition-colors"
                            title="Làm mới dữ liệu"
                        >
                            <BiRefresh className="mx-auto" size={20} />
                        </button>
                    </div>

                    <div className="mt-3 relative">
                        <BiSearchAlt2
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />
                        <input
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Tìm nhanh bạn bè, nhóm, lời mời..."
                            className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none bg-white"
                        />
                    </div>
                </div>

                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto">
                    <button
                        onClick={() => setCurrentView('friends')}
                        className={`w-full py-3 px-4 sm:px-6 text-left transition-colors border-l-4 ${
                            currentView === 'friends'
                                ? 'bg-emerald-50 border-emerald-500'
                                : 'border-transparent hover:bg-gray-50'
                        }`}
                    >
                        <span
                            className={`text-sm sm:text-[0.95rem] flex items-center gap-2 ${
                                currentView === 'friends'
                                    ? 'font-semibold text-emerald-600'
                                    : 'font-normal text-gray-800'
                            }`}
                        >
                            <HiUserGroup className="w-5 h-5" />
                            Danh sách bạn bè
                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/80 border border-emerald-100 text-emerald-700">
                                {filteredFriends.length}
                            </span>
                        </span>
                    </button>
                    <button
                        onClick={() => setCurrentView('groups')}
                        className={`w-full py-3 px-4 sm:px-6 text-left transition-colors border-l-4 ${
                            currentView === 'groups'
                                ? 'bg-violet-50 border-violet-500'
                                : 'border-transparent hover:bg-gray-50'
                        }`}
                    >
                        <span
                            className={`text-sm sm:text-[0.95rem] flex items-center gap-2 ${
                                currentView === 'groups'
                                    ? 'font-semibold text-violet-600'
                                    : 'font-normal text-gray-800'
                            }`}
                        >
                            <BiGroup className="w-5 h-5" />
                            Lớp học & Nhóm
                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/80 border border-violet-100 text-violet-700">
                                {filteredGroups.length}
                            </span>
                        </span>
                    </button>
                    <button
                        onClick={() => setCurrentView('friend-requests')}
                        className={`w-full py-3 px-4 sm:px-6 text-left transition-colors border-l-4 ${
                            currentView === 'friend-requests'
                                ? 'bg-amber-50 border-amber-500'
                                : 'border-transparent hover:bg-gray-50'
                        }`}
                    >
                        <span
                            className={`text-sm sm:text-[0.95rem] flex items-center gap-2 ${
                                currentView === 'friend-requests'
                                    ? 'font-semibold text-amber-600'
                                    : 'font-normal text-gray-800'
                            }`}
                        >
                            <BiEnvelope className="w-5 h-5" />
                            Lời mời kết bạn
                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/80 border border-amber-100 text-amber-700">
                                {filteredPendingRequests.length}
                            </span>
                        </span>
                    </button>
                    <button
                        onClick={() => setCurrentView('group-invites')}
                        className={`w-full py-3 px-4 sm:px-6 text-left transition-colors border-l-4 ${
                            currentView === 'group-invites'
                                ? 'bg-cyan-50 border-cyan-500'
                                : 'border-transparent hover:bg-gray-50'
                        }`}
                    >
                        <span
                            className={`text-sm sm:text-[0.95rem] flex items-center gap-2 ${
                                currentView === 'group-invites'
                                    ? 'font-semibold text-cyan-600'
                                    : 'font-normal text-gray-800'
                            }`}
                        >
                            <BiMailSend className="w-5 h-5" />
                            Lời mời vào nhóm
                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/80 border border-cyan-100 text-cyan-700">
                                {filteredGroupInvites.length}
                            </span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {/* Header with back button - Responsive padding and font size */}
                <div className="px-4 py-4 sm:px-6 sm:py-5 lg:p-6 border-b border-gray-200 flex items-center gap-2 sm:gap-4 bg-gradient-to-r from-emerald-50 to-white">
                    <button
                        onClick={handleBackToHome}
                        className="tap-target hover:bg-white rounded-xl transition-colors shadow-sm bg-white/80"
                    >
                        <BiArrowBack size={22} className="text-gray-600" />
                    </button>
                    <h1 className="text-base sm:text-xl font-bold text-gray-800 flex items-center gap-2 min-w-0 truncate">
                        {currentView === 'friends' && (
                            <>
                                <HiUserGroup className="w-6 h-6 text-emerald-500" />
                                Danh sách bạn bè
                            </>
                        )}
                        {currentView === 'groups' && (
                            <>
                                <BiGroup className="w-6 h-6 text-violet-500" />
                                Lớp học & Nhóm
                            </>
                        )}
                        {currentView === 'friend-requests' && (
                            <>
                                <BiEnvelope className="w-6 h-6 text-amber-500" />
                                Lời mời kết bạn
                            </>
                        )}
                        {currentView === 'group-invites' && (
                            <>
                                <BiMailSend className="w-6 h-6 text-cyan-500" />
                                Lời mời vào nhóm
                            </>
                        )}
                    </h1>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={refreshAllData}
                            className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                        >
                            <BiRefresh size={16} />
                            Làm mới
                        </button>
                    </div>
                </div>

                {/* Content */}
                {currentView === 'friends' && (
                    <FriendsList
                        contacts={filteredFriends}
                        onSelectContact={handleContactSelect}
                        onOpenUserSearch={() => {}}
                        onStartCall={() => {}}
                        onRemoveFriend={handleRemoveFriend}
                        hideHeader={false}
                    />
                )}
                {currentView === 'groups' && (
                    <div className="p-4 sm:p-6 overflow-auto">
                        <p className="text-sm text-gray-500 mb-4">
                            {filteredGroups.length} nhóm
                        </p>
                        <ContactList
                            contacts={filteredGroups}
                            selectedContact={null}
                            onContactSelect={handleContactSelect}
                            pendingRequests={[]}
                            onAcceptFriendRequest={() => {}}
                            isLoading={isLoading}
                            fetchPendingFriendRequests={() => {}}
                        />
                    </div>
                )}
                {currentView === 'friend-requests' && (
                    <div className="p-4 sm:p-6 overflow-auto">
                        <p className="text-sm text-gray-500 mb-4">
                            {filteredPendingRequests?.length || 0} lời mời
                        </p>
                        <ContactList
                            contacts={[]}
                            selectedContact={null}
                            onContactSelect={handleContactSelect}
                            pendingRequests={filteredPendingRequests}
                            onAcceptFriendRequest={handleAcceptFriendRequest}
                            isLoading={isLoading}
                            fetchPendingFriendRequests={refreshPendingRequests}
                        />
                    </div>
                )}
                {currentView === 'group-invites' && (
                    <div className="p-4 sm:p-6 overflow-auto">
                        {filteredGroupInvites &&
                        filteredGroupInvites.length > 0 ? (
                            <>
                                <p className="text-sm text-gray-500 mb-4">
                                    {filteredGroupInvites.length} lời mời
                                </p>
                                <div className="space-y-4">
                                    {filteredGroupInvites.map((invite) => (
                                        <div
                                            key={invite.id || invite.inviteId}
                                            className="p-4 flex flex-col border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-center w-full mb-3">
                                                <img
                                                    src={
                                                        invite.groupAvatar ||
                                                        'https://th.bing.com/th/id/R.0fb6fad84621ac768796c2c228858678?rik=EZHn72rbvK8jkg&pid=ImgRaw&r=0'
                                                    }
                                                    alt={
                                                        invite.groupName ||
                                                        'Nhóm'
                                                    }
                                                    className="w-14 h-14 rounded-full mr-4 object-cover"
                                                />
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-medium text-gray-900">
                                                        {invite.groupName ||
                                                            'Nhóm'}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        {invite.inviterName ||
                                                            'Người dùng'}{' '}
                                                        đã mời bạn vào nhóm
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 ml-0 sm:ml-[72px]">
                                                <button
                                                    onClick={() =>
                                                        handleAcceptGroupInvite(
                                                            invite.id ||
                                                                invite.inviteId,
                                                        )
                                                    }
                                                    disabled={
                                                        isLoading ||
                                                        processingInviteId ===
                                                            (invite.id ||
                                                                invite.inviteId)
                                                    }
                                                    className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${
                                                        isLoading ||
                                                        processingInviteId ===
                                                            (invite.id ||
                                                                invite.inviteId)
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm hover:shadow-md'
                                                    }`}
                                                >
                                                    {processingInviteId ===
                                                    (invite.id ||
                                                        invite.inviteId)
                                                        ? 'Đang xử lý...'
                                                        : '✓ Chấp nhận'}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleRejectGroupInvite(
                                                            invite.id ||
                                                                invite.inviteId,
                                                        )
                                                    }
                                                    disabled={
                                                        isLoading ||
                                                        processingInviteId ===
                                                            (invite.id ||
                                                                invite.inviteId)
                                                    }
                                                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                                                        isLoading ||
                                                        processingInviteId ===
                                                            (invite.id ||
                                                                invite.inviteId)
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-red-500 text-white hover:bg-red-600'
                                                    }`}
                                                >
                                                    Từ chối
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-16 text-center">
                                <h3 className="text-lg font-medium text-gray-500 mb-2">
                                    {normalizedSearch
                                        ? 'Không có kết quả phù hợp'
                                        : 'Chưa có lời mời nào'}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    {normalizedSearch
                                        ? 'Thử từ khóa khác để tìm lời mời'
                                        : 'Các lời mời tham gia nhóm sẽ xuất hiện ở đây'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactsManagement;
