// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    Alert,
    ScrollView,
    Linking,
} from 'react-native';

const EMOJI_LIST = [
    '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
    '😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗',
    '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥',
    '😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜',
    '😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️',
    '🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨',
    '😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵',
    '🤠','🥳','😷','🤒','🤕','🤢','🤧','🥴','😇','🤓',
    '🤡','👹','👺','💀','☠️','👻','👽','🤖','💩','😺',
    '👍','👎','👏','🙌','🤝','🤜','🤛','✊','👊','🤚',
    '✋','🖐','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
    '❤️‍🔥','💯','✅','❌','⭐','🔥','💥','🎉','🎊','🎈',
];

import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
    getChatHistory,
    getGroupChatHistory,
    connectWebSocket,
    sendMessage,
    sendGroupMessage,
    disconnectWebSocket,
    waitForWebSocketConnection,
    uploadFile,
    getPinnedMessages,
    pinMessage,
    unpinMessage,
    recallMessage,
    deleteMessage,
    editMessage,
    clearChatHistory,
    readMessage,
    sendTypingStatus,
    forwardMessage,
    searchMessages,
    sendCallSignal,
    updateTypingCallback,
} from '../../src/api/messageApi';
import { fetchFriendsList } from '../../src/api/user';
import { fetchUserGroups, fetchGroupMembers, fetchGroupDetail } from '../../src/api/groupApi';
import * as webrtcService from '../../src/services/webrtcService';
import localStorage from '../../src/utils/localStoragePolyfill';
import { updateConversationSetting, reportUser, reportGroup } from '../../src/api/conversationSettingsApi';
import { reactToMessage } from '../../src/api/messageApi';

// Import new components
import { MessageBubble, ChatInput, ChatHeader } from '../../src/components/chat';

// Import new hooks
import { useMessageReactions } from '../../src/hooks/useMessageReactions';
import { useInfiniteScroll } from '../../src/hooks/useInfiniteScroll';

