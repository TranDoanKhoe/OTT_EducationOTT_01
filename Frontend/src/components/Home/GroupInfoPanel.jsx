import React, { useEffect, useState } from 'react';
import {
    BiX,
    BiChevronDown,
    BiChevronUp,
    BiBell,
    BiGroup,
    BiPin,
    BiUserPlus,
    BiSearch,
    BiCog,
    BiImage,
    BiFile,
    BiLink,
    BiShieldAlt2,
    BiLockAlt,
    BiShow,
    BiMessageAltError,
    BiLogOut,
    BiEdit,
    BiTrash,
} from 'react-icons/bi';

const GroupInfoPanel = ({
    selectedContact,
    groupMembers = [],
    messages = [],
    onClose,
    contacts = [],
    onAddMembers,
    onSendGroupInvites,
    onUpdateGroupInfo,
    onPinConversation,
    onMuteConversation,
    onSetAutoDelete,
    onToggleHiddenConversation,
    onClearChatHistory,
    onLeaveGroup,
    onDissolveGroup,
    onReportGroup,
    onOpenGroupFeatures,
    onOpenSettingGroup,
}) => {
    const [expandedSections, setExpandedSections] = useState({
        members: true,
        schedule: false,
        media: false,
        files: false,
        links: false,
        security: false,
    });

    const [isPrivateMode, setIsPrivateMode] = useState(
        selectedContact?.isHidden || false,
    );
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [selectedNewMembers, setSelectedNewMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [inviteMode, setInviteMode] = useState('invite'); // 'invite' or 'direct'
    const [editNameOpen, setEditNameOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupAvatar, setNewGroupAvatar] = useState(null);
    const [isPinned, setIsPinned] = useState(
        selectedContact?.isPinned || false,
    );
    const [isMuted, setIsMuted] = useState(selectedContact?.isMuted || false);
    const [muteDialogOpen, setMuteDialogOpen] = useState(false);
    const [selectedMuteOption, setSelectedMuteOption] = useState('1hour');
    const [autoDeleteDialogOpen, setAutoDeleteDialogOpen] = useState(false);
    const [autoDeleteOption, setAutoDeleteOption] = useState(
        selectedContact?.autoDeleteOption || 'off',
    );
    const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
    const [leaveGroupDialogOpen, setLeaveGroupDialogOpen] = useState(false);
    const [dissolveGroupDialogOpen, setDissolveGroupDialogOpen] =
        useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');

    useEffect(() => {
        setIsPinned(selectedContact?.isPinned || false);
        setIsMuted(selectedContact?.isMuted || false);
        setIsPrivateMode(selectedContact?.isHidden || false);
        setAutoDeleteOption(selectedContact?.autoDeleteOption || 'off');
    }, [selectedContact?.id]);

    const autoDeleteLabels = {
        off: 'Không bảo giữ',
        '5m': 'Sau 5 phút',
        '1h': 'Sau 1 giờ',
        '24h': 'Sau 24 giờ',
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

    const handleTogglePrivateMode = async () => {
        const nextValue = !isPrivateMode;
        setIsPrivateMode(nextValue);

        if (onToggleHiddenConversation) {
            await onToggleHiddenConversation(selectedContact.id, nextValue);
        }
    };

    const handleOpenAutoDeleteDialog = () => {
        setAutoDeleteDialogOpen(true);
    };

    const handleCloseAutoDeleteDialog = () => {
        setAutoDeleteDialogOpen(false);
    };

    const handleConfirmAutoDelete = async () => {
        if (onSetAutoDelete) {
            await onSetAutoDelete(selectedContact.id, autoDeleteOption);
        }
        setAutoDeleteDialogOpen(false);
    };

    const handleOpenAddMember = () => {
        setAddMemberOpen(true);
        setSelectedNewMembers([]);
        setSearchQuery('');
    };

    const handleCloseAddMember = () => {
        setAddMemberOpen(false);
        setSelectedNewMembers([]);
        setSearchQuery('');
    };

    const handleToggleNewMember = (memberId) => {
        setSelectedNewMembers((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId],
        );
    };

    const handleAddMembers = async () => {
        if (selectedNewMembers.length === 0) {
            return;
        }

        if (inviteMode === 'invite' && onSendGroupInvites) {
            // Gửi lời mời
            await onSendGroupInvites(selectedContact.id, selectedNewMembers);
        } else if (inviteMode === 'direct' && onAddMembers) {
            // Thêm trực tiếp
            await onAddMembers(selectedContact.id, selectedNewMembers);
        }
        handleCloseAddMember();
    };

    // Lọc ra những người bạn chưa ở trong nhóm
    const existingMemberIds = new Set(groupMembers.map((m) => m.id));
    const availableContacts = contacts.filter(
        (contact) =>
            !contact.isGroup &&
            !existingMemberIds.has(contact.id) &&
            (contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.phone?.includes(searchQuery)),
    );

    const handleOpenEditName = () => {
        setNewGroupName(selectedContact?.name || '');
        setEditNameOpen(true);
    };

    const handleCloseEditName = () => {
        setEditNameOpen(false);
        setNewGroupName('');
    };

    const handleUpdateGroupName = async () => {
        if (!newGroupName.trim()) return;

        if (onUpdateGroupInfo) {
            await onUpdateGroupInfo(selectedContact.id, { name: newGroupName });
        }
        handleCloseEditName();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const avatarBase64 = reader.result;
            setNewGroupAvatar(avatarBase64);

            if (onUpdateGroupInfo) {
                await onUpdateGroupInfo(selectedContact.id, {
                    avatarGroup: avatarBase64,
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleTogglePin = async () => {
        if (onPinConversation) {
            await onPinConversation(selectedContact.id, !isPinned);
            setIsPinned(!isPinned);
        }
    };

    const handleToggleMute = async () => {
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

    // Xử lý xóa lịch sử chat
    const handleOpenClearHistory = () => {
        setClearHistoryDialogOpen(true);
    };

    const handleCloseClearHistory = () => {
        setClearHistoryDialogOpen(false);
    };

    const handleConfirmClearHistory = async () => {
        if (onClearChatHistory) {
            await onClearChatHistory(selectedContact.id);
        }
        setClearHistoryDialogOpen(false);
    };

    // Xử lý rời nhóm
    const handleOpenLeaveGroup = () => {
        setLeaveGroupDialogOpen(true);
    };

    const handleCloseLeaveGroup = () => {
        setLeaveGroupDialogOpen(false);
    };

    const handleConfirmLeaveGroup = async () => {
        if (onLeaveGroup) {
            await onLeaveGroup(selectedContact.id);
        }
        setLeaveGroupDialogOpen(false);
    };

    // Xử lý giải tán nhóm
    const handleOpenDissolveGroup = () => {
        setDissolveGroupDialogOpen(true);
    };

    const handleCloseDissolveGroup = () => {
        setDissolveGroupDialogOpen(false);
    };

    const handleConfirmDissolveGroup = async () => {
        if (onDissolveGroup) {
            await onDissolveGroup(selectedContact.id);
        }
        setDissolveGroupDialogOpen(false);
    };

    // Xử lý báo cáo
    const handleOpenReport = () => {
        setReportDialogOpen(true);
        setReportReason('');
    };

    const handleCloseReport = () => {
        setReportDialogOpen(false);
        setReportReason('');
    };

    const handleConfirmReport = async () => {
        if (onReportGroup && reportReason) {
            await onReportGroup(selectedContact.id, reportReason);
        }
        setReportDialogOpen(false);
        setReportReason('');
    };

    return (
        <div className="w-full sm:w-[360px] h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Thông tin nhóm</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <BiX size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {/* Group Avatar & Name */}
                <div className="flex flex-col items-center px-4 py-6 border-b border-gray-200">
                    <div
                        className="w-20 h-20 mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() =>
                            document
                                .getElementById('groupAvatarChangeInput')
                                .click()
                        }
                    >
                        {newGroupAvatar || selectedContact?.avatar ? (
                            <img
                                src={newGroupAvatar || selectedContact.avatar}
                                alt={selectedContact.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full rounded-full bg-primary text-white flex items-center justify-center text-2xl font-semibold">
                                {selectedContact?.name?.charAt(0)}
                            </div>
                        )}
                    </div>
                    <input
                        id="groupAvatarChangeInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                    <h3 className="text-xl font-semibold mb-1">
                        {selectedContact?.name}
                    </h3>
                    <button
                        onClick={handleOpenEditName}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <BiEdit size={18} />
                    </button>
                </div>

                {/* Quick Actions */}
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
                                    isPinned ? 'text-[#0091ff]' : 'text-black'
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
                        onClick={handleOpenAddMember}
                    >
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <BiUserPlus size={24} />
                        </button>
                        <span className="text-xs text-center mt-1">
                            Thêm thành viên
                        </span>
                    </div>
                    <div
                        className="flex flex-col items-center cursor-pointer"
                        onClick={onOpenSettingGroup}
                    >
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <BiCog size={24} />
                        </button>
                        <span className="text-xs text-center mt-1">
                            Quản lý nhóm
                        </span>
                    </div>
                </div>

                {/* Members Section */}
                <div>
                    <div
                        onClick={() => toggleSection('members')}
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <BiGroup size={20} />
                            <span className="font-medium">Thành viên nhóm</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                                {groupMembers.length} thành viên
                            </span>
                            {expandedSections.members ? (
                                <BiChevronUp size={20} />
                            ) : (
                                <BiChevronDown size={20} />
                            )}
                        </div>
                    </div>
                    {expandedSections.members && (
                        <div className="max-h-[200px] overflow-auto">
                            {groupMembers.length > 0 ? (
                                <>
                                    {groupMembers
                                        .slice(0, 5)
                                        .map((member, index) => (
                                            <div
                                                key={member.id || index}
                                                className="flex items-center gap-3 px-4 py-2"
                                            >
                                                <div className="relative">
                                                    {member.avatar ? (
                                                        <img
                                                            src={member.avatar}
                                                            alt={
                                                                member.username
                                                            }
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                                                            {member.username?.charAt(
                                                                0,
                                                            )}
                                                        </div>
                                                    )}
                                                    <span
                                                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                                            member.status ===
                                                            'online'
                                                                ? 'bg-green-500'
                                                                : 'bg-gray-400'
                                                        }`}
                                                    ></span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {member.username}
                                                    </p>
                                                    {member.status ===
                                                        'online' && (
                                                        <p className="text-xs text-gray-600">
                                                            Đang hoạt động
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    {groupMembers.length > 5 && (
                                        <div className="px-4 py-2">
                                            <p className="text-[#0068ff] cursor-pointer text-sm">
                                                Xem tất cả {groupMembers.length}{' '}
                                                thành viên
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="px-4 py-2 text-center text-gray-600">
                                    <p className="text-sm">
                                        Không có thành viên nào
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-b-8 border-gray-100"></div>

                {/* Schedule Section */}
                <div>
                    <div
                        onClick={() => toggleSection('schedule')}
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <BiSearch size={20} />
                            <span className="font-medium">Bảng tin nhóm</span>
                        </div>
                        {expandedSections.schedule ? (
                            <BiChevronUp size={20} />
                        ) : (
                            <BiChevronDown size={20} />
                        )}
                    </div>
                    {expandedSections.schedule && (
                        <div className="px-2 py-2">
                            <div
                                onClick={() => {
                                    if (onOpenGroupFeatures) {
                                        onOpenGroupFeatures();
                                    }
                                }}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                            >
                                <BiEdit size={20} />
                                <span className="text-sm">
                                    Ghi chú, ghim, bình chọn
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-b-8 border-gray-100"></div>

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
                                            onClick={() =>
                                                window.open(
                                                    msg.content,
                                                    '_blank',
                                                )
                                            }
                                        >
                                            {msg.type === 'IMAGE' ? (
                                                <img
                                                    src={msg.content}
                                                    alt="Media"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <video
                                                    src={msg.content}
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
                                        onClick={() =>
                                            window.open(msg.content, '_blank')
                                        }
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
                            <div
                                onClick={handleOpenAutoDeleteDialog}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                            >
                                <BiLockAlt
                                    size={20}
                                    className="text-gray-600"
                                />
                                <div className="flex-1">
                                    <p className="text-sm">Tin nhắn tự xóa</p>
                                    <p className="text-xs text-gray-600">
                                        {autoDeleteLabels[autoDeleteOption] ||
                                            'Không bảo giữ'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                <BiShow size={20} className="text-gray-600" />
                                <div className="flex-1 flex items-center justify-between">
                                    <p className="text-sm">Ẩn trò chuyện</p>
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
                                onClick={handleOpenClearHistory}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                            >
                                <BiTrash size={20} className="text-gray-600" />
                                <p className="text-sm">
                                    Xóa lịch sử trò chuyện
                                </p>
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

                {/* Leave Group */}
                <div
                    onClick={handleOpenLeaveGroup}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors text-red-600"
                >
                    <BiLogOut size={20} />
                    <p className="text-sm">Rời nhóm</p>
                </div>

                <div
                    onClick={handleOpenDissolveGroup}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 cursor-pointer transition-colors text-red-600"
                >
                    <BiTrash size={20} />
                    <p className="text-sm">Giải tán nhóm</p>
                </div>
            </div>

            {/* Dialog đổi tên nhóm */}
            {editNameOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleCloseEditName}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-xs p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-4">
                            Đổi tên nhóm
                        </h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên nhóm mới
                            </label>
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) =>
                                    setNewGroupName(e.target.value)
                                }
                                autoFocus
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloseEditName}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpdateGroupName}
                                disabled={!newGroupName.trim()}
                                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                                    !newGroupName.trim()
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-[#0068ff] text-white hover:bg-[#0056d6]'
                                }`}
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog thêm thành viên */}
            {addMemberOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleCloseAddMember}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center text-2xl font-bold text-[#0068ff] py-4 border-b border-gray-200">
                            Thêm thành viên vào nhóm
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Chọn phương thức */}
                            <div className="mb-6">
                                <h3 className="mb-2 text-sm font-semibold">
                                    Chọn phương thức:
                                </h3>
                                <div className="space-y-2">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            value="invite"
                                            checked={inviteMode === 'invite'}
                                            onChange={(e) =>
                                                setInviteMode(e.target.value)
                                            }
                                            className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
                                        />
                                        <span className="ml-2 text-sm">
                                            Gửi lời mời (người nhận phải chấp
                                            nhận)
                                        </span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            value="direct"
                                            checked={inviteMode === 'direct'}
                                            onChange={(e) =>
                                                setInviteMode(e.target.value)
                                            }
                                            className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
                                        />
                                        <span className="ml-2 text-sm">
                                            Thêm trực tiếp vào nhóm
                                        </span>
                                    </label>
                                </div>
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
                                Đã chọn: {selectedNewMembers.length} người
                            </h3>

                            <div className="max-h-96 overflow-auto bg-white rounded-lg border border-gray-300">
                                {availableContacts.length === 0 ? (
                                    <div className="p-4 text-center text-gray-600">
                                        {searchQuery
                                            ? 'Không tìm thấy bạn bè phù hợp'
                                            : 'Tất cả bạn bè đã ở trong nhóm'}
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
                                                    checked={selectedNewMembers.includes(
                                                        contact.id,
                                                    )}
                                                    onChange={() =>
                                                        handleToggleNewMember(
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
                                onClick={handleCloseAddMember}
                                className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddMembers}
                                disabled={selectedNewMembers.length === 0}
                                className={`flex-1 px-6 py-2 rounded-lg transition-colors ${
                                    selectedNewMembers.length === 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-[#0068ff] text-white hover:bg-[#0056d6]'
                                }`}
                            >
                                {inviteMode === 'invite'
                                    ? 'Gửi lời mời'
                                    : 'Thêm thành viên'}
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

            {/* Dialog tin nhắn tự xóa */}
            {autoDeleteDialogOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleCloseAutoDeleteDialog}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-xs p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-4">
                            Tin nhắn tự xóa
                        </h2>
                        <p className="mb-4 text-gray-700 text-sm">
                            Chọn thời gian tự xóa cho tin nhắn mới trong cuộc
                            trò chuyện này.
                        </p>

                        <div className="space-y-2">
                            {[
                                { value: 'off', label: 'Không bảo giữ' },
                                { value: '5m', label: 'Sau 5 phút' },
                                { value: '1h', label: 'Sau 1 giờ' },
                                { value: '24h', label: 'Sau 24 giờ' },
                            ].map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center cursor-pointer"
                                >
                                    <input
                                        type="radio"
                                        value={option.value}
                                        checked={
                                            autoDeleteOption === option.value
                                        }
                                        onChange={(e) =>
                                            setAutoDeleteOption(e.target.value)
                                        }
                                        className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
                                    />
                                    <span className="ml-2 text-sm">
                                        {option.label}
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleCloseAutoDeleteDialog}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmAutoDelete}
                                className="flex-1 px-4 py-2 bg-[#0068ff] text-white rounded-lg hover:bg-[#0056d6] transition-colors"
                            >
                                Lưu
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
                            nhóm "{selectedContact?.name}"?
                        </p>
                        <p className="mb-4 text-sm text-gray-500">
                            Hành động này chỉ xóa tin nhắn ở phía bạn. Các thành
                            viên khác vẫn có thể xem tin nhắn.
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

            {/* Dialog xác nhận rời nhóm */}
            {leaveGroupDialogOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleCloseLeaveGroup}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-xs p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-4 text-red-600">
                            Rời nhóm
                        </h2>
                        <p className="mb-4 text-gray-700">
                            Bạn có chắc muốn rời khỏi nhóm "
                            {selectedContact?.name}"?
                        </p>
                        <p className="mb-4 text-sm text-gray-500">
                            Bạn sẽ không còn nhận được tin nhắn từ nhóm này và
                            cần được mời lại để tham gia.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloseLeaveGroup}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmLeaveGroup}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Rời nhóm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog xác nhận giải tán nhóm */}
            {dissolveGroupDialogOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleCloseDissolveGroup}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-xs p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-4 text-red-600">
                            Giải tán nhóm
                        </h2>
                        <p className="mb-4 text-gray-700">
                            Bạn có chắc muốn giải tán nhóm "
                            {selectedContact?.name}"?
                        </p>
                        <p className="mb-4 text-sm text-gray-500">
                            Hành động này sẽ kết thúc nhóm cho tất cả thành
                            viên.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloseDissolveGroup}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmDissolveGroup}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Giải tán
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
                            Báo xấu nhóm
                        </h2>
                        <p className="mb-4 text-gray-700">
                            Vui lòng cho biết lý do bạn muốn báo xấu nhóm này:
                        </p>
                        <div className="space-y-2 mb-4">
                            {[
                                'Nội dung spam',
                                'Nội dung không phù hợp',
                                'Lừa đảo',
                                'Quấy rối',
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

export default GroupInfoPanel;
