import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BiArrowBack,
    BiSearch,
    BiPhone,
    BiVideo,
    BiDotsVerticalRounded,
    BiSmile,
    BiPaperclip,
    BiSend,
    BiUndo,
    BiTrash,
    BiShare,
    BiGroup,
    BiPin,
    BiEdit,
    BiImage,
    BiFile,
    BiMicrophone,
    BiCheck,
    BiMenu,
    BiInfoCircle,
    BiMessageSquareDetail,
    BiLinkAlt,
    BiPoll,
    BiNotepad,
    BiX,
} from 'react-icons/bi';
import { BsCheckAll } from 'react-icons/bs';
import { HiAcademicCap } from 'react-icons/hi';
import Picker from 'emoji-picker-react';
import {
    sendMessage,
    uploadFile,
    recallMessage,
    deleteMessage,
    forwardMessage,
    pinMessage,
    unpinMessage,
    getPinnedMessages,
    editMessage,
    sendCallSignal,
    readMessage,
    clearChatHistory,
} from '../../api/messageApi';
import {
    fetchGroupMembers,
    leaveGroup,
    dissolveGroup,
} from '../../api/groupApi';
import SearchMessages from '../../components/SearchMessages';
import FriendModal from './FriendModal';
import VideoCallModal from './VideoCallModal';
import GroupInfoPanel from './GroupInfoPanel';
import PersonalChatInfoPanel from './PersonalChatInfoPanel';
import PollModal from './PollModal';
import NoteModal from './NoteModal';
import GroupFeaturesModal from './GroupFeaturesModal';
import SettingGroup from './SettingGroup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getLastSeenText } from '../../utils/timeUtils';
import { playNotificationSound } from '../../utils/notificationSound';
import { showBrowserNotification } from '../../utils/browserNotification';
import {
    getGroupNotes,
    createGroupNote,
    updateGroupNote,
    deleteGroupNote,
    getGroupPolls,
    createPoll as createPollApi,
    votePoll as votePollApi,
} from '../../api/groupFeaturesApi';
import {
    updateConversationSetting,
    reportGroup,
    reportUser,
} from '../../api/conversationSettingsApi';
import {
    initializePeerConnection,
    startCall,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    endCall,
    toggleAudio,
    toggleVideo,
} from '../../services/webrtcService';

const formatAiMessageForDisplay = (rawText) => {
    if (!rawText) return '';

    let text = String(rawText).replace(/\r\n/g, '\n').trim();

    // Remove markdown markers that look noisy in plain chat bubbles.
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');

    // Ensure numbered items are displayed on separate lines.
    text = text.replace(/([^\n])\s+(\d+\.\s)/g, '$1\n$2');

    // Convert markdown-style bullets to cleaner list lines.
    text = text.replace(/\s\*\s+/g, '\n- ');

    // Normalize excessive blank lines.
    text = text.replace(/\n{3,}/g, '\n\n');

    return text;
};