function InlineVideo({ uri }: { uri: string }) {
    const player = useVideoPlayer(uri, (p) => { p.loop = false; });
    return (
        <View style={{ width: 240, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' }}>
            <VideoView
                player={player}
                style={{ width: 240, height: 135 }}
                allowsFullscreen
                allowsPictureInPicture
            />
        </View>
    );
}

const getAudioFileExtension = (message) => {
    const source = decodeURIComponent(
        String(message?.fileName || message?.content || '').toLowerCase(),
    );
    const match = source.match(/\.(m4a|mp4|aac|mp3|wav|caf|webm|ogg)(?:\?|$)/i);
    if (match?.[1]) return match[1].toLowerCase();
    return 'm4a';
};

// Tự động cuộn đến cuối danh sách (nếu lộn ngược thì end là đầu mảng)
export default function ChatScreen() {
    const { id, name, isPrivate } = useLocalSearchParams();
    const router = useRouter();

    const [messages, setMessages] = useState([]);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImages, setSelectedImages] = useState([]);
    const [actionMenuVisible, setActionMenuVisible] = useState(false);
    const [activeMessage, setActiveMessage] = useState(null);
    const [isPeerTyping, setIsPeerTyping] = useState(false);
    const [pinnedListVisible, setPinnedListVisible] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [messageToForward, setMessageToForward] = useState(null);
    const [forwardContacts, setForwardContacts] = useState([]);
    const [forwardLoading, setForwardLoading] = useState(false);
    const [searchBarVisible, setSearchBarVisible] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Edit message state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [messageToEdit, setMessageToEdit] = useState(null);

    // Reply state
    const [replyToMessage, setReplyToMessage] = useState(null);

    // Conversation settings state
    const [convSettingsVisible, setConvSettingsVisible] = useState(false);
    const [convSettings, setConvSettings] = useState({
        isPinned: false,
        isMuted: false,
        autoDeleteOption: 'off',
    });

    const userId = localStorage.getItem('userId');
    const token =
        localStorage.getItem('token') || localStorage.getItem('accessToken');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingRef = useRef(null);
    const recordTimerRef = useRef(null);
    const playbackSoundRef = useRef(null);
    const [playingAudioId, setPlayingAudioId] = useState(null);
    const [memberAvatarMap, setMemberAvatarMap] = useState<Record<string, string>>({});

    const flatListRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const hasSentTypingRef = useRef(false);
    const peerTypingTimeoutRef = useRef(null);

    // ✅ NEW: Setup custom hooks
    const { handleReaction: handleReactionHook, getReactions } = useMessageReactions(userId);
    const { loadMoreMessages, isLoadingMore, hasMoreHistory, resetPagination } = useInfiniteScroll(
        id,
        isPrivate === 'true',
        userId
    );

    // Lấy lịch sử tin nhắn khi mở trang chat
    const fetchHistory = useCallback(async () => {
        try {
            resetPagination(); // ✅ Reset pagination when loading new chat
            let data = [];
            if (isPrivate === 'true') {
                data = await getChatHistory(id, token);
            } else {
                data = await getGroupChatHistory(id, token);
            }

            const reversedData = Array.isArray(data) ? [...data].reverse() : [];
            setMessages(reversedData);
            // Đánh dấu đã đọc sau khi load
            setTimeout(() => markMessagesAsRead(reversedData), 800);
        } catch (error) {
            console.error('Loi lay lich su chat:', error);
        } finally {
            setIsLoading(false);
        }
    }, [id, isPrivate, token, markMessagesAsRead, resetPagination]);

    const fetchPinned = useCallback(async () => {
        try {
            const data = await getPinnedMessages(
                isPrivate === 'true' ? id : null,
                isPrivate === 'true' ? null : id,
                token,
            );
            setPinnedMessages(data || []);
        } catch (error) {
            console.error('Loi lay tin nhan ghim:', error);
        }
    }, [id, isPrivate, token]);

    const getMessageId = (msg) => msg?.id || msg?._id;

    const applyRecallLocal = useCallback((message) => {
        const targetId = getMessageId(message);
        if (!targetId) return;
        setMessages((prev) =>
            prev.map((m) =>
                getMessageId(m) === targetId
                    ? {
                          ...m,
                          recalled: true,
                          content:
                              message?.content || 'Tin nhắn đã được thu hồi',
                      }
                    : m,
            ),
        );
    }, []);

    const applyDeleteLocal = useCallback((message) => {
        const targetId = getMessageId(message);
        if (!targetId) return;

        const deletedMessageIds = JSON.parse(
            localStorage.getItem('deletedMessageIds') || '[]',
        );
        if (!deletedMessageIds.includes(targetId)) {
            deletedMessageIds.push(targetId);
            localStorage.setItem(
                'deletedMessageIds',
                JSON.stringify(deletedMessageIds),
            );
        }

        setMessages((prev) => prev.filter((m) => getMessageId(m) !== targetId));
    }, []);

    const applyPinLocal = useCallback(
        (message, pinned) => {
            const targetId = getMessageId(message);
            if (!targetId) return;

            setMessages((prev) =>
                prev.map((m) =>
                    getMessageId(m) === targetId
                        ? {
                              ...m,
                              isPinned: pinned,
                          }
                        : m,
                ),
            );

            fetchPinned();
        },
        [fetchPinned],
    );

    const emitTyping = useCallback(
        (typing) => {
            if (!token || !userId) return;
            sendTypingStatus(
                userId,
                isPrivate === 'true' ? id : null,
                isPrivate === 'true' ? null : id,
                typing,
                token,
            );
        },
        [id, isPrivate, token, userId],
    );

    const handleInputChange = useCallback(
        (text) => {
            setInputText(text);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }

            const hasText = Boolean(text?.trim());
            if (!hasText) {
                if (hasSentTypingRef.current) {
                    emitTyping(false);
                    hasSentTypingRef.current = false;
                }
                return;
            }

            if (!hasSentTypingRef.current) {
                emitTyping(true);
                hasSentTypingRef.current = true;
            }

            typingTimeoutRef.current = setTimeout(() => {
                emitTyping(false);
                hasSentTypingRef.current = false;
                typingTimeoutRef.current = null;
            }, 1200);
        },
        [emitTyping],
    );

    const closeActionMenu = () => {
        setActionMenuVisible(false);
        setActiveMessage(null);
    };

    const initiateCall = async (isVideo) => {
        if (isPrivate === 'true') {
            // ── 1-1 call ──
            try {
                webrtcService.initializePeerConnection(
                    (candidate) => { sendCallSignal('ice-candidate', candidate, id, token); },
                    () => {},
                );
                await webrtcService.startCall(isVideo);
                const offer = await webrtcService.createOffer();
                sendCallSignal('offer', { offer, isVideoCall: isVideo }, id, token);
                await webrtcService.enableIceProcessing();
                router.push({
                    pathname: '/call/active',
                    params: {
                        callerId: String(id),
                        callerName: String(name || ''),
                        callerAvatar: '',
                        isVideo: String(isVideo),
                        conversationId: String(id),
                        role: 'caller',
                    },
                });
            } catch (err) {
                webrtcService.endCall();
                Alert.alert('Lỗi', err.message || 'Không thể khởi tạo cuộc gọi.');
            }
        } else {
            // ── Group call ──
            try {
                // Fallback chain (khớp với FE): fetchUserGroups -> fetchGroupDetail -> fetchGroupMembers
                // Lý do: GET /group/{id} và /group/{id}/members có check teacher-role cho CLASS,
                // nên student gọi class chat sẽ bị 403. fetchUserGroups hoạt động cho mọi role.
                let rawMemberIds: any[] = [];

                try {
                    const userGroups = await fetchUserGroups(userId, token);
                    const currentGroup = Array.isArray(userGroups)
                        ? userGroups.find((g: any) => String(g.id || g._id) === String(id))
                        : null;
                    if (Array.isArray(currentGroup?.memberIds)) {
                        rawMemberIds = currentGroup.memberIds;
                    }
                } catch (e) {
                    console.log('fetchUserGroups fallback failed:', (e as any)?.message);
                }

                if (rawMemberIds.length === 0) {
                    try {
                        const groupDetail = await fetchGroupDetail(id, token);
                        if (Array.isArray(groupDetail?.memberIds)) {
                            rawMemberIds = groupDetail.memberIds;
                        } else if (Array.isArray(groupDetail?.members)) {
                            rawMemberIds = groupDetail.members;
                        }
                    } catch (e) {
                        console.log('fetchGroupDetail fallback failed:', (e as any)?.message);
                    }
                }

                if (rawMemberIds.length === 0) {
                    try {
                        const members = await fetchGroupMembers(id, token);
                        if (Array.isArray(members)) {
                            rawMemberIds = members;
                        }
                    } catch (e) {
                        console.log('fetchGroupMembers fallback failed:', (e as any)?.message);
                    }
                }

                const peerIds = rawMemberIds
                    .map((m: any) => typeof m === 'string' ? m : String(m.userId || m.id || m._id || ''))
                    .filter((pid: string) => pid && pid !== String(userId));

                console.log('[GroupCall] rawMemberIds=', rawMemberIds.length, 'peerIds=', peerIds.length, 'userId=', userId);

                if (peerIds.length === 0) {
                    Alert.alert('Thông báo', 'Không có thành viên nào trong nhóm để gọi.');
                    return;
                }

                await webrtcService.startGroupCall(isVideo);

                // Send offer to each member
                for (const peerId of peerIds) {
                    webrtcService.initializeGroupPeerConnection(
                        peerId,
                        (pid, candidate) => {
                            sendCallSignal('ice-candidate', { candidate, isGroupCall: true, groupId: id }, pid, token);
                        },
                        () => {},
                    );
                    const offer = await webrtcService.createGroupOffer(peerId);
                    sendCallSignal('offer', {
                        offer,
                        isVideoCall: isVideo,
                        isGroupCall: true,
                        groupId: id,
                        groupName: String(name || ''),
                        allMemberIds: peerIds,
                    }, peerId, token);
                    await webrtcService.enableGroupIceProcessing(peerId);
                }

                router.push({
                    pathname: '/call/group-active',
                    params: {
                        groupId: String(id),
                        groupName: String(name || ''),
                        isVideo: String(isVideo),
                        memberIds: JSON.stringify(peerIds),
                    },
                });
            } catch (err) {
                webrtcService.endGroupCall();
                Alert.alert('Lỗi', err.message || 'Không thể khởi tạo cuộc gọi nhóm.');
            }
        }
    };

    const handleAudioCall = () => initiateCall(false);
    const handleVideoCall = () => initiateCall(true);

    const handleOpenInfo = () => {
        if (isPrivate !== 'true') {
            router.push(`/group/settings?id=${id}`);
            return;
        }

        router.push({
            pathname: '/chat/info',
            params: {
                id: String(id || ''),
                name: String(name || ''),
            },
        });
    };

    const handleOpenPinnedList = () => {
        if (!pinnedMessages?.length) return;
        setPinnedListVisible(true);
    };

    const jumpToPinnedMessage = (msg) => {
        const targetId = String(getMessageId(msg) || '');
        if (!targetId) return;

        const index = messages.findIndex(
            (m) => String(getMessageId(m) || '') === targetId,
        );

        if (index >= 0 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true });
        }
        setPinnedListVisible(false);
    };

    useEffect(() => {
        if (!token || !userId) return;

        fetchHistory();
        fetchPinned();

        const onMessageReceived = (newMessage) => {
            setMessages((prev) => {
                // Tránh duplicate nếu message đã tồn tại
                if (prev.find((m) => m.id === newMessage.id)) return prev;
                // Nếu tempKey khớp → thay thế tin nhắn tạm bằng tin thật
                if (newMessage.tempKey) {
                    const hasTempMatch = prev.find((m) => m.tempKey === newMessage.tempKey);
                    if (hasTempMatch) {
                        return prev.map((m) => m.tempKey === newMessage.tempKey ? newMessage : m);
                    }
                }
                // Nếu là tin nhắn của chính mình → xóa tin nhắn tạm có cùng nội dung (gửi gần đây)
                if (String(newMessage.senderId) === String(userId)) {
                    const now = Date.now();
                    const filtered = prev.filter((m) => {
                        if (!String(m.id || '').startsWith('temp-')) return true;
                        const msgTime = new Date(m.createAt || 0).getTime();
                        const sameContent = m.content === newMessage.content;
                        const isRecent = (now - msgTime) < 10000;
                        return !(sameContent && isRecent);
                    });
                    return [newMessage, ...filtered];
                }
                return [newMessage, ...prev];
            });
        };

        const onDeleteReceived = (deletedMessage) => {
            applyDeleteLocal(deletedMessage);
        };

        const onRecallReceived = (recalledMessage) => {
            applyRecallLocal(recalledMessage);
        };

        const onPinReceived = (pinnedMessage) => {
            applyPinLocal(pinnedMessage, true);
        };

        const onUnpinReceived = (unpinnedMessage) => {
            applyPinLocal(unpinnedMessage, false);
        };

        const onTypingReceived = (typingEvent) => {
            if (!typingEvent?.senderId) return;
            if (String(typingEvent.senderId) === String(userId)) return;

            const currentConversationId = String(id);
            const typingConversationId = String(
                typingEvent.groupId || typingEvent.senderId,
            );
            if (typingConversationId !== currentConversationId) return;

            setIsPeerTyping(Boolean(typingEvent.typing));

            if (peerTypingTimeoutRef.current) {
                clearTimeout(peerTypingTimeoutRef.current);
                peerTypingTimeoutRef.current = null;
            }

            if (typingEvent.typing) {
                peerTypingTimeoutRef.current = setTimeout(() => {
                    setIsPeerTyping(false);
                    peerTypingTimeoutRef.current = null;
                }, 2500);
            }
        };

        const groupIds = isPrivate === 'true' ? [] : [id];

        const onCallSignalReceived = (signal) => {
            if (!signal) return;
            const { type, data, senderId } = signal;
            const isGroupSignal = Boolean(data?.isGroupCall);

            if (type === 'offer' && data?.offer) {
                if (isGroupSignal) {
                    // Group call offer — navigate to incoming with group context
                    router.push({
                        pathname: '/call/incoming',
                        params: {
                            callerId: String(senderId || ''),
                            callerName: String(data.callerName || data.groupName || name || 'Nhóm'),
                            callerAvatar: data.groupAvatar || '',
                            isVideo: String(data.isVideoCall || false),
                            conversationId: String(data.groupId || id),
                            offer: JSON.stringify(data.offer),
                            isGroupCall: 'true',
                            groupId: String(data.groupId || id),
                            groupName: String(data.groupName || data.callerName || name || ''),
                            allMemberIds: JSON.stringify(data.allMemberIds || []),
                        },
                    });
                } else {
                    // 1-1 call offer
                    router.push({
                        pathname: '/call/incoming',
                        params: {
                            callerId: String(senderId || ''),
                            callerName: String(name || ''),
                            callerAvatar: '',
                            isVideo: String(data.isVideoCall || data.isVideo || false),
                            conversationId: String(id),
                            offer: JSON.stringify(data.offer),
                        },
                    });
                }
            } else if (type === 'answer' || type === 'ice-candidate') {
                // Routed to active screen via registerCallSignalHandler (group-active or active)
            } else if (type === 'call-reject' || type === 'call-end' || type === 'call-cancel') {
                if (isGroupSignal) {
                    webrtcService.endGroupCall();
                } else {
                    webrtcService.endCall();
                }
            }
        };

        connectWebSocket(
            token,
            userId,
            onMessageReceived,
            onDeleteReceived,
            onRecallReceived,
            onPinReceived,
            onUnpinReceived,
            groupIds,
            () => {},
            // onEditCallback: cập nhật tin nhắn đã chỉnh sửa
            (editedMessage) => {
                const targetId = getMessageId(editedMessage);
                if (!targetId) return;
                setMessages((prev) =>
                    prev.map((m) =>
                        getMessageId(m) === targetId
                            ? { ...m, content: editedMessage.content, isEdited: true }
                            : m,
                    ),
                );
            },
            () => {},
            onCallSignalReceived,
            () => {},
            () => {},
            () => {},
            () => {},
            () => {},
            () => {},
            onTypingReceived,
        ).catch((err) => console.error('Lỗi Socket', err));

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            if (peerTypingTimeoutRef.current) {
                clearTimeout(peerTypingTimeoutRef.current);
                peerTypingTimeoutRef.current = null;
            }
            if (hasSentTypingRef.current) {
                emitTyping(false);
                hasSentTypingRef.current = false;
            }
            setIsPeerTyping(false);
        };
    }, [
        applyDeleteLocal,
        applyPinLocal,
        applyRecallLocal,
        emitTyping,
        fetchHistory,
        fetchPinned,
        id,
        isPrivate,
        markMessagesAsRead,
        token,
        userId,
    ]);

    useEffect(() => {
        if (isPrivate === 'true' || !id || !token) return;
        fetchGroupMembers(id, token)
            .then((rawMembers) => {
                const members = Array.isArray(rawMembers) ? rawMembers
                    : Array.isArray(rawMembers?.content) ? rawMembers.content
                    : Array.isArray(rawMembers?.data) ? rawMembers.data : [];
                const map: Record<string, string> = {};
                members.forEach((m) => {
                    const uid = String(m.userId || m.id || m._id || '');
                    const avatar = m.avatar || m.avatarUrl || m.profilePicture || '';
                    if (uid) map[uid] = avatar;
                });
                setMemberAvatarMap(map);
            })
            .catch(() => {});
    }, [id, isPrivate, token]);

    useEffect(() => {
        const handler = (typingEvent) => {
            if (!typingEvent?.senderId) return;
            if (String(typingEvent.senderId) === String(userId)) return;
            const conversationId = String(id);
            const typingConvId = String(typingEvent.groupId || typingEvent.senderId);
            if (typingConvId !== conversationId) return;
            setIsPeerTyping(Boolean(typingEvent.typing));
            if (peerTypingTimeoutRef.current) {
                clearTimeout(peerTypingTimeoutRef.current);
                peerTypingTimeoutRef.current = null;
            }
            if (typingEvent.typing) {
                peerTypingTimeoutRef.current = setTimeout(() => {
                    setIsPeerTyping(false);
                    peerTypingTimeoutRef.current = null;
                }, 2500);
            }
        };
        updateTypingCallback(handler);
        return () => updateTypingCallback(null);
    }, [id, userId]);

    const handleEmojiSelect = (emoji: string) => {
        setInputText((prev) => prev + emoji);
    };

    const stopAudioPlayback = useCallback(async () => {
        if (!playbackSoundRef.current) return;
        try {
            await playbackSoundRef.current.stopAsync();
            await playbackSoundRef.current.unloadAsync();
        } catch (_error) {
            // Ignore cleanup failures from already-unloaded sounds.
        } finally {
            playbackSoundRef.current = null;
            setPlayingAudioId(null);
        }
    }, []);

    const playAudioMessage = useCallback(
        async (message) => {
            const audioUrl = message?.content;
            const messageId = getMessageId(message);
            if (!audioUrl || !messageId) return;

            if (String(playingAudioId) === String(messageId)) {
                await stopAudioPlayback();
                return;
            }

            await stopAudioPlayback();

            const playUri = async (uri) => {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });

                const { sound } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true },
                );
                playbackSoundRef.current = sound;
                setPlayingAudioId(messageId);
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status?.didJustFinish) {
                        stopAudioPlayback();
                    }
                });
            };

            try {
                await playUri(audioUrl);
            } catch (error) {
                try {
                    const extension = getAudioFileExtension(message);
                    if (extension === 'webm' || extension === 'ogg') {
                        throw error;
                    }

                    const safeMessageId = String(messageId).replace(
                        /[^a-zA-Z0-9_-]/g,
                        '',
                    );
                    const localFile = new File(
                        Paths.cache,
                        `voice-${safeMessageId}.${extension}`,
                    );
                    if (!localFile.exists) {
                        await File.downloadFileAsync(audioUrl, localFile, {
                            idempotent: true,
                        });
                    }
                    await playUri(localFile.uri);
                } catch (fallbackError) {
                    console.error('Play audio message error:', fallbackError);
                    const extension = getAudioFileExtension(message);
                    const isUnsupportedWebFormat =
                        extension === 'webm' || extension === 'ogg';
                    Alert.alert(
                        'Lỗi',
                        isUnsupportedWebFormat
                            ? 'iPhone không hỗ trợ định dạng ghi âm WebM/OGG. Cần gửi voice dạng m4a/mp3 hoặc backend chuyển mã âm thanh.'
                            : 'Không thể phát tin nhắn thoại',
                    );
                    await stopAudioPlayback();
                }
            }
        },
        [playingAudioId, stopAudioPlayback],
    );

    useEffect(() => {
        return () => {
            stopAudioPlayback();
        };
    }, [stopAudioPlayback]);

    const handleOpenForward = async (message) => {
        setMessageToForward(message);
        setForwardModalVisible(true);
        setForwardLoading(true);
        try {
            const [friends, groups] = await Promise.all([
                fetchFriendsList(),
                fetchUserGroups(userId, token),
            ]);
            const friendContacts = (friends || []).map((f) => ({
                id: f.id || f._id,
                name: `${f.firstName || ''} ${f.lastName || ''}`.trim(),
                avatar: f.avatar,
                isGroup: false,
            }));
            const groupContacts = (groups || [])
                .filter((g) => g.isGroup)
                .map((g) => ({
                    id: g.id || g._id,
                    name: g.name,
                    avatar: g.avatar,
                    isGroup: true,
                }));
            setForwardContacts([...friendContacts, ...groupContacts]);
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể tải danh sách liên hệ');
        } finally {
            setForwardLoading(false);
        }
    };

    const handleSearch = async (keyword) => {
        setSearchKeyword(keyword);
        if (!keyword.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchMessages(
                userId,
                isPrivate === 'true' ? id : null,
                isPrivate === 'true' ? null : id,
                keyword.trim(),
                token,
            );
            setSearchResults(results || []);
        } catch (e) {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleForwardMessage = (contact) => {
        if (!messageToForward) return;
        const msgId = getMessageId(messageToForward);
        const success = forwardMessage(
            msgId,
            userId,
            contact.isGroup ? null : contact.id,
            contact.isGroup ? contact.id : null,
            messageToForward.content,
            token,
        );
        setForwardModalVisible(false);
        setMessageToForward(null);
        if (success) {
            Alert.alert('Thành công', `Đã chuyển tiếp đến ${contact.name}`);
        } else {
            Alert.alert('Lỗi', 'Không thể chuyển tiếp, WebSocket chưa kết nối');
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            selectionLimit: 3,
        });

        if (!result.canceled) {
            setSelectedImages((prev) => [...prev, ...result.assets]);
        }
    };

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const file = result.assets[0];
            // BE upload-file endpoint sẽ tự tạo message và gửi WebSocket notification
            await uploadFile(
                [{ uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' }],
                isPrivate === 'true' ? id : null,
                token,
                isPrivate === 'true' ? null : id,
            );
        } catch (e) {
            console.error('Upload file error:', e);
            Alert.alert('Lỗi', 'Không thể gửi file');
        }
    };

    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
            );
            recordingRef.current = recording;
            setIsRecording(true);
            setRecordingDuration(0);
            recordTimerRef.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể ghi âm. Vui lòng cấp quyền microphone.');
        }
    };

    const stopRecording = async () => {
        if (!recordingRef.current) return;
        clearInterval(recordTimerRef.current);
        setIsRecording(false);
        setRecordingDuration(0);
        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;
            if (!uri) return;
            // BE upload-file endpoint sẽ tự tạo message và gửi WebSocket notification
            await uploadFile(
                [{ uri, name: `voice_${Date.now()}.m4a`, type: 'audio/m4a' }],
                isPrivate === 'true' ? id : null,
                token,
                isPrivate === 'true' ? null : id,
            );
        } catch (e) {
            console.error('Upload voice error:', e);
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn thoại');
        }
    };

    const handleLongPressMessage = (message) => {
        if (
            !getMessageId(message) ||
            String(getMessageId(message)).startsWith('temp-')
        ) {
            return;
        }
        setActiveMessage(message);
        setActionMenuVisible(true);
    };

    const handleTogglePin = async () => {
        if (!activeMessage) return;
        const messageId = getMessageId(activeMessage);
        const pinned = pinnedMessages.some(
            (m) => String(getMessageId(m)) === String(messageId),
        );
        const success = pinned
            ? await unpinMessage(messageId, userId, token)
            : await pinMessage(messageId, userId, token);

        if (!success) {
            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái ghim');
            return;
        }

        applyPinLocal(activeMessage, !pinned);
        closeActionMenu();
    };

    const handleRecall = async () => {
        if (!activeMessage) return;
        const messageId = getMessageId(activeMessage);
        const success = await recallMessage(messageId, userId, token);
        if (!success) {
            Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
            return;
        }

        applyRecallLocal({
            ...activeMessage,
            content: 'Tin nhắn đã được thu hồi',
        });
        closeActionMenu();
    };

    const handleDelete = async () => {
        if (!activeMessage) return;
        const messageId = getMessageId(activeMessage);
        const success = await deleteMessage(messageId, userId, token);
        if (!success) {
            Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
            return;
        }

        applyDeleteLocal(activeMessage);
        closeActionMenu();
    };

    // Mở modal chỉnh sửa tin nhắn
    const handleOpenEdit = () => {
        if (!activeMessage || activeMessage.recalled) return;
        setMessageToEdit(activeMessage);
        setEditContent(activeMessage.content || '');
        setEditModalVisible(true);
        closeActionMenu();
    };

    // Gửi chỉnh sửa tin nhắn qua WebSocket
    const handleSubmitEdit = async () => {
        if (!messageToEdit || !editContent.trim()) return;
        const messageId = getMessageId(messageToEdit);
        const success = await editMessage(
            messageId,
            userId,
            editContent.trim(),
            isPrivate === 'true' ? null : id,
            token,
        );
        if (!success) {
            Alert.alert('Lỗi', 'Không thể chỉnh sửa tin nhắn');
            return;
        }
        // Cập nhật local ngay lập tức
        setMessages((prev) =>
            prev.map((m) =>
                getMessageId(m) === messageId
                    ? { ...m, content: editContent.trim(), isEdited: true }
                    : m,
            ),
        );
        setEditModalVisible(false);
        setMessageToEdit(null);
        setEditContent('');
    };

    // Xóa toàn bộ lịch sử chat
    const handleClearHistory = () => {
        Alert.alert(
            'Xóa lịch sử trò chuyện',
            'Bạn có chắc muốn xóa toàn bộ lịch sử tin nhắn? Hành động này không thể hoàn tác.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearChatHistory(
                                isPrivate === 'true' ? id : null,
                                isPrivate === 'true' ? null : id,
                                token,
                            );
                            setMessages([]);
                            setPinnedMessages([]);
                        } catch (e) {
                            Alert.alert('Lỗi', 'Không thể xóa lịch sử trò chuyện');
                        }
                    },
                },
            ],
        );
    };

    // Đánh dấu tin nhắn đã đọc khi mở chat
    const markMessagesAsRead = useCallback((msgs: any[]) => {
        if (!token || !userId) return;
        const unread = msgs.filter(
            (m) => m.senderId !== userId && !m.isRead && m.id,
        );
        unread.forEach((m) => {
            readMessage(m.id, m.senderId, userId, token);
        });
    }, [token, userId]);

    // Cập nhật conversation setting (pin, mute, auto-delete)
    const handleUpdateConvSetting = async (updates: Record<string, any>) => {
        try {
            await updateConversationSetting(String(id), updates, token);
            setConvSettings((prev) => ({ ...prev, ...updates }));
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể cập nhật cài đặt cuộc trò chuyện');
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() && selectedImages.length === 0) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        if (hasSentTypingRef.current) {
            emitTyping(false);
            hasSentTypingRef.current = false;
        }

        const tempKey = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const messagePayload = {
            senderId: userId,
            content: inputText.trim() || 'Ảnh đính kèm',
            type: selectedImages.length > 0 ? 'IMAGE' : 'TEXT',
            tempKey: tempKey,
        };

        if (isPrivate === 'true') {
            messagePayload.receiverId = id;
        } else {
            messagePayload.groupId = id;
        }

        // Gửi replyToMessageId nếu đang reply
        if (replyToMessage) {
            messagePayload.replyToMessageId = getMessageId(replyToMessage);
        }

        const optimisticMessage = {
            ...messagePayload,
            id: `temp-${tempKey}`,
            createAt: new Date().toISOString(),
            localImages: selectedImages, // hiển thị tạm
        };
        setMessages((prev) => [optimisticMessage, ...prev]);
        setInputText('');
        const imagesToUpload = [...selectedImages];
        setSelectedImages([]);
        const replyId = replyToMessage ? getMessageId(replyToMessage) : null;
        setReplyToMessage(null);
        try {
            const ready = await waitForWebSocketConnection(15000);
            if (!ready) {
                Alert.alert('Lỗi', 'Kết nối realtime chưa sẵn sàng, thử lại sau');
                return;
            }
            if (imagesToUpload.length > 0) {
                // React Native FormData uses URI object format, not browser File
                const files = imagesToUpload.map((img, idx) => ({
                    uri: img.uri,
                    name: `image_${idx}.jpg`,
                    type: img.mimeType || 'image/jpeg',
                }));
                await uploadFile(
                    files,
                    isPrivate === 'true' ? id : null,
                    token,
                    isPrivate === 'true' ? null : id,
                    replyId,
                );
            } else {
                if (isPrivate === 'true') {
                    sendMessage('/app/chat.send', messagePayload, token);
                } else {
                    sendGroupMessage('/app/chat.group.send', messagePayload, token);
                }
            }
        } catch (error) {
            console.error('Lỗi khi gửi:', error);
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = String(item.senderId) === String(userId);
        const messageText = item.recalled
            ? 'Tin nhắn đã được thu hồi'
            : item.content || 'Tin nhắn';

        return (
            <View
                style={[
                    styles.messageWrapper,
                    isMe ? styles.myMessageWrapper : styles.theirMessageWrapper,
                ]}
            >
                {!isMe && (
                    <View style={styles.avatarMini}>
                        {memberAvatarMap[String(item.senderId)] ? (
                            <Image
                                source={{ uri: memberAvatarMap[String(item.senderId)] }}
                                style={{ width: 32, height: 32, borderRadius: 16 }}
                            />
                        ) : (
                            <Text style={styles.avatarMiniText}>
                                {String(item.senderName || '?')[0]?.toUpperCase() || '?'}
                            </Text>
                        )}
                    </View>
                )}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onLongPress={() => handleLongPressMessage(item)}
                    delayLongPress={260}
                    style={[
                        styles.messageBubble,
                        isMe
                            ? styles.myMessageBubble
                            : styles.theirMessageBubble,
                    ]}
                >
                    {item.isPinned && (
                        <View style={styles.pinnedTag}>
                            <MaterialIcons
                                name="push-pin"
                                size={12}
                                color={isMe ? '#d1fae5' : '#059669'}
                            />
                            <Text
                                style={[
                                    styles.pinnedTagText,
                                    isMe
                                        ? styles.myPinnedTagText
                                        : styles.theirPinnedTagText,
                                ]}
                            >
                                Đã ghim
                            </Text>
                        </View>
                    )}
                    {!item.recalled && item.type === 'IMAGE' && (
                        <View style={styles.imageGallery}>
                            {item.localImages ? (
                                item.localImages.map((img, idx) => (
                                    <Image
                                        key={idx}
                                        source={{ uri: img.uri }}
                                        style={styles.chatImage}
                                    />
                                ))
                            ) : item.content &&
                              item.content.startsWith('http') ? (
                                <Image
                                    source={{ uri: item.content }}
                                    style={styles.chatImage}
                                />
                            ) : null}
                        </View>
                    )}

                    {!item.recalled && item.type === 'ASSIGNMENT' && (
                        <View style={styles.assignmentCard}>
                            <MaterialIcons
                                name="assignment"
                                size={24}
                                color="#047857"
                                style={{ marginBottom: 4 }}
                            />
                            <Text style={styles.assignmentTitle}>
                                Bài tập mới
                            </Text>
                            <Text style={styles.assignmentText}>
                                {item.content || 'Nội dung bài tập'}
                            </Text>
                        </View>
                    )}

                    {!item.recalled && item.type === 'POLL' && (
                        <View style={styles.assignmentCard}>
                            <MaterialIcons
                                name="poll"
                                size={24}
                                color="#047857"
                                style={{ marginBottom: 4 }}
                            />
                            <Text style={styles.assignmentTitle}>
                                Cuộc bình chọn
                            </Text>
                            <Text style={styles.assignmentText}>
                                {item.content || 'Bình chọn'}
                            </Text>
                        </View>
                    )}

                    {!item.recalled && (item.type === 'FILE' || item.type === 'DOCUMENT') && (
                        <TouchableOpacity
                            style={styles.fileCard}
                            onPress={() => item.content && Linking.openURL(item.content)}
                            activeOpacity={0.75}
                        >
                            <MaterialIcons
                                name="insert-drive-file"
                                size={32}
                                color="#10b981"
                            />
                            <Text style={styles.fileText} numberOfLines={2}>
                                {item.content
                                    ? item.content.split('/').pop()
                                    : 'Tài liệu đính kèm'}
                            </Text>
                            <MaterialIcons name="open-in-new" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                    )}

                    {!item.recalled && item.type === 'VIDEO' && item.content && (
                        <InlineVideo uri={item.content} />
                    )}

                    {!item.recalled && (item.type === 'AUDIO' || item.type === 'VOICE') && item.content && (
                        <TouchableOpacity
                            style={styles.fileCard}
                            onPress={() => playAudioMessage(item)}
                            activeOpacity={0.75}
                        >
                            <MaterialIcons
                                name={
                                    String(playingAudioId) === String(getMessageId(item))
                                        ? 'pause-circle-filled'
                                        : 'play-circle-filled'
                                }
                                size={28}
                                color="#10b981"
                            />
                            <Text style={styles.fileText}>Tin nhắn thoại</Text>
                            <MaterialIcons name="mic" size={22} color="#10b981" />
                        </TouchableOpacity>
                    )}

                    {/* Render Content if it's purely text */}
                    {(item.recalled || ![
                        'IMAGE',
                        'ASSIGNMENT',
                        'POLL',
                        'FILE',
                        'DOCUMENT',
                        'VIDEO',
                        'AUDIO',
                        'VOICE',
                    ].includes(item.type)) && (() => {
                        if (item.recalled) {
                            return (
                                <View style={styles.recalledContainer}>
                                    <MaterialIcons
                                        name="block"
                                        size={14}
                                        color={isMe ? '#d1fae5' : '#9ca3af'}
                                    />
                                    <Text
                                        style={[
                                            styles.messageText,
                                            isMe
                                                ? styles.myMessageText
                                                : styles.theirMessageText,
                                            styles.recalledText,
                                            isMe && styles.myRecalledText,
                                        ]}
                                    >
                                        {messageText}
                                    </Text>
                                </View>
                            );
                        }
                        const isVideoUrl = item.content &&
                            (item.content.includes('/video/upload/') ||
                             /\.(mp4|mov|avi|mkv|webm)(\?|$)/i.test(item.content));
                        if (isVideoUrl) {
                            return <InlineVideo uri={item.content} />;
                        }
                        return (
                            <Text
                                style={[
                                    styles.messageText,
                                    isMe
                                        ? styles.myMessageText
                                        : styles.theirMessageText,
                                ]}
                            >
                                {messageText}
                            </Text>
                        );
                    })()}

                    <Text
                        style={[
                            styles.timeText,
                            isMe ? styles.myTimeText : styles.theirTimeText,
                        ]}
                    >
                        {new Date(
                            item.createAt || Date.now(),
                        ).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                    {item.isEdited && (
                        <Text style={[styles.editedTag, isMe ? { color: '#d1fae5' } : {}]}>
                            (đã chỉnh sửa)
                        </Text>
                    )}
                    {/* Read receipt - chỉ hiện cho tin nhắn của mình */}
                    {isMe && item.isRead && (
                        <MaterialIcons name="done-all" size={14} color={isMe ? '#d1fae5' : '#10b981'} style={{ alignSelf: 'flex-end' }} />
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={0}
        >
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {name}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {isPrivate === 'true'
                            ? isPeerTyping
                                ? 'Đang nhập...'
                                : 'Đang hoạt động'
                            : isPeerTyping
                              ? 'Có người đang nhập...'
                              : 'Nhóm chat'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={handleVideoCall}
                >
                    <MaterialIcons name="videocam" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={handleAudioCall}
                >
                    <MaterialIcons name="call" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={() => {
                        setSearchBarVisible((v) => !v);
                        setSearchKeyword('');
                        setSearchResults([]);
                    }}
                >
                    <MaterialIcons name="search" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={() => setConvSettingsVisible(true)}
                >
                    <MaterialIcons name="more-vert" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {searchBarVisible && (
                <View style={styles.searchBar}>
                    <MaterialIcons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm tin nhắn..."
                        value={searchKeyword}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                    {isSearching && <ActivityIndicator size="small" color="#10b981" />}
                    <TouchableOpacity onPress={() => { setSearchBarVisible(false); setSearchKeyword(''); setSearchResults([]); }}>
                        <MaterialIcons name="close" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>
            )}

            {searchBarVisible && searchResults.length > 0 && (
                <View style={styles.searchResultsBox}>
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => String(getMessageId(item))}
                        style={{ maxHeight: 220 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchResultItem}
                                onPress={() => {
                                    const idx = messages.findIndex(
                                        (m) => String(getMessageId(m)) === String(getMessageId(item)),
                                    );
                                    if (idx >= 0) flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                                    setSearchBarVisible(false);
                                    setSearchResults([]);
                                    setSearchKeyword('');
                                }}
                            >
                                <MaterialIcons name="chat-bubble-outline" size={16} color="#10b981" />
                                <Text style={styles.searchResultText} numberOfLines={2}>
                                    {item.content || 'Đính kèm'}
                                </Text>
                                <Text style={styles.searchResultTime}>
                                    {new Date(item.createAt || Date.now()).toLocaleDateString()}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {searchBarVisible && !isSearching && searchKeyword.trim().length > 0 && searchResults.length === 0 && (
                <View style={styles.searchResultsBox}>
                    <Text style={styles.pinnedEmptyText}>Không tìm thấy tin nhắn nào</Text>
                </View>
            )}

            {pinnedMessages && pinnedMessages.length > 0 && (
                <TouchableOpacity
                    style={styles.pinnedBar}
                    activeOpacity={0.8}
                    onPress={handleOpenPinnedList}
                >
                    <MaterialIcons name="push-pin" size={20} color="#10b981" />
                    <View style={styles.pinnedContent}>
                        <Text style={styles.pinnedTitle}>Tin nhắn đã ghim</Text>
                        <Text style={styles.pinnedText} numberOfLines={1}>
                            {pinnedMessages[0].content || 'Đính kèm'}
                        </Text>
                    </View>
                    <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color="#9ca3af"
                    />
                </TouchableOpacity>
            )}

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id?.toString() || item.tempKey}
                    renderItem={renderMessage}
                    inverted
                    onScrollToIndexFailed={({ index }) => {
                        const safeIndex = Math.max(0, index - 1);
                        setTimeout(() => {
                            flatListRef.current?.scrollToIndex({
                                index: safeIndex,
                                animated: true,
                            });
                        }, 250);
                    }}
                    contentContainerStyle={styles.messageList}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <>
                {/* Reply bar */}
                {replyToMessage && (
                    <View style={styles.replyBar}>
                        <MaterialIcons name="reply" size={16} color="#10b981" />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.replyBarLabel}>Trả lời</Text>
                            <Text style={styles.replyBarContent} numberOfLines={1}>
                                {replyToMessage.content || 'Đính kèm'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setReplyToMessage(null)}>
                            <MaterialIcons name="close" size={18} color="#6b7280" />
                        </TouchableOpacity>
                    </View>
                )}

                {selectedImages.length > 0 && (
                    <View style={styles.previewContainer}>
                        {selectedImages.map((img, idx) => (
                            <View key={idx} style={styles.previewItem}>
                                <Image
                                    source={{ uri: img.uri }}
                                    style={styles.previewImage}
                                />
                                <TouchableOpacity
                                    style={styles.removePreviewBtn}
                                    onPress={() =>
                                        setSelectedImages((prev) =>
                                            prev.filter((_, i) => i !== idx),
                                        )
                                    }
                                >
                                    <MaterialIcons
                                        name="cancel"
                                        size={20}
                                        color="#ef4444"
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {showEmojiPicker && (
                    <View style={styles.emojiPanel}>
                        <ScrollView
                            horizontal={false}
                            showsVerticalScrollIndicator={false}
                            style={{ maxHeight: 180 }}
                        >
                            <View style={styles.emojiGrid}>
                                {EMOJI_LIST.map((emoji, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.emojiBtn}
                                        onPress={() => handleEmojiSelect(emoji)}
                                    >
                                        <Text style={styles.emojiText}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
                        <MaterialIcons name="add-photo-alternate" size={24} color="#6b7280" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.attachBtn} onPress={pickFile}>
                        <MaterialIcons name="attach-file" size={24} color="#6b7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.attachBtn}
                        onPress={() => setShowEmojiPicker((v) => !v)}
                    >
                        <MaterialIcons
                            name="emoji-emotions"
                            size={24}
                            color={showEmojiPicker ? '#10b981' : '#6b7280'}
                        />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.textInput}
                        placeholder="Nhập tin nhắn..."
                        value={inputText}
                        onChangeText={handleInputChange}
                        multiline
                        onFocus={() => setShowEmojiPicker(false)}
                    />

                    {!inputText.trim() && selectedImages.length === 0 ? (
                        <TouchableOpacity
                            style={styles.attachBtn}
                            onPressIn={startRecording}
                            onPressOut={stopRecording}
                        >
                            <MaterialIcons
                                name="mic"
                                size={26}
                                color={isRecording ? '#ef4444' : '#6b7280'}
                            />
                            {isRecording && (
                                <Text style={{ fontSize: 10, color: '#ef4444' }}>
                                    {recordingDuration}s
                                </Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.sendBtn, !inputText.trim() && selectedImages.length === 0 && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={!inputText.trim() && selectedImages.length === 0}
                        >
                            <MaterialIcons
                                name="send"
                                size={24}
                                color={inputText.trim() || selectedImages.length > 0 ? '#10b981' : '#9ca3af'}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </>

            <Modal
                visible={actionMenuVisible}
                transparent
                animationType="fade"
                onRequestClose={closeActionMenu}
            >
                <Pressable style={styles.menuOverlay} onPress={closeActionMenu}>
                    <View style={styles.menuCard}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleTogglePin}
                        >
                            <MaterialIcons
                                name={
                                    pinnedMessages.some(
                                        (m) => String(getMessageId(m)) === String(getMessageId(activeMessage)),
                                    )
                                        ? 'push-pin'
                                        : 'flag'
                                }
                                size={18}
                                color="#111827"
                            />
                            <Text style={styles.menuItemText}>
                                {pinnedMessages.some(
                                    (m) => String(getMessageId(m)) === String(getMessageId(activeMessage)),
                                )
                                    ? 'Bỏ ghim tin nhắn'
                                    : 'Ghim tin nhắn'}
                            </Text>
                        </TouchableOpacity>

                        {String(activeMessage?.senderId) === String(userId) && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleRecall}
                            >
                                <MaterialIcons
                                    name="undo"
                                    size={18}
                                    color="#111827"
                                />
                                <Text style={styles.menuItemText}>Thu hồi</Text>
                            </TouchableOpacity>
                        )}

                        {/* Edit - chỉ cho tin nhắn của mình, chưa thu hồi, là TEXT */}
                        {String(activeMessage?.senderId) === String(userId) &&
                            !activeMessage?.recalled &&
                            (!activeMessage?.type || activeMessage?.type === 'TEXT') && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleOpenEdit}
                            >
                                <MaterialIcons name="edit" size={18} color="#111827" />
                                <Text style={styles.menuItemText}>Chỉnh sửa</Text>
                            </TouchableOpacity>
                        )}

                        {/* Reply */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setReplyToMessage(activeMessage);
                                closeActionMenu();
                            }}
                        >
                            <MaterialIcons name="reply" size={18} color="#111827" />
                            <Text style={styles.menuItemText}>Trả lời</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                closeActionMenu();
                                handleOpenForward(activeMessage);
                            }}
                        >
                            <MaterialIcons name="forward" size={18} color="#111827" />
                            <Text style={styles.menuItemText}>Chuyển tiếp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleDelete}
                        >
                            <MaterialIcons
                                name="delete-outline"
                                size={18}
                                color="#ef4444"
                            />
                            <Text
                                style={[
                                    styles.menuItemText,
                                    styles.menuDangerText,
                                ]}
                            >
                                Xóa tin nhắn
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* Modal chuyển tiếp tin nhắn */}
            <Modal
                visible={forwardModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setForwardModalVisible(false)}
            >
                <Pressable
                    style={styles.menuOverlay}
                    onPress={() => setForwardModalVisible(false)}
                >
                    <Pressable style={[styles.menuCard, { maxHeight: '75%' }]} onPress={() => {}}>
                        <View style={styles.pinnedListHeader}>
                            <Text style={styles.pinnedListTitle}>Chuyển tiếp đến</Text>
                            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        {forwardLoading ? (
                            <ActivityIndicator size="large" color="#10b981" style={{ padding: 24 }} />
                        ) : (
                            <FlatList
                                data={forwardContacts}
                                keyExtractor={(item) => String(item.id)}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.forwardItem}
                                        onPress={() => handleForwardMessage(item)}
                                    >
                                        <View style={styles.forwardAvatar}>
                                            {item.avatar ? (
                                                <Image source={{ uri: item.avatar }} style={styles.forwardAvatarImg} />
                                            ) : (
                                                <Text style={styles.forwardAvatarText}>
                                                    {item.isGroup ? '👥' : (item.name?.charAt(0) || '?').toUpperCase()}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.forwardName}>
                                                {item.isGroup ? `[Nhóm] ${item.name}` : item.name}
                                            </Text>
                                        </View>
                                        <MaterialIcons name="send" size={20} color="#10b981" />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.pinnedEmptyText}>Không có liên hệ nào</Text>
                                }
                            />
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Modal chỉnh sửa tin nhắn */}
            <Modal
                visible={editModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => { setEditModalVisible(false); setMessageToEdit(null); }}
            >
                <Pressable
                    style={styles.menuOverlay}
                    onPress={() => { setEditModalVisible(false); setMessageToEdit(null); }}
                >
                    <Pressable style={[styles.menuCard, { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }]} onPress={() => {}}>
                        <View style={styles.pinnedListHeader}>
                            <Text style={styles.pinnedListTitle}>Chỉnh sửa tin nhắn</Text>
                            <TouchableOpacity onPress={() => { setEditModalVisible(false); setMessageToEdit(null); }}>
                                <MaterialIcons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.textInput, { marginHorizontal: 0, marginTop: 12, minHeight: 80, maxHeight: 160, borderRadius: 12 }]}
                            value={editContent}
                            onChangeText={setEditContent}
                            multiline
                            autoFocus
                            placeholder="Nội dung tin nhắn..."
                        />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                            <TouchableOpacity
                                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' }}
                                onPress={() => { setEditModalVisible(false); setMessageToEdit(null); }}
                            >
                                <Text style={{ color: '#374151', fontWeight: '600' }}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center' }}
                                onPress={handleSubmitEdit}
                                disabled={!editContent.trim()}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Lưu</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={pinnedListVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setPinnedListVisible(false)}
            >
                <Pressable
                    style={styles.menuOverlay}
                    onPress={() => setPinnedListVisible(false)}
                >
                    <View style={styles.menuCard}>
                        <View style={styles.pinnedListHeader}>
                            <Text style={styles.pinnedListTitle}>
                                Tin nhắn đã ghim
                            </Text>
                            <TouchableOpacity
                                onPress={() => setPinnedListVisible(false)}
                            >
                                <MaterialIcons
                                    name="close"
                                    size={22}
                                    color="#6b7280"
                                />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={pinnedMessages || []}
                            keyExtractor={(item) =>
                                String(getMessageId(item) || Math.random())
                            }
                            renderItem={({ item }) => (
                                <View style={styles.pinnedListItem}>
                                    <TouchableOpacity
                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                        onPress={() => jumpToPinnedMessage(item)}
                                    >
                                        <MaterialIcons
                                            name="push-pin"
                                            size={16}
                                            color="#10b981"
                                        />
                                        <Text
                                            style={[styles.pinnedListItemText, { flex: 1 }]}
                                            numberOfLines={2}
                                        >
                                            {item?.content || 'Đính kèm'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            const messageId = getMessageId(item);
                                            const success = await unpinMessage(messageId, userId, token);
                                            if (success) {
                                                applyPinLocal(item, false);
                                            } else {
                                                Alert.alert('Lỗi', 'Không thể bỏ ghim tin nhắn');
                                            }
                                        }}
                                        style={{ padding: 6 }}
                                    >
                                        <MaterialIcons name="push-pin" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.pinnedEmptyText}>
                                    Chưa có tin nhắn đã ghim.
                                </Text>
                            }
                            style={{ maxHeight: 320 }}
                        />
                    </View>
                </Pressable>
            </Modal>

            {/* Conversation Settings Modal */}
            <Modal
                visible={convSettingsVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setConvSettingsVisible(false)}
            >
                <Pressable style={styles.menuOverlay} onPress={() => setConvSettingsVisible(false)}>
                    <Pressable style={[styles.menuCard, { paddingBottom: 32 }]} onPress={() => {}}>
                        <View style={[styles.pinnedListHeader, { paddingTop: 8 }]}>
                            <Text style={styles.pinnedListTitle}>Tùy chọn cuộc trò chuyện</Text>
                            <TouchableOpacity onPress={() => setConvSettingsVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Info */}
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setConvSettingsVisible(false); handleOpenInfo(); }}>
                            <MaterialIcons name="info-outline" size={20} color="#111827" />
                            <Text style={styles.menuItemText}>Xem thông tin</Text>
                        </TouchableOpacity>

                        {/* Pin conversation */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={async () => {
                                const newVal = !convSettings.isPinned;
                                await handleUpdateConvSetting({ isPinned: newVal });
                                setConvSettingsVisible(false);
                            }}
                        >
                            <MaterialIcons name={convSettings.isPinned ? 'push-pin' : 'push-pin'} size={20} color="#111827" />
                            <Text style={styles.menuItemText}>
                                {convSettings.isPinned ? 'Bỏ ghim cuộc trò chuyện' : 'Ghim cuộc trò chuyện'}
                            </Text>
                        </TouchableOpacity>

                        {/* Mute */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={async () => {
                                const newVal = !convSettings.isMuted;
                                await handleUpdateConvSetting({ isMuted: newVal });
                                setConvSettingsVisible(false);
                            }}
                        >
                            <MaterialIcons name={convSettings.isMuted ? 'notifications-off' : 'notifications'} size={20} color="#111827" />
                            <Text style={styles.menuItemText}>
                                {convSettings.isMuted ? 'Bật thông báo' : 'Tắt thông báo'}
                            </Text>
                        </TouchableOpacity>

                        {/* Auto-delete */}
                        <View style={[styles.menuItem, { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <MaterialIcons name="timer" size={20} color="#111827" />
                                <Text style={styles.menuItemText}>Tự xóa tin nhắn</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 30 }}>
                                {(['off', '5m', '1h', '24h'] as const).map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={{
                                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                                            backgroundColor: convSettings.autoDeleteOption === opt ? '#10b981' : '#f3f4f6',
                                        }}
                                        onPress={() => handleUpdateConvSetting({ autoDeleteOption: opt })}
                                    >
                                        <Text style={{ color: convSettings.autoDeleteOption === opt ? '#fff' : '#374151', fontSize: 13, fontWeight: '600' }}>
                                            {opt === 'off' ? 'Tắt' : opt === '5m' ? '5 phút' : opt === '1h' ? '1 giờ' : '24 giờ'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Clear history */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { setConvSettingsVisible(false); handleClearHistory(); }}
                        >
                            <MaterialIcons name="delete-sweep" size={20} color="#ef4444" />
                            <Text style={[styles.menuItemText, styles.menuDangerText]}>Xóa lịch sử trò chuyện</Text>
                        </TouchableOpacity>

                        {/* Report */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setConvSettingsVisible(false);
                                Alert.alert('Báo cáo', 'Bạn có muốn báo cáo cuộc trò chuyện này không?', [
                                    { text: 'Hủy', style: 'cancel' },
                                    {
                                        text: 'Báo cáo', style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                if (isPrivate === 'true') {
                                                    await reportUser(String(id), 'Nội dung không phù hợp', token);
                                                } else {
                                                    await reportGroup(String(id), 'Nội dung không phù hợp', token);
                                                }
                                                Alert.alert('Đã gửi', 'Báo cáo của bạn đã được ghi nhận');
                                            } catch {
                                                Alert.alert('Lỗi', 'Không thể gửi báo cáo');
                                            }
                                        },
                                    },
                                ]);
                            }}
                        >
                            <MaterialIcons name="flag" size={20} color="#f59e0b" />
                            <Text style={[styles.menuItemText, { color: '#f59e0b' }]}>Báo cáo</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b981', // emerald-500 khớp Web
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 12,
        paddingHorizontal: 16,
    },
    backButton: { marginRight: 12, padding: 4 },
    headerIcon: { marginLeft: 16, padding: 4 },
    headerInfo: { flex: 1 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerSubtitle: { color: '#d1fae5', fontSize: 13 },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageList: { padding: 16, gap: 8 },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end',
    },
    myMessageWrapper: { justifyContent: 'flex-end' },
    theirMessageWrapper: { justifyContent: 'flex-start' },
    avatarMini: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#d1fae5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    avatarMiniText: { color: '#047857', fontSize: 12, fontWeight: 'bold' },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    myMessageBubble: { backgroundColor: '#10b981', borderBottomRightRadius: 4 }, // Màu bong bóng tin nhắn của mình
    theirMessageBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    pinnedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    pinnedTagText: { fontSize: 11, fontWeight: '600' },
    myPinnedTagText: { color: '#d1fae5' },
    theirPinnedTagText: { color: '#047857' },
    messageText: { fontSize: 16, lineHeight: 22 },
    recalledContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    recalledText: {
        fontStyle: 'italic',
        color: '#9ca3af',
    },
    myRecalledText: {
        color: '#d1fae5',
    },
    myMessageText: { color: '#fff' },
    theirMessageText: { color: '#111827' },
    timeText: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
    myTimeText: { color: '#d1fae5' },
    theirTimeText: { color: '#9ca3af' },
    imageGallery: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 8,
    },
    chatImage: { width: 150, height: 150, borderRadius: 8 },
    previewContainer: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#f3f4f6',
        borderTopWidth: 1,
        borderColor: '#e5e7eb',
    },
    previewItem: { marginRight: 8, position: 'relative' },
    previewImage: { width: 60, height: 60, borderRadius: 8 },
    removePreviewBtn: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    attachBtn: { padding: 8, paddingBottom: 10 },
    textInput: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 16,
        maxHeight: 100,
        minHeight: 40,
        marginHorizontal: 8,
    },
    sendBtn: { padding: 8, paddingBottom: 10 },
    sendBtnDisabled: { opacity: 0.5 },
    pinnedBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    pinnedContent: { flex: 1, marginLeft: 12 },
    pinnedTitle: {
        fontSize: 12,
        color: '#10b981',
        fontWeight: 'bold',
        marginBottom: 2,
    },
    pinnedText: { fontSize: 14, color: '#4b5563' },
    assignmentCard: {
        backgroundColor: '#f0fdf4',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#10b981',
        minWidth: 200,
    },
    assignmentTitle: { fontWeight: 'bold', color: '#047857', marginBottom: 4 },
    assignmentText: { color: '#065f46', fontSize: 13 },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minWidth: 150,
    },
    fileText: {
        flex: 1,
        marginLeft: 8,
        color: '#374151',
        fontSize: 13,
        textDecorationLine: 'underline',
    },
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
        paddingBottom: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    menuItemText: { fontSize: 15, color: '#111827' },
    menuDangerText: { color: '#ef4444' },
    pinnedListHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    pinnedListTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    pinnedListItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    pinnedListItemText: {
        flex: 1,
        color: '#374151',
        fontSize: 14,
        lineHeight: 20,
    },
    pinnedEmptyText: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        color: '#9ca3af',
    },
    emojiPanel: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    emojiBtn: {
        width: '12.5%',
        alignItems: 'center',
        paddingVertical: 6,
    },
    emojiText: {
        fontSize: 24,
    },
    forwardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        gap: 12,
    },
    forwardAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#d1fae5',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    forwardAvatarImg: {
        width: '100%',
        height: '100%',
    },
    forwardAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#047857',
    },
    forwardName: {
        fontSize: 15,
        color: '#111827',
        fontWeight: '500',
    },
    // Reply bar
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#d1fae5',
    },
    replyBarLabel: { fontSize: 12, color: '#10b981', fontWeight: '700', marginBottom: 2 },
    replyBarContent: { fontSize: 13, color: '#374151' },
    // Edited indicator
    editedTag: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 2 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
    },
    searchResultsBox: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        maxHeight: 220,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        gap: 10,
    },
    searchResultText: {
        flex: 1,
        fontSize: 14,
        color: '#374151',
    },
    searchResultTime: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
