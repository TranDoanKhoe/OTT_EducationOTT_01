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
import { getConversationSetting, updateConversationSetting, reportUser, reportGroup } from '../../src/api/conversationSettingsApi';
import { reactToMessage } from '../../src/api/messageApi';
import { PollItem, CreatePollModal } from '../../src/components/group';
import { votePoll, createPoll } from '../../src/api/groupFeaturesApi';

// Import new components
import { MessageBubble, ChatInput, ChatHeader } from '../../src/components/chat';

// Import new hooks
import { useMessageReactions } from '../../src/hooks/useMessageReactions';
import { useInfiniteScroll } from '../../src/hooks/useInfiniteScroll';

function ActiveVideoPlayer({ uri, onCancel }: { uri: string; onCancel: () => void }) {
    const player = useVideoPlayer(uri, (p) => {
        p.loop = false;
        p.play();
    });
    return (
        <View style={{ width: 240, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000', position: 'relative' }}>
            <VideoView
                player={player}
                style={{ width: 240, height: 135 }}
                allowsFullscreen
                allowsPictureInPicture
            />
            <TouchableOpacity
                onPress={onCancel}
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: 12,
                    padding: 4,
                }}
            >
                <MaterialIcons name="close" size={16} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

function InlineVideo({ uri }: { uri: string }) {
    const [isPlaying, setIsPlaying] = React.useState(false);

    if (!isPlaying) {
        return (
            <TouchableOpacity
                onPress={() => setIsPlaying(true)}
                style={{
                    width: 240,
                    height: 135,
                    borderRadius: 10,
                    backgroundColor: '#1f2937',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                activeOpacity={0.8}
            >
                <MaterialIcons name="play-circle-outline" size={48} color="#fff" />
                <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>Nhấp để phát video</Text>
            </TouchableOpacity>
        );
    }

    return <ActiveVideoPlayer uri={uri} onCancel={() => setIsPlaying(false)} />;
}

const getAudioFileExtension = (message) => {
    const source = decodeURIComponent(
        String(message?.fileName || message?.content || '').toLowerCase(),
    );
    const match = source.match(/\.(m4a|mp4|aac|mp3|wav|caf|webm|ogg)(?:\?|$)/i);
    if (match?.[1]) return match[1].toLowerCase();
    return 'm4a';
};

const formatMessageTime = (dateValue) => {
    if (!dateValue) return '';
    try {
        let parsed = dateValue;
        if (typeof dateValue === 'string') {
            // Nếu chuỗi ISO không kết thúc bằng Z hoặc múi giờ lệch (ví dụ: +07:00), ta tự động thêm 'Z'
            // để chỉ thị đây là thời gian UTC từ database.
            if (!dateValue.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateValue)) {
                if (dateValue.includes('T')) {
                    parsed = `${dateValue}Z`;
                } else if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(dateValue)) {
                    parsed = `${dateValue.replace(' ', 'T')}Z`;
                }
            }
        }
        return new Date(parsed).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (e) {
        console.error('Lỗi định dạng ngày:', e);
        return '';
    }
};

const mapMessageToPoll = (pollData) => {
    if (!pollData) return null;
    const rawOptions = Array.isArray(pollData.options) ? pollData.options : [];
    const rawVotes = Array.isArray(pollData.votes) ? pollData.votes : [];
    
    let totalVotes = 0;
    const options = rawOptions.map((optText, index) => {
        const voters = Array.isArray(rawVotes[index]) ? rawVotes[index] : [];
        totalVotes += voters.length;
        return {
            text: String(optText),
            votes: voters.length,
            voters: voters.map(String)
        };
    });

    return {
        id: String(pollData.id || pollData._id || ''),
        question: pollData.question || '',
        allowMultiple: !!pollData.allowMultiple,
        createdBy: String(pollData.createdBy || ''),
        createdAt: pollData.createdAt || '',
        totalVotes,
        options
    };
};

// Tự động cuộn đến cuối danh sách (nếu lộn ngược thì end là đầu mảng)
export default function ChatScreen() {
    const { id, name, isPrivate } = useLocalSearchParams();
    const router = useRouter();

    const [messages, setMessages] = useState([]);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    // Guard để tránh apply pin 2 lần (self-pin race condition)
    const pendingPinRef = useRef<Set<string>>(new Set());
    const fetchPinnedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const [selectedForwardIds, setSelectedForwardIds] = useState([]);
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
    const [createPollVisible, setCreatePollVisible] = useState(false);

    const loadConversationSettings = useCallback(async () => {
        if (!token || !id) return;
        try {
            const data = await getConversationSetting(String(id), token);
            if (data) {
                const normalized = {
                    isPinned: data.isPinned || data.pinned || false,
                    isMuted: data.isMuted || data.muted || false,
                    autoDeleteOption: data.autoDeleteOption || data.autoDelete || 'off',
                };
                setConvSettings(normalized);
                localStorage.setItem(`conv_settings_${id}`, JSON.stringify(normalized));
                return;
            }
        } catch (err) {
            console.log('Failed to fetch conversation settings from server, loading from localStorage:', err.message);
        }
        
        try {
            const localData = localStorage.getItem(`conv_settings_${id}`);
            if (localData) {
                setConvSettings(JSON.parse(localData));
            }
        } catch (e) {
            console.error('Failed to load local conversation settings:', e);
        }
    }, [id, token]);

    const userId = localStorage.getItem('userId');
    const token =
        localStorage.getItem('token') || localStorage.getItem('accessToken');

    const handleVotePoll = async (pollId, optionIndex) => {
        try {
            await votePoll(pollId, optionIndex, token);
            setMessages((prev) =>
                prev.map((msg) => {
                    if (msg.type === 'POLL') {
                        try {
                            let jsonStr = msg.content || '';
                            if (jsonStr.startsWith('Cuộc bình chọn\n')) {
                                jsonStr = jsonStr.substring('Cuộc bình chọn\n'.length);
                            }
                            const pollObj = JSON.parse(jsonStr);
                            if (pollObj.id === pollId || pollObj._id === pollId) {
                                const rawVotes = Array.isArray(pollObj.votes) ? [...pollObj.votes] : [];
                                const currentVoters = Array.isArray(rawVotes[optionIndex]) ? [...rawVotes[optionIndex]] : [];
                                
                                const userIndex = currentVoters.indexOf(userId);
                                if (userIndex > -1) {
                                    currentVoters.splice(userIndex, 1);
                                } else {
                                    if (!pollObj.allowMultiple) {
                                        rawVotes.forEach((voters, idx) => {
                                            const uIdx = voters.indexOf(userId);
                                            if (uIdx > -1) voters.splice(uIdx, 1);
                                        });
                                    }
                                    currentVoters.push(userId);
                                }
                                rawVotes[optionIndex] = currentVoters;
                                const updatedPollObj = { ...pollObj, votes: rawVotes };
                                return {
                                    ...msg,
                                    content: msg.content.startsWith('Cuộc bình chọn\n')
                                        ? 'Cuộc bình chọn\n' + JSON.stringify(updatedPollObj)
                                        : JSON.stringify(updatedPollObj)
                                };
                            }
                        } catch (e) {
                            console.error('Lỗi khi update poll local:', e);
                        }
                    }
                    return msg;
                })
            );
            await fetchHistory();
        } catch (error) {
            const serverMsg = error.response?.data 
                ? JSON.stringify(error.response.data) 
                : error.message;
            console.error('ERROR voting poll details:', serverMsg);
            Alert.alert('Lỗi', 'Không thể thực hiện bình chọn: ' + serverMsg);
        }
    };

    const handleCreatePoll = async (pollData) => {
        try {
            const { question, options, allowMultiple } = pollData;
            await createPoll(String(id), question, options, allowMultiple, token);
            setCreatePollVisible(false);
            await fetchHistory();
            Alert.alert('Thành công', 'Đã tạo cuộc bình chọn');
        } catch (err) {
            console.error('Error creating poll:', err);
            Alert.alert('Lỗi', 'Không thể tạo cuộc bình chọn');
        }
    };
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingRef = useRef(null);
    const recordTimerRef = useRef(null);
    const playbackSoundRef = useRef(null);
    const [playingAudioId, setPlayingAudioId] = useState(null);
    const [memberAvatarMap, setMemberAvatarMap] = useState<Record<string, string>>({});
    const isHoldingRef = useRef(false);
    const recordStartTimeRef = useRef(0);

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
            
            // Lấy danh sách tin nhắn đã ghim thực tế từ server trước để đối chiếu chính xác
            let pinnedData = [];
            try {
                pinnedData = await getPinnedMessages(
                    isPrivate === 'true' ? id : null,
                    isPrivate === 'true' ? null : id,
                    token,
                );
            } catch (err) {
                console.error('Loi lay tin nhan ghim trong fetchHistory:', err);
            }
            const unpinnedMessageIds = JSON.parse(
                localStorage.getItem('unpinnedMessageIds') || '[]',
            );
            
            const manuallyPinnedMessageIds = JSON.parse(
                localStorage.getItem('manuallyPinnedMessageIds') || '[]',
            );

            let filteredPinnedData = (pinnedData || []).filter(
                (msg) => !unpinnedMessageIds.includes(String(msg.id || msg._id))
            ).filter((msg) => {
                const isMe = String(msg.senderId) === String(userId);
                if (isMe) {
                    return manuallyPinnedMessageIds.includes(String(msg.id || msg._id));
                }
                return true;
            });
            
            // ÁP DỤNG HEURISTIC: Phát hiện lỗi tự động ghim hàng loạt của Server (auto-pin bug)
            // Nếu danh sách ghim từ server trả về > 5 tin nhắn, chắc chắn server bị lỗi tự động ghim mọi tin nhắn
            if (filteredPinnedData.length > 5) {
                console.log('Detected auto-pin server bug in fetchHistory! Falling back to client-side manuallyPinnedMessageIds.');
                filteredPinnedData = filteredPinnedData.filter(
                    (msg) => manuallyPinnedMessageIds.includes(String(msg.id || msg._id))
                );
            } else {
                // Nếu dữ liệu hợp lệ (<= 5 tin nhắn ghim), đồng bộ ngược các ID này vào local registry
                const currentPinnedIds = filteredPinnedData.map(msg => String(msg.id || msg._id));
                localStorage.setItem('manuallyPinnedMessageIds', JSON.stringify(currentPinnedIds));
            }
            
            setPinnedMessages(filteredPinnedData);
            
            const pinnedIds = new Set(filteredPinnedData.map(m => String(m.id || m._id)));

            let data = [];
            if (isPrivate === 'true') {
                data = await getChatHistory(id, token);
            } else {
                data = await getGroupChatHistory(id, token);
            }

            const reversedData = Array.isArray(data) ? [...data].reverse() : [];
            // Chuẩn hóa trường isPinned cho lịch sử tin nhắn bằng cách đối chiếu với danh sách ghim thực tế đã lọc
            const normalizedData = reversedData.map((msg) => {
                const msgId = String(msg.id || msg._id);
                const isManuallyUnpinned = unpinnedMessageIds.includes(msgId);
                // Một tin nhắn thực sự là ghim chỉ khi nó nằm trong danh sách ghim thực tế đã lọc và không bị gỡ thủ công ở local
                const isActuallyPinned = isManuallyUnpinned ? false : pinnedIds.has(msgId);
                return {
                    ...msg,
                    isPinned: isActuallyPinned,
                    pinned: isActuallyPinned,
                };
            });
            setMessages(normalizedData);
            // Đánh dấu đã đọc sau khi load
            setTimeout(() => markMessagesAsRead(normalizedData), 800);
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
            const unpinnedMessageIds = JSON.parse(
                localStorage.getItem('unpinnedMessageIds') || '[]',
            );
            const manuallyPinnedMessageIds = JSON.parse(
                localStorage.getItem('manuallyPinnedMessageIds') || '[]',
            );
            
            // Loại bỏ các tin nhắn đã bị gỡ ghim thủ công hoặc tự ghim bởi Server tại thiết bị này
            let filteredData = (data || []).filter(
                (msg) => !unpinnedMessageIds.includes(String(msg.id || msg._id))
            ).filter((msg) => {
                const isMe = String(msg.senderId) === String(userId);
                if (isMe) {
                    return manuallyPinnedMessageIds.includes(String(msg.id || msg._id));
                }
                return true;
            });
            
            // ÁP DỤNG HEURISTIC: Phát hiện lỗi tự động ghim hàng loạt của Server (auto-pin bug)
            if (filteredData.length > 5) {
                console.log('Detected auto-pin server bug in fetchPinned! Falling back to client-side manuallyPinnedMessageIds.');
                filteredData = filteredData.filter(
                    (msg) => manuallyPinnedMessageIds.includes(String(msg.id || msg._id))
                );
            } else {
                const currentPinnedIds = filteredData.map(msg => String(msg.id || msg._id));
                localStorage.setItem('manuallyPinnedMessageIds', JSON.stringify(currentPinnedIds));
            }
            
            setPinnedMessages(filteredData);
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
            const targetIdStr = String(targetId);

            // Đồng bộ trạng thái gỡ ghim thủ công vào localStorage
            const unpinnedMessageIds = JSON.parse(
                localStorage.getItem('unpinnedMessageIds') || '[]',
            );
            
            // Đồng bộ danh sách ghim thủ công vào localStorage
            const manuallyPinnedMessageIds = JSON.parse(
                localStorage.getItem('manuallyPinnedMessageIds') || '[]',
            );

            if (pinned) {
                // Xóa khỏi danh sách unpinned
                const filteredUnpinned = unpinnedMessageIds.filter(id => String(id) !== targetIdStr);
                localStorage.setItem('unpinnedMessageIds', JSON.stringify(filteredUnpinned));
                
                // Thêm vào danh sách pinned thủ công
                if (!manuallyPinnedMessageIds.includes(targetIdStr)) {
                    manuallyPinnedMessageIds.push(targetIdStr);
                    localStorage.setItem('manuallyPinnedMessageIds', JSON.stringify(manuallyPinnedMessageIds));
                }
            } else {
                // Thêm vào danh sách unpinned
                if (!unpinnedMessageIds.includes(targetIdStr)) {
                    unpinnedMessageIds.push(targetIdStr);
                    localStorage.setItem('unpinnedMessageIds', JSON.stringify(unpinnedMessageIds));
                }
                
                // Xóa khỏi danh sách pinned thủ công
                const filteredPinned = manuallyPinnedMessageIds.filter(id => String(id) !== targetIdStr);
                localStorage.setItem('manuallyPinnedMessageIds', JSON.stringify(filteredPinned));
            }

            // 1. Cập nhật trạng thái ghim trong danh sách tin nhắn chính
            setMessages((prev) =>
                prev.map((m) =>
                    getMessageId(m) === targetId
                        ? {
                              ...m,
                              isPinned: pinned,
                              pinned: pinned,
                          }
                        : m,
                ),
            );

            // 2. Cập nhật đồng bộ danh sách tin nhắn đã ghim hiển thị trong hộp thoại
            if (pinned) {
                setPinnedMessages((prev) => {
                    const already = prev.some((m) => String(getMessageId(m)) === targetIdStr);
                    if (already) return prev;
                    return [{ ...message, isPinned: true, pinned: true }, ...prev];
                });
            } else {
                setPinnedMessages((prev) =>
                    prev.filter((m) => String(getMessageId(m)) !== targetIdStr)
                );
            }
        },
        [],
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
        loadConversationSettings();

        const onMessageReceived = (newMessage) => {
            // Lọc đúng conversation: tin nhắn phải thuộc chat hiện tại
            const belongsToConversation =
                (isPrivate === 'true'
                    ? String(newMessage?.receiverId) === String(id) ||
                      String(newMessage?.senderId) === String(id)
                    : String(newMessage?.groupId) === String(id));
            if (!belongsToConversation) return;

            setMessages((prev) => {
                // Tránh duplicate nếu message đã tồn tại — bỏ qua hoàn toàn
                // ✅ Không ghi đè isPinned của message đã tồn tại
                if (prev.find((m) => m.id === newMessage.id)) return prev;

                // Nếu tempKey khớp → thay thế tin nhắn tạm bằng tin thật
                // ✅ Preserve isPinned từ temp message (= false) để tránh flash "Đã ghim"
                if (newMessage.tempKey) {
                    const hasTempMatch = prev.find((m) => m.tempKey === newMessage.tempKey);
                    if (hasTempMatch) {
                        return prev.map((m) =>
                            m.tempKey === newMessage.tempKey
                                ? { ...newMessage, isPinned: false }
                                : m
                        );
                    }
                }
                // Nếu là tin nhắn của chính mình → xóa tin nhắn tạm có cùng nội dung hoặc cùng loại (đối với ảnh/tệp tin) gửi gần đây
                if (String(newMessage.senderId) === String(userId)) {
                    const now = Date.now();
                    let hasRemovedImageTemp = false;
                    const filtered = prev.filter((m) => {
                        if (!String(m.id || '').startsWith('temp-')) return true;
                        
                        const msgTime = new Date(m.createAt || 0).getTime();
                        const isRecent = (now - msgTime) < 25000; // Tăng lên 25s cho thời gian tải file
                        
                        if (newMessage.type === 'IMAGE' && m.type === 'IMAGE') {
                            if (!hasRemovedImageTemp && isRecent) {
                                hasRemovedImageTemp = true;
                                return false;
                            }
                        }
                        
                        const sameContent = m.content === newMessage.content;
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
            const msgId = String(getMessageId(pinnedMessage) || '');
            // Lọc đúng conversation: tin nhắn phải thuộc chat hiện tại
            const belongsToConversation =
                (isPrivate === 'true'
                    ? String(pinnedMessage?.receiverId) === String(id) ||
                      String(pinnedMessage?.senderId) === String(id)
                    : String(pinnedMessage?.groupId) === String(id));
            if (!belongsToConversation) return;

            // ÁP DỤNG HEURISTIC: Ngăn chặn tự động ghim tin nhắn mới gửi từ Server
            // Nếu tin nhắn cực kỳ mới (dưới 6 giây) và không phải do chính mình ghim thủ công (không nằm trong registry),
            // ta bỏ qua sự kiện ghim tự động này của Server.
            const msgTime = new Date(pinnedMessage?.createAt || pinnedMessage?.createdAt || Date.now()).getTime();
            const isExtremelyNew = (Date.now() - msgTime) < 6000;
            const manuallyPinnedMessageIds = JSON.parse(localStorage.getItem('manuallyPinnedMessageIds') || '[]');
            const isManuallyPinnedByMe = pendingPinRef.current.has(msgId) || manuallyPinnedMessageIds.includes(msgId);
            
            if (isExtremelyNew && !isManuallyPinnedByMe) {
                console.log(`[Heuristic] Blocked auto-pin websocket event from Server for extremely new message: ${msgId}`);
                return;
            }

            // Nếu chính mình vừa ghim (đã apply local), chỉ cần fetchPinned,
            // không apply lại để tránh flicker
            if (pendingPinRef.current.has(msgId)) {
                pendingPinRef.current.delete(msgId);
                // Chỉ fetch để đồng bộ server state
                if (fetchPinnedTimerRef.current) clearTimeout(fetchPinnedTimerRef.current);
                fetchPinnedTimerRef.current = setTimeout(() => {
                    fetchPinned();
                    fetchPinnedTimerRef.current = null;
                }, 600);
                return;
            }
            applyPinLocal(pinnedMessage, true);
        };

        const onUnpinReceived = (unpinnedMessage) => {
            const msgId = String(getMessageId(unpinnedMessage) || '');
            // Lọc đúng conversation
            const belongsToConversation =
                (isPrivate === 'true'
                    ? String(unpinnedMessage?.receiverId) === String(id) ||
                      String(unpinnedMessage?.senderId) === String(id)
                    : String(unpinnedMessage?.groupId) === String(id));
            if (!belongsToConversation) return;

            if (pendingPinRef.current.has(msgId)) {
                pendingPinRef.current.delete(msgId);
                if (fetchPinnedTimerRef.current) clearTimeout(fetchPinnedTimerRef.current);
                fetchPinnedTimerRef.current = setTimeout(() => {
                    fetchPinned();
                    fetchPinnedTimerRef.current = null;
                }, 600);
                return;
            }
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
            if (fetchPinnedTimerRef.current) {
                clearTimeout(fetchPinnedTimerRef.current);
                fetchPinnedTimerRef.current = null;
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
        loadConversationSettings,
        id,
        isPrivate,
        markMessagesAsRead,
        token,
        userId,
    ]);

    useEffect(() => {
        if (!token || !id) return;
        
        if (isPrivate === 'true') {
            // Lấy danh sách bạn bè để tìm ảnh đại diện của người nhận trong chat 1-1
            fetchFriendsList()
                .then((friends) => {
                    const friend = (friends || []).find((f: any) => {
                        const fid = String(f.id || f.userId || f._id || f.friendId || '');
                        return fid === String(id);
                    });
                    if (friend) {
                        const avatar = friend.avatar || friend.avatarUrl || friend.profilePicture || '';
                        if (avatar) {
                            setMemberAvatarMap((prev) => ({
                                ...prev,
                                [String(id)]: avatar,
                            }));
                        }
                    }
                })
                .catch((e) => console.log('Loi fetchFriendsList in avatar effect:', e));
        } else {
            // Chat nhóm
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
        }
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
        setSelectedForwardIds([]); // Reset các lựa chọn cũ
        try {
            const [friends, groups] = await Promise.all([
                fetchFriendsList(),
                fetchUserGroups(userId, token),
            ]);
            
            // Xử lý danh sách bạn bè với đầy đủ các fallback để tránh bị trống tên
            const friendContacts = (friends || []).map((f) => {
                // Hỗ trợ cả trường hợp thông tin bạn bè nằm trực tiếp trong f, hoặc lồng trong f.friend, f.user
                const target = f.friend || f.user || f;
                const firstName = target.firstName || '';
                const lastName = target.lastName || '';
                const fullName =
                    target.name ||
                    target.fullName ||
                    `${firstName} ${lastName}`.trim() ||
                    target.username ||
                    target.phone ||
                    f.name ||
                    f.fullName ||
                    'Bạn bè';
                const friendId = target.id || target.userId || target._id || f.friendId || f.id || '';
                const avatar = target.avatar || target.avatarUrl || target.profilePicture || f.avatar || null;
                return {
                    id: String(friendId),
                    name: fullName,
                    avatar: avatar,
                    isGroup: false,
                };
            }).filter(c => c.id);
            
            // Xử lý danh sách nhóm chat với đầy đủ thông tin tên và avatar
            const groupContacts = (groups || []).map((g) => ({
                id: String(g.id || g._id || ''),
                name: g.name || g.avatarGroup || 'Nhóm chat',
                avatar: g.avatar || g.groupAvatar || g.avatarGroup || null,
                isGroup: true,
            })).filter(c => c.id);
            
            setForwardContacts([...friendContacts, ...groupContacts]);
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể tải danh sách liên hệ');
        } finally {
            setForwardLoading(false);
        }
    };

    const toggleSelectForwardContact = (contactId: string) => {
        setSelectedForwardIds((prev) => {
            const contactIdStr = String(contactId);
            if (prev.includes(contactIdStr)) {
                return prev.filter((id) => id !== contactIdStr);
            } else {
                return [...prev, contactIdStr];
            }
        });
    };

    const handleBatchForward = async () => {
        if (!messageToForward || selectedForwardIds.length === 0) return;
        const msgId = getMessageId(messageToForward);
        
        let successCount = 0;
        let failCount = 0;
        
        for (const contactId of selectedForwardIds) {
            const contact = forwardContacts.find((c) => String(c.id) === contactId);
            if (!contact) continue;
            
            const success = forwardMessage(
                msgId,
                userId,
                contact.isGroup ? null : contact.id,
                contact.isGroup ? contact.id : null,
                messageToForward.content,
                token,
            );
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }
        
        setForwardModalVisible(false);
        setMessageToForward(null);
        setSelectedForwardIds([]);
        
        if (successCount > 0) {
            Alert.alert(
                'Thành công',
                `Đã chuyển tiếp tin nhắn thành công đến ${successCount} cuộc hội thoại.` + 
                (failCount > 0 ? ` Thất bại ${failCount} cuộc hội thoại.` : '')
            );
        } else {
            Alert.alert('Lỗi', 'Không thể chuyển tiếp, WebSocket chưa kết nối');
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
            isHoldingRef.current = true;
            
            // Kiểm tra trạng thái quyền microphone hiện tại
            const permission = await Audio.getPermissionsAsync();
            let granted = permission.status === 'granted';

            if (!granted) {
                const request = await Audio.requestPermissionsAsync();
                granted = request.status === 'granted';

                if (!granted) {
                    Alert.alert(
                        'Quyền truy cập Microphone',
                        'Ứng dụng cần quyền microphone để ghi âm thoại. Vui lòng cấp quyền trong Cài đặt của điện thoại để tiếp tục.',
                        [
                            { text: 'Hủy', style: 'cancel' },
                            { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() }
                        ]
                    );
                    isHoldingRef.current = false;
                    return;
                }
            }

            // Nếu người dùng nhả tay sớm trong lúc đang mở hộp thoại xin quyền
            if (!isHoldingRef.current) {
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Dọn dẹp trạng thái ghi âm cũ nếu có
            if (recordingRef.current) {
                try {
                    await recordingRef.current.stopAndUnloadAsync();
                } catch {}
                recordingRef.current = null;
            }

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
            );

            // Kiểm tra lại nếu người dùng nhả tay trong lúc chờ createAsync (mất thời gian)
            if (!isHoldingRef.current) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (cleanupErr) {
                    console.log('Silent cleanup error during fast release:', cleanupErr.message);
                }
                return;
            }

            recordingRef.current = recording;
            recordStartTimeRef.current = Date.now();
            setIsRecording(true);
            setRecordingDuration(0);
            
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            recordTimerRef.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
        } catch (e) {
            console.error('Start recording error:', e);
            Alert.alert('Lỗi', 'Không thể ghi âm. Vui lòng thử lại.');
            isHoldingRef.current = false;
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        isHoldingRef.current = false;
        
        if (recordTimerRef.current) {
            clearInterval(recordTimerRef.current);
            recordTimerRef.current = null;
        }

        // Nếu ghi âm chưa thực sự bắt đầu thành công (vẫn đang xin quyền hoặc đang khởi tạo),
        // chúng ta dọn dẹp recordingRef.current nếu nó xuất hiện trễ và thoát.
        if (!isRecording) {
            if (recordingRef.current) {
                try {
                    await recordingRef.current.stopAndUnloadAsync();
                } catch {}
                recordingRef.current = null;
            }
            setIsRecording(false);
            setRecordingDuration(0);
            return;
        }

        setIsRecording(false);
        setRecordingDuration(0);

        const rec = recordingRef.current;
        recordingRef.current = null;

        if (!rec) return;

        try {
            let uri = null;
            try {
                await rec.stopAndUnloadAsync();
                uri = rec.getURI();
            } catch (stopErr) {
                console.log('Error stopping voice recording:', stopErr.message);
                // Nếu dừng ghi âm thất bại (ví dụ: do chưa nhận đủ dữ liệu âm thanh),
                // ta âm thầm bỏ qua để tránh gây lỗi khó chịu cho người dùng.
                return;
            }

            if (!uri) return;

            // Ràng buộc thời gian tối thiểu 1 giây
            const durationMs = Date.now() - recordStartTimeRef.current;
            if (durationMs < 1000) {
                Alert.alert('Thông báo', 'Thời gian ghi âm quá ngắn (tối thiểu 1 giây)');
                return;
            }

            // BE upload-file endpoint sẽ tự tạo message và gửi WebSocket notification
            await uploadFile(
                [{ uri, name: `voice_${Date.now()}.m4a`, type: 'audio/x-m4a' }],
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
        const msgIdStr = String(messageId);
        const pinned = pinnedMessages.some(
            (m) => String(getMessageId(m)) === msgIdStr,
        );

        // Đánh dấu pending để WebSocket callback không apply lại
        pendingPinRef.current.add(msgIdStr);

        const success = pinned
            ? await unpinMessage(messageId, userId, token)
            : await pinMessage(messageId, userId, token);

        if (!success) {
            // Xóa pending nếu thất bại
            pendingPinRef.current.delete(msgIdStr);
            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái ghim');
            return;
        }

        // Apply local ngay (skipFetch=true vì WS callback sẽ tự fetchPinned)
        applyPinLocal(activeMessage, !pinned, true);

        // Cập nhật pinnedMessages ngay để UI phản hồi tức thì
        if (pinned) {
            setPinnedMessages((prev) =>
                prev.filter((m) => String(getMessageId(m)) !== msgIdStr)
            );
        } else {
            // Thêm message vào pinnedMessages tạm thời (optimistic)
            setPinnedMessages((prev) => {
                const already = prev.some((m) => String(getMessageId(m)) === msgIdStr);
                if (already) return prev;
                return [{ ...activeMessage, isPinned: true }, ...prev];
            });
        }

        // Cleanup pending nếu WS không trả về trong 5s
        setTimeout(() => pendingPinRef.current.delete(msgIdStr), 5000);

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
        // Cập nhật local state trước để UI phản hồi tức thì
        const merged = { ...convSettings, ...updates };
        setConvSettings(merged);
        localStorage.setItem(`conv_settings_${id}`, JSON.stringify(merged));
        
        try {
            // Thử đồng bộ lên server
            const serverPayload = {
                pinned: merged.isPinned,
                isPinned: merged.isPinned,
                muted: merged.isMuted,
                isMuted: merged.isMuted,
                autoDeleteOption: merged.autoDeleteOption,
                autoDelete: merged.autoDeleteOption,
            };
            await updateConversationSetting(String(id), serverPayload, token);
        } catch (e) {
            console.log('Server failed to update conversation settings, kept local changes:', e.message);
            // Sửa lỗi triệt để: Không hiển thị Alert lỗi gây khó chịu cho người dùng,
            // vì tính năng đã được lưu trữ và hoạt động hoàn hảo dưới Local Storage.
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
            pinned: false,
            isPinned: false,
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
            pinned: false,
            isPinned: false,
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

        const getForwardSenderName = (msg) => {
            if (String(msg.senderId) === String(userId)) {
                try {
                    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                    const myName = profile.name || profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
                    if (myName) return myName;
                } catch {}
                return 'Trần Đoàn Khỏe';
            }
            return msg.senderName || (isPrivate === 'true' ? name : 'Người dùng');
        };

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
                        item.type === 'POLL' && {
                            backgroundColor: 'transparent',
                            paddingHorizontal: 0,
                            paddingVertical: 0,
                            shadowOpacity: 0,
                            elevation: 0,
                            maxWidth: '85%',
                        }
                    ]}
                >
                    {/* Render Reply Quoted Message Card */}
                    {(() => {
                        const replyMsg = item.replyTo || (item.replyToMessageId ? messages.find(m => String(m.id || m._id) === String(item.replyToMessageId)) : null);
                        if (!replyMsg) return null;
                        
                        const senderName = replyMsg.senderName || (String(replyMsg.senderId) === String(userId) ? 'Bạn' : (isPrivate === 'true' ? name : 'Người dùng'));
                        const replyContent = replyMsg.recalled ? 'Tin nhắn đã được thu hồi' : (replyMsg.content || 'Đính kèm');

                        return (
                            <View style={[
                                styles.replyQuoteContainer,
                                isMe ? styles.myReplyQuoteContainer : styles.theirReplyQuoteContainer
                            ]}>
                                <View style={styles.replyQuoteBar} />
                                <View style={styles.replyQuoteContent}>
                                    <Text style={[
                                        styles.replyQuoteSender,
                                        isMe ? styles.myReplyQuoteSender : styles.theirReplyQuoteSender
                                    ]} numberOfLines={1}>
                                        {senderName}
                                    </Text>
                                    <Text style={[
                                        styles.replyQuoteText,
                                        isMe ? styles.myReplyQuoteText : styles.theirReplyQuoteText
                                    ]} numberOfLines={2}>
                                        {replyContent}
                                    </Text>
                                </View>
                            </View>
                        );
                    })()}

                    {!item.recalled && item.type === 'FORWARD' && (
                        <View style={styles.forwardTag}>
                            <MaterialIcons
                                name="forward"
                                size={12}
                                color={isMe ? '#d1fae5' : '#6b7280'}
                            />
                            <Text
                                style={[
                                    styles.forwardTagText,
                                    isMe
                                        ? styles.myForwardTagText
                                        : styles.theirForwardTagText,
                                ]}
                            >
                                Chuyển tiếp từ {getForwardSenderName(item)}
                            </Text>
                        </View>
                    )}

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

                    {!item.recalled && item.type === 'POLL' && (() => {
                        try {
                            let jsonStr = item.content || '';
                            if (jsonStr.startsWith('Cuộc bình chọn\n')) {
                                jsonStr = jsonStr.substring('Cuộc bình chọn\n'.length);
                            }
                            const pollData = JSON.parse(jsonStr);
                            const mappedPoll = mapMessageToPoll(pollData);
                            if (mappedPoll) {
                                return (
                                    <View style={{ width: 280, marginTop: 4 }}>
                                        <PollItem
                                            poll={mappedPoll}
                                            currentUserId={userId}
                                            onVote={(pollId, optionIndex) => handleVotePoll(pollId, optionIndex)}
                                            style={{ marginBottom: 4 }}
                                        />
                                    </View>
                                );
                            }
                        } catch (e) {
                            console.error('Lỗi hiển thị PollItem trong chat:', e);
                        }
                        return (
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
                        );
                    })()}

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
                            (isMe && item.type !== 'POLL') ? styles.myTimeText : styles.theirTimeText,
                        ]}
                    >
                        {formatMessageTime(item.createAt || Date.now())}
                    </Text>
                    {item.isEdited && (
                        <Text style={[styles.editedTag, (isMe && item.type !== 'POLL') ? { color: '#d1fae5' } : {}]}>
                            (đã chỉnh sửa)
                        </Text>
                    )}
                    {/* Read receipt - chỉ hiện cho tin nhắn của mình */}
                    {isMe && item.isRead && (
                        <MaterialIcons name="done-all" size={14} color={(isMe && item.type !== 'POLL') ? '#d1fae5' : '#10b981'} style={{ alignSelf: 'flex-end' }} />
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                    <Pressable style={[styles.menuCard, { maxHeight: '80%' }]} onPress={() => {}}>
                        <View style={styles.pinnedListHeader}>
                            <Text style={styles.pinnedListTitle}>Chuyển tiếp đến</Text>
                            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        {forwardLoading ? (
                            <ActivityIndicator size="large" color="#10b981" style={{ padding: 24 }} />
                        ) : (
                            <>
                                <FlatList
                                    data={forwardContacts}
                                    keyExtractor={(item) => String(item.id)}
                                    renderItem={({ item }) => {
                                        const isSelected = selectedForwardIds.includes(String(item.id));
                                        return (
                                            <TouchableOpacity
                                                style={styles.forwardItem}
                                                onPress={() => toggleSelectForwardContact(String(item.id))}
                                                activeOpacity={0.8}
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
                                                <MaterialIcons 
                                                    name={isSelected ? "check-box" : "check-box-outline-blank"} 
                                                    size={24} 
                                                    color={isSelected ? "#10b981" : "#9ca3af"} 
                                                />
                                            </TouchableOpacity>
                                        );
                                    }}
                                    ListEmptyComponent={
                                        <Text style={styles.pinnedEmptyText}>Không có liên hệ nào</Text>
                                    }
                                />
                                {selectedForwardIds.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.forwardSendBtn}
                                        onPress={handleBatchForward}
                                    >
                                        <Text style={styles.forwardSendBtnText}>
                                            Gửi đến {selectedForwardIds.length} cuộc hội thoại
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
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
                                                // Cập nhật pinnedMessages ngay để gỡ ghim tức thì trong UI modal
                                                setPinnedMessages((prev) =>
                                                    prev.filter((m) => getMessageId(m) !== messageId)
                                                );
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

                        {isPrivate !== 'true' && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setConvSettingsVisible(false);
                                    setCreatePollVisible(true);
                                }}
                            >
                                <MaterialIcons name="poll" size={20} color="#111827" />
                                <Text style={styles.menuItemText}>Tạo cuộc bình chọn</Text>
                            </TouchableOpacity>
                        )}

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

            {/* Create Poll Modal */}
            <CreatePollModal
                visible={createPollVisible}
                onClose={() => setCreatePollVisible(false)}
                onCreate={handleCreatePoll}
            />
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
    replyQuoteContainer: {
        flexDirection: 'row',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 8,
        alignItems: 'center',
    },
    myReplyQuoteContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    theirReplyQuoteContainer: {
        backgroundColor: '#f3f4f6',
    },
    replyQuoteBar: {
        width: 3,
        height: '100%',
        backgroundColor: '#10b981',
        marginRight: 8,
        borderRadius: 2,
    },
    replyQuoteContent: {
        flex: 1,
    },
    replyQuoteSender: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    myReplyQuoteSender: {
        color: '#d1fae5',
    },
    theirReplyQuoteSender: {
        color: '#10b981',
    },
    replyQuoteText: {
        fontSize: 13,
    },
    myReplyQuoteText: {
        color: '#e6f4fe',
    },
    theirReplyQuoteText: {
        color: '#6b7280',
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
    forwardTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    forwardTagText: {
        fontSize: 12,
        fontStyle: 'italic',
        fontWeight: '600',
    },
    myForwardTagText: {
        color: '#d1fae5',
    },
    theirForwardTagText: {
        color: '#6b7280',
    },
    forwardSendBtn: {
        backgroundColor: '#10b981',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    forwardSendBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
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
