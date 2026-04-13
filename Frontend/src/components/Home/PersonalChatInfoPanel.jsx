import React, { useEffect, useMemo, useState } from 'react';
import {
    BiX,
    BiChevronDown,
    BiChevronUp,
    BiBell,
    BiPin,
    BiUserPlus,
    BiSearch,
    BiImage,
    BiFile,
    BiLink,
    BiShieldAlt2,
    BiLockAlt,
    BiShow,
    BiMessageAltError,
    BiTrash,
    BiGroup,
} from 'react-icons/bi';

const PersonalChatInfoPanel = ({
    selectedContact,
    messages = [],
    onClose,
    contacts = [],
    aiConversations = [],
    currentAiConversationId = null,
    onCreateAiConversation,
    onSelectAiConversation,
    onCreateGroup,
    onPinConversation,
    onMuteConversation,
    onToggleHiddenConversation,
    onClearChatHistory,
    onReportUser,
}) => {
    const [expandedSections, setExpandedSections] = useState({
        schedule: false,
        media: false,
        files: false,
        links: false,
        security: false,
    });

    const [isPrivateMode, setIsPrivateMode] = useState(
        selectedContact?.isHidden || false,
    );
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [groupAvatar, setGroupAvatar] = useState(null);
    const [isPinned, setIsPinned] = useState(
        selectedContact?.isPinned || false,
    );
    const [isMuted, setIsMuted] = useState(selectedContact?.isMuted || false);
    const [muteDialogOpen, setMuteDialogOpen] = useState(false);
    const [selectedMuteOption, setSelectedMuteOption] = useState('1hour');
    const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const isAiContact = Boolean(selectedContact?.isAI);

    const cloudinaryCloudName = useMemo(() => {
        const fromEnv = String(
            import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
        ).trim();
        if (fromEnv) return fromEnv;

        const sample = messages.find((msg) =>
            String(msg?.content || '').includes('res.cloudinary.com/'),
        );
        const sampleUrl = String(sample?.content || '');
        const matched = sampleUrl.match(/res\.cloudinary\.com\/([^/]+)\//i);
        return matched?.[1] || '';
    }, [messages]);

    const resolveMediaUrl = (msg) => {
        const raw = String(msg?.content || '').trim();
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

        const publicId = String(msg?.publicId || '').trim();
        if (publicId && cloudinaryCloudName) {
            const encodedPublicId = publicId
                .split('/')
                .map((part) => encodeURIComponent(part))
                .join('/');
            const resourceType =
                msg?.type === 'IMAGE'
                    ? 'image'
                    : msg?.type === 'VIDEO' || msg?.type === 'AUDIO'
                      ? 'video'
                      : 'raw';
            return `https://res.cloudinary.com/${cloudinaryCloudName}/${resourceType}/upload/${encodedPublicId}`;
        }

        return '';
    };

    // Lọc ảnh và video
    const mediaMessages = messages.filter(
        (msg) => msg.type === 'IMAGE' || msg.type === 'VIDEO',
    );

    // Lọc file
    const fileMessages = messages.filter((msg) => msg.type === 'FILE');

    // Lọc link (tin nhắn text có chứa http/https)
    const linkMessages = messages.filter(
        (msg) =>
            msg.type === 'TEXT' &&
            msg.content &&
            (msg.content.includes('http://') ||
                msg.content.includes('https://')),
    );

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    useEffect(() => {
        setIsPinned(selectedContact?.isPinned || false);
        setIsMuted(selectedContact?.isMuted || false);
        setIsPrivateMode(selectedContact?.isHidden || false);
    }, [
        selectedContact?.id,
        selectedContact?.isPinned,
        selectedContact?.isMuted,
        selectedContact?.isHidden,
    ]);

    const handleTogglePrivateMode = async () => {
        const nextValue = !isPrivateMode;
        setIsPrivateMode(nextValue);

        if (onToggleHiddenConversation) {
            await onToggleHiddenConversation(selectedContact.id, nextValue);
        }
    };

    const handleTogglePin = async () => {
        if (isAiContact) return;
        if (onPinConversation) {
            await onPinConversation(selectedContact.id, !isPinned);
            setIsPinned(!isPinned);
        }
    };

    const handleToggleMute = async () => {
        if (isAiContact) return;
        if (isMuted) {
            // Nếu đang mắt, bật lại ngay
            if (onMuteConversation) {
                await onMuteConversation(selectedContact.id, false, null);
                setIsMuted(false);
            }
        } else {
            // Nếu chưa mắt, mở dialog chọn thời gian
            setMuteDialogOpen(true);
        }
    };

    const handleCloseMuteDialog = () => {
        setMuteDialogOpen(false);
    };

    const handleConfirmMute = async () => {
        if (onMuteConversation) {
            await onMuteConversation(
                selectedContact.id,
                true,
                selectedMuteOption,
            );
            setIsMuted(true);
        }
        setMuteDialogOpen(false);
    };

    const handleOpenCreateGroup = () => {
        if (isAiContact) return;
        setCreateGroupOpen(true);
        setGroupName('');
        setSelectedMembers([selectedContact.id]); // Tự động chọn người đang chat
        setSearchQuery('');
        setGroupAvatar(null);
    };

    const handleCloseCreateGroup = () => {
        setCreateGroupOpen(false);
        setGroupName('');
        setSelectedMembers([]);
        setSearchQuery('');
        setGroupAvatar(null);
    };

    const handleToggleMember = (memberId) => {
        setSelectedMembers((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId],
        );
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) {
            return;
        }

        if (onCreateGroup) {
            await onCreateGroup(groupName, selectedMembers, groupAvatar);
        }
        handleCloseCreateGroup();
    };

    // Xử lý xóa lịch sử chat
    const handleOpenClearHistory = () => {
        setClearHistoryDialogOpen(true);
    };

    const handleCloseClearHistory = () => {
        setClearHistoryDialogOpen(false);
    };

    const handleStartNewAiConversation = async () => {
        if (onCreateAiConversation) {
            const created = await onCreateAiConversation();
            if (created?.id && onSelectAiConversation) {
                await onSelectAiConversation(created.id);
            }
        }
    };

    const handleSelectAiHistoryItem = async (conversationId) => {
        if (onSelectAiConversation) {
            await onSelectAiConversation(conversationId);
        }
    };

    const handleConfirmClearHistory = async () => {
        if (onClearChatHistory) {
            await onClearChatHistory(selectedContact.id);
        }
        setClearHistoryDialogOpen(false);
    };

    // Xử lý báo cáo
    const handleOpenReport = () => {
        if (isAiContact) return;
        setReportDialogOpen(true);
        setReportReason('');
    };

    const handleCloseReport = () => {
        setReportDialogOpen(false);
        setReportReason('');
    };

    const handleConfirmReport = async () => {
        if (onReportUser && reportReason) {
            await onReportUser(selectedContact.id, reportReason);
        }
        setReportDialogOpen(false);
        setReportReason('');
    };

    // Lọc contacts để hiển thị trong modal
    const availableContacts = contacts.filter(
        (contact) =>
            !contact.isGroup &&
            contact.id !== selectedContact.id && // Không hiển thị người đang chat
            (contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.phone?.includes(searchQuery)),
    );

    return (
        <div className="w-full sm:w-[360px] h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    {isAiContact
                        ? 'Thông tin trợ lý AI'
                        : 'Thông tin hội thoại'}
                </h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <BiX size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {/* User Avatar & Name */}
                <div className="flex flex-col items-center px-4 py-6 border-b border-gray-200">
                    {selectedContact?.avatar ? (
                        <img
                            src={selectedContact.avatar}
                            alt={selectedContact.name}
                            className="w-20 h-20 rounded-full mb-4 object-cover"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-semibold mb-4">
                            {selectedContact?.name?.charAt(0)}
                        </div>
                    )}
                    <h3 className="text-xl font-semibold mb-1">
                        {selectedContact?.name}
                    </h3>
                    {isAiContact && (
                        <p className="text-sm text-gray-500">
                            Trợ lý AI học tập
                        </p>
                    )}
                </div>

                {/* Quick Actions */}
                {!isAiContact && (
                    <div className="flex justify-around p-4 border-b-8 border-gray-100">
                        <div
                            className="flex flex-col items-center cursor-pointer"
                            onClick={handleToggleMute}
                        >
                            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <BiBell
                                    size={24}
                                    className={
                                        isMuted ? 'text-gray-400' : 'text-black'
                                    }
                                />
                            </button>
                            <span
                                className={`text-xs text-center mt-1 ${isMuted ? 'text-gray-400' : 'text-black'}`}
                            >
                                {isMuted ? 'Đã tắt thông báo' : 'Tắt thông báo'}
                            </span>
                        </div>
                        <div
                            className="flex flex-col items-center cursor-pointer"
                            onClick={handleTogglePin}
                        >
                            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <BiPin
                                    size={24}
                                    className={
                                        isPinned
                                            ? 'text-[#0091ff]'
                                            : 'text-black'
                                    }
                                />
                            </button>
                            <span
                                className={`text-xs text-center mt-1 ${isPinned ? 'text-[#0091ff]' : 'text-black'}`}
                            >
                                {isPinned ? 'Đã ghim' : 'Ghim hội thoại'}
                            </span>
                        </div>
                        <div
                            className="flex flex-col items-center cursor-pointer"
                            onClick={handleOpenCreateGroup}
                        >
                            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <BiUserPlus size={24} />
                            </button>
                            <span className="text-xs text-center mt-1">
                                Tạo nhóm trò chuyện
                            </span>
                        </div>
                    </div>
                )}

                {isAiContact && (
                    <div className="p-4 border-b-8 border-gray-100">
                        <button
                            onClick={handleStartNewAiConversation}
                            className="w-full text-left px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors text-emerald-800 text-sm font-medium"
                        >
                            Bắt đầu cuộc trò chuyện mới
                        </button>
                    </div>
                )}

                {isAiContact && (
                    <div className="border-b-8 border-gray-100">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700">
                                Lịch sử trò chuyện AI
                            </h4>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {aiConversations.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-500">
                                    Chưa có lịch sử trò chuyện
                                </div>
                            ) : (
                                aiConversations.map((item) => {
                                    const isActive =
                                        item.id === currentAiConversationId;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() =>
                                                handleSelectAiHistoryItem(
                                                    item.id,
                                                )
                                            }
                                            className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                                                isActive
                                                    ? 'bg-emerald-50 text-emerald-900'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                        >
                                            <p className="text-sm font-medium truncate">
                                                {item.title ||
                                                    'Cuộc trò chuyện mới'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate mt-1">
                                                {item.lastMessage ||
                                                    'Chưa có tin nhắn'}
                                            </p>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Schedule Section */}
                {!isAiContact && (
                    <>
                        <div>
                            <div
                                onClick={() => toggleSection('schedule')}
                                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <BiSearch size={20} />
                                    <span className="font-medium">
                                        Danh sách nhạc hẹn
                                    </span>
                                </div>
                                {expandedSections.schedule ? (
                                    <BiChevronUp size={20} />
                                ) : (
                                    <BiChevronDown size={20} />
                                )}
                            </div>
                            {expandedSections.schedule && (
                                <div className="p-4 text-center text-gray-600">
                                    <p className="text-sm">
                                        Chưa có nhạc hẹn nào
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="border-b-8 border-gray-100"></div>
                    </>
                )}

                {/* Media Section */}
                <div>
                    <div
                        onClick={() => toggleSection('media')}
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <BiImage size={20} />
                            <span className="font-medium">Ảnh/Video</span>
                        </div>
                        {expandedSections.media ? (
                            <BiChevronUp size={20} />
                        ) : (
                            <BiChevronDown size={20} />
                        )}
                    </div>
                    {expandedSections.media &&
                        (mediaMessages.length > 0 ? (
                            <div className="p-4 grid grid-cols-3 gap-2">
                                {mediaMessages
                                    .slice(0, 12)
                                    .map((msg, index) => (
                                        <div
                                            key={msg.id || index}
                                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => {
                                                const mediaUrl =
                                                    resolveMediaUrl(msg);
                                                if (mediaUrl) {
                                                    window.open(
                                                        mediaUrl,
                                                        '_blank',
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.type === 'IMAGE' ? (
                                                <img
                                                    src={
                                                        resolveMediaUrl(msg) ||
                                                        ''
                                                    }
                                                    alt="Media"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <video
                                                    src={
                                                        resolveMediaUrl(msg) ||
                                                        ''
                                                    }
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-gray-600">
                                <p className="text-sm">
                                    Chưa có Ảnh/Video được chia sẻ sau 7/1/2026
                                </p>
                            </div>
                        ))}
                </div>

                <div className="border-b border-gray-200"></div>

                {/* Files Section */}
                <div>
                    <div
                        onClick={() => toggleSection('files')}
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <BiFile size={20} />
                            <span className="font-medium">File</span>
                        </div>
                        {expandedSections.files ? (
                            <BiChevronUp size={20} />
                        ) : (
                            <BiChevronDown size={20} />
                        )}
                    </div>
                    {expandedSections.files &&
                        (fileMessages.length > 0 ? (
                            <div className="px-4 py-2">
                                {fileMessages.slice(0, 10).map((msg, index) => (
                                    <div
                                        key={msg.id || index}
                                        onClick={() => {
                                            const fileUrl =
                                                resolveMediaUrl(msg);
                                            if (fileUrl) {
                                                window.open(fileUrl, '_blank');
                                            }
                                        }}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                    >
                                        <BiFile
                                            size={24}
                                            className="text-[#0091ff]"
                                        />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                                                {msg.fileName ||
                                                    'File đính kèm'}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {new Date(
                                                    msg.createAt,
                                                ).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-gray-600">
                                <p className="text-sm">
                                    Chưa có File được chia sẻ từ sau 7/1/2026
                                </p>
                            </div>
                        ))}
                </div>

                <div className="border-b border-gray-200"></div>

                {/* Links Section */}
                <div>
                    <div
                        onClick={() => toggleSection('links')}
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <BiLink size={20} />
                            <span className="font-medium">Link</span>
                        </div>
                        {expandedSections.links ? (
                            <BiChevronUp size={20} />
                        ) : (
                            <BiChevronDown size={20} />
                        )}
                    </div>
                    {expandedSections.links &&
                        (linkMessages.length > 0 ? (
                            <div className="px-4 py-2">
                                {linkMessages.slice(0, 10).map((msg, index) => {
                                    const urlMatch =
                                        msg.content.match(
                                            /(https?:\/\/[^\s]+)/g,
                                        );
                                    const url = urlMatch
                                        ? urlMatch[0]
                                        : msg.content;
                                    return (
                                        <div
                                            key={msg.id || index}
                                            onClick={() =>
                                                window.open(url, '_blank')
                                            }
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                        >
                                            <BiLink
                                                size={24}
                                                className="text-[#0091ff]"
                                            />
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {url}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    {new Date(
                                                        msg.createAt,
                                                    ).toLocaleDateString(
                                                        'vi-VN',
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-gray-600">
                                <p className="text-sm">
                                    Chưa có Link được chia sẻ từ sau 7/1/2026
                                </p>
                            </div>
                        ))}
                </div>

                <div className="border-b-8 border-gray-100"></div>

                {/* Security Settings */}
                {!isAiContact && (
                    <>
                        <div>
                            <div
                                onClick={() => toggleSection('security')}
                                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <BiShieldAlt2 size={20} />
                                    <span className="font-medium">
                                        Thiết lập bảo mật
                                    </span>
                                </div>
                                {expandedSections.security ? (
                                    <BiChevronUp size={20} />
                                ) : (
                                    <BiChevronDown size={20} />
                                )}
                            </div>
                            {expandedSections.security && (
                                <div className="px-4 pb-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                        <BiLockAlt
                                            size={20}
                                            className="text-gray-600"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm">
                                                Tin nhắn tự xóa
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                Không báo giữ
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                        <BiShow
                                            size={20}
                                            className="text-gray-600"
                                        />
                                        <div className="flex-1 flex items-center justify-between">
                                            <p className="text-sm">
                                                Ẩn trò chuyện
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTogglePrivateMode();
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    isPrivateMode
                                                        ? 'bg-[#0068ff]'
                                                        : 'bg-gray-300'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        isPrivateMode
                                                            ? 'translate-x-6'
                                                            : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        onClick={handleOpenReport}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                    >
                                        <BiMessageAltError
                                            size={20}
                                            className="text-gray-600"
                                        />
                                        <p className="text-sm">Báo xấu</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-b-8 border-gray-100"></div>
                    </>
                )}

                {/* Delete Chat History */}
                <div
                    onClick={handleOpenClearHistory}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors text-red-600"
                >
                    <BiTrash size={20} />
                    <p className="text-sm">Xóa lịch sử trò chuyện</p>
                </div>
            </div>

            {/* Dialog tạo nhóm */}
            {createGroupOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleCloseCreateGroup}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center text-2xl font-bold text-[#0068ff] py-4 border-b border-gray-200">
                            Tạo nhóm trò chuyện
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex flex-col items-center mb-6">
                                <div
                                    className="w-24 h-24 mb-4 border-4 border-[#0068ff] rounded-full shadow-md cursor-pointer hover:opacity-80 transition-opacity overflow-hidden flex items-center justify-center bg-gray-100"
                                    onClick={() =>
                                        document
                                            .getElementById('groupAvatarInput')
                                            .click()
                                    }
                                >
                                    {groupAvatar ? (
                                        <img
                                            src={groupAvatar}
                                            alt="Group avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <BiGroup
                                            size={40}
                                            className="text-gray-400"
                                        />
                                    )}
                                </div>
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
                                                setGroupAvatar(reader.result);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                <p className="text-xs text-gray-600">
                                    Nhấn để thay đổi ảnh nhóm
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên nhóm
                                </label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) =>
                                        setGroupName(e.target.value)
                                    }
                                    placeholder="Nhập tên nhóm..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
                                />
                            </div>

                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    placeholder="Tìm kiếm bạn bè..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
                                />
                            </div>

                            <h3 className="mb-2 font-medium text-gray-800">
                                Thành viên đã chọn: {selectedMembers.length + 1}
                            </h3>

                            {/* Hiển thị người đang chat (đã chọn mặc định) */}
                            <div className="mb-4 p-2 bg-gray-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                    {selectedContact.avatar ? (
                                        <img
                                            src={selectedContact.avatar}
                                            alt={selectedContact.name}
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                                            {selectedContact.name?.charAt(0)}
                                        </div>
                                    )}
                                    <p className="text-sm">
                                        {selectedContact.name} (đang chat)
                                    </p>
                                </div>
                            </div>

                            <h3 className="mb-2 font-medium text-gray-800">
                                Chọn thêm thành viên
                            </h3>

                            <div className="max-h-72 overflow-auto bg-white rounded-lg border border-gray-300">
                                {availableContacts.length === 0 ? (
                                    <div className="p-4 text-center text-gray-600">
                                        Không tìm thấy bạn bè phù hợp
                                    </div>
                                ) : (
                                    availableContacts.map((contact) => (
                                        <div
                                            key={contact.id}
                                            className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMembers.includes(
                                                        contact.id,
                                                    )}
                                                    onChange={() =>
                                                        handleToggleMember(
                                                            contact.id,
                                                        )
                                                    }
                                                    className="w-5 h-5 text-[#0068ff] border-gray-300 rounded focus:ring-[#0068ff] cursor-pointer"
                                                />
                                                <div className="ml-3 flex items-center gap-2">
                                                    {contact.avatar ? (
                                                        <img
                                                            src={contact.avatar}
                                                            alt={contact.name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                                                            {contact.name?.charAt(
                                                                0,
                                                            )}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            {contact.name}
                                                        </p>
                                                        <p className="text-xs text-gray-600">
                                                            {contact.phone ||
                                                                contact.username}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={handleCloseCreateGroup}
                                className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={
                                    !groupName.trim() ||
                                    selectedMembers.length === 0
                                }
                                className={`flex-1 px-6 py-2 rounded-lg transition-colors ${
                                    !groupName.trim() ||
                                    selectedMembers.length === 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-[#0068ff] text-white hover:bg-[#0056d6]'
                                }`}
                            >
                                Tạo nhóm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog tắt thông báo */}
            {muteDialogOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleCloseMuteDialog}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-xs p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-4">Xác nhận</h2>
                        <p className="mb-4 text-gray-700">
                            Bạn có chắc muốn tắt thông báo hội thoại này:
                        </p>
                        <div className="space-y-2">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    value="1hour"
                                    checked={selectedMuteOption === '1hour'}
                                    onChange={(e) =>
                                        setSelectedMuteOption(e.target.value)
                                    }
                                    className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
                                />
                                <span className="ml-2 text-sm">
                                    Trong 1 giờ
                                </span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    value="4hours"
                                    checked={selectedMuteOption === '4hours'}
                                    onChange={(e) =>
                                        setSelectedMuteOption(e.target.value)
                                    }
                                    className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
                                />
                                <span className="ml-2 text-sm">
                                    Trong 4 giờ
                                </span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    value="until8am"
                                    checked={selectedMuteOption === 'until8am'}
                                    onChange={(e) =>
                                        setSelectedMuteOption(e.target.value)
                                    }
                                    className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
                                />
                                <span className="ml-2 text-sm">
                                    Cho đến 8:00 AM
                                </span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    value="forever"
                                    checked={selectedMuteOption === 'forever'}
                                    onChange={(e) =>
                                        setSelectedMuteOption(e.target.value)
                                    }
                                    className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
                                />
                                <span className="ml-2 text-sm">
                                    Cho đến khi được mở lại
                                </span>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleCloseMuteDialog}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmMute}
                                className="flex-1 px-4 py-2 bg-[#0068ff] text-white rounded-lg hover:bg-[#0056d6] transition-colors"
                            >
                                Đồng ý
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog xác nhận xóa lịch sử chat */}
            {clearHistoryDialogOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleCloseClearHistory}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-xs p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-4">Xác nhận</h2>
                        <p className="mb-4 text-gray-700">
                            Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện với
                            "{selectedContact?.name}"?
                        </p>
                        <p className="mb-4 text-sm text-gray-500">
                            Hành động này chỉ xóa tin nhắn ở phía bạn. Người kia
                            vẫn có thể xem tin nhắn.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloseClearHistory}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmClearHistory}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog báo xấu */}
            {reportDialogOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleCloseReport}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-sm p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-4">
                            Báo xấu người dùng
                        </h2>
                        <p className="mb-4 text-gray-700">
                            Vui lòng cho biết lý do bạn muốn báo xấu người này:
                        </p>
                        <div className="space-y-2 mb-4">
                            {[
                                'Nội dung spam',
                                'Nội dung không phù hợp',
                                'Lừa đảo',
                                'Quấy rối',
                                'Giả mạo danh tính',
                                'Khác',
                            ].map((reason) => (
                                <label
                                    key={reason}
                                    className="flex items-center cursor-pointer"
                                >
                                    <input
                                        type="radio"
                                        value={reason}
                                        checked={reportReason === reason}
                                        onChange={(e) =>
                                            setReportReason(e.target.value)
                                        }
                                        className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
                                    />
                                    <span className="ml-2 text-sm">
                                        {reason}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloseReport}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmReport}
                                disabled={!reportReason}
                                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                                    !reportReason
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                            >
                                Gửi báo cáo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonalChatInfoPanel;
