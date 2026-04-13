import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    Component,
} from 'react';
import { createPortal } from 'react-dom';
import {
    BiUserPlus,
    BiGroup,
    BiDotsVerticalRounded,
    BiSearch,
    BiMenu,
    BiArrowBack,
    BiMessageSquareDetail,
} from 'react-icons/bi';
import { useNavigate, useLocation } from 'react-router-dom';
import NavSidebar from '../components/Home/NavSidebar';
import ContactList from '../components/Home/ContactList';
import FriendsList from '../components/Home/FriendsList';
import SettingsPanel from '../components/Home/SettingsPanel';
import ChatWindow from '../components/Home/ChatWindow';
import ProfileModal from '../components/Home/ProfileModal';
import UserSearchModal from '../components/Home/UserSearchModal';
import IncomingCallModal from '../components/Home/IncomingCallModal';
import VideoCallModal from '../components/Home/VideoCallModal';
import PermissionGuideModal from '../components/Home/PermissionGuideModal';
import NotificationPanel from '../components/Home/NotificationPanel';
import ResourcesPanel from '../components/Home/ResourcesPanel';
import ClassPanel from '../components/Class/ClassPanel';
import {
    fetchUserProfile,
    fetchFriendsList,
    sendFriendRequest,
    fetchPendingFriendRequests,
    acceptFriendRequest,
    cancelFriendRequest,
    fetchUserByPhone,
    fetchUserById,
} from '../api/user';
import {
    getChatHistory,
    getGroupChatHistory,
    connectWebSocket,
    disconnectWebSocket,
    sendCallSignal,
    readMessage,
} from '../api/messageApi';
import {
    createGroup,
    fetchUserGroups,
    fetchGroupInvites,
    acceptGroupInvite,
    rejectGroupInvite,
} from '../api/groupApi';
import { getConversationSettings } from '../api/conversationSettingsApi';
import {
    initializePeerConnection,
    startCall,
    createOffer,
    createAnswer,
    setRemoteDescription,
    enableIceProcessing,
    addIceCandidate,
    endCall,
    toggleAudio,
    toggleVideo,
} from '../services/webrtcService';
import { playNotificationSound } from '../utils/notificationSound';
import {
    requestNotificationPermission,
    showNotificationIfHidden,
} from '../utils/browserNotification';
import {
    askAiAssistant,
    getAiConversations,
    createAiConversation,
    getAiConversationMessages,
    saveAiConversationMessages,
} from '../api/aiApi';

const AI_ASSISTANT_ID = 'ai-assistant-bot';

// Error Boundary Component
class ErrorBoundary extends Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught in ErrorBoundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">
                        Đã xảy ra lỗi:{' '}
                        {this.state.error?.message || 'Không xác định'}
                    </h2>
                    <p className="text-base text-gray-700">
                        Vui lòng làm mới trang hoặc liên hệ hỗ trợ.
                    </p>
                </div>
            );
        }
        return this.props.children;
    }
}