const ChatWindow = ({
    selectedContact,
    messages,
    messageInput,
    onMessageInputChange,
    onSendMessage,
    onRequestAIReply,
    onProfileOpen,
    userId,
    contacts,
    token,
    onUpdateContact,
    onSendFriendRequest,
    onUpdateSelectedContact,
    onDeleteConversation,
    aiConversations,
    currentAiConversationId,
    onCreateAiConversation,
    onSelectAiConversation,
}) => {
    const [localMessages, setLocalMessages] = useState(messages);
    const [isSending, setIsSending] = useState(false);
    const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [pinnedMessagesDialogOpen, setPinnedMessagesDialogOpen] =
        useState(false);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [syncedPinnedIds, setSyncedPinnedIds] = useState(new Set());
    const [messageToForward, setMessageToForward] = useState(null);
    const [messageToEdit, setMessageToEdit] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [groupMembers, setGroupMembers] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef(null);
    const documentInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingChunksRef = useRef([]);
    const recordingStreamRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const dragDepthRef = useRef(0);
    const pendingDropFilesRef = useRef([]);
    const voicePreviewUrlRef = useRef('');
    const lastAiContextFilesRef = useRef([]);
    const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [openMenuMessageId, setOpenMenuMessageId] = useState(null);
    const messageInputRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [voicePreviewBlob, setVoicePreviewBlob] = useState(null);
    const [voicePreviewUrl, setVoicePreviewUrl] = useState('');
    const [voicePreviewDuration, setVoicePreviewDuration] = useState(0);
    const [isDragOver, setIsDragOver] = useState(false);
    const [pendingDropFiles, setPendingDropFiles] = useState([]);
    const [showAiQuickSuggestions, setShowAiQuickSuggestions] = useState(true);

    // Reset pinned state when switching conversations to avoid showing stale pins
    useEffect(() => {
        setPinnedMessages([]);
        setPinnedMessagesDialogOpen(false);
        setSyncedPinnedIds(new Set());
    }, [selectedContact?.id]);

    // Video call states
    const [callModalOpen, setCallModalOpen] = useState(false);
    const [isVideoCall, setIsVideoCall] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [callStatus, setCallStatus] = useState('');
    const [isInitiator, setIsInitiator] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);

    // Poll and Note states
    const [isPollModalOpen, setIsPollModalOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isGroupFeaturesModalOpen, setIsGroupFeaturesModalOpen] =
        useState(false);
    const [groupNotes, setGroupNotes] = useState([]);
    const [polls, setPolls] = useState([]);
    const [isSettingGroupOpen, setIsSettingGroupOpen] = useState(false);

    const aiSuggestedQuestions = useMemo(
        () => [
            'Mình yếu toán, gợi ý lớp cho người mất gốc giúp mình.',
            'Mình muốn học để thi cuối kỳ đạt 8+, nên chọn lớp nào?',
            'Mình rảnh tối thứ 2, 4, 6. Có lớp toán nào phù hợp không?',
            'So sánh nhanh các giảng viên dạy toán hiện có giúp mình.',
        ],
        [],
    );
    const isAiConversation = Boolean(selectedContact?.isAI);

    const cloudinaryCloudName = useMemo(() => {
        const fromEnv = String(
            import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
        ).trim();
        if (fromEnv) return fromEnv;

        const sample = localMessages.find((msg) =>
            String(msg?.content || '').includes('res.cloudinary.com/'),
        );
        const sampleUrl = String(sample?.content || '');
        const matched = sampleUrl.match(/res\.cloudinary\.com\/([^/]+)\//i);
        return matched?.[1] || '';
    }, [localMessages]);

    // Cập nhật thời gian mỗi phút để hiển thị "last seen" realtime
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Cập nhật mỗi phút

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (messageInputRef.current) {
            messageInputRef.current.focus();
        }
    }, [selectedContact]);
    const handleMenuOpen = (messageId, event) => {
        event.stopPropagation();
        setOpenMenuMessageId(
            openMenuMessageId === messageId ? null : messageId,
        );
    };
    const handleMenuClose = () => {
        setOpenMenuMessageId(null);
    };
    const handleProfileOpen = () => {
        setProfileData(selectedContact);
        setIsFriendModalOpen(true);
    };

    const handleProfileClose = () => {
        setIsFriendModalOpen(false);
        setProfileData(null);
    };

    const handleCloseConversation = () => {
        setShowGroupInfo(false);
        setShowSearchBar(false);
        setPinnedMessagesDialogOpen(false);
        if (onUpdateSelectedContact) {
            onUpdateSelectedContact(null);
        }
    };

    const handleStartNewAiConversation = async () => {
        if (!isAiConversation) return;

        setLocalMessages([]);
        setShowAiQuickSuggestions(true);
        lastAiContextFilesRef.current = [];

        if (onCreateAiConversation) {
            const created = await onCreateAiConversation();
            if (created?.id && onSelectAiConversation) {
                await onSelectAiConversation(created.id);
            }
        } else if (onDeleteConversation) {
            onDeleteConversation(selectedContact.id, {
                clearHistoryOnly: true,
                isAI: true,
            });
        }

        toast.success('Đã tạo cuộc trò chuyện AI mới');
    };

    useEffect(() => {
        // Deduplicate by id but always take the latest version (to keep refreshed flags like isPinned/isRead)
        const mapById = new Map();
        messages.forEach((msg) => {
            mapById.set(
                msg.id || msg.tempKey || `${msg.createAt}-${msg.senderId}`,
                msg,
            );
        });
        setLocalMessages((prev) => {
            const merged = Array.from(mapById.values()).map((msg) => {
                // Preserve local pinned state if backend list already marked it pinned
                if (msg.id && syncedPinnedIds.has(msg.id)) {
                    return { ...msg, isPinned: true };
                }
                return msg;
            });
            return merged;
        });
    }, [messages, syncedPinnedIds]);

    // Tách riêng useEffect để đánh dấu tin nhắn đã đọc
    useEffect(() => {
        if (!selectedContact || selectedContact.isGroup || !token) return;

        // Đợi lâu hơn để đảm bảo WebSocket đã kết nối
        const timer = setTimeout(() => {
            // Chỉ đánh dấu tin nhắn chưa đọc khi mở chat lần đầu
            const unreadMessages = localMessages.filter(
                (msg) => msg.senderId !== userId && !msg.isRead && msg.id,
            );

            if (unreadMessages.length > 0) {
                console.log(
                    `Marking ${unreadMessages.length} messages as read`,
                );
                const successfulReads = [];

                unreadMessages.forEach((msg) => {
                    const success = readMessage(
                        msg.id,
                        msg.senderId,
                        userId,
                        token,
                    );
                    if (success) {
                        successfulReads.push(msg.id);
                    }
                });

                // Chỉ cập nhật local state cho những tin nhắn đã gửi read receipt thành công
                if (successfulReads.length > 0) {
                    setTimeout(() => {
                        setLocalMessages((prev) =>
                            prev.map((m) =>
                                successfulReads.includes(m.id)
                                    ? { ...m, isRead: true }
                                    : m,
                            ),
                        );
                    }, 200);
                }
            }
        }, 500); // Đợi 500ms để WebSocket connect xong

        return () => clearTimeout(timer);
    }, [selectedContact?.id]); // Chỉ chạy khi đổi contact

    useEffect(() => {
        if (!token) {
            setGroupMembers([]);
            return;
        }

        if (selectedContact?.isGroup) {
            fetchGroupMembers(selectedContact.id, token)
                .then((members) => {
                    console.log('Group members loaded:', members);
                    setGroupMembers(members);
                })
                .catch((error) => {
                    console.error('Error fetching group members:', error);
                    setGroupMembers([]);
                });
        } else {
            setGroupMembers([]);
        }
    }, [selectedContact, token]);

    // Load notes from backend when switching groups
    useEffect(() => {
        if (selectedContact?.isGroup && selectedContact?.id && token) {
            // Load notes from backend
            getGroupNotes(selectedContact.id, token)
                .then((notes) => {
                    setGroupNotes(notes);
                })
                .catch((error) => {
                    if (error?.response?.status !== 403) {
                        console.error('Error loading notes:', error);
                    }
                    setGroupNotes([]);
                });

            // Load polls from backend
            getGroupPolls(selectedContact.id, token)
                .then((polls) => {
                    setPolls(polls);
                })
                .catch((error) => {
                    if (error?.response?.status !== 403) {
                        console.error('Error loading polls:', error);
                    }
                    setPolls([]);
                });
        } else {
            setGroupNotes([]);
            setPolls([]);
        }
    }, [selectedContact?.id, selectedContact?.isGroup, token]);

    const handleShowPinnedMessages = async () => {
        if (selectedContact?.isAI) {
            setPinnedMessages([]);
            setPinnedMessagesDialogOpen(true);
            return;
        }

        if (!token) {
            toast.error('Vui lòng đăng nhập để xem tin nhắn đã ghim');
            return;
        }

        try {
            const pinned = await getPinnedMessages(
                // Với nhóm: chỉ cần groupId, otherUserId để null để tránh backend trả về tất cả
                selectedContact.isGroup ? null : selectedContact.id,
                selectedContact.isGroup ? selectedContact.id : null,
                token,
            );

            console.log('🔍 Raw pinned messages from backend:', pinned);
            console.log('📌 Current contact:', selectedContact);
            console.log('👤 Current userId:', userId);

            const filteredPinned = (pinned || [])
                .filter((msg) => {
                    const isPinnedFlag =
                        msg.isPinned === true || msg.isPinned === 'true';
                    const hasPinMeta = !!(
                        msg.pinBy ||
                        msg.pinnedBy ||
                        msg.pinnedAt ||
                        msg.pinAt ||
                        msg.pinTime
                    );

                    if (!isPinnedFlag && !hasPinMeta) {
                        console.log('Skip not-marked-pinned:', msg.id);
                        return false;
                    }

                    if (selectedContact.isGroup) {
                        const sameGroup = msg.groupId === selectedContact.id;
                        if (!sameGroup) {
                            console.log(
                                'Skip non-group message for current group:',
                                msg.id,
                                msg.groupId,
                            );
                        }
                        return sameGroup;
                    }

                    const otherId = selectedContact.id;
                    const isDirectMessage =
                        msg.groupId === undefined || msg.groupId === null;
                    const involvesCurrentPair =
                        (msg.senderId === userId &&
                            msg.receiverId === otherId) ||
                        (msg.senderId === otherId && msg.receiverId === userId);

                    if (!isDirectMessage || !involvesCurrentPair) {
                        console.log(
                            'Skip message not in this DM pair:',
                            msg.id,
                            msg.groupId,
                            msg.senderId,
                            msg.receiverId,
                        );
                    }

                    return isDirectMessage && involvesCurrentPair;
                })
                .reduce((unique, msg) => {
                    if (!unique.some((item) => item.id === msg.id)) {
                        unique.push(msg);
                    }
                    return unique;
                }, []);

            console.log('✅ Filtered pinned messages:', filteredPinned);
            setPinnedMessages(filteredPinned);
            setSyncedPinnedIds(new Set(filteredPinned.map((m) => m.id)));
            setPinnedMessagesDialogOpen(true);
        } catch (error) {
            console.error('Error fetching pinned messages:', error);
            let errorMessage = 'Lỗi tải tin nhắn đã ghim';
            if (error.response) {
                if (error.response.status === 403) {
                    errorMessage =
                        'Không có quyền truy cập tin nhắn đã ghim. Vui lòng kiểm tra lại quyền truy cập nhóm.';
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else {
                errorMessage = error.message || errorMessage;
            }
            toast.error(errorMessage);
        }
    };

    const handleSendMessage = async () => {
        const trimmedInput = messageInput.trim();
        const pendingFiles = pendingDropFiles.map((item) => item.file);
        const hasAiAttachments =
            Boolean(selectedContact?.isAI) && pendingFiles.length > 0;

        if (!trimmedInput && !hasAiAttachments) return;
        if (!token) {
            toast.error('Vui lòng đăng nhập để gửi tin nhắn');
            return;
        }

        const sendAiPrompt = async (promptText, aiFiles = []) => {
            setIsSending(true);
            const tempKey = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 9)}`;
            const hasFiles = Array.isArray(aiFiles) && aiFiles.length > 0;
            const trimmedPrompt = (promptText || '').trim();
            const contextFiles = hasFiles
                ? aiFiles
                : lastAiContextFilesRef.current;

            try {
                onMessageInputChange({ target: { value: '' } });
                if (hasFiles) {
                    appendAiAttachmentPreviewMessages(aiFiles);
                    lastAiContextFilesRef.current = aiFiles;
                }

                if (trimmedPrompt) {
                    onSendMessage({
                        senderId: userId,
                        receiverId: selectedContact.id,
                        content: trimmedPrompt,
                        type: 'TEXT',
                        tempKey: tempKey,
                        id: `local-ai-${tempKey}`,
                        createAt: new Date().toISOString(),
                        recalled: false,
                        deletedByUsers: [],
                        isRead: true,
                        isPinned: false,
                        isEdited: false,
                    });
                }

                await onRequestAIReply?.(promptText, contextFiles);
                if (hasFiles) {
                    clearPendingDropFiles();
                }
            } catch (error) {
                toast.error(`Lỗi AI: ${error.message}`);
            } finally {
                setIsSending(false);
                setShowEmojiPicker(false);
            }
        };

        if (selectedContact?.isAI) {
            setShowAiQuickSuggestions(false);
            await sendAiPrompt(trimmedInput, pendingFiles);
            return;
        }

        setIsSending(true);

        const tempKey = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;
        const message = {
            senderId: userId,
            [selectedContact.isGroup ? 'groupId' : 'receiverId']:
                selectedContact.id,
            content: messageInput,
            type: 'TEXT',
            tempKey: tempKey,
        };

        try {
            console.log('Attempting to send message:', message);
            const success = sendMessage('/app/chat.send', message, token);
            if (success) {
                const newMessage = {
                    ...message,
                    createAt: new Date().toISOString(),
                    recalled: false,
                    deletedByUsers: [],
                    isRead: false,
                    isPinned: false,
                    isEdited: false,
                };
                onMessageInputChange({ target: { value: '' } });
                onSendMessage(newMessage);
            } else {
                toast.error(
                    'Không thể gửi tin nhắn: WebSocket không hoạt động',
                );
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error(`Lỗi gửi tin nhắn: ${error.message}`);
        } finally {
            setIsSending(false);
            setShowEmojiPicker(false);
        }
    };

    const formatVoiceTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60)
            .toString()
            .padStart(2, '0');
        const secs = Math.floor(totalSeconds % 60)
            .toString()
            .padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const clearVoicePreview = () => {
        if (voicePreviewUrl) {
            URL.revokeObjectURL(voicePreviewUrl);
        }
        setVoicePreviewUrl('');
        setVoicePreviewBlob(null);
        setVoicePreviewDuration(0);
    };

    const cleanupRecordingResources = () => {
        if (recordingStreamRef.current) {
            recordingStreamRef.current
                .getTracks()
                .forEach((track) => track.stop());
            recordingStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
    };

    const cleanupPendingDropFiles = (files) => {
        files.forEach((item) => {
            if (item?.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
        });
    };

    const addPendingDropFiles = (files) => {
        const mapped = files.map((file) => {
            const kind = file.type.startsWith('image/')
                ? 'image'
                : file.type.startsWith('video/')
                  ? 'video'
                  : file.type.startsWith('audio/')
                    ? 'audio'
                    : 'file';

            const hasPreview = kind === 'image' || kind === 'video';

            return {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                kind,
                previewUrl: hasPreview ? URL.createObjectURL(file) : '',
            };
        });

        setPendingDropFiles((prev) => [...prev, ...mapped]);
    };

    const clearPendingDropFiles = () => {
        setPendingDropFiles((prev) => {
            cleanupPendingDropFiles(prev);
            return [];
        });
    };

    const removePendingDropFile = (fileId) => {
        setPendingDropFiles((prev) => {
            const target = prev.find((item) => item.id === fileId);
            if (target?.previewUrl) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((item) => item.id !== fileId);
        });
    };

    const appendAiAttachmentPreviewMessages = (aiFiles = []) => {
        if (
            !selectedContact?.isAI ||
            !Array.isArray(aiFiles) ||
            !aiFiles.length
        ) {
            return;
        }

        aiFiles.forEach((file) => {
            const fileType = file?.type || '';
            const isImage = fileType.startsWith('image/');
            const isVideo = fileType.startsWith('video/');
            const previewUrl = URL.createObjectURL(file);

            onSendMessage({
                id: `local-ai-attach-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 9)}`,
                senderId: userId,
                receiverId: selectedContact.id,
                content: previewUrl,
                type: isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'FILE',
                fileName: file.name || '',
                createAt: new Date().toISOString(),
                recalled: false,
                deletedByUsers: [],
                isRead: true,
                isPinned: false,
                isEdited: false,
            });
        });
    };

    const appendUploadedMessages = (uploadResponse) => {
        const rows = Array.isArray(uploadResponse)
            ? uploadResponse
            : uploadResponse
              ? [uploadResponse]
              : [];

        rows.forEach((row) => {
            if (!row || row.error) return;

            const normalized = {
                id: row.id || `upload-${Date.now()}-${Math.random()}`,
                senderId: row.senderId || userId,
                receiverId:
                    row.receiverId ||
                    (selectedContact?.isGroup ? null : selectedContact?.id),
                groupId:
                    row.groupId ||
                    (selectedContact?.isGroup ? selectedContact?.id : null),
                content: row.content || row.url || '',
                type: row.type || 'FILE',
                fileName: row.fileName || '',
                thumbnail: row.thumbnail || '',
                publicId: row.publicId || '',
                createAt: row.createdAt || new Date().toISOString(),
                recalled: false,
                deletedByUsers: [],
                isRead: false,
                isPinned: false,
                isEdited: false,
            };

            onSendMessage(normalized);
        });
    };

    const handleSendRecordedVoice = async () => {
        if (!voicePreviewBlob) {
            toast.error('Chưa có voice để gửi');
            return;
        }

        if (!selectedContact?.id || !token) {
            toast.error('Vui lòng chọn cuộc trò chuyện và đăng nhập');
            return;
        }

        try {
            const outputType = voicePreviewBlob.type || 'audio/webm';
            const extension = outputType.includes('ogg')
                ? 'ogg'
                : outputType.includes('wav')
                  ? 'wav'
                  : outputType.includes('mp4') || outputType.includes('m4a')
                    ? 'm4a'
                    : 'webm';

            const file = new File(
                [voicePreviewBlob],
                `voice-${Date.now()}.${extension}`,
                { type: outputType },
            );

            setIsSending(true);
            const response = await uploadFile(
                [file],
                selectedContact.isGroup ? null : selectedContact.id,
                token,
                selectedContact.isGroup ? selectedContact.id : null,
            );
            appendUploadedMessages(response);
            clearVoicePreview();
        } catch (error) {
            console.error('Error sending voice message:', error);
            toast.error(
                `Gửi voice thất bại: ${
                    error.response?.data?.message || error.message
                }`,
            );
        } finally {
            setIsSending(false);
        }
    };

    const handleSendPendingDropFiles = async () => {
        if (!pendingDropFiles.length) return;
        if (!selectedContact?.id || !token) {
            toast.error('Vui lòng chọn cuộc trò chuyện và đăng nhập');
            return;
        }

        if (selectedContact?.isAI) {
            const files = pendingDropFiles.map((item) => item.file);
            if (files.length) {
                setIsSending(true);
                try {
                    appendAiAttachmentPreviewMessages(files);
                    lastAiContextFilesRef.current = files;

                    await onRequestAIReply?.('', files);
                    clearPendingDropFiles();
                    toast.success('Đã gửi tệp cho AI thành công');
                } catch (error) {
                    toast.error(
                        `Lỗi gửi tệp cho AI: ${
                            error.response?.data?.message || error.message
                        }`,
                    );
                } finally {
                    setIsSending(false);
                }
            }
            return;
        }

        setIsSending(true);
        try {
            const files = pendingDropFiles.map((item) => item.file);
            const response = await uploadFile(
                files,
                selectedContact.isGroup ? null : selectedContact.id,
                token,
                selectedContact.isGroup ? selectedContact.id : null,
            );
            appendUploadedMessages(response);
            clearPendingDropFiles();
            toast.success('Đã gửi tệp thành công');
        } catch (error) {
            console.error('Error sending dropped files:', error);
            toast.error(
                `Lỗi gửi tệp: ${
                    error.response?.data?.message || error.message
                }`,
            );
        } finally {
            setIsSending(false);
        }
    };

    const handleDragEnter = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragDepthRef.current += 1;
        setIsDragOver(true);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragDepthRef.current -= 1;
        if (dragDepthRef.current <= 0) {
            dragDepthRef.current = 0;
            setIsDragOver(false);
        }
    };

    const handleDropFiles = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragDepthRef.current = 0;
        setIsDragOver(false);

        const droppedFiles = Array.from(event.dataTransfer?.files || []);
        if (!droppedFiles.length) return;

        addPendingDropFiles(droppedFiles);
        toast.info('Đã thêm tệp vào bản xem trước. Bấm gửi để xác nhận.');
    };

    const handleToggleVoiceRecording = async () => {
        if (!selectedContact?.id) {
            toast.error('Vui lòng chọn cuộc trò chuyện trước');
            return;
        }

        if (!token) {
            toast.error('Vui lòng đăng nhập để gửi voice');
            return;
        }

        if (!navigator?.mediaDevices?.getUserMedia) {
            toast.error('Trình duyệt không hỗ trợ ghi âm');
            return;
        }

        if (!window.MediaRecorder) {
            toast.error('Trình duyệt không hỗ trợ MediaRecorder');
            return;
        }

        if (isRecordingVoice) {
            try {
                mediaRecorderRef.current?.stop();
            } catch (error) {
                console.error('Error stopping recorder:', error);
                cleanupRecordingResources();
                setIsRecordingVoice(false);
            }
            return;
        }

        clearVoicePreview();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            const mimeType = MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : '';
            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);

            recordingStreamRef.current = stream;
            mediaRecorderRef.current = recorder;
            recordingChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordingChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                try {
                    const chunks = recordingChunksRef.current;
                    if (!chunks.length) {
                        return;
                    }

                    const outputType =
                        mimeType || chunks[0].type || 'audio/webm';
                    const blob = new Blob(chunks, { type: outputType });
                    const url = URL.createObjectURL(blob);

                    setVoicePreviewBlob(blob);
                    setVoicePreviewUrl(url);
                    setVoicePreviewDuration(recordingSeconds);
                } catch (error) {
                    console.error('Error preparing voice message:', error);
                    toast.error('Không thể tạo preview voice');
                } finally {
                    setIsRecordingVoice(false);
                    setRecordingSeconds(0);
                    cleanupRecordingResources();
                }
            };

            recorder.start();
            setIsRecordingVoice(true);
            setRecordingSeconds(0);
            toast.info('Đang ghi âm... Bấm lại nút mic để dừng');
        } catch (error) {
            console.error('Error starting voice recording:', error);
            toast.error(
                'Không thể bắt đầu ghi âm. Vui lòng kiểm tra quyền microphone.',
            );
            setIsRecordingVoice(false);
            setRecordingSeconds(0);
            cleanupRecordingResources();
        }
    };

    useEffect(() => {
        if (isRecordingVoice) {
            recordingTimerRef.current = setInterval(() => {
                setRecordingSeconds((prev) => prev + 1);
            }, 1000);
        } else if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        };
    }, [isRecordingVoice]);

    useEffect(() => {
        pendingDropFilesRef.current = pendingDropFiles;
    }, [pendingDropFiles]);

    useEffect(() => {
        voicePreviewUrlRef.current = voicePreviewUrl;
    }, [voicePreviewUrl]);

    useEffect(() => {
        return () => {
            try {
                mediaRecorderRef.current?.stop();
            } catch (error) {
                console.error('Error stopping recorder on cleanup:', error);
            }
            cleanupRecordingResources();
            if (voicePreviewUrlRef.current) {
                URL.revokeObjectURL(voicePreviewUrlRef.current);
            }
            cleanupPendingDropFiles(pendingDropFilesRef.current);
        };
    }, []);

    useEffect(() => {
        setPendingDropFiles((prev) => {
            cleanupPendingDropFiles(prev);
            return [];
        });
        dragDepthRef.current = 0;
        setIsDragOver(false);
    }, [selectedContact?.id]);

    useEffect(() => {
        setShowAiQuickSuggestions(Boolean(selectedContact?.isAI));
        if (!selectedContact?.isAI) {
            lastAiContextFilesRef.current = [];
        }
    }, [selectedContact?.id, selectedContact?.isAI]);

    const isAudioMessage = (message) => {
        if (message.type === 'AUDIO') return true;
        if (message.type !== 'FILE') return false;

        const fileName = String(message.fileName || '').toLowerCase();
        const content = String(message.content || '').toLowerCase();
        return (
            /(\.webm|\.mp3|\.wav|\.ogg|\.m4a|\.aac)(\?|$)/.test(fileName) ||
            /(\.webm|\.mp3|\.wav|\.ogg|\.m4a|\.aac)(\?|$)/.test(content)
        );
    };

    const resolveMessageMediaUrl = (message) => {
        const raw = String(message?.content || '').trim();
        if (!raw && !message?.publicId) return '';

        const cleaned = raw
            .replace('?fl_attachment', '')
            .replace('&fl_attachment', '');

        if (
            cleaned.startsWith('http://') ||
            cleaned.startsWith('https://') ||
            cleaned.startsWith('blob:') ||
            cleaned.startsWith('data:') ||
            cleaned.startsWith('//') ||
            cleaned.startsWith('/')
        ) {
            return cleaned;
        }

        const publicId = String(message?.publicId || '').trim();
        if (publicId && cloudinaryCloudName) {
            const encodedPublicId = publicId
                .split('/')
                .map((part) => encodeURIComponent(part))
                .join('/');

            const resourceType =
                message?.type === 'IMAGE'
                    ? 'image'
                    : message?.type === 'VIDEO' || message?.type === 'AUDIO'
                      ? 'video'
                      : 'raw';

            return `https://res.cloudinary.com/${cloudinaryCloudName}/${resourceType}/upload/${encodedPublicId}`;
        }

        return '';
    };

    const handleQuickAiQuestion = async (question) => {
        if (!selectedContact?.isAI || !question || isSending) return;
        if (!token) {
            toast.error('Vui lòng đăng nhập để gửi tin nhắn');
            return;
        }

        setShowAiQuickSuggestions(false);
        setIsSending(true);
        const tempKey = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;
        const aiUserMessage = {
            senderId: userId,
            receiverId: selectedContact.id,
            content: question,
            type: 'TEXT',
            tempKey: tempKey,
            id: `local-ai-${tempKey}`,
            createAt: new Date().toISOString(),
            recalled: false,
            deletedByUsers: [],
            isRead: true,
            isPinned: false,
            isEdited: false,
        };

        try {
            onMessageInputChange({ target: { value: '' } });
            onSendMessage(aiUserMessage);
            await onRequestAIReply?.(question, lastAiContextFilesRef.current);
        } catch (error) {
            toast.error(`Lỗi AI: ${error.message}`);
        } finally {
            setIsSending(false);
            setShowEmojiPicker(false);
        }
    };

    const onEmojiClick = (emojiObject) => {
        const newMessageInput = messageInput + emojiObject.emoji;
        onMessageInputChange({ target: { value: newMessageInput } });
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Voice/Video Call Handlers
    const handleStartCall = async (withVideo = false) => {
        if (selectedContact?.isGroup) {
            toast.error('Không thể gọi cho nhóm');
            return;
        }

        if (selectedContact?.isAI) {
            toast.info('Không thể gọi cho OTT AI Assistant');
            return;
        }

        try {
            setIsVideoCall(withVideo);
            setIsInitiator(true);
            setCallStatus('Đang kết nối...');
            setCallModalOpen(true);

            // Initialize peer connection
            initializePeerConnection(
                (candidate) => {
                    // Send ICE candidate to peer
                    sendCallSignal(
                        'ice-candidate',
                        candidate,
                        selectedContact.id,
                        token,
                    );
                },
                (stream) => {
                    // Receive remote stream
                    setRemoteStream(stream);
                    setCallStatus('Đang gọi...');
                },
            );

            // Get local media stream
            const stream = await startCall(withVideo);
            setLocalStream(stream);

            // Create and send offer
            const offer = await createOffer();
            sendCallSignal(
                'offer',
                { offer, isVideoCall: withVideo },
                selectedContact.id,
                token,
            );

            setCallStatus('Đang đổ chuông...');
        } catch (error) {
            console.error('Error starting call:', error);

            // Show specific error message for permissions
            if (error.message.includes('quyền truy cập')) {
                toast.error(
                    'Vui lòng cho phép quyền microphone/camera! Click vào icon 🔒 bên cạnh URL và bật quyền.',
                    { autoClose: 8000 },
                );
            } else {
                toast.error('Không thể bắt đầu cuộc gọi: ' + error.message);
            }
            handleEndCall();
        }
    };

    const handleEndCall = () => {
        endCall();
        setCallModalOpen(false);
        setLocalStream(null);
        setRemoteStream(null);
        setCallStatus('');
        setIsInitiator(false);
        setIsAudioEnabled(true);
        setIsVideoEnabled(true);

        if (isInitiator) {
            sendCallSignal('call-end', {}, selectedContact.id, token);
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

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (!files.length) return;
        if (!token) {
            toast.error('Vui lòng đăng nhập để gửi file');
            return;
        }
        if (!selectedContact?.id) {
            toast.error('Không tìm thấy ID liên hệ hoặc nhóm');
            return;
        }

        if (selectedContact?.isAI) {
            addPendingDropFiles(files);
            toast.info(
                'Đã thêm tệp vào bản xem trước. Bấm gửi để AI phân tích.',
            );

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            if (documentInputRef.current) {
                documentInputRef.current.value = '';
            }
            return;
        }

        console.log('Uploading files:', {
            isGroup: selectedContact.isGroup,
            id: selectedContact.id,
            files: files.map((f) => ({
                name: f.name,
                type: f.type,
                size: f.size,
            })),
            token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
        });

        setIsSending(true);
        try {
            const response = await uploadFile(
                files,
                selectedContact.isGroup ? null : selectedContact.id,
                token,
                selectedContact.isGroup ? selectedContact.id : null,
            );
            appendUploadedMessages(response);
        } catch (error) {
            console.error('Error uploading file:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers,
                token: token ? 'EXISTS' : 'NO TOKEN',
            });

            // Xử lý lỗi cụ thể
            if (error.response?.status === 403) {
                toast.error('Lỗi xác thực. Vui lòng đăng nhập lại!');
            } else if (error.response?.status === 401) {
                toast.error('Token hết hạn. Vui lòng đăng nhập lại!');
            } else {
                toast.error(
                    `Lỗi gửi file: ${
                        error.response?.data?.message || error.message
                    }`,
                );
            }
        } finally {
            setIsSending(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            if (documentInputRef.current) {
                documentInputRef.current.value = '';
            }
        }
    };

    const handleRecallMessage = (message) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để thu hồi tin nhắn');
            return;
        }

        setIsSending(true);
        try {
            const identifier = message.id;
            if (!identifier) {
                throw new Error('Missing message identifier.');
            }
            const success = recallMessage(identifier, userId, token);
            if (success) {
                setLocalMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === message.id
                            ? { ...msg, recalled: true }
                            : msg,
                    ),
                );
                toast.success('Đã thu hồi');
            } else {
                toast.error(
                    'Không thể thu hồi tin nhắn: WebSocket không hoạt động',
                );
            }
        } catch (error) {
            console.error('Error recalling message:', error);
            toast.error(`Lỗi thu hồi tin nhắn: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = (message) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để xóa tin nhắn');
            return;
        }

        setIsSending(true);
        try {
            const identifier = message.id;
            if (!identifier) {
                throw new Error('Missing message identifier.');
            }
            const success = deleteMessage(identifier, userId, token);
            if (success) {
                const deletedMessageIds = JSON.parse(
                    localStorage.getItem('deletedMessageIds') || '[]',
                );
                if (message.id && !deletedMessageIds.includes(message.id)) {
                    deletedMessageIds.push(message.id);
                    localStorage.setItem(
                        'deletedMessageIds',
                        JSON.stringify(deletedMessageIds),
                    );
                }

                setLocalMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === message.id
                            ? {
                                  ...msg,
                                  deletedByUsers: [
                                      ...(msg.deletedByUsers || []),
                                      userId,
                                  ],
                              }
                            : msg,
                    ),
                );
                toast.success('Đã xóa');
            } else {
                toast.error(
                    'Không thể xóa tin nhắn: WebSocket không hoạt động',
                );
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error(`Lỗi xóa tin nhắn: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handlePinMessage = (message) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để ghim tin nhắn');
            return;
        }

        setIsSending(true);
        try {
            const identifier = message.id;
            if (!identifier) {
                throw new Error('Missing message identifier.');
            }
            const success = pinMessage(identifier, userId, token);
            if (success) {
                setLocalMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === message.id
                            ? { ...msg, isPinned: true }
                            : msg,
                    ),
                );
                toast.success('Đã ghim');
            } else {
                toast.error(
                    'Không thể ghim tin nhắn: WebSocket không hoạt động',
                );
            }
        } catch (error) {
            console.error('Error pinning message:', error);
            toast.error(`Lỗi ghim tin nhắn: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleUnpinMessage = (message) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để bỏ ghim tin nhắn');
            return;
        }

        setIsSending(true);
        try {
            const identifier = message.id;
            if (!identifier) {
                throw new Error('Missing message identifier.');
            }
            const success = unpinMessage(identifier, userId, token);
            if (success) {
                setLocalMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === message.id
                            ? { ...msg, isPinned: false }
                            : msg,
                    ),
                );
                toast.success('Đã bỏ ghim');
            } else {
                toast.error(
                    'Không thể bỏ ghim tin nhắn: WebSocket không hoạt động',
                );
            }
        } catch (error) {
            console.error('Error unpinning message:', error);
            toast.error(`Lỗi bỏ ghim tin nhắn: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleUnpinFromModal = async (message) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để bỏ ghim tin nhắn');
            return;
        }

        try {
            const success = await unpinMessage(message.id, userId, token);
            if (success) {
                setPinnedMessages((prev) =>
                    prev.filter((msg) => msg.id !== message.id),
                );
                setLocalMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === message.id
                            ? { ...msg, isPinned: false }
                            : msg,
                    ),
                );
                toast.success('Đã bỏ ghim');
            } else {
                toast.error(
                    'Không thể bỏ ghim tin nhắn: WebSocket không hoạt động',
                );
            }
        } catch (error) {
            console.error('Error unpinning message from modal:', error);
            toast.error(`Lỗi bỏ ghim tin nhắn: ${error.message}`);
        }
    };

    const handleOpenForwardDialog = (message) => {
        setMessageToForward(message);
        setForwardDialogOpen(true);
    };

    const handleOpenEditDialog = (message) => {
        if (message.type !== 'TEXT') {
            toast.error('Chỉ có thể chỉnh sửa tin nhắn văn bản');
            return;
        }
        setMessageToEdit(message);
        setEditContent(message.content);
        setEditDialogOpen(true);
    };

    const handleEditMessage = async () => {
        if (!editContent.trim()) {
            toast.error('Nội dung tin nhắn không được để trống');
            return;
        }
        if (!token) {
            toast.error('Vui lòng đăng nhập để chỉnh sửa tin nhắn');
            return;
        }

        setIsSending(true);
        try {
            const success = await editMessage(
                messageToEdit.id,
                userId,
                editContent,
                selectedContact.isGroup ? selectedContact.id : null,
                token,
            );
            if (success) {
                setLocalMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === messageToEdit.id
                            ? { ...msg, content: editContent, isEdited: true }
                            : msg,
                    ),
                );
                toast.success('Đã chỉnh sửa');
            } else {
                toast.error(
                    'Không thể chỉnh sửa tin nhắn: WebSocket không hoạt động',
                );
            }
        } catch (error) {
            console.error('Error editing message:', error);
            toast.error(`Lỗi chỉnh sửa tin nhắn: ${error.message}`);
        } finally {
            setIsSending(false);
            setEditDialogOpen(false);
            setMessageToEdit(null);
            setEditContent('');
        }
    };

    const handleForwardMessage = (contact) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để chuyển tiếp tin nhắn');
            return;
        }
        if (!contact.id) {
            toast.error('Không tìm thấy ID của liên hệ hoặc nhóm');
            return;
        }

        setIsSending(true);
        try {
            const identifier = messageToForward?.id;
            if (!identifier) {
                throw new Error('Missing message identifier.');
            }
            console.log('Forwarding message:', {
                identifier,
                userId,
                receiverId: contact.isGroup ? null : contact.id,
                groupId: contact.isGroup ? contact.id : null,
                content: messageToForward.content,
                type: messageToForward.type,
            });
            const success = forwardMessage(
                identifier,
                userId,
                contact.isGroup ? null : contact.id,
                contact.isGroup ? contact.id : null,
                messageToForward.content,
                token,
            );
            if (success) {
                toast.success('Đã chuyển tiếp');
            } else {
                toast.error(
                    'Không thể chuyển tiếp tin nhắn: WebSocket không hoạt động',
                );
            }
        } catch (error) {
            console.error('Lỗi chuyển tiếp tin nhắn:', error);
            toast.error(`Lỗi chuyển tiếp tin nhắn: ${error.message}`);
        } finally {
            setIsSending(false);
            setForwardDialogOpen(false);
            setMessageToForward(null);
        }
    };

    const handleSelectMessage = (message) => {
        setPinnedMessagesDialogOpen(false);
        const messageElement = document.getElementById(`message-${message.id}`);
        if (messageElement) {
            messageElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    };

    // Poll handlers
    const handleCreatePoll = async (pollData) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để tạo bình chọn');
            return;
        }

        if (!selectedContact?.isGroup || !selectedContact?.id) {
            toast.error('Chỉ có thể tạo bình chọn trong nhóm');
            return;
        }

        setIsSending(true);
        try {
            const savedPoll = await createPollApi(
                selectedContact.id,
                pollData.question,
                pollData.options,
                pollData.allowMultiple,
                token,
            );

            if (savedPoll) {
                setPolls((prev) => {
                    if (prev.some((item) => item.id === savedPoll.id)) {
                        return prev.map((item) =>
                            item.id === savedPoll.id ? savedPoll : item,
                        );
                    }
                    return [savedPoll, ...prev];
                });
                toast.success('Đã tạo bình chọn!');
            }
        } catch (error) {
            console.error('Error creating poll:', error);
            toast.error(`Lỗi tạo bình chọn: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleVotePoll = async (pollId, optionIndex) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để bình chọn');
            return;
        }

        try {
            const updatedPoll = await votePollApi(pollId, optionIndex, token);
            setPolls((prev) =>
                prev.map((poll) =>
                    poll.id === updatedPoll.id ? updatedPoll : poll,
                ),
            );
            toast.success('Đã ghi nhận bình chọn');
        } catch (error) {
            console.error('Error voting poll:', error);
            toast.error(`Lỗi bình chọn: ${error.message}`);
        }
    };

    // Note handlers
    const handleAddNote = async (note) => {
        const groupId = selectedContact.isGroup ? selectedContact.id : null;
        if (!groupId || !token) return;

        try {
            const savedNote = await createGroupNote(
                groupId,
                note.title,
                note.content,
                token,
            );
            setGroupNotes((prev) => [savedNote, ...prev]);
            toast.success('Đã thêm ghi chú!');
        } catch (error) {
            console.error('Error adding note:', error);
            toast.error('Lỗi thêm ghi chú: ' + error.message);
        }
    };

    const handleEditNote = async (noteId, updates) => {
        if (!token) return;

        try {
            const updatedNote = await updateGroupNote(
                noteId,
                updates.title,
                updates.content,
                token,
            );
            setGroupNotes((prev) =>
                prev.map((note) => (note.id === noteId ? updatedNote : note)),
            );
            toast.success('Đã cập nhật ghi chú!');
        } catch (error) {
            console.error('Error updating note:', error);
            toast.error('Lỗi cập nhật ghi chú: ' + error.message);
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!token) return;

        if (window.confirm('Bạn có chắc muốn xóa ghi chú này?')) {
            try {
                await deleteGroupNote(noteId, token);
                setGroupNotes((prev) =>
                    prev.filter((note) => note.id !== noteId),
                );
                toast.success('Đã xóa ghi chú!');
            } catch (error) {
                console.error('Error deleting note:', error);
                toast.error('Lỗi xóa ghi chú: ' + error.message);
            }
        }
    };

    const getMessagePreview = (msg) => {
        if (!msg) return '';

        const resolveFileName = (fileMsg) => {
            if (fileMsg?.fileName) return fileMsg.fileName;
            if (!fileMsg?.content) return '[Tệp đính kèm]';

            try {
                const cleanUrl = fileMsg.content.split('?')[0];
                const segments = cleanUrl.split('/').filter(Boolean);
                const lastSegment = segments[segments.length - 1] || '';
                const decoded = decodeURIComponent(lastSegment);
                return decoded || '[Tệp đính kèm]';
            } catch {
                return '[Tệp đính kèm]';
            }
        };

        switch (msg.type) {
            case 'TEXT':
                return msg.content || '';
            case 'IMAGE':
                return '[Hình ảnh]';
            case 'VIDEO':
                return '[Video]';
            case 'AUDIO':
                return '[Âm thanh]';
            case 'FILE':
                return isAudioMessage(msg)
                    ? '[Âm thanh]'
                    : resolveFileName(msg);
            default:
                return '[Tin nhắn]';
        }
    };

    const pinnedHighlight = useMemo(() => {
        const pinned = localMessages.filter((m) => m.isPinned);
        if (!pinned.length) return null;

        return pinned.reduce((latest, msg) => {
            const latestTime = new Date(
                latest.createAt || latest.createdAt || 0,
            ).getTime();
            const msgTime = new Date(
                msg.createAt || msg.createdAt || 0,
            ).getTime();
            return msgTime >= latestTime ? msg : latest;
        }, pinned[0]);
    }, [localMessages]);

    const visibleMessages = useMemo(() => {
        const autoDeleteOption = selectedContact?.autoDeleteOption || 'off';
        const ttlMs =
            autoDeleteOption === '5m'
                ? 5 * 60 * 1000
                : autoDeleteOption === '1h'
                  ? 60 * 60 * 1000
                  : autoDeleteOption === '24h'
                    ? 24 * 60 * 60 * 1000
                    : null;

        if (!ttlMs) {
            return localMessages;
        }

        const now = Date.now();
        return localMessages.filter((msg) => {
            const createdTime = new Date(
                msg.createAt || msg.createdAt || 0,
            ).getTime();
            if (!createdTime || Number.isNaN(createdTime)) {
                return true;
            }
            return now - createdTime <= ttlMs;
        });
    }, [localMessages, selectedContact?.autoDeleteOption]);

    const messagesForRender = useMemo(() => {
        if (!isAiConversation || visibleMessages.length > 0) {
            return visibleMessages;
        }

        return [
            {
                id: 'ai-default-welcome',
                senderId: selectedContact?.id,
                receiverId: userId,
                content:
                    'Xin chào! Mình là OTT AI Assistant. Mình có thể giúp bạn gợi ý lộ trình học, phân tích tài liệu và trả lời nhanh các câu hỏi học tập.',
                type: 'TEXT',
                createAt: new Date().toISOString(),
                recalled: false,
                deletedByUsers: [],
                isRead: true,
                isPinned: false,
                isEdited: false,
            },
        ];
    }, [isAiConversation, visibleMessages, selectedContact?.id, userId]);

    useEffect(() => {
        const selectedId = selectedContact?.id;
        const selectedIsGroup = Boolean(selectedContact?.isGroup);
        const selectedIsAi = Boolean(selectedContact?.isAI);

        if (!selectedId || !token) {
            setSyncedPinnedIds(new Set());
            return;
        }

        if (selectedIsAi) {
            setSyncedPinnedIds(new Set());
            setPinnedMessages([]);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const pinned = await getPinnedMessages(
                    selectedIsGroup ? null : selectedId,
                    selectedIsGroup ? selectedId : null,
                    token,
                );

                if (cancelled) return;

                const filteredPinned = (pinned || [])
                    .filter((msg) => {
                        const isPinnedFlag =
                            msg.isPinned === true || msg.isPinned === 'true';
                        const hasPinMeta = !!(
                            msg.pinBy ||
                            msg.pinnedBy ||
                            msg.pinnedAt ||
                            msg.pinAt ||
                            msg.pinTime
                        );

                        if (!isPinnedFlag && !hasPinMeta) {
                            return false;
                        }

                        if (selectedIsGroup) {
                            return msg.groupId === selectedId;
                        }

                        const otherId = selectedId;
                        const isDirectMessage =
                            msg.groupId === undefined || msg.groupId === null;
                        const involvesCurrentPair =
                            (msg.senderId === userId &&
                                msg.receiverId === otherId) ||
                            (msg.senderId === otherId &&
                                msg.receiverId === userId);

                        return isDirectMessage && involvesCurrentPair;
                    })
                    .reduce((unique, msg) => {
                        if (!unique.some((item) => item.id === msg.id)) {
                            unique.push(msg);
                        }
                        return unique;
                    }, []);

                const ids = new Set(filteredPinned.map((m) => m.id));
                setSyncedPinnedIds(ids);
                setPinnedMessages(filteredPinned);
                setLocalMessages((prev) =>
                    prev.map((msg) =>
                        msg.id ? { ...msg, isPinned: ids.has(msg.id) } : msg,
                    ),
                );
            } catch (error) {
                console.error('Error syncing pinned messages:', error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        selectedContact?.id,
        selectedContact?.isGroup,
        selectedContact?.isAI,
        token,
        userId,
    ]);

    if (!selectedContact) {
        return (
            <div className="flex-1 flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-emerald-50/30">
                <div className="text-center max-w-md px-8">
                    {/* Illustration */}
                    <div className="relative mb-8">
                        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center">
                            <svg
                                className="w-16 h-16 text-emerald-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                            </svg>
                        </div>
                        {/* Decorative elements */}
                        <div
                            className="absolute top-0 right-1/4 w-4 h-4 bg-amber-300 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                            className="absolute bottom-4 left-1/4 w-3 h-3 bg-violet-300 rounded-full animate-bounce"
                            style={{ animationDelay: '0.3s' }}
                        ></div>
                        <div
                            className="absolute top-1/2 right-1/6 w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.5s' }}
                        ></div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                        Chào mừng đến OTT Education!
                        <HiAcademicCap className="w-7 h-7 text-amber-500" />
                    </h2>
                    <p className="text-gray-500 mb-6">
                        Chọn một cuộc trò chuyện để bắt đầu nhắn tin, chia sẻ
                        tài liệu học tập và kết nối với bạn bè.
                    </p>

                    {/* Quick tips */}
                    <div className="flex flex-wrap justify-center gap-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm text-gray-600 shadow-sm border border-gray-100">
                            <BiMessageSquareDetail className="w-4 h-4 text-emerald-500" />
                            Nhắn tin
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm text-gray-600 shadow-sm border border-gray-100">
                            <BiVideo className="w-4 h-4 text-violet-500" />
                            Video call
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm text-gray-600 shadow-sm border border-gray-100">
                            <BiLinkAlt className="w-4 h-4 text-amber-500" />
                            Chia sẻ file
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 h-full overflow-hidden">
            <div
                className="flex-1 flex flex-col bg-liquid-app relative"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropFiles}
            >
                {isDragOver && (
                    <div className="absolute inset-0 z-[1200] bg-emerald-500/10 backdrop-blur-[1px] border-2 border-dashed border-emerald-500 rounded-xl flex items-center justify-center pointer-events-none">
                        <div className="px-5 py-3 bg-white/95 rounded-xl shadow-md text-emerald-700 font-medium">
                            Thả file, ảnh, video vào đây để xem trước
                        </div>
                    </div>
                )}
                {/* Animated Background Elements */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl pointer-events-none"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.1, 0.15, 0.1],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 2,
                    }}
                    className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-3xl pointer-events-none"
                />

                <div className="p-3 sm:p-4 flex items-center liquid-toolbar shadow-sm relative z-10">
                    <button
                        onClick={handleCloseConversation}
                        className="tap-target mr-1 sm:mr-2 lg:hidden hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                        title="Quay lại danh sách cuộc trò chuyện"
                    >
                        <BiArrowBack size={22} />
                    </button>
                    <div className="cursor-pointer" onClick={handleProfileOpen}>
                        {selectedContact.avatar ? (
                            <img
                                src={selectedContact.avatar}
                                alt={selectedContact.name}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                                {selectedContact.isGroup ? (
                                    <BiGroup size={24} />
                                ) : (
                                    selectedContact.name?.charAt(0)
                                )}
                            </div>
                        )}
                    </div>
                    <div
                        className="ml-3 sm:ml-4 flex-1 min-w-0 cursor-pointer"
                        onClick={handleProfileOpen}
                    >
                        <p className="font-bold text-sm sm:text-base truncate">
                            {selectedContact.name}
                        </p>
                        <p
                            className="text-gray-500 text-xs sm:text-sm truncate"
                            key={currentTime.getTime()}
                        >
                            {selectedContact.isGroup
                                ? `Nhóm`
                                : selectedContact.isAI
                                  ? 'Trợ lý học tập • Hỗ trợ file, ảnh'
                                  : selectedContact.status === 'online'
                                    ? 'Đang hoạt động'
                                    : selectedContact.lastSeen
                                      ? `Hoạt động ${getLastSeenText(
                                            selectedContact.lastSeen,
                                        )}`
                                      : 'Không hoạt động'}
                        </p>
                    </div>
                    {selectedContact.isGroup ? (
                        <>
                            <button
                                onClick={() => setShowSearchBar(!showSearchBar)}
                                className="tap-target hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                            >
                                <BiSearch size={22} />
                            </button>
                            {!isAiConversation && (
                                <button
                                    onClick={handleShowPinnedMessages}
                                    className="tap-target hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                                >
                                    <BiPin size={22} />
                                </button>
                            )}
                            <button
                                onClick={() => setShowGroupInfo(!showGroupInfo)}
                                className={`tap-target hover:bg-gray-100 rounded-full transition-colors ${
                                    showGroupInfo
                                        ? 'text-[#0091ff]'
                                        : 'text-gray-600'
                                }`}
                                title="Thông tin nhóm"
                            >
                                <BiInfoCircle size={22} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowSearchBar(!showSearchBar)}
                                className="tap-target hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                            >
                                <BiSearch size={22} />
                            </button>
                            {!isAiConversation && (
                                <button
                                    onClick={handleShowPinnedMessages}
                                    className="tap-target hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                                    title="Tin nhắn đã ghim"
                                >
                                    <BiPin size={22} />
                                </button>
                            )}
                            {!selectedContact?.isGroup &&
                                !selectedContact?.isAI && (
                                    <>
                                        <button
                                            onClick={() =>
                                                handleStartCall(false)
                                            }
                                            className="tap-target hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                                            title="Gọi thoại"
                                        >
                                            <BiPhone size={22} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleStartCall(true)
                                            }
                                            className="tap-target hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                                            title="Gọi video"
                                        >
                                            <BiVideo size={22} />
                                        </button>
                                    </>
                                )}
                            <button
                                onClick={() => setShowGroupInfo(!showGroupInfo)}
                                className={`tap-target hover:bg-gray-100 rounded-full transition-colors ${
                                    showGroupInfo
                                        ? 'text-[#0091ff]'
                                        : 'text-gray-600'
                                }`}
                                title="Thông tin"
                            >
                                <BiInfoCircle size={22} />
                            </button>
                            {isAiConversation && (
                                <button
                                    onClick={handleStartNewAiConversation}
                                    className="tap-target hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                                    title="Cuộc trò chuyện mới"
                                >
                                    <BiMessageSquareDetail size={22} />
                                </button>
                            )}
                        </>
                    )}
                    <button
                        onClick={handleCloseConversation}
                        className="tap-target hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                        title="Đóng cuộc trò chuyện"
                    >
                        <BiX size={22} />
                    </button>
                </div>

                {!isAiConversation && pinnedHighlight && (
                    <div
                        onClick={() => handleSelectMessage(pinnedHighlight)}
                        className="flex items-center gap-3 px-4 py-2 bg-[#fff6e6] border-b border-[#ffd599] cursor-pointer"
                    >
                        <BiPin color="#b56c00" size={18} />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#b56c00] font-bold tracking-wide">
                                Tin nhắn đã ghim
                            </p>
                            <p
                                className="text-sm text-[#8a5a00] truncate"
                                title={getMessagePreview(pinnedHighlight)}
                            >
                                {getMessagePreview(pinnedHighlight)}
                            </p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleShowPinnedMessages();
                            }}
                            className="text-sm text-[#b56c00] font-semibold px-2 hover:underline"
                        >
                            Xem tất cả
                        </button>
                    </div>
                )}

                {showSearchBar && (
                    <SearchMessages
                        userId={userId}
                        selectedContact={selectedContact}
                        token={token}
                        onSelectMessage={handleSelectMessage}
                        onClose={() => setShowSearchBar(false)}
                    />
                )}

                {/* Group Notes Banner */}
                {selectedContact?.isGroup && groupNotes.length > 0 && (
                    <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50">
                        <div className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <BiNotepad
                                        className="text-amber-600"
                                        size={20}
                                    />
                                    <h3 className="text-sm font-semibold text-amber-800">
                                        Ghi chú nhóm ({groupNotes.length})
                                    </h3>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsNoteModalOpen(true)}
                                    className="text-xs text-amber-700 hover:text-amber-900 font-medium px-3 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                                >
                                    Xem tất cả
                                </motion.button>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {groupNotes.slice(0, 3).map((note) => (
                                    <motion.div
                                        key={note.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-start gap-2 p-2 bg-white/70 rounded-lg border border-amber-200/50 hover:border-amber-300 hover:bg-white transition-all cursor-pointer"
                                        onClick={() => setIsNoteModalOpen(true)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">
                                                {note.title}
                                            </p>
                                            <p className="text-xs text-gray-600 truncate">
                                                {note.content}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                            {new Date(
                                                note.createdAt,
                                            ).toLocaleDateString('vi-VN', {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </motion.div>
                                ))}
                                {groupNotes.length > 3 && (
                                    <p className="text-xs text-amber-600 text-center py-1">
                                        Còn {groupNotes.length - 3} ghi chú
                                        khác...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-auto p-4 relative z-10 liquid-panel">
                    {isSending && (
                        <div className="flex justify-center my-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                        </div>
                    )}
                    {messagesForRender.map((message, index) => (
                        <div
                            key={
                                message.id
                                    ? `${message.id}-${index}`
                                    : message.tempKey
                                      ? `${message.tempKey}-${index}`
                                      : `${message.createAt}-${message.senderId}-${index}`
                            }
                            className={`flex p-2 px-4 items-center ${
                                message.senderId === userId
                                    ? 'justify-end'
                                    : 'justify-start'
                            }`}
                            id={`message-${message.id}`}
                        >
                            {!message.recalled &&
                                !message.deletedByUsers?.includes(userId) &&
                                !isAiConversation && (
                                    <div className="flex flex-row items-center relative">
                                        {/* Pin button - cho phép ghim cả tin nhắn của mình và người khác */}
                                        <button
                                            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                                            onClick={() =>
                                                message.isPinned
                                                    ? handleUnpinMessage(
                                                          message,
                                                      )
                                                    : handlePinMessage(message)
                                            }
                                            disabled={isSending}
                                        >
                                            <BiPin />
                                        </button>

                                        {/* Các action khác chỉ cho tin nhắn của mình */}
                                        {message.senderId === userId &&
                                            message.type === 'TEXT' && (
                                                <button
                                                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                                                    onClick={() =>
                                                        handleOpenEditDialog(
                                                            message,
                                                        )
                                                    }
                                                    disabled={isSending}
                                                >
                                                    <BiEdit />
                                                </button>
                                            )}

                                        {/* Menu gom 3 hành động khác */}
                                        <div className="relative">
                                            <button
                                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                                onClick={(e) =>
                                                    handleMenuOpen(
                                                        message.id,
                                                        e,
                                                    )
                                                }
                                            >
                                                <BiDotsVerticalRounded />
                                            </button>
                                            {openMenuMessageId ===
                                                message.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={
                                                            handleMenuClose
                                                        }
                                                    ></div>
                                                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[200px]">
                                                        {/* Thu hồi và Xóa chỉ cho tin nhắn của mình */}
                                                        {message.senderId ===
                                                            userId && (
                                                            <button
                                                                onClick={() => {
                                                                    handleRecallMessage(
                                                                        message,
                                                                    );
                                                                    handleMenuClose();
                                                                }}
                                                                disabled={
                                                                    isSending
                                                                }
                                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                                                            >
                                                                <BiUndo
                                                                    size={18}
                                                                />
                                                                <span>
                                                                    Thu hồi
                                                                </span>
                                                            </button>
                                                        )}
                                                        {message.senderId ===
                                                            userId && (
                                                            <button
                                                                onClick={() => {
                                                                    handleDeleteMessage(
                                                                        message,
                                                                    );
                                                                    handleMenuClose();
                                                                }}
                                                                disabled={
                                                                    isSending
                                                                }
                                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                                                            >
                                                                <BiTrash
                                                                    size={18}
                                                                />
                                                                <span>Xóa</span>
                                                            </button>
                                                        )}
                                                        {/* Chuyển tiếp cho phép với tất cả tin nhắn */}
                                                        <button
                                                            onClick={() => {
                                                                handleOpenForwardDialog(
                                                                    message,
                                                                );
                                                                handleMenuClose();
                                                            }}
                                                            disabled={isSending}
                                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                                                        >
                                                            <BiShare
                                                                size={18}
                                                            />
                                                            <span>
                                                                Chuyển tiếp
                                                            </span>
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            <div
                                className={`p-2.5 px-4 rounded-2xl relative max-w-[70%] shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
                                    message.senderId === userId
                                        ? 'liquid-bubble-user text-white'
                                        : isAiConversation
                                          ? 'bg-white/95 border border-emerald-200 text-gray-800'
                                          : 'liquid-bubble text-gray-800'
                                }`}
                            >
                                {!isAiConversation && message.isPinned && (
                                    <div className="absolute -top-2.5 right-2.5 text-orange-500">
                                        <BiPin />
                                    </div>
                                )}
                                {message.recalled ? (
                                    <p className="italic">
                                        Tin nhắn đã được thu hồi
                                    </p>
                                ) : message.deletedByUsers?.includes(userId) ? (
                                    // Chỉ hiển thị "Tin nhắn đã bị xóa" nếu user HIỆN TẠI đã xóa
                                    // Người khác vẫn thấy nội dung bình thường
                                    <p className="italic">Tin nhắn đã bị xóa</p>
                                ) : message.type === 'TEXT' ? (
                                    <>
                                        {selectedContact.isGroup &&
                                            message.senderId !== userId && (
                                                <p className="text-xs block opacity-70 mb-2">
                                                    {(() => {
                                                        const member =
                                                            groupMembers.find(
                                                                (m) =>
                                                                    m.id ===
                                                                    message.senderId,
                                                            );
                                                        return member
                                                            ? `${
                                                                  member.firstName ||
                                                                  ''
                                                              } ${
                                                                  member.lastName ||
                                                                  ''
                                                              }`.trim() ||
                                                                  member.username ||
                                                                  'Unknown'
                                                            : 'Unknown';
                                                    })()}
                                                </p>
                                            )}
                                        {selectedContact?.isAI &&
                                        message.senderId !== userId ? (
                                            <div className="space-y-1">
                                                {formatAiMessageForDisplay(
                                                    message.content,
                                                )
                                                    .split('\n')
                                                    .filter(
                                                        (line, idx, arr) =>
                                                            line.trim() ||
                                                            (idx > 0 &&
                                                                arr[
                                                                    idx - 1
                                                                ].trim()),
                                                    )
                                                    .map((line, idx) => {
                                                        const trimmed =
                                                            line.trim();
                                                        const isListLine =
                                                            /^\d+\.\s|^-\s/.test(
                                                                trimmed,
                                                            );
                                                        return (
                                                            <p
                                                                key={`ai-line-${idx}`}
                                                                className={
                                                                    isListLine
                                                                        ? 'pl-1 font-medium'
                                                                        : ''
                                                                }
                                                            >
                                                                {line}
                                                            </p>
                                                        );
                                                    })}
                                            </div>
                                        ) : (
                                            <p>{message.content}</p>
                                        )}
                                        {message.isEdited && (
                                            <p className="text-xs opacity-70 italic">
                                                (Đã chỉnh sửa)
                                            </p>
                                        )}
                                    </>
                                ) : message.type === 'IMAGE' ? (
                                    <>
                                        {selectedContact.isGroup &&
                                            message.senderId !== userId && (
                                                <p className="text-xs block opacity-70 mb-2">
                                                    {(() => {
                                                        const member =
                                                            groupMembers.find(
                                                                (m) =>
                                                                    m.id ===
                                                                    message.senderId,
                                                            );
                                                        return member
                                                            ? `${
                                                                  member.firstName ||
                                                                  ''
                                                              } ${
                                                                  member.lastName ||
                                                                  ''
                                                              }`.trim() ||
                                                                  member.username ||
                                                                  'Unknown'
                                                            : 'Unknown';
                                                    })()}
                                                </p>
                                            )}
                                        {resolveMessageMediaUrl(message) ? (
                                            <img
                                                src={resolveMessageMediaUrl(
                                                    message,
                                                )}
                                                alt="Uploaded"
                                                className="max-w-[200px] rounded-lg cursor-pointer"
                                                onClick={() =>
                                                    window.open(
                                                        resolveMessageMediaUrl(
                                                            message,
                                                        ),
                                                        '_blank',
                                                    )
                                                }
                                            />
                                        ) : (
                                            <span className="text-xs opacity-80 italic">
                                                [Không tải được hình ảnh]
                                            </span>
                                        )}
                                    </>
                                ) : message.type === 'VIDEO' ? (
                                    <>
                                        {selectedContact.isGroup &&
                                            message.senderId !== userId && (
                                                <p className="text-xs block opacity-70 mb-2">
                                                    {(() => {
                                                        const member =
                                                            groupMembers.find(
                                                                (m) =>
                                                                    m.id ===
                                                                    message.senderId,
                                                            );
                                                        return member
                                                            ? `${
                                                                  member.firstName ||
                                                                  ''
                                                              } ${
                                                                  member.lastName ||
                                                                  ''
                                                              }`.trim() ||
                                                                  member.username ||
                                                                  'Unknown'
                                                            : 'Unknown';
                                                    })()}
                                                </p>
                                            )}
                                        {resolveMessageMediaUrl(message) ? (
                                            <video
                                                src={resolveMessageMediaUrl(
                                                    message,
                                                )}
                                                controls
                                                className="max-w-[200px] rounded-lg"
                                            />
                                        ) : (
                                            <span className="text-xs opacity-80 italic">
                                                [Không tải được video]
                                            </span>
                                        )}
                                    </>
                                ) : isAudioMessage(message) ? (
                                    <>
                                        {selectedContact.isGroup &&
                                            message.senderId !== userId && (
                                                <span className="text-xs block opacity-70 mb-2">
                                                    {(() => {
                                                        const member =
                                                            groupMembers.find(
                                                                (m) =>
                                                                    m.id ===
                                                                    message.senderId,
                                                            );
                                                        return member
                                                            ? `${
                                                                  member.firstName ||
                                                                  ''
                                                              } ${
                                                                  member.lastName ||
                                                                  ''
                                                              }`.trim() ||
                                                                  member.username ||
                                                                  'Unknown'
                                                            : 'Unknown';
                                                    })()}
                                                </span>
                                            )}
                                        {resolveMessageMediaUrl(message) ? (
                                            <audio
                                                controls
                                                style={{ maxWidth: '200px' }}
                                            >
                                                <source
                                                    src={resolveMessageMediaUrl(
                                                        message,
                                                    )}
                                                    type="audio/webm"
                                                />
                                                <source
                                                    src={resolveMessageMediaUrl(
                                                        message,
                                                    )}
                                                    type="audio/mp4"
                                                />
                                                <source
                                                    src={resolveMessageMediaUrl(
                                                        message,
                                                    )}
                                                    type="audio/mpeg"
                                                />
                                                <source
                                                    src={resolveMessageMediaUrl(
                                                        message,
                                                    )}
                                                    type="audio/wav"
                                                />
                                                <source
                                                    src={resolveMessageMediaUrl(
                                                        message,
                                                    )}
                                                    type="audio/ogg"
                                                />
                                                Trình duyệt của bạn không hỗ trợ
                                                phát audio.
                                            </audio>
                                        ) : (
                                            <span className="text-xs opacity-80 italic">
                                                [Không tải được âm thanh]
                                            </span>
                                        )}
                                    </>
                                ) : message.type === 'POLL' ? (
                                    <>
                                        {selectedContact.isGroup &&
                                            message.senderId !== userId && (
                                                <span className="text-xs block opacity-70 mb-2">
                                                    {(() => {
                                                        const member =
                                                            groupMembers.find(
                                                                (m) =>
                                                                    m.id ===
                                                                    message.senderId,
                                                            );
                                                        return member
                                                            ? `${
                                                                  member.firstName ||
                                                                  ''
                                                              } ${
                                                                  member.lastName ||
                                                                  ''
                                                              }`.trim() ||
                                                                  member.username ||
                                                                  'Unknown'
                                                            : 'Unknown';
                                                    })()}
                                                </span>
                                            )}
                                        {(() => {
                                            const pollData = JSON.parse(
                                                message.content,
                                            );
                                            const totalVotes =
                                                pollData.votes.reduce(
                                                    (sum, votes) =>
                                                        sum + votes.length,
                                                    0,
                                                );
                                            const hasUserVoted =
                                                pollData.votes.some((votes) =>
                                                    votes.includes(userId),
                                                );

                                            return (
                                                <div className="min-w-[280px]">
                                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/20">
                                                        <BiPoll size={20} />
                                                        <h4 className="font-semibold text-base">
                                                            {pollData.question}
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {pollData.options.map(
                                                            (option, idx) => {
                                                                const votes =
                                                                    pollData
                                                                        .votes[
                                                                        idx
                                                                    ]?.length ||
                                                                    0;
                                                                const percentage =
                                                                    totalVotes >
                                                                    0
                                                                        ? Math.round(
                                                                              (votes /
                                                                                  totalVotes) *
                                                                                  100,
                                                                          )
                                                                        : 0;
                                                                const userVoted =
                                                                    pollData.votes[
                                                                        idx
                                                                    ]?.includes(
                                                                        userId,
                                                                    );

                                                                return (
                                                                    <motion.button
                                                                        key={
                                                                            idx
                                                                        }
                                                                        whileHover={{
                                                                            scale: 1.02,
                                                                        }}
                                                                        whileTap={{
                                                                            scale: 0.98,
                                                                        }}
                                                                        onClick={() =>
                                                                            handleVotePoll(
                                                                                message.id,
                                                                                idx,
                                                                            )
                                                                        }
                                                                        className={`w-full text-left p-3 rounded-lg transition-all relative overflow-hidden ${
                                                                            message.senderId ===
                                                                            userId
                                                                                ? userVoted
                                                                                    ? 'bg-white/30 border-2 border-white/50'
                                                                                    : 'bg-white/10 hover:bg-white/20 border-2 border-white/20'
                                                                                : userVoted
                                                                                  ? 'bg-blue-100 border-2 border-blue-400'
                                                                                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-gray-200'
                                                                        }`}
                                                                    >
                                                                        <div
                                                                            className={`absolute inset-0 ${
                                                                                message.senderId ===
                                                                                userId
                                                                                    ? 'bg-white/10'
                                                                                    : 'bg-blue-200/40'
                                                                            }`}
                                                                            style={{
                                                                                width: `${percentage}%`,
                                                                                transition:
                                                                                    'width 0.3s ease',
                                                                            }}
                                                                        />
                                                                        <div className="relative flex justify-between items-center">
                                                                            <span className="font-medium">
                                                                                {
                                                                                    option
                                                                                }
                                                                            </span>
                                                                            <span className="text-sm">
                                                                                {
                                                                                    percentage
                                                                                }

                                                                                %{' '}
                                                                                (
                                                                                {
                                                                                    votes
                                                                                }

                                                                                )
                                                                            </span>
                                                                        </div>
                                                                    </motion.button>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                    <p className="text-xs opacity-70 mt-3 text-center">
                                                        {totalVotes} lượt bình
                                                        chọn
                                                        {pollData.allowMultiple &&
                                                            ' • Chọn nhiều đáp án'}
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                    </>
                                ) : message.type === 'FORWARD' ? (
                                    <>
                                        {selectedContact.isGroup &&
                                            message.senderId !== userId && (
                                                <span className="text-xs block opacity-70 mb-2">
                                                    {(() => {
                                                        const member =
                                                            groupMembers.find(
                                                                (m) =>
                                                                    m.id ===
                                                                    message.senderId,
                                                            );
                                                        return member
                                                            ? `${
                                                                  member.firstName ||
                                                                  ''
                                                              } ${
                                                                  member.lastName ||
                                                                  ''
                                                              }`.trim() ||
                                                                  member.username ||
                                                                  'Unknown'
                                                            : 'Unknown';
                                                    })()}
                                                </span>
                                            )}
                                        <div>
                                            <span className="text-xs italic">
                                                Chuyển tiếp từ{' '}
                                                {message.forwardedFrom
                                                    ?.senderId ||
                                                    'người dùng khác'}
                                            </span>
                                            <p>{message.content}</p>
                                        </div>
                                    </>
                                ) : message.type === 'FILE' ? (
                                    <>
                                        {selectedContact.isGroup &&
                                            message.senderId !== userId && (
                                                <span className="text-xs block opacity-70 mb-2">
                                                    {(() => {
                                                        const member =
                                                            groupMembers.find(
                                                                (m) =>
                                                                    m.id ===
                                                                    message.senderId,
                                                            );
                                                        return member
                                                            ? `${
                                                                  member.firstName ||
                                                                  ''
                                                              } ${
                                                                  member.lastName ||
                                                                  ''
                                                              }`.trim() ||
                                                                  member.username ||
                                                                  'Unknown'
                                                            : 'Unknown';
                                                    })()}
                                                </span>
                                            )}
                                        <div
                                            className={`flex items-center gap-2 p-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                                message.senderId === userId
                                                    ? 'bg-white/20 hover:bg-white/30'
                                                    : 'bg-gray-100/80 hover:bg-gray-200/80'
                                            }`}
                                            onClick={async () => {
                                                try {
                                                    const fileUrl =
                                                        resolveMessageMediaUrl(
                                                            message,
                                                        );

                                                    if (!fileUrl) {
                                                        toast.error(
                                                            'Không tìm thấy đường dẫn tệp hợp lệ',
                                                        );
                                                        return;
                                                    }

                                                    // Fetch file as blob to avoid navigation
                                                    const response =
                                                        await fetch(fileUrl);
                                                    const blob =
                                                        await response.blob();

                                                    // Create blob URL and trigger download
                                                    const blobUrl =
                                                        window.URL.createObjectURL(
                                                            blob,
                                                        );
                                                    const link =
                                                        document.createElement(
                                                            'a',
                                                        );
                                                    link.href = blobUrl;
                                                    link.download =
                                                        message.fileName ||
                                                        'file';
                                                    document.body.appendChild(
                                                        link,
                                                    );
                                                    link.click();
                                                    document.body.removeChild(
                                                        link,
                                                    );

                                                    // Clean up blob URL
                                                    window.URL.revokeObjectURL(
                                                        blobUrl,
                                                    );
                                                } catch (error) {
                                                    console.error(
                                                        'Error downloading file:',
                                                        error,
                                                    );
                                                    const fileUrl =
                                                        resolveMessageMediaUrl(
                                                            message,
                                                        );
                                                    if (fileUrl) {
                                                        window.open(
                                                            fileUrl,
                                                            '_blank',
                                                        );
                                                    } else {
                                                        toast.error(
                                                            'Không thể mở tệp vì URL không hợp lệ',
                                                        );
                                                    }
                                                }
                                            }}
                                        >
                                            <BiFile
                                                size={32}
                                                color={
                                                    message.senderId === userId
                                                        ? '#fff'
                                                        : '#0091ff'
                                                }
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {getMessagePreview(message)}
                                                </p>
                                                <span className="text-xs opacity-80">
                                                    Nhấn để tải xuống
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <span>Loại tin nhắn không được hỗ trợ</span>
                                )}
                                <span className="text-xs text-right opacity-70 flex items-center justify-end gap-1">
                                    {new Date(
                                        message.createAt,
                                    ).toLocaleTimeString()}
                                    {/* Hiển thị checkmark cho tin nhắn đã gửi */}
                                    {message.senderId === userId &&
                                        (message.isRead ? (
                                            <BsCheckAll
                                                size={16}
                                                style={{ color: '#0091ff' }}
                                                title="Đã xem"
                                            />
                                        ) : (
                                            <BiCheck size={16} title="Đã gửi" />
                                        ))}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Banner cho người lạ - hiển thị khi chat với người chưa kết bạn */}
                {selectedContact &&
                    !selectedContact.isGroup &&
                    selectedContact.isStranger && (
                        <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-amber-800">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-sm font-medium">
                                        {selectedContact.friendStatus ===
                                        'PENDING'
                                            ? 'Đã gửi lời mời kết bạn - Đang chờ phản hồi'
                                            : 'Đây là người lạ. Kết bạn để nhắn tin dễ dàng hơn!'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedContact.friendStatus !==
                                        'PENDING' && (
                                        <button
                                            onClick={async () => {
                                                if (
                                                    onSendFriendRequest &&
                                                    selectedContact.phone
                                                ) {
                                                    try {
                                                        await onSendFriendRequest(
                                                            selectedContact.phone,
                                                        );
                                                        // Cập nhật selectedContact sau khi gửi lời mời
                                                        if (
                                                            onUpdateSelectedContact
                                                        ) {
                                                            onUpdateSelectedContact(
                                                                {
                                                                    ...selectedContact,
                                                                    friendStatus:
                                                                        'PENDING',
                                                                },
                                                            );
                                                        }
                                                        toast.success(
                                                            'Đã gửi lời mời kết bạn!',
                                                        );
                                                    } catch (error) {
                                                        toast.error(
                                                            error.message ||
                                                                'Không thể gửi lời mời kết bạn',
                                                        );
                                                    }
                                                }
                                            }}
                                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                            </svg>
                                            Kết bạn
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                <div className="p-3 liquid-compose relative z-10">
                    {pendingDropFiles.length > 0 && (
                        <div className="mb-2 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2">
                            <div className="mb-2 text-sm font-medium text-sky-700">
                                Bản xem trước tệp ({pendingDropFiles.length})
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2 max-h-40 overflow-y-auto">
                                {pendingDropFiles.map((item) => (
                                    <div
                                        key={item.id}
                                        className="relative w-[92px] h-[92px] rounded-lg border border-sky-200 bg-white overflow-hidden"
                                        title={item.name}
                                    >
                                        {item.kind === 'image' ? (
                                            <img
                                                src={item.previewUrl}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : item.kind === 'video' ? (
                                            <video
                                                src={item.previewUrl}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-sky-700 px-2">
                                                {item.kind === 'audio' ? (
                                                    <BiMicrophone size={24} />
                                                ) : (
                                                    <BiFile size={24} />
                                                )}
                                                <span className="text-[10px] mt-1 line-clamp-2 text-center">
                                                    {item.name}
                                                </span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() =>
                                                removePendingDropFile(item.id)
                                            }
                                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/75"
                                            title="Bỏ tệp"
                                        >
                                            <BiX size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={clearPendingDropFiles}
                                    disabled={isSending}
                                    className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSendPendingDropFiles}
                                    disabled={
                                        isSending || !pendingDropFiles.length
                                    }
                                    className="px-3 py-1.5 text-sm bg-[#0084ff] text-white rounded-md hover:bg-[#0077dd] disabled:opacity-50"
                                >
                                    Gửi
                                </button>
                            </div>
                        </div>
                    )}
                    {(isRecordingVoice || voicePreviewUrl) && (
                        <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                            {isRecordingVoice ? (
                                <div className="flex items-center justify-between text-emerald-700">
                                    <span className="text-sm font-medium">
                                        Dang ghi am...
                                    </span>
                                    <span className="text-sm font-semibold">
                                        {formatVoiceTime(recordingSeconds)}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <audio
                                        controls
                                        src={voicePreviewUrl}
                                        className="max-w-[240px]"
                                    />
                                    <span className="text-xs text-gray-600 min-w-[42px]">
                                        {formatVoiceTime(voicePreviewDuration)}
                                    </span>
                                    <button
                                        onClick={handleSendRecordedVoice}
                                        disabled={isSending}
                                        className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-full disabled:opacity-50"
                                        title="Gui voice"
                                    >
                                        <BiSend size={18} />
                                    </button>
                                    <button
                                        onClick={clearVoicePreview}
                                        disabled={isSending}
                                        className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50"
                                        title="Xoa voice"
                                    >
                                        <BiX size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {selectedContact?.isAI && showAiQuickSuggestions && (
                        <div className="mb-2 rounded-2xl border border-emerald-200 bg-white/85 px-3 py-2">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                Gợi ý nhanh cho chatbot
                            </div>
                            <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
                                {aiSuggestedQuestions.map((question) => (
                                    <button
                                        key={question}
                                        onClick={() =>
                                            handleQuickAiQuestion(question)
                                        }
                                        disabled={isSending}
                                        className="shrink-0 px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                    >
                                        {question}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowAiQuickSuggestions(false)
                                    }
                                    className="shrink-0 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-full hover:bg-gray-100"
                                    title="Ẩn gợi ý"
                                >
                                    Ẩn
                                </button>
                            </div>
                        </div>
                    )}
                    {showEmojiPicker && (
                        <div className="absolute bottom-full right-2.5 z-[1000]">
                            <Picker onEmojiClick={onEmojiClick} />
                        </div>
                    )}
                    <div className="flex items-center gap-1 sm:gap-2">
                        <label
                            className="p-1.5 sm:p-2 text-[#0084ff] hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                            title="Gửi file"
                        >
                            <BiPaperclip size={20} className="sm:w-6 sm:h-6" />
                            <input
                                type="file"
                                multiple
                                hidden
                                ref={documentInputRef}
                                onChange={handleFileUpload}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                            />
                        </label>
                        <label className="p-1.5 sm:p-2 text-[#0084ff] hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
                            <BiImage size={20} className="sm:w-6 sm:h-6" />
                            <input
                                type="file"
                                multiple
                                hidden
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/*,video/*,audio/*,.mp4,.mb4,.webm,.mov,.mkv,.avi"
                            />
                        </label>
                        {selectedContact?.isGroup && (
                            <>
                                <button
                                    className="p-1.5 sm:p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                                    onClick={() => setIsPollModalOpen(true)}
                                    title="Tạo bình chọn"
                                >
                                    <BiPoll
                                        size={20}
                                        className="sm:w-6 sm:h-6"
                                    />
                                </button>
                                <button
                                    className="p-1.5 sm:p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                                    onClick={() => setIsNoteModalOpen(true)}
                                    title="Ghi chú nhóm"
                                >
                                    <BiNotepad
                                        size={20}
                                        className="sm:w-6 sm:h-6"
                                    />
                                </button>
                            </>
                        )}
                        {!isAiConversation && (
                            <button
                                className={`p-1.5 sm:p-2 rounded-full transition-colors glass-fluid ${
                                    isRecordingVoice
                                        ? 'text-red-500 bg-red-50'
                                        : 'text-[#0084ff] hover:bg-white/60'
                                }`}
                                onClick={handleToggleVoiceRecording}
                                disabled={isSending}
                                title={
                                    isRecordingVoice
                                        ? 'Dung ghi am'
                                        : 'Ghi am voice'
                                }
                            >
                                <BiMicrophone
                                    size={20}
                                    className="sm:w-6 sm:h-6"
                                />
                            </button>
                        )}
                        <input
                            type="text"
                            className="flex-1 min-w-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-[20px] bg-[#f0f2f5] border border-transparent focus:border-[#0084ff] focus:outline-none"
                            placeholder={
                                isAiConversation
                                    ? 'Nhập câu hỏi hoặc đính kèm file/ảnh để AI phân tích...'
                                    : 'Aa'
                            }
                            value={messageInput}
                            onChange={onMessageInputChange}
                            onKeyPress={(e) =>
                                e.key === 'Enter' && handleSendMessage()
                            }
                            ref={messageInputRef}
                        />
                        {!isAiConversation && (
                            <button
                                className="p-1.5 sm:p-2 text-[#0084ff] hover:bg-gray-100 rounded-full transition-colors"
                                onClick={() =>
                                    setShowEmojiPicker(!showEmojiPicker)
                                }
                                title="Emoji"
                            >
                                <BiSmile size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        )}
                        {isAiConversation || messageInput.trim() ? (
                            <button
                                onClick={handleSendMessage}
                                disabled={isSending}
                                className="p-1.5 sm:p-2 text-[#0084ff] hover:bg-[rgba(0,132,255,0.1)] rounded-full transition-colors disabled:opacity-50"
                                title="Gửi tin nhắn"
                            >
                                <BiSend size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        ) : null}
                    </div>
                </div>

                {forwardDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1300]">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-xl font-semibold">
                                    Chọn liên hệ hoặc nhóm để chuyển tiếp
                                </h2>
                            </div>
                            <div className="px-6 py-4 max-h-96 overflow-y-auto">
                                <div>
                                    {contacts.map((contact) => (
                                        <div
                                            key={contact.id}
                                            onClick={() =>
                                                handleForwardMessage(contact)
                                            }
                                            className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg cursor-pointer"
                                        >
                                            <div>
                                                {contact.avatar ? (
                                                    <img
                                                        src={contact.avatar}
                                                        alt=""
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                                                        {contact.isGroup && (
                                                            <BiGroup />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium">
                                                    {contact.isGroup
                                                        ? `[Nhóm] ${contact.name}`
                                                        : contact.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {contact.isGroup
                                                        ? 'Nhóm'
                                                        : contact.username}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
                                <button
                                    onClick={() => setForwardDialogOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {editDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1300]">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-xl font-semibold">
                                    Chỉnh sửa tin nhắn
                                </h2>
                            </div>
                            <div className="px-6 py-4">
                                <textarea
                                    className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:border-[#0084ff] focus:outline-none resize-none"
                                    placeholder="Nội dung tin nhắn"
                                    value={editContent}
                                    onChange={(e) =>
                                        setEditContent(e.target.value)
                                    }
                                    rows={3}
                                />
                            </div>
                            <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
                                <button
                                    onClick={() => setEditDialogOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleEditMessage}
                                    disabled={isSending || !editContent.trim()}
                                    className="px-4 py-2 bg-[#0084ff] text-white rounded-lg hover:bg-[#0077dd] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {pinnedMessagesDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1300]">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-xl font-semibold">
                                    Tin nhắn đã ghim
                                </h2>
                            </div>
                            <div className="px-6 py-4 max-h-96 overflow-y-auto">
                                {pinnedMessages.length > 0 ? (
                                    <div>
                                        {pinnedMessages.map((message) => (
                                            <div
                                                key={message.id}
                                                className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg relative"
                                            >
                                                <div
                                                    className="flex-1 cursor-pointer"
                                                    onClick={() =>
                                                        handleSelectMessage(
                                                            message,
                                                        )
                                                    }
                                                >
                                                    <div className="mb-1">
                                                        {message.type ===
                                                        'IMAGE' ? (
                                                            <div className="flex items-center">
                                                                {resolveMessageMediaUrl(
                                                                    message,
                                                                ) ? (
                                                                    <img
                                                                        src={resolveMessageMediaUrl(
                                                                            message,
                                                                        )}
                                                                        alt="Ảnh"
                                                                        className="max-w-[100px] max-h-[60px] mr-2"
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs opacity-70 mr-2">
                                                                        [Ảnh
                                                                        lỗi]
                                                                    </span>
                                                                )}
                                                                <span className="text-sm">
                                                                    [Hình ảnh]
                                                                </span>
                                                            </div>
                                                        ) : message.type ===
                                                          'VIDEO' ? (
                                                            <div className="flex items-center">
                                                                {resolveMessageMediaUrl(
                                                                    message,
                                                                ) ? (
                                                                    <video
                                                                        src={resolveMessageMediaUrl(
                                                                            message,
                                                                        )}
                                                                        className="max-w-[100px] max-h-[60px] mr-2"
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs opacity-70 mr-2">
                                                                        [Video
                                                                        lỗi]
                                                                    </span>
                                                                )}
                                                                <span className="text-sm">
                                                                    [Video]
                                                                </span>
                                                            </div>
                                                        ) : message.type ===
                                                          'AUDIO' ? (
                                                            <span>
                                                                [Âm thanh]
                                                            </span>
                                                        ) : message.type ===
                                                          'FILE' ? (
                                                            <span>
                                                                {getMessagePreview(
                                                                    message,
                                                                )}
                                                            </span>
                                                        ) : (
                                                            message.content
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Từ:{' '}
                                                        {selectedContact.isGroup
                                                            ? message.senderId ===
                                                              userId
                                                                ? 'Bạn'
                                                                : message.senderId
                                                            : message.senderId ===
                                                                userId
                                                              ? 'Bạn'
                                                              : selectedContact.name}{' '}
                                                        -{' '}
                                                        {new Date(
                                                            message.createAt,
                                                        ).toLocaleString()}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        handleUnpinFromModal(
                                                            message,
                                                        )
                                                    }
                                                    disabled={isSending}
                                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                                                >
                                                    <BiPin />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p>Không có tin nhắn nào được ghim.</p>
                                )}
                            </div>
                            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
                                <button
                                    onClick={() =>
                                        setPinnedMessagesDialogOpen(false)
                                    }
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <FriendModal
                    open={isFriendModalOpen}
                    onClose={handleProfileClose}
                    profileData={profileData}
                    userId={userId}
                    token={token}
                    contacts={contacts}
                    onContactSelect={onSendMessage}
                />

                <VideoCallModal
                    open={callModalOpen}
                    onClose={handleEndCall}
                    contact={selectedContact}
                    isVideoCall={isVideoCall}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    onToggleAudio={handleToggleAudio}
                    onToggleVideo={handleToggleVideo}
                    isAudioEnabled={isAudioEnabled}
                    isVideoEnabled={isVideoEnabled}
                    callStatus={callStatus}
                />

                <PollModal
                    open={isPollModalOpen}
                    onClose={() => setIsPollModalOpen(false)}
                    onCreatePoll={handleCreatePoll}
                />

                <NoteModal
                    open={isNoteModalOpen}
                    onClose={() => setIsNoteModalOpen(false)}
                    notes={groupNotes}
                    onAddNote={handleAddNote}
                    onEditNote={handleEditNote}
                    onDeleteNote={handleDeleteNote}
                />

                <GroupFeaturesModal
                    open={isGroupFeaturesModalOpen}
                    onClose={() => setIsGroupFeaturesModalOpen(false)}
                    notes={groupNotes}
                    onAddNote={handleAddNote}
                    onEditNote={handleEditNote}
                    onDeleteNote={handleDeleteNote}
                    pinnedMessages={pinnedMessages}
                    onUnpinMessage={handleUnpinFromModal}
                    onSelectMessage={handleSelectMessage}
                    polls={polls}
                    onVotePoll={handleVotePoll}
                    userId={userId}
                />

                <SettingGroup
                    open={isSettingGroupOpen}
                    onClose={() => setIsSettingGroupOpen(false)}
                    groupId={selectedContact?.id}
                    token={token}
                />

                <ToastContainer
                    position="top-right"
                    autoClose={2000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss={false}
                    draggable
                    pauseOnHover
                    theme="light"
                    limit={3}
                    style={{
                        fontSize: '14px',
                        fontFamily: 'inherit',
                    }}
                />
            </div>

            {showGroupInfo &&
                (selectedContact.isGroup ? (
                    <GroupInfoPanel
                        selectedContact={selectedContact}
                        groupMembers={groupMembers}
                        messages={localMessages}
                        onClose={() => setShowGroupInfo(false)}
                        contacts={contacts}
                        onOpenSettingGroup={() => setIsSettingGroupOpen(true)}
                        onOpenGroupFeatures={() => {
                            setIsGroupFeaturesModalOpen(true);
                            setShowGroupInfo(false);
                        }}
                        onAddMembers={async (groupId, memberIds) => {
                            if (!token) {
                                toast.error(
                                    'Vui lòng đăng nhập để thêm thành viên',
                                );
                                return;
                            }
                            try {
                                const { addGroupMembers } =
                                    await import('../../api/groupApi');
                                await addGroupMembers(
                                    groupId,
                                    memberIds,
                                    token,
                                );
                                toast.success('Đã thêm thành viên vào nhóm!');
                                // Reload group members
                                const { fetchGroupMembers } =
                                    await import('../../api/groupApi');
                                const updatedMembers = await fetchGroupMembers(
                                    groupId,
                                    token,
                                );
                                setGroupMembers(updatedMembers);
                            } catch (error) {
                                console.error('Error adding members:', error);
                                toast.error(
                                    'Lỗi thêm thành viên: ' + error.message,
                                );
                            }
                        }}
                        onSendGroupInvites={async (groupId, memberIds) => {
                            if (!token) {
                                toast.error(
                                    'Vui lòng đăng nhập để gửi lời mời',
                                );
                                return;
                            }
                            try {
                                const { sendGroupInvite } =
                                    await import('../../api/groupApi');
                                await sendGroupInvite(
                                    groupId,
                                    memberIds,
                                    token,
                                );
                                toast.success('Đã gửi lời mời vào nhóm!');
                            } catch (error) {
                                console.error('Error sending invites:', error);
                                toast.error(
                                    'Lỗi gửi lời mời: ' + error.message,
                                );
                            }
                        }}
                        onUpdateGroupInfo={async (groupId, updates) => {
                            if (!token) {
                                toast.error(
                                    'Vui lòng đăng nhập để cập nhật thông tin nhóm',
                                );
                                return;
                            }
                            try {
                                const { updateGroupInfo } =
                                    await import('../../api/groupApi');
                                await updateGroupInfo(groupId, updates, token);
                                toast.success('Đã cập nhật thông tin nhóm!');

                                // Cập nhật selectedContact nếu đang xem nhóm này
                                if (selectedContact?.id === groupId) {
                                    // Reload lại thông tin nhóm để hiển thị cập nhật
                                    window.location.reload();
                                }
                            } catch (error) {
                                console.error(
                                    'Error updating group info:',
                                    error,
                                );
                                toast.error(
                                    'Lỗi cập nhật thông tin nhóm: ' +
                                        error.message,
                                );
                            }
                        }}
                        onPinConversation={async (contactId, isPinned) => {
                            try {
                                await updateConversationSetting(
                                    contactId,
                                    { isPinned },
                                    token,
                                );

                                // Cập nhật contact trong danh sách
                                if (onUpdateContact) {
                                    onUpdateContact(contactId, { isPinned });
                                }

                                toast.success(
                                    isPinned
                                        ? 'Đã ghim hội thoại'
                                        : 'Đã bỏ ghim hội thoại',
                                );
                            } catch (error) {
                                console.error(
                                    'Error pinning conversation:',
                                    error,
                                );
                                toast.error('Lỗi ghim hội thoại');
                            }
                        }}
                        onMuteConversation={async (
                            contactId,
                            isMuted,
                            muteOption,
                        ) => {
                            try {
                                await updateConversationSetting(
                                    contactId,
                                    {
                                        isMuted,
                                        muteOption: isMuted ? muteOption : null,
                                    },
                                    token,
                                );

                                // Cập nhật contact trong danh sách
                                if (onUpdateContact) {
                                    onUpdateContact(contactId, {
                                        isMuted,
                                        muteOption,
                                    });
                                }

                                if (isMuted) {
                                    const muteLabels = {
                                        '1hour': '1 giờ',
                                        '4hours': '4 giờ',
                                        until8am: 'đến 8:00 AM',
                                        forever: 'vĩnh viễn',
                                    };
                                    toast.success(
                                        `Đã tắt thông báo trong ${
                                            muteLabels[muteOption] || ''
                                        }`,
                                    );
                                } else {
                                    toast.success('Đã bật thông báo');
                                }
                            } catch (error) {
                                console.error(
                                    'Error muting conversation:',
                                    error,
                                );
                                toast.error('Lỗi tắt thông báo');
                            }
                        }}
                        onSetAutoDelete={async (
                            contactId,
                            autoDeleteOption,
                        ) => {
                            try {
                                await updateConversationSetting(
                                    contactId,
                                    { autoDeleteOption },
                                    token,
                                );

                                if (onUpdateContact) {
                                    onUpdateContact(contactId, {
                                        autoDeleteOption,
                                    });
                                }

                                const labels = {
                                    off: 'Không bảo giữ',
                                    '5m': 'Sau 5 phút',
                                    '1h': 'Sau 1 giờ',
                                    '24h': 'Sau 24 giờ',
                                };

                                toast.success(
                                    `Tin nhắn tự xóa: ${labels[autoDeleteOption] || 'Không bảo giữ'}`,
                                );
                            } catch (error) {
                                console.error(
                                    'Error setting auto-delete:',
                                    error,
                                );
                                toast.error('Lỗi cập nhật tin nhắn tự xóa');
                            }
                        }}
                        onToggleHiddenConversation={async (
                            contactId,
                            isHidden,
                        ) => {
                            try {
                                await updateConversationSetting(
                                    contactId,
                                    { isHidden },
                                    token,
                                );

                                if (onUpdateContact) {
                                    onUpdateContact(contactId, { isHidden });
                                }

                                toast.success(
                                    isHidden
                                        ? 'Đã ẩn cuộc trò chuyện'
                                        : 'Đã hiện cuộc trò chuyện',
                                );
                            } catch (error) {
                                console.error(
                                    'Error toggling hidden conversation:',
                                    error,
                                );
                                toast.error('Lỗi ẩn cuộc trò chuyện');
                            }
                        }}
                        onClearChatHistory={async (groupId) => {
                            if (!token) {
                                toast.error(
                                    'Vui lòng đăng nhập để xóa lịch sử',
                                );
                                return;
                            }
                            try {
                                await clearChatHistory(null, groupId, token);
                                toast.success('Đã xóa lịch sử trò chuyện!');
                                // Clear local messages
                                setLocalMessages([]);
                                // Xóa cuộc trò chuyện khỏi danh sách
                                if (onDeleteConversation) {
                                    onDeleteConversation(groupId);
                                }
                                setShowGroupInfo(false);
                            } catch (error) {
                                console.error(
                                    'Error clearing chat history:',
                                    error,
                                );
                                toast.error(
                                    'Lỗi xóa lịch sử: ' + error.message,
                                );
                            }
                        }}
                        onLeaveGroup={async (groupId) => {
                            if (!token || !userId) {
                                toast.error('Vui lòng đăng nhập để rời nhóm');
                                return;
                            }
                            try {
                                await leaveGroup(groupId, userId, token);
                                toast.success('Đã rời khỏi nhóm!');
                                setShowGroupInfo(false);
                                // Reload page to update contact list
                                window.location.reload();
                            } catch (error) {
                                console.error('Error leaving group:', error);
                                toast.error('Lỗi rời nhóm: ' + error.message);
                            }
                        }}
                        onDissolveGroup={async (groupId) => {
                            if (!token) {
                                toast.error(
                                    'Vui lòng đăng nhập để giải tán nhóm',
                                );
                                return;
                            }
                            try {
                                await dissolveGroup(groupId, token);
                                toast.success('Nhóm đã được giải tán!');
                                setShowGroupInfo(false);
                                window.location.reload();
                            } catch (error) {
                                console.error('Error dissolving group:', error);
                                toast.error(
                                    'Lỗi giải tán nhóm: ' + error.message,
                                );
                            }
                        }}
                        onReportGroup={async (groupId, reason) => {
                            try {
                                await reportGroup(groupId, reason, token);
                                toast.success('Đã gửi báo cáo thành công!');
                            } catch (error) {
                                console.error('Error reporting group:', error);
                                toast.error('Lỗi gửi báo cáo');
                            }
                        }}
                    />
                ) : (
                    <PersonalChatInfoPanel
                        selectedContact={selectedContact}
                        messages={localMessages}
                        onClose={() => setShowGroupInfo(false)}
                        contacts={contacts}
                        aiConversations={aiConversations}
                        currentAiConversationId={currentAiConversationId}
                        onCreateAiConversation={onCreateAiConversation}
                        onSelectAiConversation={onSelectAiConversation}
                        onCreateGroup={async (groupName, memberIds) => {
                            if (!token) {
                                toast.error('Vui lòng đăng nhập để tạo nhóm');
                                return;
                            }
                            try {
                                const { createGroup } =
                                    await import('../../api/groupApi');
                                await createGroup(
                                    groupName,
                                    memberIds,
                                    null,
                                    token,
                                );
                                toast.success('Đã tạo nhóm thành công!');
                                setShowGroupInfo(false);
                            } catch (error) {
                                console.error('Error creating group:', error);
                                toast.error('Lỗi tạo nhóm: ' + error.message);
                            }
                        }}
                        onPinConversation={async (contactId, isPinned) => {
                            try {
                                await updateConversationSetting(
                                    contactId,
                                    { isPinned },
                                    token,
                                );

                                // Cập nhật contact trong danh sách
                                if (onUpdateContact) {
                                    onUpdateContact(contactId, { isPinned });
                                }

                                toast.success(
                                    isPinned
                                        ? 'Đã ghim hội thoại'
                                        : 'Đã bỏ ghim hội thoại',
                                );
                            } catch (error) {
                                console.error(
                                    'Error pinning conversation:',
                                    error,
                                );
                                toast.error('Lỗi ghim hội thoại');
                            }
                        }}
                        onMuteConversation={async (
                            contactId,
                            isMuted,
                            muteOption,
                        ) => {
                            try {
                                await updateConversationSetting(
                                    contactId,
                                    {
                                        isMuted,
                                        muteOption: isMuted ? muteOption : null,
                                    },
                                    token,
                                );

                                // Cập nhật contact trong danh sách
                                if (onUpdateContact) {
                                    onUpdateContact(contactId, {
                                        isMuted,
                                        muteOption,
                                    });
                                }

                                if (isMuted) {
                                    const muteLabels = {
                                        '1hour': '1 giờ',
                                        '4hours': '4 giờ',
                                        until8am: 'đến 8:00 AM',
                                        forever: 'vĩnh viễn',
                                    };
                                    toast.success(
                                        `Đã tắt thông báo trong ${
                                            muteLabels[muteOption] || ''
                                        }`,
                                    );
                                } else {
                                    toast.success('Đã bật thông báo');
                                }
                            } catch (error) {
                                console.error(
                                    'Error muting conversation:',
                                    error,
                                );
                                toast.error('Lỗi tắt thông báo');
                            }
                        }}
                        onToggleHiddenConversation={async (
                            contactId,
                            isHidden,
                        ) => {
                            try {
                                await updateConversationSetting(
                                    contactId,
                                    { isHidden },
                                    token,
                                );

                                if (onUpdateContact) {
                                    onUpdateContact(contactId, { isHidden });
                                }

                                toast.success(
                                    isHidden
                                        ? 'Đã ẩn cuộc trò chuyện'
                                        : 'Đã hiện cuộc trò chuyện',
                                );
                            } catch (error) {
                                console.error(
                                    'Error toggling hidden conversation:',
                                    error,
                                );
                                toast.error('Lỗi ẩn cuộc trò chuyện');
                            }
                        }}
                        onClearChatHistory={async (contactId) => {
                            if (selectedContact?.isAI) {
                                await handleStartNewAiConversation();
                                setShowGroupInfo(false);
                                return;
                            }

                            if (!token) {
                                toast.error(
                                    'Vui lòng đăng nhập để xóa lịch sử',
                                );
                                return;
                            }
                            try {
                                await clearChatHistory(contactId, null, token);
                                toast.success('Đã xóa lịch sử trò chuyện!');
                                // Clear local messages
                                setLocalMessages([]);
                                // Xóa cuộc trò chuyện khỏi danh sách
                                if (onDeleteConversation) {
                                    onDeleteConversation(contactId);
                                }
                                setShowGroupInfo(false);
                            } catch (error) {
                                console.error(
                                    'Error clearing chat history:',
                                    error,
                                );
                                toast.error(
                                    'Lỗi xóa lịch sử: ' + error.message,
                                );
                            }
                        }}
                        onReportUser={async (contactId, reason) => {
                            try {
                                await reportUser(contactId, reason, token);
                                toast.success('Đã gửi báo cáo thành công!');
                            } catch (error) {
                                console.error('Error reporting user:', error);
                                toast.error('Lỗi gửi báo cáo');
                            }
                        }}
                    />
                ))}
        </div>
    );
};

export default ChatWindow;