const Home = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        token: navToken,
        userId: navUserId,
        selectedContactId,
        selectedContactIsGroup,
    } = location.state || {};
    const [userId, setUserId] = useState(
        navUserId ||
            localStorage.getItem('userId') ||
            '680e6d95a73e35151128bf65',
    );
    const [token, setToken] = useState(
        navToken || localStorage.getItem('accessToken'),
    );
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [currentView, setCurrentView] = useState('messages');
    const [anchorEl, setAnchorEl] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [groupInvites, setGroupInvites] = useState([]);
    const [messageNotifications, setMessageNotifications] = useState([]);
    const [notificationSettings, setNotificationSettings] = useState({
        pushEnabled: true,
        soundEnabled: true,
        privateMessageEnabled: true,
        groupMessageEnabled: true,
    });
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [showAddFriendInput, setShowAddFriendInput] = useState(false);
    const [friendPhoneInput, setFriendPhoneInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [userSearchOpen, setUserSearchOpen] = useState(false);
    const [openChangePasswordModal, setOpenChangePasswordModal] =
        useState(false);
    const [groupAvatar, setGroupAvatar] = useState(null);
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [messageTab, setMessageTab] = useState('all'); // 'all', 'unread', 'stranger', 'hidden'
    const [contactView, setContactView] = useState('all'); // 'all', 'friends', 'groups', 'friend-requests', 'group-invites'
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sentFriendRequests, setSentFriendRequests] = useState(new Set()); // Track sent friend requests by user ID
    const settingsStorageKey = useMemo(
        () => `conversationSettings:${userId || 'anonymous'}`,
        [userId],
    );
    const notificationSettingsKey = useMemo(
        () => `notificationSettings:${userId || 'anonymous'}`,
        [userId],
    );
    const [conversationSettings, setConversationSettings] = useState({});
    const aiHistoryStorageKey = useMemo(
        () => `aiChatHistory:${userId || 'anonymous'}`,
        [userId],
    );
    const [aiConversations, setAiConversations] = useState([]);
    const [currentAiConversationId, setCurrentAiConversationId] =
        useState(null);

    const getAiAssistantContact = useCallback(
        () => ({
            id: AI_ASSISTANT_ID,
            name: 'OTT AI Assistant',
            username: 'OTT AI Assistant',
            avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=ott-ai',
            status: 'online',
            isFriend: true,
            isAI: true,
            lastMessage: '',
            unreadCount: 0,
            timestamp: new Date().toISOString(),
        }),
        [],
    );

    const ensureAiContact = useCallback(
        (list) => {
            const ai = getAiAssistantContact();
            const arr = Array.isArray(list) ? list : [];
            const existed = arr.find((c) => c.id === AI_ASSISTANT_ID);
            if (existed) {
                return arr.map((c) =>
                    c.id === AI_ASSISTANT_ID ? { ...ai, ...c, isAI: true } : c,
                );
            }
            return [ai, ...arr];
        },
        [getAiAssistantContact],
    );

    const handleOpenAIChat = useCallback(() => {
        const aiContact =
            contacts.find((contact) => contact.id === AI_ASSISTANT_ID) ||
            getAiAssistantContact();
        setContacts((prev) => ensureAiContact(prev));
        setSelectedContact(aiContact);
        setCurrentView('messages');
        setContactView('all');
        setHeaderSearchQuery('');
    }, [contacts, ensureAiContact, getAiAssistantContact]);

    const handleSidebarViewChange = useCallback(
        (view) => {
            if (view === 'messages') {
                if (currentView === 'messages') {
                    setIsMessageListHidden((prev) => !prev);
                } else {
                    setIsMessageListHidden(false);
                }
                setContactView('all');
            } else {
                setIsMessageListHidden(false);
            }
            setCurrentView(view);
        },
        [currentView],
    );

    const loadAiHistory = useCallback(() => {
        try {
            const raw = localStorage.getItem(aiHistoryStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Cannot parse AI chat history:', error);
            return [];
        }
    }, [aiHistoryStorageKey]);

    const filterAiConversationMessages = useCallback(
        (list) => {
            const arr = Array.isArray(list) ? list : [];
            return arr.filter((msg) => {
                if (!msg || msg.groupId) return false;

                const senderId =
                    msg.senderId === undefined || msg.senderId === null
                        ? ''
                        : String(msg.senderId);
                const receiverId =
                    msg.receiverId === undefined || msg.receiverId === null
                        ? ''
                        : String(msg.receiverId);
                const currentUserId = String(userId || '');
                const isUserToAi =
                    senderId === currentUserId &&
                    receiverId === AI_ASSISTANT_ID;
                const isAiToUser =
                    senderId === AI_ASSISTANT_ID &&
                    receiverId === currentUserId;

                if (isUserToAi || isAiToUser) return true;

                // Fallback cho dữ liệu cũ chưa lưu đúng sender/receiver
                const role = String(msg.role || '').toLowerCase();
                const hasTextLikeContent =
                    typeof msg.content === 'string' && msg.content.length > 0;
                const looksLikeAiTurn =
                    role === 'assistant' ||
                    role === 'user' ||
                    msg.isAI === true ||
                    senderId === AI_ASSISTANT_ID ||
                    receiverId === AI_ASSISTANT_ID;

                if (!senderId && !receiverId && hasTextLikeContent) {
                    return true;
                }

                return looksLikeAiTurn;
            });
        },
        [userId],
    );

    const refreshAiConversations = useCallback(async () => {
        if (!token) return [];
        try {
            const items = await getAiConversations(token);
            const normalized = Array.isArray(items) ? items : [];
            setAiConversations(normalized);
            return normalized;
        } catch (error) {
            console.error('Error loading AI conversations:', error);
            return [];
        }
    }, [token]);

    const createNewAiConversation = useCallback(async () => {
        if (!token) return null;
        try {
            const created = await createAiConversation(
                token,
                'Cuộc trò chuyện mới',
            );

            setAiConversations((prev) => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [
                    created,
                    ...safePrev.filter((c) => c.id !== created.id),
                ];
            });

            setCurrentAiConversationId(created.id);
            setMessages([]);
            return created;
        } catch (error) {
            console.error('Error creating AI conversation:', error);
            setSnackbarMessage('Không thể tạo cuộc trò chuyện AI mới');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return null;
        }
    }, [token]);

    const selectAiConversation = useCallback(
        async (conversationId) => {
            if (!token || !conversationId) return;
            try {
                const conversation = await getAiConversationMessages(
                    token,
                    conversationId,
                );
                const list = Array.isArray(conversation?.messages)
                    ? conversation.messages
                    : [];
                setCurrentAiConversationId(conversationId);
                setMessages(filterAiConversationMessages(list));
            } catch (error) {
                console.error('Error loading AI conversation messages:', error);
                setSnackbarMessage('Không thể tải lịch sử cuộc trò chuyện AI');
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            }
        },
        [token, filterAiConversationMessages],
    );

    // Incoming call states
    const [incomingCall, setIncomingCall] = useState(null);
    const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);

    // Active call states
    const [activeCall, setActiveCall] = useState(null);
    const [callModalOpen, setCallModalOpen] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [callStatus, setCallStatus] = useState('');
    const [showPermissionGuide, setShowPermissionGuide] = useState(false);
    const [pendingCallAction, setPendingCallAction] = useState(null);
    const [isMessageListHidden, setIsMessageListHidden] = useState(false);
    const [isMobileView, setIsMobileView] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 1024;
    });
    const normalizedRole = String(userProfile?.role || '')
        .toUpperCase()
        .replace(/^ROLE_/, '');
    const isTeacher = normalizedRole === 'TEACHER';

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 1024);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (currentView !== 'messages') {
            setIsMessageListHidden(false);
        }
    }, [currentView]);

    useEffect(() => {
        if (isMobileView && currentView === 'messages' && selectedContact) {
            setIsMessageListHidden(true);
        }
    }, [isMobileView, currentView, selectedContact]);

    const handleNotify = useCallback((message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setOpenSnackbar(true);
    }, []);

    const handleUpdateNotificationSettings = useCallback((key, value) => {
        setNotificationSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const normalizeLastMessage = useCallback((value) => {
        const raw = (value || '').toString().trim();
        if (!raw) return '';

        const lowered = raw.toLowerCase();
        if (
            lowered.includes('bắt đầu cuộc trò chuyện') ||
            lowered.includes('bat dau cuoc tro chuyen')
        ) {
            return '';
        }

        return raw;
    }, []);

    const handleOpenMessageNotification = useCallback(
        (notification) => {
            if (!notification?.contactId) return;

            const targetContact = contacts.find(
                (contact) => contact.id === notification.contactId,
            );

            if (targetContact) {
                setSelectedContact(targetContact);
                setCurrentView('messages');
            }

            setMessageNotifications((prev) =>
                prev.map((item) =>
                    item.id === notification.id
                        ? { ...item, isRead: true }
                        : item,
                ),
            );
        },
        [contacts],
    );

    const handleMarkMessageNotificationRead = useCallback(
        (notification) => {
            if (!notification?.contactId) return;

            setMessageNotifications((prev) =>
                prev.map((item) =>
                    item.id === notification.id
                        ? { ...item, isRead: true }
                        : item,
                ),
            );

            setContacts((prev) =>
                prev.map((contact) =>
                    contact.id === notification.contactId
                        ? { ...contact, unreadCount: 0 }
                        : contact,
                ),
            );

            const unreadTargetMessages = messages.filter((msg) => {
                if (notification.isGroup) {
                    return (
                        msg.groupId === notification.contactId &&
                        !msg.isRead &&
                        msg.senderId !== userId
                    );
                }
                return (
                    !msg.groupId &&
                    msg.senderId === notification.contactId &&
                    msg.receiverId === userId &&
                    !msg.isRead
                );
            });

            unreadTargetMessages.forEach((msg) => {
                readMessage(msg.id, msg.senderId, userId, token);
            });

            setMessages((prev) =>
                prev.map((msg) => {
                    if (notification.isGroup) {
                        if (
                            msg.groupId === notification.contactId &&
                            msg.senderId !== userId
                        ) {
                            return { ...msg, isRead: true };
                        }
                        return msg;
                    }

                    if (
                        !msg.groupId &&
                        msg.senderId === notification.contactId &&
                        msg.receiverId === userId
                    ) {
                        return { ...msg, isRead: true };
                    }
                    return msg;
                }),
            );
        },
        [messages, token, userId],
    );

    const handleDeleteMessageNotification = useCallback((notification) => {
        setMessageNotifications((prev) =>
            prev.filter((item) => item.id !== notification.id),
        );
    }, []);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(settingsStorageKey);
            setConversationSettings(raw ? JSON.parse(raw) : {});
        } catch (error) {
            console.error('Error loading conversation settings:', error);
            setConversationSettings({});
        }
    }, [settingsStorageKey]);

    useEffect(() => {
        localStorage.setItem(
            settingsStorageKey,
            JSON.stringify(conversationSettings),
        );
    }, [conversationSettings, settingsStorageKey]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(notificationSettingsKey);
            if (raw) {
                setNotificationSettings((prev) => ({
                    ...prev,
                    ...JSON.parse(raw),
                }));
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }, [notificationSettingsKey]);

    useEffect(() => {
        localStorage.setItem(
            notificationSettingsKey,
            JSON.stringify(notificationSettings),
        );
    }, [notificationSettings, notificationSettingsKey]);

    useEffect(() => {
        if (!token) return;

        getConversationSettings(token)
            .then((items) => {
                const mapped = (items || []).reduce((acc, item) => {
                    if (item?.conversationId) {
                        acc[item.conversationId] = {
                            isHidden: item.isHidden || false,
                            isPinned: item.isPinned || false,
                            isMuted: item.isMuted || false,
                            muteOption: item.muteOption || null,
                            autoDeleteOption: item.autoDeleteOption || 'off',
                        };
                    }
                    return acc;
                }, {});

                setConversationSettings((prev) => ({
                    ...prev,
                    ...mapped,
                }));
            })
            .catch((error) => {
                console.error('Error loading conversation settings:', error);
            });
    }, [token]);

    const mergeContactWithSettings = useCallback(
        (contact) => {
            if (!contact?.id) return contact;
            return {
                ...contact,
                ...(conversationSettings[contact.id] || {}),
            };
        },
        [conversationSettings],
    );

    // Đồng bộ token với localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken');
        if (storedToken !== token) {
            setToken(storedToken);
        }
    }, [token]);

    // Auto-select contact from navigation state
    useEffect(() => {
        if (
            selectedContactId &&
            contacts.length > 0 &&
            (!selectedContact || selectedContact.id !== selectedContactId)
        ) {
            const contact = contacts.find((c) => c.id === selectedContactId);
            if (contact) {
                setSelectedContact(mergeContactWithSettings(contact));
            }
        }
    }, [
        selectedContactId,
        contacts,
        selectedContact,
        mergeContactWithSettings,
    ]);

    // Kiểm tra token và chuyển hướng ngay lập tức nếu không có token
    useEffect(() => {
        if (!token) {
            setSnackbarMessage('Vui lòng đăng nhập để sử dụng chức năng!');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            navigate('/'); // Chuyển hướng ngay lập tức về trang đăng nhập
            return;
        }

        let isMounted = true;

        const handleFriendRequest = async (notification) => {
            if (!isMounted) return;
            console.log('Received friend request notification:', notification);
            if (notification.type === 'accepted') {
                // Thông báo cho người gửi (A)
                await updateFriendsList(); // Làm mới danh sách bạn bè
                setSnackbarMessage(
                    'Yêu cầu kết bạn của bạn đã được chấp nhận!',
                );
                setSnackbarSeverity('success');
            } else if (notification.type === 'confirmed') {
                // Thông báo cho người nhận (B)
                await updatePendingRequests(); // Làm mới danh sách yêu cầu
                setSnackbarMessage('Bạn đã chấp nhận một yêu cầu kết bạn!');
                setSnackbarSeverity('success');
            } else {
                // Yêu cầu kết bạn mới
                await updatePendingRequests();
                setSnackbarMessage('Bạn nhận được một yêu cầu kết bạn mới!');
                setSnackbarSeverity('info');
            }
            setOpenSnackbar(true);
        };

        updateGroups().then((groupIds) => {
            if (!isMounted) return;

            connectWebSocket(
                token,
                userId,
                (receivedMessage) => {
                    if (!isMounted) return;
                    console.log('Received message in Home:', receivedMessage);
                    setMessages((prev) => {
                        const messageExistsById = prev.some(
                            (msg) => msg.id === receivedMessage.id,
                        );
                        if (messageExistsById) {
                            return prev;
                        }

                        const messageExistsByContent = prev.find(
                            (msg) =>
                                msg.tempKey &&
                                msg.content === receivedMessage.content &&
                                msg.senderId === receivedMessage.senderId &&
                                (msg.receiverId ===
                                    receivedMessage.receiverId ||
                                    msg.groupId === receivedMessage.groupId),
                        );
                        if (messageExistsByContent) {
                            return prev.map((msg) =>
                                msg.tempKey === messageExistsByContent.tempKey
                                    ? { ...receivedMessage, tempKey: undefined }
                                    : msg,
                            );
                        }

                        const deletedMessageIds = JSON.parse(
                            localStorage.getItem('deletedMessageIds') || '[]',
                        );
                        if (deletedMessageIds.includes(receivedMessage.id)) {
                            return prev;
                        }

                        let createAt =
                            receivedMessage.createdAt ||
                            receivedMessage.createAt;
                        let parsedDate = new Date(createAt);
                        if (isNaN(parsedDate.getTime())) {
                            console.warn(
                                'Invalid createAt value:',
                                createAt,
                                'Using current time as fallback',
                            );
                            parsedDate = new Date();
                        } else if (
                            typeof createAt === 'string' &&
                            !createAt.endsWith('Z') &&
                            !createAt.includes('+')
                        ) {
                            createAt = `${createAt}Z`;
                            parsedDate = new Date(createAt);
                        }

                        return [
                            ...prev,
                            {
                                ...receivedMessage,
                                createAt: parsedDate.toISOString(),
                                recalled: receivedMessage.recalled || false,
                                deletedByUsers:
                                    receivedMessage.deletedByUsers || [],
                                isRead: receivedMessage.isRead || false,
                                // Coerce to real boolean to avoid truthy strings like "false"
                                // Không auto-pin tin nhắn mới đến; chỉ pin khi có thông báo pin/unpin riêng
                                isPinned: false,
                                isEdited: receivedMessage.isEdited || false,
                            },
                        ];
                    });

                    // Cập nhật contact list khi nhận tin nhắn mới
                    if (!isMounted) return;
                    const contactId =
                        receivedMessage.groupId ||
                        (receivedMessage.receiverId === userId
                            ? receivedMessage.senderId
                            : receivedMessage.receiverId);

                    // Play notification sound and show browser notification
                    const isSentByMe = receivedMessage.senderId === userId;
                    const isCurrentlyViewing =
                        selectedContact?.id === contactId;
                    const isGroupMessage = Boolean(receivedMessage.groupId);
                    const isTypeEnabled = isGroupMessage
                        ? notificationSettings.groupMessageEnabled
                        : notificationSettings.privateMessageEnabled;

                    if (!isSentByMe && isTypeEnabled) {
                        // Play sound
                        if (notificationSettings.soundEnabled) {
                            playNotificationSound();
                        }

                        // Show browser notification if tab is not active
                        const senderName =
                            contacts.find(
                                (c) => c.id === receivedMessage.senderId,
                            )?.name || 'Người dùng';
                        const messagePreview =
                            receivedMessage.type === 'TEXT'
                                ? receivedMessage.content
                                : receivedMessage.type === 'IMAGE'
                                  ? '📷 Hình ảnh'
                                  : receivedMessage.type === 'VIDEO'
                                    ? '🎥 Video'
                                    : receivedMessage.type === 'FILE'
                                      ? '📎 Tệp đính kèm'
                                      : '💬 Tin nhắn mới';

                        if (notificationSettings.pushEnabled) {
                            showNotificationIfHidden(senderName, {
                                body: messagePreview,
                                icon: contacts.find(
                                    (c) => c.id === receivedMessage.senderId,
                                )?.avatar,
                                onClick: () => {
                                    window.focus();
                                },
                            });
                        }

                        setMessageNotifications((prev) => {
                            const notificationId =
                                receivedMessage.id ||
                                `${contactId}-${Date.now()}`;
                            if (
                                prev.some((item) => item.id === notificationId)
                            ) {
                                return prev;
                            }

                            const senderName =
                                contacts.find(
                                    (c) => c.id === receivedMessage.senderId,
                                )?.name || 'Người dùng';
                            const preview =
                                receivedMessage.type === 'TEXT'
                                    ? receivedMessage.content
                                    : receivedMessage.type === 'IMAGE'
                                      ? '[Hình ảnh]'
                                      : receivedMessage.type === 'VIDEO'
                                        ? '[Video]'
                                        : receivedMessage.type === 'FILE'
                                          ? '[Tệp đính kèm]'
                                          : '[Tin nhắn mới]';

                            return [
                                {
                                    id: notificationId,
                                    messageId: receivedMessage.id,
                                    contactId,
                                    senderId: receivedMessage.senderId,
                                    senderName,
                                    preview,
                                    createAt:
                                        receivedMessage.createAt ||
                                        new Date().toISOString(),
                                    isGroup: isGroupMessage,
                                    isRead: false,
                                },
                                ...prev,
                            ].slice(0, 50);
                        });
                    }

                    setContacts((prevContacts) => {
                        // Kiểm tra xem contact đã tồn tại chưa
                        const existingContact = prevContacts.find(
                            (c) => c.id === contactId,
                        );

                        if (existingContact) {
                            // Contact đã tồn tại, cập nhật thông tin
                            return prevContacts.map((contact) => {
                                if (contact.id === contactId) {
                                    return {
                                        ...contact,
                                        lastMessage:
                                            receivedMessage.type === 'TEXT'
                                                ? receivedMessage.content
                                                : receivedMessage.type ===
                                                    'IMAGE'
                                                  ? '[Hình ảnh]'
                                                  : receivedMessage.type ===
                                                      'VIDEO'
                                                    ? '[Video]'
                                                    : receivedMessage.type ===
                                                        'AUDIO'
                                                      ? '[Âm thanh]'
                                                      : receivedMessage.type ===
                                                          'FILE'
                                                        ? `[File: ${receivedMessage.fileName || 'Tài liệu'}]`
                                                        : '[Tin nhắn]',
                                        timestamp: new Date().toISOString(),
                                        unreadCount:
                                            isSentByMe || isCurrentlyViewing
                                                ? 0
                                                : (contact.unreadCount || 0) +
                                                  1,
                                    };
                                }
                                return contact;
                            });
                        } else if (!receivedMessage.groupId && !isSentByMe) {
                            // Tin nhắn từ người lạ (không phải nhóm, không phải mình gửi)
                            // Tạo contact mới với thông tin cơ bản, sau đó fetch chi tiết
                            const newStrangerContact = {
                                id: contactId,
                                name: 'Đang tải...',
                                avatar: null,
                                status: 'offline',
                                isFriend: false,
                                isStranger: true,
                                friendStatus: 'NONE',
                                lastMessage:
                                    receivedMessage.type === 'TEXT'
                                        ? receivedMessage.content
                                        : '[Tin nhắn mới]',
                                timestamp: new Date().toISOString(),
                                unreadCount: 1,
                            };

                            // Fetch thông tin người gửi (async, sẽ cập nhật sau)
                            fetchUserById(contactId)
                                .then((userData) => {
                                    setContacts((prev) =>
                                        prev.map((c) =>
                                            c.id === contactId
                                                ? {
                                                      ...c,
                                                      name:
                                                          userData.name ||
                                                          'Người dùng',
                                                      avatar: userData.avatar,
                                                      phone: userData.phone,
                                                  }
                                                : c,
                                        ),
                                    );
                                })
                                .catch((err) => {
                                    console.error(
                                        'Error fetching stranger info:',
                                        err,
                                    );
                                });

                            return [...prevContacts, newStrangerContact];
                        }

                        return prevContacts;
                    });
                },
                (deletedMessage) => {
                    if (!isMounted) return;
                    console.log(
                        'Received delete notification:',
                        deletedMessage,
                    );
                    if (deletedMessage.id) {
                        const deletedMessageIds = JSON.parse(
                            localStorage.getItem('deletedMessageIds') || '[]',
                        );
                        if (!deletedMessageIds.includes(deletedMessage.id)) {
                            deletedMessageIds.push(deletedMessage.id);
                            localStorage.setItem(
                                'deletedMessageIds',
                                JSON.stringify(deletedMessageIds),
                            );
                        }
                    }
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === deletedMessage.id
                                ? {
                                      ...msg,
                                      deletedByUsers:
                                          deletedMessage.deletedByUsers || [],
                                  }
                                : msg,
                        ),
                    );
                },
                (recalledMessage) => {
                    if (!isMounted) return;
                    console.log(
                        'Received recall notification:',
                        recalledMessage,
                    );
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === recalledMessage.id
                                ? {
                                      ...msg,
                                      recalled:
                                          recalledMessage.recalled || false,
                                  }
                                : msg,
                        ),
                    );
                },
                (pinnedMessage) => {
                    if (!isMounted) return;
                    console.log('Received pin notification:', pinnedMessage);
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === pinnedMessage.id
                                ? { ...msg, isPinned: true }
                                : msg,
                        ),
                    );
                },
                (unpinnedMessage) => {
                    if (!isMounted) return;
                    console.log(
                        'Received unpin notification:',
                        unpinnedMessage,
                    );
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === unpinnedMessage.id
                                ? { ...msg, isPinned: false }
                                : msg,
                        ),
                    );
                },
                groupIds,
                handleFriendRequest,
                (editedMessage) => {
                    if (!isMounted) return;
                    console.log('Received edit notification:', editedMessage);

                    // Update message content
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === editedMessage.id
                                ? {
                                      ...msg,
                                      content: editedMessage.content,
                                      isEdited: true,
                                  }
                                : msg,
                        ),
                    );

                    // Update lastMessage in contact list if it's the most recent message
                    const contactId =
                        editedMessage.groupId ||
                        (editedMessage.receiverId === userId
                            ? editedMessage.senderId
                            : editedMessage.receiverId);

                    setContacts((prevContacts) =>
                        prevContacts.map((contact) => {
                            if (contact.id === contactId) {
                                // Only update if this is likely the last message
                                // (we can check by comparing IDs or timestamps if needed)
                                return {
                                    ...contact,
                                    lastMessage:
                                        editedMessage.type === 'TEXT'
                                            ? editedMessage.content
                                            : contact.lastMessage,
                                };
                            }
                            return contact;
                        }),
                    );
                },
                (statusChange) => {
                    if (!isMounted) return;
                    console.log(
                        '🔔 Received status change notification:',
                        statusChange,
                    );
                    // statusChange có dạng: { userId: 'xxx', status: 'online' hoặc 'offline' }
                    setContacts((prevContacts) => {
                        const updatedContacts = prevContacts.map((contact) => {
                            if (contact.id === statusChange.userId) {
                                console.log(
                                    `✅ Updating ${contact.name} status: ${contact.status} -> ${statusChange.status}`,
                                );
                                return {
                                    ...contact,
                                    status: statusChange.status,
                                };
                            }
                            return contact;
                        });
                        return updatedContacts;
                    });
                },
                (callSignal) => {
                    if (!isMounted) return;
                    console.log('Received call signal:', callSignal);

                    // Handle different call signal types
                    switch (callSignal.type) {
                        case 'offer':
                            // Incoming call
                            const senderId = String(callSignal.senderId || '');
                            const caller = contacts.find(
                                (c) => String(c.id) === senderId,
                            );
                            const signalName =
                                callSignal?.data?.callerName ||
                                callSignal?.data?.senderName;
                            const signalAvatar =
                                callSignal?.data?.callerAvatar ||
                                callSignal?.data?.senderAvatar;

                            setIncomingCall({
                                ...callSignal,
                                caller: caller || {
                                    id: callSignal.senderId,
                                    name: signalName || 'Unknown',
                                    avatar: signalAvatar || '',
                                },
                            });
                            setShowIncomingCallModal(true);

                            if (!caller && token && senderId) {
                                fetchUserById(senderId)
                                    .then((user) => {
                                        const fullName =
                                            user?.name ||
                                            `${user?.firstName || ''} ${
                                                user?.lastName || ''
                                            }`.trim() ||
                                            user?.username ||
                                            user?.phone ||
                                            'Unknown';

                                        setIncomingCall((prev) => {
                                            if (
                                                !prev ||
                                                String(prev.senderId) !==
                                                    senderId
                                            ) {
                                                return prev;
                                            }

                                            return {
                                                ...prev,
                                                caller: {
                                                    id: senderId,
                                                    name: fullName,
                                                    avatar: user?.avatar || '',
                                                },
                                            };
                                        });
                                    })
                                    .catch((error) => {
                                        console.warn(
                                            'Cannot resolve caller profile:',
                                            error?.message,
                                        );
                                    });
                            }
                            break;

                        case 'answer':
                            // Peer accepted call
                            if (callSignal?.data?.answer) {
                                setRemoteDescription(callSignal.data.answer)
                                    .then(async () => {
                                        await enableIceProcessing();
                                        setCallStatus('Đã kết nối');
                                    })
                                    .catch((err) =>
                                        console.error(
                                            'Error setting remote description:',
                                            err,
                                        ),
                                    );
                            }
                            break;

                        case 'ice-candidate':
                            // Add ICE candidate
                            if (callSignal?.data) {
                                addIceCandidate(callSignal.data).catch((err) =>
                                    console.error(
                                        'Error adding ICE candidate:',
                                        err,
                                    ),
                                );
                            }
                            break;

                        case 'call-end':
                            // Peer ended call
                            handleEndCall();
                            setSnackbarMessage('Cuộc gọi đã kết thúc');
                            setSnackbarSeverity('info');
                            setOpenSnackbar(true);
                            break;

                        case 'call-reject':
                            // Peer rejected call
                            handleEndCall();
                            setSnackbarMessage('Cuộc gọi bị từ chối');
                            setSnackbarSeverity('warning');
                            setOpenSnackbar(true);
                            break;

                        default:
                            console.warn(
                                'Unknown call signal type:',
                                callSignal.type,
                            );
                    }
                },
                (readReceipt) => {
                    if (!isMounted) return;
                    console.log('✅ Read receipt received:', readReceipt);
                    // Cập nhật trạng thái isRead cho tin nhắn
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === readReceipt.id
                                ? { ...msg, isRead: true }
                                : msg,
                        ),
                    );
                },
                async () => {
                    if (!isMounted) return;
                    await updateGroups();
                },
                async () => {
                    if (!isMounted) return;
                    await Promise.all([updateGroups(), updateGroupInvites()]);
                },
                async () => {
                    if (!isMounted) return;
                    await Promise.all([updateGroups(), updateGroupInvites()]);
                },
                async () => {
                    if (!isMounted) return;
                    await updateGroupInvites();
                },
                async () => {
                    if (!isMounted) return;
                    await Promise.all([
                        updateFriendsList(),
                        updatePendingRequests(),
                    ]);
                },
                async () => {
                    if (!isMounted) return;
                    await updatePendingRequests();
                },
            )
                .then(() => {
                    if (!isMounted) return;
                    console.log('STOMP connected in Home');
                })
                .catch((error) => {
                    if (!isMounted) return;
                    console.error('Failed to connect STOMP in Home:', error);
                    setSnackbarMessage(
                        `Không thể kết nối WebSocket: ${error.message}`,
                    );
                    setSnackbarSeverity('error');
                    setOpenSnackbar(true);
                });
        });

        return () => {
            isMounted = false;
            disconnectWebSocket();
        };
    }, [token, userId, navigate]);

    useEffect(() => {
        console.log('Home mounted with userId:', userId);
        if (token) {
            fetchUserProfile(token).then((data) => {
                if (data) {
                    setUserProfile(data);
                }
            });
        }

        // Request notification permission
        requestNotificationPermission().then((permission) => {
            console.log('Notification permission:', permission);
        });

        return () => {
            console.log('Home unmounting');
        };
    }, [token, userId]);

    const updateGroups = useCallback(async () => {
        if (!token) return [];
        try {
            const groups = await fetchUserGroups(userId, token);
            const groupContacts = await Promise.all(
                groups.map(async (group) => {
                    // Lấy tin nhắn cuối từ group chat history
                    let lastMessage = normalizeLastMessage(group.lastMessage);
                    try {
                        const chatHistory = await getGroupChatHistory(
                            group.id,
                            token,
                        );
                        if (chatHistory && chatHistory.length > 0) {
                            const lastMsg = chatHistory[chatHistory.length - 1];
                            if (lastMsg.type === 'TEXT') {
                                lastMessage = lastMsg.content;
                            } else if (lastMsg.type === 'IMAGE') {
                                lastMessage = '[Hình ảnh]';
                            } else if (lastMsg.type === 'VIDEO') {
                                lastMessage = '[Video]';
                            } else if (lastMsg.type === 'FILE') {
                                lastMessage = '[File]';
                            }
                        }
                    } catch (err) {
                        console.error(
                            'Error loading last message for group',
                            group.name,
                            err,
                        );
                    }

                    return {
                        id: group.id,
                        name: group.name,
                        createId: group.createId,
                        roles: group.roles,
                        isGroup: true,
                        isClass: group.groupType === 'CLASS',
                        groupType: group.groupType || 'GROUP',
                        classCode: group.classCode,
                        avatar:
                            group.avatarGroup ||
                            'https://th.bing.com/th/id/R.0fb6fad84621ac768796c2c228858678?rik=EZHn72rbvK8jkg&pid=ImgRaw&r=0',
                        status: 'group',
                        lastMessage: lastMessage,
                        timestamp: group.timestamp || 'Yesterday',
                    };
                }),
            );
            setContacts((prev) =>
                ensureAiContact([
                    ...prev.filter((c) => !c.isGroup),
                    ...groupContacts,
                ]),
            );
            const groupIds = groups.map((group) => group.id).filter((id) => id);
            console.log('Group IDs for subscription:', groupIds);
            return groupIds;
        } catch (error) {
            setSnackbarMessage(
                'Lỗi tải danh sách nhóm: ' +
                    (error.response?.data?.message || error.message),
            );
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return [];
        }
    }, [userId, token]);

    const updateFriendsList = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const data = await fetchFriendsList(token);
            console.log('📋 Friends list data from API:', data);
            if (data) {
                const mappedFriends = await Promise.all(
                    data.map(async (friend) => {
                        // Map ONLINE -> online, OFFLINE -> offline
                        const status =
                            friend.activeStatus?.toUpperCase() === 'ONLINE'
                                ? 'online'
                                : 'offline';

                        // Lấy tin nhắn cuối từ chat history
                        let lastMessage = normalizeLastMessage(
                            friend.lastMessage,
                        );
                        try {
                            const chatHistory = await getChatHistory(
                                friend.id,
                                token,
                            );
                            if (chatHistory && chatHistory.length > 0) {
                                const lastMsg =
                                    chatHistory[chatHistory.length - 1];
                                if (lastMsg.type === 'TEXT') {
                                    lastMessage = lastMsg.content;
                                } else if (lastMsg.type === 'IMAGE') {
                                    lastMessage = '[Hình ảnh]';
                                } else if (lastMsg.type === 'VIDEO') {
                                    lastMessage = '[Video]';
                                } else if (lastMsg.type === 'FILE') {
                                    lastMessage = '[File]';
                                }
                            }
                        } catch (err) {
                            console.error(
                                'Error loading last message for',
                                friend.name,
                                err,
                            );
                        }

                        return {
                            id: friend.id,
                            name: friend.name,
                            username: friend.name,
                            avatar:
                                friend.avatar ||
                                `https://i.pravatar.cc/150?img=${Math.floor(
                                    Math.random() * 70,
                                )}`,
                            status: status,
                            isFriend: true,
                            lastSeen: friend.lastSeen || friend.lastSeenAt,
                            lastMessage: lastMessage,
                            unreadCount: friend.unreadCount || 0,
                            timestamp: friend.timestamp || 'Yesterday',
                        };
                    }),
                );

                console.log('✅ Mapped friends with status:', mappedFriends);

                setContacts((prev) =>
                    ensureAiContact([
                        ...prev.filter((c) => c.isGroup || c.isAI),
                        ...mappedFriends,
                    ]),
                );
            } else {
                setSnackbarMessage('Không thể tải danh sách bạn bè!');
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            }
        } catch (error) {
            setSnackbarMessage(
                'Lỗi tải danh sách bạn bè: ' +
                    (error.response?.data?.message || error.message),
            );
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        } finally {
            setIsLoading(false);
        }
    }, [token, normalizeLastMessage, ensureAiContact]);

    const updatePendingRequests = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const data = await fetchPendingFriendRequests(token);
            if (data) {
                console.log('Pending friend requests data:', data); // Debug log
                setPendingRequests(
                    data.map((request) => {
                        // Log từng request để debug
                        console.log('Processing request:', request);

                        // Thử nhiều cách lấy tên
                        const name =
                            request.name ||
                            request.senderName ||
                            request.sender?.name ||
                            `${request.firstName || ''} ${
                                request.lastName || ''
                            }`.trim() ||
                            `${request.sender?.firstName || ''} ${
                                request.sender?.lastName || ''
                            }`.trim() ||
                            request.username ||
                            request.sender?.username ||
                            'Người dùng';

                        // Thử nhiều cách lấy avatar
                        const avatar =
                            request.avatar ||
                            request.senderAvatar ||
                            request.sender?.avatar ||
                            request.avatarUrl ||
                            request.sender?.avatarUrl ||
                            `https://i.pravatar.cc/150?img=${Math.floor(
                                Math.random() * 70,
                            )}`;

                        return {
                            id: request.requestId || request.id,
                            requestId: request.requestId || request.id,
                            senderId: request.senderId || request.sender?.id,
                            name: name,
                            avatar: avatar,
                            phone: request.phone,
                        };
                    }),
                );
            } else {
                setSnackbarMessage('Không thể tải danh sách lời mời!');
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            }
        } catch (error) {
            setSnackbarMessage(
                'Lỗi tải danh sách lời mời: ' +
                    (error.response?.data?.message || error.message),
            );
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const updateGroupInvites = useCallback(async () => {
        if (!token) return;
        try {
            const data = await fetchGroupInvites(token);
            if (data) {
                console.log('Group invites data:', data);
                setGroupInvites(
                    data.map((invite) => ({
                        id: invite.inviteId || invite.id,
                        inviteId: invite.inviteId || invite.id,
                        groupId: invite.groupId,
                        groupName:
                            invite.groupName || invite.group?.name || 'Nhóm',
                        inviterName:
                            invite.inviterName ||
                            invite.inviter?.name ||
                            'Người dùng',
                        createAt: invite.createAt || invite.createdAt,
                    })),
                );
            }
        } catch (error) {
            console.error('Error fetching group invites:', error);
        }
    }, [token]);

    useEffect(() => {
        if (
            currentView === 'contacts' ||
            currentView === 'messages' ||
            currentView === 'notifications'
        ) {
            updateFriendsList();
            updatePendingRequests();
            updateGroupInvites();
        }
    }, [
        currentView,
        updateFriendsList,
        updatePendingRequests,
        updateGroupInvites,
    ]);

    useEffect(() => {
        const selectedId = selectedContact?.id;
        const selectedIsAi = Boolean(selectedContact?.isAI);
        const selectedIsGroup = Boolean(selectedContact?.isGroup);

        if (!selectedId || !token) return;

        // Reset unreadCount khi chọn contact
        setContacts((prevContacts) =>
            prevContacts.map((contact) =>
                contact.id === selectedId
                    ? { ...contact, unreadCount: 0 }
                    : contact,
            ),
        );

        const loadChatHistory = async () => {
            try {
                if (selectedIsAi) {
                    let targetConversationId = currentAiConversationId;
                    let list = [];

                    list = await refreshAiConversations();

                    if (!targetConversationId) {
                        if (list.length > 0) {
                            targetConversationId = list[0].id;
                            setCurrentAiConversationId(targetConversationId);
                        } else {
                            // Không tự tạo hội thoại mới để tránh nhảy trạng thái UI khi người dùng đang chat.
                            setMessages(
                                filterAiConversationMessages(loadAiHistory()),
                            );
                            return;
                        }
                    }

                    if (!targetConversationId) {
                        setMessages([]);
                        return;
                    }

                    const conversation = await getAiConversationMessages(
                        token,
                        targetConversationId,
                    );
                    const serverMessages = Array.isArray(conversation?.messages)
                        ? conversation.messages
                        : [];
                    const normalizedServer =
                        filterAiConversationMessages(serverMessages);

                    // Giữ lại một ít tin nhắn local vừa gửi để tránh mất tin khi server sync trễ.
                    setMessages((prev) => {
                        const now = Date.now();
                        const keepRecentLocal = (prev || []).filter((msg) => {
                            const id = String(msg?.id || '');
                            const isLocalAiId =
                                id.startsWith('local-ai-') ||
                                id.startsWith('ai-fallback-') ||
                                id.startsWith('ai-');
                            if (!isLocalAiId) return false;

                            const ts = new Date(
                                msg?.createAt || msg?.createdAt || 0,
                            ).getTime();
                            return Number.isFinite(ts) && now - ts < 90 * 1000;
                        });

                        const merged = [...normalizedServer];
                        const existingIds = new Set(
                            merged
                                .map((m) => m?.id)
                                .filter(
                                    (id) => id !== undefined && id !== null,
                                ),
                        );

                        keepRecentLocal.forEach((msg) => {
                            if (!msg?.id || !existingIds.has(msg.id)) {
                                merged.push(msg);
                            }
                        });

                        return merged;
                    });
                    return;
                }

                let chatHistory;
                if (selectedIsGroup) {
                    chatHistory = await getGroupChatHistory(selectedId, token);
                } else {
                    chatHistory = await getChatHistory(selectedId, token);
                }
                console.log('Chat history loaded:', chatHistory);
                const uniqueMessages = chatHistory.reduce((acc, msg) => {
                    if (!acc.some((item) => item.id === msg.id)) {
                        let createAt = msg.createAt || msg.createdAt;
                        let parsedDate = new Date(createAt);
                        if (isNaN(parsedDate.getTime())) {
                            console.warn(
                                'Invalid createAt value in chat history:',
                                createAt,
                                'Using current time as fallback',
                            );
                            parsedDate = new Date();
                        } else if (
                            typeof createAt === 'string' &&
                            !createAt.endsWith('Z') &&
                            !createAt.includes('+')
                        ) {
                            createAt = `${createAt}Z`;
                            parsedDate = new Date(createAt);
                        }
                        acc.push({
                            id: msg.id,
                            senderId: msg.senderId,
                            receiverId: msg.receiverId,
                            groupId: msg.groupId,
                            content: msg.content,
                            type: msg.type,
                            createAt: parsedDate.toISOString(),
                            recalled: msg.recalled || false,
                            deletedByUsers: msg.deletedByUsers || [],
                            isRead: msg.isRead || false,
                            // Coerce to boolean to avoid string "false" being truthy
                            isPinned: msg.isPinned === true,
                            isEdited: msg.isEdited || false,
                        });
                    }
                    return acc;
                }, []);
                setMessages(uniqueMessages);
            } catch (error) {
                setSnackbarMessage(
                    'Lỗi tải lịch sử tin nhắn: ' +
                        (error.response?.data?.message || error.message),
                );
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            }
        };
        loadChatHistory();
    }, [
        selectedContact?.id,
        selectedContact?.isAI,
        selectedContact?.isGroup,
        token,
        loadAiHistory,
        filterAiConversationMessages,
        currentAiConversationId,
        refreshAiConversations,
    ]);

    useEffect(() => {
        setContacts((prev) => ensureAiContact(prev));
    }, [ensureAiContact]);

    useEffect(() => {
        if (selectedContact?.isAI) {
            const aiOnlyMessages = filterAiConversationMessages(messages);
            localStorage.setItem(
                aiHistoryStorageKey,
                JSON.stringify(aiOnlyMessages),
            );

            if (token && currentAiConversationId) {
                saveAiConversationMessages(
                    token,
                    currentAiConversationId,
                    aiOnlyMessages,
                )
                    .then((savedSummary) => {
                        if (!savedSummary?.id) return;

                        setAiConversations((prev) => {
                            const safePrev = Array.isArray(prev) ? prev : [];
                            const merged = safePrev.map((item) =>
                                item.id === savedSummary.id
                                    ? { ...item, ...savedSummary }
                                    : item,
                            );

                            const existed = merged.some(
                                (item) => item.id === savedSummary.id,
                            );

                            return existed ? merged : [savedSummary, ...merged];
                        });
                    })
                    .catch((error) => {
                        console.error(
                            'Error syncing AI history to server:',
                            error,
                        );
                    });
            }
        }
    }, [
        messages,
        selectedContact,
        aiHistoryStorageKey,
        filterAiConversationMessages,
        token,
        currentAiConversationId,
    ]);

    const handleSendMessage = useCallback(
        (message) => {
            console.log('Sending message:', message);
            setMessages((prev) => {
                const shouldPersistAiHistory =
                    !message?.groupId &&
                    ((message?.senderId === userId &&
                        message?.receiverId === AI_ASSISTANT_ID) ||
                        (message?.senderId === AI_ASSISTANT_ID &&
                            message?.receiverId === userId));

                const persistAiHistoryIfNeeded = (nextMessages) => {
                    if (!shouldPersistAiHistory) {
                        return;
                    }
                    try {
                        const aiOnlyMessages =
                            filterAiConversationMessages(nextMessages);
                        localStorage.setItem(
                            aiHistoryStorageKey,
                            JSON.stringify(aiOnlyMessages),
                        );
                    } catch (error) {
                        console.warn('Cannot persist AI chat history:', error);
                    }
                };

                if (!message.content && !message.type) {
                    const nextMessages = prev.map((msg) =>
                        msg.id === message.id ? { ...msg, ...message } : msg,
                    );
                    persistAiHistoryIfNeeded(nextMessages);
                    return nextMessages;
                }

                const deletedMessageIds = JSON.parse(
                    localStorage.getItem('deletedMessageIds') || '[]',
                );
                if (message.id && deletedMessageIds.includes(message.id)) {
                    return prev;
                }

                const nextMessages = [...prev, message];
                persistAiHistoryIfNeeded(nextMessages);
                return nextMessages;
            });

            // Cập nhật lastMessage trong contact list
            const contactId =
                message.groupId ||
                (message.receiverId === userId
                    ? message.senderId
                    : message.receiverId);
            setContacts((prevContacts) =>
                prevContacts.map((contact) => {
                    if (contact.id === contactId) {
                        return {
                            ...contact,
                            lastMessage:
                                message.type === 'TEXT'
                                    ? message.content
                                    : message.type === 'IMAGE'
                                      ? '[Hình ảnh]'
                                      : message.type === 'VIDEO'
                                        ? '[Video]'
                                        : message.type === 'AUDIO'
                                          ? '[Âm thanh]'
                                          : '[File]',
                            timestamp: new Date().toISOString(),
                        };
                    }
                    return contact;
                }),
            );
        },
        [userId, aiHistoryStorageKey, filterAiConversationMessages],
    );

    const handleRequestAIReply = useCallback(
        async (userText, files = []) => {
            const normalizedText = (userText || '').trim();
            const hasFiles = Array.isArray(files) && files.length > 0;
            if ((!normalizedText && !hasFiles) || !token) return;

            try {
                const aiContext = messages
                    .slice(-10)
                    .map((msg) => ({
                        role:
                            msg.senderId === userId
                                ? 'user'
                                : msg.senderId === AI_ASSISTANT_ID
                                  ? 'assistant'
                                  : 'user',
                        content:
                            msg.type === 'TEXT'
                                ? msg.content || ''
                                : msg.type === 'IMAGE'
                                  ? `[Hình ảnh: ${msg.fileName || 'image'}]`
                                  : msg.type === 'VIDEO'
                                    ? `[Video: ${msg.fileName || 'video'}]`
                                    : msg.type === 'AUDIO'
                                      ? `[Âm thanh: ${msg.fileName || 'audio'}]`
                                      : msg.type === 'FILE'
                                        ? `[Tệp đính kèm: ${msg.fileName || 'file'}]`
                                        : '',
                    }))
                    .filter((item) => item.content.trim().length > 0);

                const aiResponse = await askAiAssistant(
                    normalizedText,
                    aiContext,
                    token,
                    files,
                );

                const replyText =
                    aiResponse?.reply ||
                    'Mình chưa có phản hồi phù hợp, bạn thử hỏi rõ hơn nhé.';

                const diagnostic = (aiResponse?.diagnostic || '').trim();
                const provider = (aiResponse?.provider || '').toLowerCase();
                const finalReply =
                    provider === 'gemini' || !diagnostic
                        ? replyText
                        : `Thong bao he thong: ${diagnostic}\n\n${replyText}`;

                handleSendMessage({
                    id: `ai-${Date.now()}-${Math.random()
                        .toString(36)
                        .substring(2, 9)}`,
                    senderId: AI_ASSISTANT_ID,
                    receiverId: userId,
                    content: finalReply,
                    type: 'TEXT',
                    createAt: new Date().toISOString(),
                    recalled: false,
                    deletedByUsers: [],
                    isRead: true,
                    isPinned: false,
                    isEdited: false,
                });
            } catch (error) {
                const isTimeout =
                    error?.code === 'ECONNABORTED' ||
                    String(error?.message || '')
                        .toLowerCase()
                        .includes('timeout');
                const fallback = isTimeout
                    ? 'AI đang xử lý quá lâu, bạn thử lại giúp mình sau ít phút nhé.'
                    : error?.response?.data?.message ||
                      'AI đang bận, bạn thử lại sau ít phút nhé.';

                handleSendMessage({
                    id: `ai-fallback-${Date.now()}-${Math.random()
                        .toString(36)
                        .substring(2, 9)}`,
                    senderId: AI_ASSISTANT_ID,
                    receiverId: userId,
                    content: fallback,
                    type: 'TEXT',
                    createAt: new Date().toISOString(),
                    recalled: false,
                    deletedByUsers: [],
                    isRead: true,
                    isPinned: false,
                    isEdited: false,
                });
            }
        },
        [messages, token, userId, handleSendMessage],
    );

    const handleProfileOpen = useCallback((user) => {
        setSelectedProfile(user);
        setProfileOpen(true);
    }, []);

    const handleProfileClose = useCallback(() => {
        setProfileOpen(false);
        setSelectedProfile(null);
    }, []);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // Search for users when typing in search bar
    useEffect(() => {
        const searchUsers = async () => {
            if (!headerSearchQuery.trim()) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            // Kiểm tra xem có phải tìm số điện thoại không (chỉ chứa số)
            const isPhoneSearch = /^\d+$/.test(headerSearchQuery.trim());

            if (!isPhoneSearch) {
                // Nếu là tìm tin nhắn (chứa chữ), không gọi API, chỉ lọc contacts
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            // Kiểm tra độ dài số điện thoại (phải đủ 10 số)
            const phoneNumber = headerSearchQuery.trim();
            if (phoneNumber.length < 10) {
                // Chưa đủ 10 số, không search
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            // Chỉ tìm người dùng mới nếu nhập số điện thoại đủ 10 số
            setIsSearching(true);
            try {
                // Tìm người dùng mới bằng số điện thoại
                const userData = await fetchUserByPhone(
                    headerSearchQuery.trim(),
                );

                // Kiểm tra userData có hợp lệ không (phải có id)
                if (userData && userData.id) {
                    // Ẩn kết quả nếu tìm ra chính tài khoản hiện tại
                    if (userData.id === userId) {
                        setSearchResults([]);
                        setIsSearching(false);
                        return;
                    }

                    // Kiểm tra xem đã là bạn bè chưa
                    const isFriend = contacts.some((c) => c.id === userData.id);
                    // Kiểm tra xem đã gửi lời mời chưa
                    const hasSentRequest = sentFriendRequests.has(userData.id);
                    const fullName =
                        userData.name ||
                        `${userData.firstName || ''} ${
                            userData.lastName || ''
                        }`.trim() ||
                        userData.username ||
                        userData.phone;

                    setSearchResults([
                        {
                            id: userData.id,
                            name: fullName,
                            phone: userData.phone,
                            avatar:
                                userData.avatar ||
                                'https://i.pravatar.cc/150?img=' +
                                    Math.floor(Math.random() * 70),
                            friendStatus: isFriend
                                ? 'FRIEND'
                                : hasSentRequest
                                  ? 'PENDING'
                                  : userData.friendStatus || 'NONE',
                            isSearchResult: true,
                        },
                    ]);
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                console.error('Error searching users:', error);
                setSearchResults([]);
            }
            setIsSearching(false);
        };

        const timeoutId = setTimeout(searchUsers, 500); // Debounce 500ms
        return () => clearTimeout(timeoutId);
    }, [headerSearchQuery, contacts, sentFriendRequests, userId]);

    // Call handlers
    const handleAcceptCall = async () => {
        if (!incomingCall) return;

        try {
            setShowIncomingCallModal(false);
            setCallStatus('Đang kết nối...');
            setCallModalOpen(true);
            setActiveCall({
                ...incomingCall,
                isVideoCall: incomingCall.data?.isVideoCall || false,
            });

            // Initialize peer connection
            initializePeerConnection(
                (candidate) => {
                    sendCallSignal(
                        'ice-candidate',
                        candidate,
                        incomingCall.senderId,
                        token,
                    );
                },
                (stream) => {
                    setRemoteStream(stream);
                    setCallStatus('Đã kết nối');
                },
            );

            // Get local media
            const stream = await startCall(
                incomingCall.data?.isVideoCall || false,
            );
            setLocalStream(stream);

            // Set remote offer and create answer
            await setRemoteDescription(incomingCall.data.offer);
            const answer = await createAnswer();
            sendCallSignal('answer', { answer }, incomingCall.senderId, token);
            await enableIceProcessing();

            setCallStatus('Đã kết nối');
            setIncomingCall(null);
        } catch (error) {
            console.error('Error accepting call:', error);

            // Check if it's a permission error
            if (error.message.includes('quyền truy cập')) {
                setShowPermissionGuide(true);
                setPendingCallAction(() => handleAcceptCall);
            } else {
                setSnackbarMessage(
                    'Không thể chấp nhận cuộc gọi: ' + error.message,
                );
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            }
            handleEndCall();
        }
    };

    const handleRejectCall = () => {
        if (incomingCall) {
            sendCallSignal('call-reject', {}, incomingCall.senderId, token);
            setIncomingCall(null);
            setShowIncomingCallModal(false);
        }
    };

    const handleEndCall = () => {
        endCall();
        setCallModalOpen(false);
        setLocalStream(null);
        setRemoteStream(null);
        setCallStatus('');
        setActiveCall(null);
        setIsAudioEnabled(true);
        setIsVideoEnabled(true);

        if (activeCall) {
            sendCallSignal(
                'call-end',
                {},
                activeCall.senderId || activeCall.receiverId,
                token,
            );
        }
    };

    const handleToggleAudio = () => {
        const enabled = toggleAudio();
        setIsAudioEnabled(enabled);
    };

    const handleToggleVideo = () => {
        const enabled = toggleVideo();
        setIsVideoEnabled(enabled);
    };

    const handleRetryPermission = () => {
        setShowPermissionGuide(false);
        if (pendingCallAction) {
            pendingCallAction();
            setPendingCallAction(null);
        }
    };

    const handleStartCallFromFriendsList = async (friend, isVideo) => {
        // Switch to messages view to show ChatWindow
        setCurrentView('messages');
        // Select the friend
        setSelectedContact(friend);

        // Wait for state updates then initiate call
        setTimeout(async () => {
            try {
                setCallStatus('Đang kết nối...');
                setCallModalOpen(true);
                setActiveCall({
                    caller: friend,
                    isVideoCall: isVideo,
                    receiverId: friend.id,
                });

                // Initialize peer connection
                initializePeerConnection(
                    (candidate) => {
                        sendCallSignal(
                            'ice-candidate',
                            candidate,
                            friend.id,
                            token,
                        );
                    },
                    (stream) => {
                        setRemoteStream(stream);
                        setCallStatus('Đang gọi...');
                    },
                );

                // Get local media stream
                const stream = await startCall(isVideo);
                setLocalStream(stream);

                // Create and send offer
                const offer = await createOffer();
                sendCallSignal(
                    'offer',
                    { offer, isVideoCall: isVideo },
                    friend.id,
                    token,
                );

                setCallStatus('Đang đổ chuông...');
            } catch (error) {
                console.error('Error starting call:', error);

                if (error.message.includes('quyền truy cập')) {
                    setShowPermissionGuide(true);
                    setPendingCallAction(
                        () => () =>
                            handleStartCallFromFriendsList(friend, isVideo),
                    );
                } else {
                    setSnackbarMessage(
                        'Không thể bắt đầu cuộc gọi: ' + error.message,
                    );
                    setSnackbarSeverity('error');
                    setOpenSnackbar(true);
                }
                handleEndCall();
            }
        }, 200);
    };

    const handleLogout = useCallback(() => {
        // Disconnect WebSocket trước khi đăng xuất để cập nhật status offline
        disconnectWebSocket();

        localStorage.removeItem('userId');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('deletedMessageIds');
        setUserId(null);
        setToken(null);
        setSnackbarMessage('Đăng xuất thành công!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
        handleMenuClose();
        navigate('/');
    }, [navigate]);

    const handleToggleAddFriendInput = useCallback(() => {
        setShowAddFriendInput(!showAddFriendInput);
        setFriendPhoneInput('');
    }, [showAddFriendInput]);

    const handleSendFriendRequest = useCallback(async () => {
        if (!friendPhoneInput.trim()) {
            setSnackbarMessage('Vui lòng nhập số điện thoại!');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        if (!/^\d+$/.test(friendPhoneInput)) {
            setSnackbarMessage('Số điện thoại chỉ được chứa các chữ số!');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        if (!token) {
            setSnackbarMessage('Vui lòng đăng nhập để gửi lời mời kết bạn!');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        setIsLoading(true);
        try {
            const result = await sendFriendRequest(friendPhoneInput);
            if (result) {
                setSnackbarMessage('Gửi lời mời kết bạn thành công!');
                setSnackbarSeverity('success');
                setOpenSnackbar(true);
                setShowAddFriendInput(false);
                setFriendPhoneInput('');
                await updateFriendsList();
                await updatePendingRequests();
            } else {
                setSnackbarMessage('Gửi lời mời kết bạn thất bại!');
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            }
        } catch (error) {
            setSnackbarMessage(
                'Lỗi gửi lời mời kết bạn: ' +
                    (error.message || 'Không xác định'),
            );
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        } finally {
            setIsLoading(false);
        }
    }, [friendPhoneInput, updateFriendsList, updatePendingRequests, token]);

    const handleAcceptFriendRequest = useCallback(
        async (requestId) => {
            if (!token) {
                setSnackbarMessage(
                    'Vui lòng đăng nhập để chấp nhận lời mời kết bạn!',
                );
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
                return;
            }

            setIsLoading(true);
            try {
                const result = await acceptFriendRequest(requestId);
                if (result) {
                    setSnackbarMessage('Đã chấp nhận lời mời kết bạn!');
                    setSnackbarSeverity('success');
                    setOpenSnackbar(true);
                    await updateFriendsList();
                    await updatePendingRequests();
                } else {
                    setSnackbarMessage('Chấp nhận lời mời thất bại!');
                    setSnackbarSeverity('error');
                    setOpenSnackbar(true);
                }
            } catch (error) {
                setSnackbarMessage(
                    'Lỗi chấp nhận lời mời: ' +
                        (error.message || 'Không xác định'),
                );
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            } finally {
                setIsLoading(false);
            }
        },
        [updateFriendsList, updatePendingRequests, token],
    );

    const handleAcceptGroupInvite = useCallback(
        async (inviteId) => {
            if (!token) {
                setSnackbarMessage('Vui lòng đăng nhập!');
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
                return;
            }

            setIsLoading(true);
            try {
                const result = await acceptGroupInvite(inviteId, token);
                if (result) {
                    setSnackbarMessage('Đã tham gia nhóm!');
                    setSnackbarSeverity('success');
                    setOpenSnackbar(true);
                    await updateGroups();
                    await updateGroupInvites();
                }
            } catch (error) {
                setSnackbarMessage(
                    'Lỗi tham gia nhóm: ' + (error.message || 'Không xác định'),
                );
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            } finally {
                setIsLoading(false);
            }
        },
        [token, updateGroupInvites],
    );

    const handleRejectGroupInvite = useCallback(
        async (inviteId) => {
            if (!token) {
                setSnackbarMessage('Vui lòng đăng nhập!');
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
                return;
            }

            setIsLoading(true);
            try {
                const result = await rejectGroupInvite(inviteId, token);
                if (result) {
                    setSnackbarMessage('Đã từ chối lời mời nhóm!');
                    setSnackbarSeverity('success');
                    setOpenSnackbar(true);
                    await updateGroupInvites();
                }
            } catch (error) {
                setSnackbarMessage(
                    'Lỗi từ chối lời mời: ' +
                        (error.message || 'Không xác định'),
                );
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            } finally {
                setIsLoading(false);
            }
        },
        [token, updateGroupInvites],
    );

    const handleRejectFriendRequest = useCallback(
        async (requestId) => {
            if (!token) {
                setSnackbarMessage('Vui lòng đăng nhập!');
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
                return;
            }

            setIsLoading(true);
            try {
                const result = await cancelFriendRequest(requestId);
                if (result) {
                    setSnackbarMessage('Đã từ chối lời mời kết bạn!');
                    setSnackbarSeverity('success');
                    setOpenSnackbar(true);
                    await updatePendingRequests();
                } else {
                    setSnackbarMessage('Từ chối lời mời kết bạn thất bại!');
                    setSnackbarSeverity('error');
                    setOpenSnackbar(true);
                }
            } catch (error) {
                setSnackbarMessage(
                    'Lỗi từ chối lời mời: ' +
                        (error.message || 'Không xác định'),
                );
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            } finally {
                setIsLoading(false);
            }
        },
        [token, updatePendingRequests],
    );

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedMemberIds.length === 0) {
            setSnackbarMessage(
                'Vui lòng nhập tên nhóm và chọn ít nhất một thành viên!',
            );
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        if (!token) {
            setSnackbarMessage('Vui lòng đăng nhập để tạo nhóm!');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        const userId =
            localStorage.getItem('userId') || '680e6d95a73e35151128bf65';
        const finalMemberIds = [...new Set([...selectedMemberIds, userId])];

        setIsLoading(true);
        try {
            console.log('Creating group with:', {
                groupName,
                memberIds: finalMemberIds,
                token,
            });
            const result = await createGroup(
                groupName,
                finalMemberIds,
                groupAvatar,
                token,
            );
            if (result) {
                setSnackbarMessage('Tạo nhóm thành công!');
                setSnackbarSeverity('success');
                setOpenSnackbar(true);
                setCreateGroupOpen(false);
                setGroupName('');
                setSelectedMemberIds([]);
                await updateGroups();
            } else {
                setSnackbarMessage('Tạo nhóm thất bại!');
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            }
        } catch (error) {
            setSnackbarMessage(
                'Lỗi tạo nhóm: ' +
                    (error.response?.data?.message || error.message),
            );
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreateGroup = () => {
        setCreateGroupOpen(true);
        handleMenuClose();
    };

    const handleUpdateContact = (contactId, updates) => {
        if (contactId) {
            setConversationSettings((prev) => ({
                ...prev,
                [contactId]: {
                    ...(prev[contactId] || {}),
                    ...updates,
                },
            }));
        }

        setContacts((prevContacts) =>
            prevContacts.map((contact) =>
                contact.id === contactId ? { ...contact, ...updates } : contact,
            ),
        );

        setSelectedContact((prev) =>
            prev?.id === contactId ? { ...prev, ...updates } : prev,
        );
    };

    // Xóa cuộc trò chuyện khỏi danh sách (chỉ ẩn bên phía user, không xóa dữ liệu)
    const handleDeleteConversation = useCallback(
        async (contactId, options = {}) => {
            const isAiConversation =
                options?.isAI || contactId === AI_ASSISTANT_ID;

            if (isAiConversation) {
                localStorage.removeItem(aiHistoryStorageKey);
                setMessages([]);

                if (options?.clearHistoryOnly) {
                    const created = await createNewAiConversation();
                    if (created?.id) {
                        await refreshAiConversations();
                    }
                }

                setContacts((prevContacts) =>
                    prevContacts.map((contact) =>
                        contact.id === AI_ASSISTANT_ID
                            ? {
                                  ...contact,
                                  lastMessage: '',
                                  unreadCount: 0,
                                  timestamp: new Date().toISOString(),
                              }
                            : contact,
                    ),
                );
                return;
            }

            setContacts((prevContacts) =>
                prevContacts.filter((contact) => contact.id !== contactId),
            );
            // Nếu đang xem cuộc trò chuyện bị xóa, chuyển sang null
            if (selectedContact?.id === contactId) {
                setSelectedContact(null);
            }
        },
        [
            aiHistoryStorageKey,
            selectedContact?.id,
            userId,
            createNewAiConversation,
            refreshAiConversations,
        ],
    );

    const chatWindowProps = useMemo(
        () => ({
            selectedContact,
            messages,
            messageInput,
            onMessageInputChange: (e) => setMessageInput(e.target.value),
            onSendMessage: handleSendMessage,
            onProfileOpen: handleProfileOpen,
            userId,
            contacts,
            token,
            onUpdateContact: handleUpdateContact,
            onSendFriendRequest: async (phone) => {
                await sendFriendRequest(phone, token);
                setSentFriendRequests(
                    (prev) => new Set([...prev, selectedContact?.id]),
                );
            },
            onRequestAIReply: handleRequestAIReply,
            onUpdateSelectedContact: (updatedContact) => {
                setSelectedContact(updatedContact);
            },
            onDeleteConversation: handleDeleteConversation,
            aiConversations,
            currentAiConversationId,
            onCreateAiConversation: createNewAiConversation,
            onSelectAiConversation: selectAiConversation,
        }),
        [
            selectedContact,
            messages,
            messageInput,
            handleSendMessage,
            handleProfileOpen,
            userId,
            contacts,
            token,
            handleDeleteConversation,
            handleRequestAIReply,
            aiConversations,
            currentAiConversationId,
            createNewAiConversation,
            selectAiConversation,
        ],
    );

    const filteredContacts = useMemo(() => {
        const mergedContacts = contacts
            .map(mergeContactWithSettings)
            .filter((contact) => contact.id !== AI_ASSISTANT_ID);
        let filtered = mergedContacts;

        if (messageTab === 'hidden') {
            filtered = filtered.filter((contact) => contact.isHidden);
        } else {
            filtered = filtered.filter(
                (contact) => headerSearchQuery.trim() || !contact.isHidden,
            );
        }

        // Filter theo tab
        if (messageTab === 'unread') {
            filtered = filtered.filter((contact) => contact.unreadCount > 0);
        } else if (messageTab === 'stranger') {
            // Lọc tin nhắn từ người lạ (không phải bạn bè, không phải nhóm, và đã có tin nhắn)
            filtered = filtered.filter(
                (contact) =>
                    !contact.isFriend &&
                    !contact.isGroup &&
                    contact.lastMessage && // Phải có tin nhắn
                    contact.lastMessage !== 'Chưa có tin nhắn', // Không phải placeholder
            );
        }

        // Filter theo search query
        if (headerSearchQuery.trim()) {
            filtered = filtered.filter(
                (contact) =>
                    contact.name
                        ?.toLowerCase()
                        .includes(headerSearchQuery.toLowerCase()) ||
                    contact.phone?.includes(headerSearchQuery),
            );
        }

        // Sắp xếp: Hội thoại đã ghim lên đầu
        filtered.sort((a, b) => {
            // Ghim lên đầu
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            // Nếu cùng trạng thái ghim, giữ nguyên thứ tự hiện tại
            return 0;
        });

        console.log('Message tab:', messageTab);
        console.log('Search query:', headerSearchQuery);
        console.log('Filtered contacts:', filtered);
        return filtered;
    }, [contacts, headerSearchQuery, messageTab, mergeContactWithSettings]);

    const aiChatActive =
        currentView === 'messages' && selectedContact?.id === AI_ASSISTANT_ID;
    const showConversationList =
        currentView !== 'messages' || !isMessageListHidden;
    const showChatPane =
        !isMobileView ||
        currentView !== 'messages' ||
        Boolean(selectedContact) ||
        isMessageListHidden;
    const showSidebarNav = true;

    return (
        <ErrorBoundary>
            <div className="flex h-[100dvh] overflow-hidden pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0">
                {showSidebarNav && (
                    <NavSidebar
                        userProfile={userProfile}
                        currentView={currentView}
                        aiChatActive={aiChatActive}
                        canAccessClasses={true}
                        onViewChange={handleSidebarViewChange}
                        onOpenAIChat={handleOpenAIChat}
                        onProfileOpen={() =>
                            handleProfileOpen({
                                id: userId,
                                name: userProfile?.name || 'User',
                            })
                        }
                        onLogout={handleLogout}
                        onOpenChangePasswordModal={() =>
                            setOpenChangePasswordModal(true)
                        }
                        notificationCount={
                            pendingRequests.length + groupInvites.length
                        }
                    />
                )}
                {currentView === 'notifications' ? (
                    <NotificationPanel
                        pendingFriendRequests={pendingRequests.map((req) => ({
                            ...req,
                            id: req.requestId,
                        }))}
                        groupInvites={groupInvites}
                        messageNotifications={messageNotifications}
                        notificationSettings={notificationSettings}
                        onUpdateNotificationSettings={
                            handleUpdateNotificationSettings
                        }
                        onAcceptFriendRequest={handleAcceptFriendRequest}
                        onRejectFriendRequest={handleRejectFriendRequest}
                        onAcceptGroupInvite={handleAcceptGroupInvite}
                        onRejectGroupInvite={handleRejectGroupInvite}
                        onOpenMessageNotification={
                            handleOpenMessageNotification
                        }
                        onMarkMessageNotificationRead={
                            handleMarkMessageNotificationRead
                        }
                        onDeleteMessageNotification={
                            handleDeleteMessageNotification
                        }
                        onOpenFriendRequests={() =>
                            navigate('/contacts', {
                                state: { view: 'friend-requests' },
                            })
                        }
                        onOpenGroupInvites={() =>
                            navigate('/contacts', {
                                state: { view: 'group-invites' },
                            })
                        }
                        onClose={() => setCurrentView('messages')}
                    />
                ) : currentView === 'resources' ? (
                    <ResourcesPanel
                        onClose={() => setCurrentView('messages')}
                    />
                ) : currentView === 'classes' ? (
                    <ClassPanel
                        token={token}
                        userId={userId}
                        contacts={contacts}
                        canManageClasses={isTeacher}
                        onRefreshGroups={updateGroups}
                        onNotify={handleNotify}
                        onOpenClassChat={(classContact) => {
                            const mappedClass = {
                                id: classContact.id,
                                name: classContact.name,
                                isGroup: true,
                                isClass: true,
                                groupType: 'CLASS',
                                classCode: classContact.classCode,
                                avatar: classContact.avatar,
                                status: 'group',
                            };
                            setSelectedContact(mappedClass);
                            setCurrentView('messages');
                        }}
                    />
                ) : (
                    <div
                        className={`${aiChatActive ? 'hidden' : 'flex'} ${
                            showConversationList
                                ? 'translate-x-0 opacity-100'
                                : '-translate-x-full opacity-0 pointer-events-none'
                        } absolute inset-y-0 left-0 z-20 w-full md:static md:inset-auto md:z-auto md:w-[320px] lg:w-[350px] xl:w-[370px] 2xl:w-[390px] md:translate-x-0 md:opacity-100 md:pointer-events-auto glass-light glass-fluid border-r border-white/40 flex-col shadow-sm transition-all duration-300 ease-out`}
                    >
                        {/* Header */}
                        <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-white/20 glass-fluid">
                            {contactView !== 'all' ? (
                                <div className="flex items-center">
                                    <button
                                        onClick={() => setContactView('all')}
                                        className="tap-target text-gray-500 mr-3 hover:bg-white rounded-lg transition-all shadow-sm bg-white/80"
                                    >
                                        <BiArrowBack size={20} />
                                    </button>
                                    <h6 className="font-bold text-lg text-gray-800">
                                        {contactView === 'friends' &&
                                            '👥 Danh sách bạn bè'}
                                        {contactView === 'groups' &&
                                            '📚 Lớp học & Nhóm'}
                                        {contactView === 'friend-requests' &&
                                            '✉️ Lời mời kết bạn'}
                                        {contactView === 'group-invites' &&
                                            '📨 Lời mời vào nhóm'}
                                    </h6>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-white rounded-xl px-4 py-2.5 flex-1 shadow-sm border border-gray-100 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                        <BiSearch
                                            size={18}
                                            className="text-gray-400"
                                        />
                                        <input
                                            placeholder="Tìm bạn bè, tin nhắn..."
                                            value={headerSearchQuery}
                                            onChange={(e) =>
                                                setHeaderSearchQuery(
                                                    e.target.value,
                                                )
                                            }
                                            className="ml-2 flex-1 text-sm bg-transparent border-none outline-none text-gray-700 placeholder-gray-400"
                                        />
                                    </div>
                                    <button
                                        onClick={handleMenuOpen}
                                        disabled={isLoading}
                                        title="Menu"
                                        className="tap-target text-gray-500 hover:bg-white rounded-xl transition-all shadow-sm bg-white/80 border border-gray-100 disabled:opacity-50"
                                    >
                                        <BiDotsVerticalRounded size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Section Header - Cuộc trò chuyện */}
                        {contactView === 'all' && (
                            <div className="bg-white px-4 py-3 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BiMessageSquareDetail className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-semibold text-gray-800">
                                            Cuộc trò chuyện
                                        </h3>
                                        {filteredContacts?.length > 0 && (
                                            <span className="text-xs text-gray-400">
                                                ({filteredContacts.length})
                                            </span>
                                        )}
                                    </div>
                                    {/* Filter dropdown */}
                                    <div className="relative">
                                        <select
                                            value={messageTab}
                                            onChange={(e) =>
                                                setMessageTab(e.target.value)
                                            }
                                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-lg px-3 py-1.5 pr-8 cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        >
                                            <option value="all">Tất cả</option>
                                            <option value="unread">
                                                Chưa đọc
                                            </option>
                                            <option value="stranger">
                                                Người lạ
                                            </option>
                                            <option value="hidden">
                                                Đã ẩn
                                            </option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <svg
                                                className="w-4 h-4 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {Boolean(anchorEl) &&
                            createPortal(
                                <div
                                    className="fixed inset-0 z-[9998]"
                                    onClick={handleMenuClose}
                                >
                                    <div
                                        className="absolute right-3 top-16 z-[9999] w-72 rounded-2xl border border-gray-200 bg-white py-2 shadow-2xl md:left-[420px] md:right-auto"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="px-4 py-3 border-b border-gray-100 bg-white">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                                                Quản lý
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigate('/contacts', {
                                                    state: {
                                                        view: 'friends',
                                                    },
                                                });
                                                handleMenuClose();
                                            }}
                                            className="w-full px-4 py-3 hover:bg-emerald-50 flex items-center text-left transition-colors group"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mr-3 group-hover:bg-emerald-200 transition-colors">
                                                <BiUserPlus
                                                    size={18}
                                                    className="text-emerald-600"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">
                                                    Danh sách bạn bè
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Quản lý bạn bè của bạn
                                                </p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigate('/contacts', {
                                                    state: { view: 'groups' },
                                                });
                                                handleMenuClose();
                                            }}
                                            className="w-full px-4 py-3 hover:bg-violet-50 flex items-center text-left transition-colors group"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center mr-3 group-hover:bg-violet-200 transition-colors">
                                                <BiGroup
                                                    size={18}
                                                    className="text-violet-600"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">
                                                    Lớp học & Nhóm
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Quản lý nhóm học tập
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>,
                                document.body,
                            )}
                        {openSnackbar && (
                            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                                <div
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
                                        snackbarSeverity === 'success'
                                            ? 'bg-green-50 text-green-800 border border-green-200'
                                            : snackbarSeverity === 'error'
                                              ? 'bg-red-50 text-red-800 border border-red-200'
                                              : snackbarSeverity === 'warning'
                                                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                                    }`}
                                >
                                    <span className="text-sm font-medium">
                                        {snackbarMessage}
                                    </span>
                                    <button
                                        onClick={() => setOpenSnackbar(false)}
                                        className="ml-2 text-current opacity-70 hover:opacity-100"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}
                        {currentView === 'messages' &&
                            contactView === 'all' && (
                                <>
                                    {/* Hiển thị kết quả tìm kiếm người dùng mới */}
                                    {headerSearchQuery &&
                                        searchResults.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-600 p-4 pb-2">
                                                    Kết quả tìm kiếm
                                                </p>
                                                <ul>
                                                    {searchResults.map(
                                                        (user) => (
                                                            <li
                                                                key={user.id}
                                                                className="py-3 px-4 cursor-pointer hover:bg-gray-50 flex items-center gap-3"
                                                            >
                                                                <div className="flex-shrink-0">
                                                                    {user.avatar ? (
                                                                        <img
                                                                            src={
                                                                                user.avatar
                                                                            }
                                                                            alt={
                                                                                user.name
                                                                            }
                                                                            className="w-14 h-14 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-semibold">
                                                                            {user.name?.charAt(
                                                                                0,
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-900 truncate">
                                                                        {
                                                                            user.name
                                                                        }
                                                                    </p>
                                                                    <p className="text-sm text-gray-500 truncate">
                                                                        {
                                                                            user.phone
                                                                        }
                                                                    </p>
                                                                </div>
                                                                {/* Nút nhắn tin cho người lạ */}
                                                                {(user.friendStatus ===
                                                                    'NONE' ||
                                                                    user.friendStatus ===
                                                                        'PENDING') && (
                                                                    <button
                                                                        onClick={() => {
                                                                            // Tạo contact tạm thời cho người lạ
                                                                            const strangerContact =
                                                                                {
                                                                                    id: user.id,
                                                                                    name: user.name,
                                                                                    username:
                                                                                        user.name,
                                                                                    phone: user.phone,
                                                                                    avatar: user.avatar,
                                                                                    status: 'offline',
                                                                                    isFriend: false,
                                                                                    isStranger: true,
                                                                                    friendStatus:
                                                                                        user.friendStatus,
                                                                                };
                                                                            setSelectedContact(
                                                                                strangerContact,
                                                                            );
                                                                            setHeaderSearchQuery(
                                                                                '',
                                                                            );
                                                                        }}
                                                                        className="border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs py-1.5 px-3 rounded transition-colors"
                                                                    >
                                                                        Nhắn tin
                                                                    </button>
                                                                )}
                                                                {user.friendStatus ===
                                                                    'NONE' && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await sendFriendRequest(
                                                                                    user.phone,
                                                                                    token,
                                                                                );
                                                                                setSnackbarMessage(
                                                                                    'Đã gửi lời mời kết bạn!',
                                                                                );
                                                                                setSnackbarSeverity(
                                                                                    'success',
                                                                                );
                                                                                setOpenSnackbar(
                                                                                    true,
                                                                                );
                                                                                setSentFriendRequests(
                                                                                    (
                                                                                        prev,
                                                                                    ) =>
                                                                                        new Set(
                                                                                            [
                                                                                                ...prev,
                                                                                                user.id,
                                                                                            ],
                                                                                        ),
                                                                                );
                                                                                setSearchResults(
                                                                                    (
                                                                                        prev,
                                                                                    ) =>
                                                                                        prev.map(
                                                                                            (
                                                                                                u,
                                                                                            ) =>
                                                                                                u.id ===
                                                                                                user.id
                                                                                                    ? {
                                                                                                          ...u,
                                                                                                          friendStatus:
                                                                                                              'PENDING',
                                                                                                      }
                                                                                                    : u,
                                                                                        ),
                                                                                );
                                                                            } catch (error) {
                                                                                setSnackbarMessage(
                                                                                    error.message ||
                                                                                        'Gửi lời mời thất bại',
                                                                                );
                                                                                setSnackbarSeverity(
                                                                                    'error',
                                                                                );
                                                                                setOpenSnackbar(
                                                                                    true,
                                                                                );
                                                                            }
                                                                        }}
                                                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded transition-colors"
                                                                    >
                                                                        Kết bạn
                                                                    </button>
                                                                )}
                                                                {user.friendStatus ===
                                                                    'PENDING' && (
                                                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                                                        Đã gửi
                                                                        lời mời
                                                                    </span>
                                                                )}
                                                                {user.friendStatus ===
                                                                    'FRIEND' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const contact =
                                                                                contacts.find(
                                                                                    (
                                                                                        c,
                                                                                    ) =>
                                                                                        c.id ===
                                                                                        user.id,
                                                                                );
                                                                            if (
                                                                                contact
                                                                            ) {
                                                                                setSelectedContact(
                                                                                    contact,
                                                                                );
                                                                                setHeaderSearchQuery(
                                                                                    '',
                                                                                );
                                                                            }
                                                                        }}
                                                                        className="border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs py-1.5 px-4 rounded transition-colors"
                                                                    >
                                                                        Nhắn tin
                                                                    </button>
                                                                )}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    {/* Hiển thị thông báo không tìm thấy - CHỈ KHI TÌM SỐ ĐIỆN THOẠI */}
                                    {headerSearchQuery &&
                                        !isSearching &&
                                        searchResults.length === 0 &&
                                        filteredContacts.length === 0 &&
                                        /^\d+$/.test(
                                            headerSearchQuery.trim(),
                                        ) && (
                                            <div className="p-8 text-center">
                                                <p className="text-sm text-gray-600">
                                                    Số điện thoại chưa đăng ký
                                                    hoặc không cho phép tìm kiếm
                                                </p>
                                            </div>
                                        )}
                                    {/* Hiển thị danh sách contacts nếu không tìm kiếm hoặc không có kết quả */}
                                    {!headerSearchQuery && (
                                        <ContactList
                                            contacts={filteredContacts}
                                            selectedContact={selectedContact}
                                            onContactSelect={setSelectedContact}
                                            pendingRequests={[]}
                                            onAcceptFriendRequest={
                                                handleAcceptFriendRequest
                                            }
                                            isLoading={isLoading}
                                            fetchPendingFriendRequests={
                                                fetchPendingFriendRequests
                                            }
                                        />
                                    )}
                                    {/* Hiển thị contacts được lọc theo search */}
                                    {headerSearchQuery && !isSearching && (
                                        <ContactList
                                            contacts={filteredContacts}
                                            selectedContact={selectedContact}
                                            onContactSelect={setSelectedContact}
                                            pendingRequests={[]}
                                            onAcceptFriendRequest={
                                                handleAcceptFriendRequest
                                            }
                                            isLoading={isLoading}
                                            fetchPendingFriendRequests={
                                                fetchPendingFriendRequests
                                            }
                                        />
                                    )}
                                </>
                            )}
                        {currentView === 'messages' &&
                            contactView === 'friends' && (
                                <div className="h-full overflow-auto">
                                    <p className="text-sm text-gray-600 p-4 pb-2">
                                        {
                                            filteredContacts.filter(
                                                (c) => !c.isGroup,
                                            ).length
                                        }{' '}
                                        bạn bè
                                    </p>
                                    <FriendsList
                                        contacts={filteredContacts}
                                        onSelectContact={setSelectedContact}
                                        onOpenUserSearch={() =>
                                            setUserSearchOpen(true)
                                        }
                                        onStartCall={
                                            handleStartCallFromFriendsList
                                        }
                                        hideHeader={true}
                                    />
                                </div>
                            )}
                        {currentView === 'messages' &&
                            contactView === 'groups' && (
                                <div className="h-full overflow-auto">
                                    <p className="text-sm text-gray-600 p-4 pb-2">
                                        {
                                            filteredContacts.filter(
                                                (c) => c.isGroup,
                                            ).length
                                        }{' '}
                                        nhóm
                                    </p>
                                    <ContactList
                                        contacts={filteredContacts.filter(
                                            (c) => c.isGroup,
                                        )}
                                        selectedContact={selectedContact}
                                        onContactSelect={setSelectedContact}
                                        pendingRequests={[]}
                                        onAcceptFriendRequest={
                                            handleAcceptFriendRequest
                                        }
                                        isLoading={isLoading}
                                        fetchPendingFriendRequests={
                                            fetchPendingFriendRequests
                                        }
                                    />
                                </div>
                            )}
                        {currentView === 'messages' &&
                            contactView === 'friend-requests' && (
                                <div className="h-full overflow-auto">
                                    <p className="text-sm text-gray-600 p-4 pb-2">
                                        {pendingRequests?.length || 0} lời mời
                                    </p>
                                    <ContactList
                                        contacts={[]}
                                        selectedContact={selectedContact}
                                        onContactSelect={setSelectedContact}
                                        pendingRequests={pendingRequests}
                                        onAcceptFriendRequest={
                                            handleAcceptFriendRequest
                                        }
                                        isLoading={isLoading}
                                        fetchPendingFriendRequests={
                                            fetchPendingFriendRequests
                                        }
                                    />
                                </div>
                            )}
                        {currentView === 'messages' &&
                            contactView === 'group-invites' && (
                                <div className="p-8 text-center mt-8">
                                    <p className="text-sm text-gray-600">
                                        Chưa có lời mời nào
                                    </p>
                                </div>
                            )}
                        <SettingsPanel
                            open={openChangePasswordModal}
                            onClose={() => setOpenChangePasswordModal(false)}
                        />
                    </div>
                )}
                {false && (
                    <div
                        className={`${aiChatActive ? 'hidden' : 'flex'} w-[280px] sm:w-[300px] md:w-[320px] lg:w-[340px] xl:w-[360px] 2xl:w-[380px] glass-light glass-fluid border-r border-white/40 flex-col shadow-sm`}
                    >
                        {/* Header */}
                        <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-white/20 glass-fluid">
                            {contactView !== 'all' ? (
                                <div className="flex items-center">
                                    <button
                                        onClick={() => setContactView('all')}
                                        className="text-gray-500 mr-3 p-2 hover:bg-white rounded-lg transition-all shadow-sm bg-white/80"
                                    >
                                        <BiArrowBack size={20} />
                                    </button>
                                    <h6 className="font-bold text-lg text-gray-800">
                                        {contactView === 'friends' &&
                                            '👥 Danh sách bạn bè'}
                                        {contactView === 'groups' &&
                                            '📚 Lớp học & Nhóm'}
                                        {contactView === 'friend-requests' &&
                                            '✉️ Lời mời kết bạn'}
                                        {contactView === 'group-invites' &&
                                            '📨 Lời mời vào nhóm'}
                                    </h6>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-white rounded-xl px-4 py-2.5 flex-1 shadow-sm border border-gray-100 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                        <BiSearch
                                            size={18}
                                            className="text-gray-400"
                                        />
                                        <input
                                            placeholder="Tìm bạn bè, tin nhắn..."
                                            value={headerSearchQuery}
                                            onChange={(e) =>
                                                setHeaderSearchQuery(
                                                    e.target.value,
                                                )
                                            }
                                            className="ml-2 flex-1 text-sm bg-transparent border-none outline-none text-gray-700 placeholder-gray-400"
                                        />
                                    </div>
                                    <button
                                        onClick={handleMenuOpen}
                                        disabled={isLoading}
                                        title="Menu"
                                        className="text-gray-500 p-2.5 hover:bg-white rounded-xl transition-all shadow-sm bg-white/80 border border-gray-100 disabled:opacity-50"
                                    >
                                        <BiDotsVerticalRounded size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Section Header - Cuộc trò chuyện */}
                        {contactView === 'all' && (
                            <div className="bg-white px-4 py-3 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BiMessageSquareDetail className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-semibold text-gray-800">
                                            Cuộc trò chuyện
                                        </h3>
                                        {filteredContacts?.length > 0 && (
                                            <span className="text-xs text-gray-400">
                                                ({filteredContacts.length})
                                            </span>
                                        )}
                                    </div>
                                    {/* Filter dropdown */}
                                    <div className="relative">
                                        <select
                                            value={messageTab}
                                            onChange={(e) =>
                                                setMessageTab(e.target.value)
                                            }
                                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-lg px-3 py-1.5 pr-8 cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        >
                                            <option value="all">Tất cả</option>
                                            <option value="unread">
                                                Chưa đọc
                                            </option>
                                            <option value="stranger">
                                                Người lạ
                                            </option>
                                            <option value="hidden">
                                                Đã ẩn
                                            </option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <svg
                                                className="w-4 h-4 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {Boolean(anchorEl) && (
                            <div
                                className="fixed inset-0 z-40"
                                onClick={handleMenuClose}
                            >
                                <div
                                    className="absolute left-[420px] top-16 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 w-72 z-50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                                            Quản lý
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigate('/contacts', {
                                                state: { view: 'friends' },
                                            });
                                            handleMenuClose();
                                        }}
                                        className="w-full px-4 py-3 hover:bg-emerald-50 flex items-center text-left transition-colors group"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mr-3 group-hover:bg-emerald-200 transition-colors">
                                            <BiUserPlus
                                                size={18}
                                                className="text-emerald-600"
                                            />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">
                                                Danh sách bạn bè
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Quản lý bạn bè của bạn
                                            </p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigate('/contacts', {
                                                state: { view: 'groups' },
                                            });
                                            handleMenuClose();
                                        }}
                                        className="w-full px-4 py-3 hover:bg-violet-50 flex items-center text-left transition-colors group"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center mr-3 group-hover:bg-violet-200 transition-colors">
                                            <BiGroup
                                                size={18}
                                                className="text-violet-600"
                                            />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">
                                                Lớp học & Nhóm
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Quản lý nhóm học tập
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                        {openSnackbar && (
                            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                                <div
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
                                        snackbarSeverity === 'success'
                                            ? 'bg-green-50 text-green-800 border border-green-200'
                                            : snackbarSeverity === 'error'
                                              ? 'bg-red-50 text-red-800 border border-red-200'
                                              : snackbarSeverity === 'warning'
                                                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                                    }`}
                                >
                                    <span className="text-sm font-medium">
                                        {snackbarMessage}
                                    </span>
                                    <button
                                        onClick={() => setOpenSnackbar(false)}
                                        className="ml-2 text-current opacity-70 hover:opacity-100"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}
                        {currentView === 'messages' &&
                            contactView === 'all' && (
                                <>
                                    {/* Hiển thị kết quả tìm kiếm người dùng mới */}
                                    {headerSearchQuery &&
                                        searchResults.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-600 p-4 pb-2">
                                                    Kết quả tìm kiếm
                                                </p>
                                                <ul>
                                                    {searchResults.map(
                                                        (user) => (
                                                            <li
                                                                key={user.id}
                                                                className="py-3 px-4 cursor-pointer hover:bg-gray-50 flex items-center gap-3"
                                                            >
                                                                <div className="flex-shrink-0">
                                                                    {user.avatar ? (
                                                                        <img
                                                                            src={
                                                                                user.avatar
                                                                            }
                                                                            alt={
                                                                                user.name
                                                                            }
                                                                            className="w-14 h-14 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-semibold">
                                                                            {user.name?.charAt(
                                                                                0,
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-900 truncate">
                                                                        {
                                                                            user.name
                                                                        }
                                                                    </p>
                                                                    <p className="text-sm text-gray-500 truncate">
                                                                        {
                                                                            user.phone
                                                                        }
                                                                    </p>
                                                                </div>
                                                                {/* Nút nhắn tin cho người lạ */}
                                                                {(user.friendStatus ===
                                                                    'NONE' ||
                                                                    user.friendStatus ===
                                                                        'PENDING') && (
                                                                    <button
                                                                        onClick={() => {
                                                                            // Tạo contact tạm thời cho người lạ
                                                                            const strangerContact =
                                                                                {
                                                                                    id: user.id,
                                                                                    name: user.name,
                                                                                    username:
                                                                                        user.name,
                                                                                    phone: user.phone,
                                                                                    avatar: user.avatar,
                                                                                    status: 'offline',
                                                                                    isFriend: false,
                                                                                    isStranger: true,
                                                                                    friendStatus:
                                                                                        user.friendStatus,
                                                                                };
                                                                            setSelectedContact(
                                                                                strangerContact,
                                                                            );
                                                                            setHeaderSearchQuery(
                                                                                '',
                                                                            );
                                                                        }}
                                                                        className="border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs py-1.5 px-3 rounded transition-colors"
                                                                    >
                                                                        Nhắn tin
                                                                    </button>
                                                                )}
                                                                {user.friendStatus ===
                                                                    'NONE' && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await sendFriendRequest(
                                                                                    user.phone,
                                                                                    token,
                                                                                );
                                                                                setSnackbarMessage(
                                                                                    'Đã gửi lời mời kết bạn!',
                                                                                );
                                                                                setSnackbarSeverity(
                                                                                    'success',
                                                                                );
                                                                                setOpenSnackbar(
                                                                                    true,
                                                                                );
                                                                                setSentFriendRequests(
                                                                                    (
                                                                                        prev,
                                                                                    ) =>
                                                                                        new Set(
                                                                                            [
                                                                                                ...prev,
                                                                                                user.id,
                                                                                            ],
                                                                                        ),
                                                                                );
                                                                                setSearchResults(
                                                                                    (
                                                                                        prev,
                                                                                    ) =>
                                                                                        prev.map(
                                                                                            (
                                                                                                u,
                                                                                            ) =>
                                                                                                u.id ===
                                                                                                user.id
                                                                                                    ? {
                                                                                                          ...u,
                                                                                                          friendStatus:
                                                                                                              'PENDING',
                                                                                                      }
                                                                                                    : u,
                                                                                        ),
                                                                                );
                                                                            } catch (error) {
                                                                                setSnackbarMessage(
                                                                                    error.message ||
                                                                                        'Gửi lời mời thất bại',
                                                                                );
                                                                                setSnackbarSeverity(
                                                                                    'error',
                                                                                );
                                                                                setOpenSnackbar(
                                                                                    true,
                                                                                );
                                                                            }
                                                                        }}
                                                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded transition-colors"
                                                                    >
                                                                        Kết bạn
                                                                    </button>
                                                                )}
                                                                {user.friendStatus ===
                                                                    'PENDING' && (
                                                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                                                        Đã gửi
                                                                        lời mời
                                                                    </span>
                                                                )}
                                                                {user.friendStatus ===
                                                                    'FRIEND' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const contact =
                                                                                contacts.find(
                                                                                    (
                                                                                        c,
                                                                                    ) =>
                                                                                        c.id ===
                                                                                        user.id,
                                                                                );
                                                                            if (
                                                                                contact
                                                                            ) {
                                                                                setSelectedContact(
                                                                                    contact,
                                                                                );
                                                                                setHeaderSearchQuery(
                                                                                    '',
                                                                                );
                                                                            }
                                                                        }}
                                                                        className="border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs py-1.5 px-4 rounded transition-colors"
                                                                    >
                                                                        Nhắn tin
                                                                    </button>
                                                                )}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    {/* Hiển thị thông báo không tìm thấy - CHỈ KHI TÌM SỐ ĐIỆN THOẠI */}
                                    {headerSearchQuery &&
                                        !isSearching &&
                                        searchResults.length === 0 &&
                                        filteredContacts.length === 0 &&
                                        /^\d+$/.test(
                                            headerSearchQuery.trim(),
                                        ) && (
                                            <div className="p-8 text-center">
                                                <p className="text-sm text-gray-600">
                                                    Số điện thoại chưa đăng ký
                                                    hoặc không cho phép tìm kiếm
                                                </p>
                                            </div>
                                        )}
                                    {/* Hiển thị danh sách contacts nếu không tìm kiếm hoặc không có kết quả */}
                                    {!headerSearchQuery && (
                                        <ContactList
                                            contacts={filteredContacts}
                                            selectedContact={selectedContact}
                                            onContactSelect={setSelectedContact}
                                            pendingRequests={[]}
                                            onAcceptFriendRequest={
                                                handleAcceptFriendRequest
                                            }
                                            isLoading={isLoading}
                                            fetchPendingFriendRequests={
                                                fetchPendingFriendRequests
                                            }
                                        />
                                    )}
                                    {/* Hiển thị contacts được lọc theo search */}
                                    {headerSearchQuery && !isSearching && (
                                        <ContactList
                                            contacts={filteredContacts}
                                            selectedContact={selectedContact}
                                            onContactSelect={setSelectedContact}
                                            pendingRequests={[]}
                                            onAcceptFriendRequest={
                                                handleAcceptFriendRequest
                                            }
                                            isLoading={isLoading}
                                            fetchPendingFriendRequests={
                                                fetchPendingFriendRequests
                                            }
                                        />
                                    )}
                                </>
                            )}
                        {currentView === 'messages' &&
                            contactView === 'friends' && (
                                <div className="h-full overflow-auto">
                                    <p className="text-sm text-gray-600 p-4 pb-2">
                                        {
                                            filteredContacts.filter(
                                                (c) => !c.isGroup,
                                            ).length
                                        }{' '}
                                        bạn bè
                                    </p>
                                    <FriendsList
                                        contacts={filteredContacts}
                                        onSelectContact={setSelectedContact}
                                        onOpenUserSearch={() =>
                                            setUserSearchOpen(true)
                                        }
                                        onStartCall={
                                            handleStartCallFromFriendsList
                                        }
                                        hideHeader={true}
                                    />
                                </div>
                            )}
                        {currentView === 'messages' &&
                            contactView === 'groups' && (
                                <div className="h-full overflow-auto">
                                    <p className="text-sm text-gray-600 p-4 pb-2">
                                        {
                                            filteredContacts.filter(
                                                (c) => c.isGroup,
                                            ).length
                                        }{' '}
                                        nhóm
                                    </p>
                                    <ContactList
                                        contacts={filteredContacts.filter(
                                            (c) => c.isGroup,
                                        )}
                                        selectedContact={selectedContact}
                                        onContactSelect={setSelectedContact}
                                        pendingRequests={[]}
                                        onAcceptFriendRequest={
                                            handleAcceptFriendRequest
                                        }
                                        isLoading={isLoading}
                                        fetchPendingFriendRequests={
                                            fetchPendingFriendRequests
                                        }
                                    />
                                </div>
                            )}
                        {currentView === 'messages' &&
                            contactView === 'friend-requests' && (
                                <div className="h-full overflow-auto">
                                    <p className="text-sm text-gray-600 p-4 pb-2">
                                        {pendingRequests?.length || 0} lời mời
                                    </p>
                                    <ContactList
                                        contacts={[]}
                                        selectedContact={selectedContact}
                                        onContactSelect={setSelectedContact}
                                        pendingRequests={pendingRequests}
                                        onAcceptFriendRequest={
                                            handleAcceptFriendRequest
                                        }
                                        isLoading={isLoading}
                                        fetchPendingFriendRequests={
                                            fetchPendingFriendRequests
                                        }
                                    />
                                </div>
                            )}
                        {currentView === 'messages' &&
                            contactView === 'group-invites' && (
                                <div className="p-8 text-center mt-8">
                                    <p className="text-sm text-gray-600">
                                        Chưa có lời mời nào
                                    </p>
                                </div>
                            )}
                        <SettingsPanel
                            open={openChangePasswordModal}
                            onClose={() => setOpenChangePasswordModal(false)}
                        />
                    </div>
                )}
                {token &&
                currentView !== 'notifications' &&
                currentView !== 'resources' &&
                currentView !== 'classes' ? (
                    <div
                        className={`${
                            showChatPane
                                ? 'translate-x-0 opacity-100'
                                : 'translate-x-full opacity-0 pointer-events-none'
                        } flex-1 h-full transition-all duration-300 ease-out`}
                    >
                        <ChatWindow {...chatWindowProps} />
                    </div>
                ) : currentView === 'messages' ? (
                    <div className="flex items-center justify-center h-full flex-1 glass-light border-l border-white/40">
                        <h6 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                            Vui lòng đăng nhập để sử dụng chức năng chat
                        </h6>
                    </div>
                ) : null}
                <ProfileModal
                    open={profileOpen}
                    onClose={handleProfileClose}
                    profileData={selectedProfile}
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                />
                <UserSearchModal
                    open={userSearchOpen}
                    onClose={() => setUserSearchOpen(false)}
                />

                {createGroupOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black bg-opacity-50"
                            onClick={() => setCreateGroupOpen(false)}
                        ></div>
                        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="text-center text-2xl font-bold text-[#0068ff] pb-4 pt-6 px-6 border-b">
                                Tạo nhóm mới
                            </div>
                            <div className="p-6">
                                <div className="flex flex-col items-center mb-6">
                                    {groupAvatar ||
                                    'https://th.bing.com/th/id/R.0fb6fad84621ac768796c2c228858678?rik=EZHn72rbvK8jkg&pid=ImgRaw&r=0' ? (
                                        <img
                                            src={
                                                groupAvatar ||
                                                'https://th.bing.com/th/id/R.0fb6fad84621ac768796c2c228858678?rik=EZHn72rbvK8jkg&pid=ImgRaw&r=0'
                                            }
                                            alt="Group Avatar"
                                            className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-[#0068ff] shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        'groupAvatarInput',
                                                    )
                                                    .click()
                                            }
                                        />
                                    ) : (
                                        <div
                                            className="w-24 h-24 rounded-full bg-[#0068ff] mb-4 border-4 border-[#0068ff] shadow-md cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center text-white"
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        'groupAvatarInput',
                                                    )
                                                    .click()
                                            }
                                        >
                                            <BiGroup size={40} />
                                        </div>
                                    )}
                                    <input
                                        id="groupAvatarInput"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setGroupAvatar(
                                                        reader.result,
                                                    );
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <p className="text-xs text-gray-500">
                                        Nhấn để thay đổi ảnh nhóm
                                    </p>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Tên nhóm"
                                    value={groupName}
                                    onChange={(e) =>
                                        setGroupName(e.target.value)
                                    }
                                    className="w-full mb-6 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0068ff] focus:ring-2 focus:ring-[#0068ff] focus:ring-opacity-20 transition-all"
                                />

                                <h3 className="mb-4 font-medium text-gray-900">
                                    Chọn thành viên
                                </h3>

                                <ul className="max-h-72 overflow-auto bg-white rounded-lg border border-gray-300">
                                    {contacts
                                        .filter((contact) => !contact.isGroup)
                                        .map((contact) => (
                                            <li
                                                key={`friend-${contact.id}`}
                                                className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors flex items-center p-3"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMemberIds.includes(
                                                        contact.id,
                                                    )}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedMemberIds(
                                                                (prev) => [
                                                                    ...prev,
                                                                    contact.id,
                                                                ],
                                                            );
                                                        } else {
                                                            setSelectedMemberIds(
                                                                (prev) =>
                                                                    prev.filter(
                                                                        (id) =>
                                                                            id !==
                                                                            contact.id,
                                                                    ),
                                                            );
                                                        }
                                                    }}
                                                    className="w-5 h-5 text-[#0068ff] border-gray-300 rounded focus:ring-[#0068ff] focus:ring-2 cursor-pointer"
                                                />
                                                <div className="ml-3 flex-shrink-0">
                                                    {contact.avatar ? (
                                                        <img
                                                            src={contact.avatar}
                                                            alt={contact.name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                                                            {contact.name?.charAt(
                                                                0,
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-3 flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {contact.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500 truncate">
                                                        @{contact.username}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                            <div className="flex gap-3 px-6 pb-6">
                                <button
                                    onClick={() => setCreateGroupOpen(false)}
                                    className="flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleCreateGroup}
                                    disabled={isLoading}
                                    className="flex-1 px-6 py-2.5 bg-[#0068ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Đang tạo...' : 'Tạo nhóm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Incoming Call Modal */}
                <IncomingCallModal
                    open={showIncomingCallModal}
                    caller={incomingCall?.caller}
                    isVideoCall={incomingCall?.data?.isVideoCall || false}
                    onAccept={handleAcceptCall}
                    onReject={handleRejectCall}
                />

                {/* Active Call Modal */}
                <VideoCallModal
                    open={callModalOpen}
                    contact={activeCall?.caller || selectedContact}
                    isVideoCall={activeCall?.isVideoCall || false}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    onToggleAudio={handleToggleAudio}
                    onToggleVideo={handleToggleVideo}
                    isAudioEnabled={isAudioEnabled}
                    isVideoEnabled={isVideoEnabled}
                    callStatus={callStatus}
                    onClose={handleEndCall}
                />

                {/* Permission Guide Modal */}
                <PermissionGuideModal
                    open={showPermissionGuide}
                    onClose={() => {
                        setShowPermissionGuide(false);
                        setPendingCallAction(null);
                    }}
                    onRetry={handleRetryPermission}
                />
            </div>
        </ErrorBoundary>
    );
};

export default Home;
