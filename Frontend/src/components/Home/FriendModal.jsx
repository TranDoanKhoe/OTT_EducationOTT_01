import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone,
    MessageCircle,
    Slash,
    Trash,
    LogOut,
    X,
    UserPlus,
    Shield,
    Image,
    Link2,
    Users,
    Mail,
} from 'lucide-react';
import {
    BiCog,
    BiGroup,
    BiMessageSquareDetail,
    BiPhoneCall,
    BiUndo,
    BiVideo,
} from 'react-icons/bi';
import { deleteFriend, blockUser, unblockUser } from '../../api/user';
import { dissolveGroup, fetchUserGroups } from '../../api/groupApi';
import { toast } from 'react-toastify';
import SettingGroup from './SettingGroup';

const FriendModal = ({
    open,
    onClose,
    profileData,
    userId,
    token,
    onContactSelect,
    contacts,
    fetchFriendsList,
}) => {
    const [isSettingGroupOpen, setIsSettingGroupOpen] = useState(false);
    const [isImageOpen, setIsImageOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('info');

    const handleOpenSettingGroup = () => {
        setIsSettingGroupOpen(true);
    };

    const handleCloseSettingGroup = () => {
        setIsSettingGroupOpen(false);
    };

    const handleImageOpen = () => {
        setIsImageOpen(true);
    };

    const handleImageClose = () => {
        setIsImageOpen(false);
    };

    const handleBlockUser = async () => {
        if (!profileData.id) {
            toast.error('Không tìm thấy người dùng để chặn');
            return;
        }

        const confirmBlock = window.confirm(
            `Bạn có chắc chắn muốn chặn ${profileData.name || 'người dùng này'} không?`,
        );
        if (!confirmBlock) return;

        try {
            const result = await blockUser(profileData.id);
            if (result) {
                toast.success('Đã chặn người dùng thành công!');
                onClose();
            } else {
                toast.error('Chặn người dùng thất bại!');
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            toast.error('Có lỗi xảy ra khi chặn người dùng');
        }
    };

    const handleUnblockUser = async () => {
        if (!profileData.id) {
            toast.error('Không tìm thấy người dùng để gỡ chặn');
            return;
        }

        const confirmUnblock = window.confirm(
            `Bạn có chắc chắn muốn gỡ chặn ${profileData.name || 'người dùng này'} không?`,
        );
        if (!confirmUnblock) return;

        try {
            const result = await unblockUser(profileData.id);
            if (result) {
                toast.success('Đã gỡ chặn người dùng thành công!');
            } else {
                toast.error('Gỡ chặn người dùng thất bại!');
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            toast.error('Có lỗi xảy ra khi gỡ chặn người dùng');
        }
    };

    const handleDeleteFriend = async (friendId) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để xóa bạn bè');
            return;
        }

        const confirmDelete = window.confirm(
            `Bạn có chắc chắn muốn xóa ${profileData.name || 'người này'} khỏi danh sách bạn bè?`,
        );
        if (!confirmDelete) return;

        try {
            const result = await deleteFriend(friendId);
            if (result) {
                toast.success('Đã xóa bạn bè thành công!');

                if (typeof fetchFriendsList === 'function') {
                    const updatedFriends = await fetchFriendsList();
                    if (updatedFriends && contacts) {
                        const updatedContacts = contacts
                            .filter((c) => c.isGroup || c.id !== friendId)
                            .concat(
                                updatedFriends.map((friend) => ({
                                    id: friend.id,
                                    name: friend.name,
                                    avatar: friend.avatar,
                                    status: friend.status,
                                    phone: friend.phone,
                                })),
                            );
                        contacts.splice(0, contacts.length, ...updatedContacts);
                    }

                    if (
                        typeof onContactSelect === 'function' &&
                        profileData?.id === friendId
                    ) {
                        onContactSelect(null);
                    }
                }
                onClose();
            } else {
                toast.error('Xóa bạn bè thất bại!');
            }
        } catch (error) {
            if (
                error.message.includes('không có quyền') ||
                error.message.includes('403')
            ) {
                toast.error(
                    '⚠️ Tính năng xóa bạn bè chưa được kích hoạt trên server.',
                    {
                        duration: 5000,
                    },
                );
            } else {
                toast.error(`Lỗi xóa bạn bè: ${error.message}`);
            }
        }
    };

    const handleDissolveGroup = async () => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để xóa nhóm');
            return;
        }

        const confirmDissolve = window.confirm(
            `Bạn có chắc chắn muốn giải tán nhóm "${profileData.name}" không?`,
        );
        if (!confirmDissolve) return;

        try {
            await dissolveGroup(profileData.id, token);
            toast.success('Nhóm đã được giải tán thành công!');
            await fetchUserGroups(userId, token);
            window.location.reload();
            if (onClose) onClose();
        } catch (error) {
            console.error('Lỗi khi giải tán nhóm:', error);
            toast.error(
                'Xóa nhóm thất bại! Chỉ có nhóm trưởng mới có thể thực hiện hành động này',
            );
        }
    };

    if (!profileData) return null;

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    {/* Modal Content */}
                    <motion.div
                        key={profileData?.id || profileData?.name}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header với Gradient */}
                        <div className="relative bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 pt-8 pb-16 overflow-hidden">
                            {/* Animated Background Effects */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.5, 0.3],
                                }}
                                transition={{
                                    duration: 8,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                                className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"
                            />
                            <motion.div
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.2, 0.4, 0.2],
                                }}
                                transition={{
                                    duration: 10,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: 1,
                                }}
                                className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-300/20 rounded-full blur-2xl"
                            />

                            {/* Close Button */}
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors z-10"
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        {/* Avatar - Positioned over header/content border */}
                        <div className="relative -mt-14 flex justify-center mb-4">
                            <motion.div
                                initial={{ scale: 0, y: -20 }}
                                animate={{ scale: 1, y: 0 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 260,
                                    damping: 20,
                                    delay: 0.1,
                                }}
                                whileHover={{ scale: 1.05 }}
                                className="cursor-pointer group"
                                onClick={handleImageOpen}
                            >
                                {profileData.avatar ? (
                                    <div className="relative">
                                        <img
                                            src={profileData.avatar}
                                            alt={profileData.name}
                                            className="w-28 h-28 rounded-full border-4 border-white shadow-xl object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            whileHover={{ opacity: 1 }}
                                            className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center"
                                        >
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                whileHover={{ scale: 1 }}
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 300,
                                                }}
                                            >
                                                <Image
                                                    size={24}
                                                    className="text-white"
                                                />
                                            </motion.div>
                                        </motion.div>
                                    </div>
                                ) : profileData.isGroup ? (
                                    <div className="w-28 h-28 rounded-full border-4 border-white flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-200 shadow-xl">
                                        <BiGroup
                                            size={48}
                                            className="text-emerald-600"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-28 h-28 rounded-full border-4 border-white flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-4xl font-bold shadow-xl">
                                        {profileData.name
                                            ?.charAt(0)
                                            .toUpperCase()}
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6">
                            {/* Name & Status */}
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                                    {profileData.name}
                                </h2>
                                {profileData.phone && (
                                    <p className="text-gray-500 flex items-center justify-center gap-1.5">
                                        <Phone size={14} />
                                        {profileData.phone}
                                    </p>
                                )}
                                {profileData.isGroup && profileData.members && (
                                    <p className="text-gray-500 flex items-center justify-center gap-1.5 mt-1">
                                        <Users size={14} />
                                        {profileData.members.length} thành viên
                                    </p>
                                )}
                            </div>

                            {/* Quick Actions */}
                            {profileData.isGroup ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="mb-6"
                                >
                                    <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                                        Tác vụ nhanh
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={onClose}
                                            className="flex flex-col items-center gap-2 py-4 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 transition-all shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/40"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                                <BiMessageSquareDetail
                                                    size={21}
                                                />
                                            </div>
                                            <span className="text-sm font-semibold">
                                                Nhắn tin
                                            </span>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="flex flex-col items-center gap-2 py-4 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 transition-all shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/40"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                                <BiPhoneCall size={21} />
                                            </div>
                                            <span className="text-sm font-semibold">
                                                Gọi thoại
                                            </span>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="flex flex-col items-center gap-2 py-4 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 transition-all shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/40"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                                <BiVideo size={21} />
                                            </div>
                                            <span className="text-sm font-semibold">
                                                Gọi video
                                            </span>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleOpenSettingGroup}
                                            className="flex flex-col items-center gap-2 py-4 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 transition-all shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/40"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                                <BiCog size={21} />
                                            </div>
                                            <span className="text-sm font-semibold">
                                                Cài đặt
                                            </span>
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex gap-3 mb-6"
                                >
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 transition-all shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/40"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                            <Phone size={20} />
                                        </div>
                                        <span className="text-sm font-medium">
                                            Gọi điện
                                        </span>
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={onClose}
                                        className="flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 transition-all shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/40"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                            <MessageCircle size={20} />
                                        </div>
                                        <span className="text-sm font-medium">
                                            Nhắn tin
                                        </span>
                                    </motion.button>
                                </motion.div>
                            )}

                            {/* Tabs for Personal Profile */}
                            {!profileData.isGroup && (
                                <div className="flex border-b border-gray-200 mb-4">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('info')}
                                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                                            activeTab === 'info'
                                                ? 'border-emerald-500 text-emerald-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Thông tin
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('media')}
                                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                                            activeTab === 'media'
                                                ? 'border-emerald-500 text-emerald-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Hình ảnh
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('actions')}
                                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                                            activeTab === 'actions'
                                                ? 'border-emerald-500 text-emerald-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Tùy chọn
                                    </motion.button>
                                </div>
                            )}

                            {/* Tab Content */}
                            {!profileData.isGroup && activeTab === 'info' && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                            <UserPlus size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">
                                                Họ và tên
                                            </p>
                                            <p className="font-medium text-slate-800">
                                                {profileData.name ||
                                                    'Chưa cập nhật'}
                                            </p>
                                        </div>
                                    </div>
                                    {profileData.email && (
                                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                                <Mail size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">
                                                    Email
                                                </p>
                                                <p className="font-medium text-slate-800">
                                                    {profileData.email}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {profileData.phone && (
                                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                                <Phone size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">
                                                    Số điện thoại
                                                </p>
                                                <p className="font-medium text-slate-800">
                                                    {profileData.phone}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!profileData.isGroup && activeTab === 'media' && (
                                <div>
                                    {profileData.media?.length ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {profileData.media.map(
                                                (media, index) => (
                                                    <img
                                                        key={index}
                                                        src={media.url}
                                                        alt="media"
                                                        className="w-full aspect-square object-cover rounded-xl shadow-sm hover:opacity-90 cursor-pointer transition-opacity"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <Image
                                                size={48}
                                                className="mx-auto mb-3 opacity-30"
                                            />
                                            <p className="text-sm">
                                                Chưa có ảnh nào được chia sẻ
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!profileData.isGroup &&
                                activeTab === 'actions' && (
                                    <div className="space-y-2">
                                        <button
                                            onClick={handleBlockUser}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center transition-colors">
                                                <Shield size={18} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium">
                                                    Chặn người này
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Họ sẽ không thể liên lạc với
                                                    bạn
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={handleUnblockUser}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center transition-colors">
                                                <BiUndo size={18} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium">
                                                    Gỡ chặn
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Cho phép người này liên lạc
                                                    lại
                                                </p>
                                            </div>
                                        </button>

                                        <div className="h-px bg-slate-200 my-2"></div>

                                        <button
                                            onClick={() =>
                                                handleDeleteFriend(
                                                    profileData.id,
                                                )
                                            }
                                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50/60 text-red-600 hover:bg-red-100/70 transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center transition-colors">
                                                <Trash size={18} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium">
                                                    Xóa bạn bè
                                                </p>
                                                <p className="text-xs text-red-500/90">
                                                    Xóa khỏi danh sách bạn bè
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                )}

                            {/* Group Content */}
                            {profileData.isGroup && (
                                <>
                                    {/* Members Preview */}
                                    {profileData.members &&
                                        profileData.members.length > 0 && (
                                            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                                                <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                                                    <Users size={16} />
                                                    Thành viên (
                                                    {profileData.members.length}
                                                    )
                                                </h3>
                                                <div className="rounded-xl bg-white border border-slate-100 p-2 space-y-2 max-h-48 overflow-y-auto">
                                                    {profileData.members
                                                        .slice(0, 5)
                                                        .map((member) => (
                                                            <div
                                                                key={member.id}
                                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                                                            >
                                                                {member.avatar ? (
                                                                    <img
                                                                        src={
                                                                            member.avatar
                                                                        }
                                                                        alt={
                                                                            member.name
                                                                        }
                                                                        className="w-10 h-10 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                                                                        {member.name?.charAt(
                                                                            0,
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-800 truncate">
                                                                        {
                                                                            member.name
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        @
                                                                        {
                                                                            member.name
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    {profileData.members
                                                        .length > 5 && (
                                                        <button
                                                            onClick={
                                                                handleOpenSettingGroup
                                                            }
                                                            className="w-full text-center text-sm font-medium text-cyan-700 hover:text-cyan-800 py-2"
                                                        >
                                                            Xem tất cả{' '}
                                                            {
                                                                profileData
                                                                    .members
                                                                    .length
                                                            }{' '}
                                                            thành viên
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    {/* Group Link */}
                                    {profileData.groupLink && (
                                        <div className="mb-4">
                                            <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                                                <Link2 size={16} />
                                                Link tham gia nhóm
                                            </h3>
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <p className="text-sm text-blue-600 break-all">
                                                    {profileData.groupLink}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Danger Zone */}
                                    <div className="pt-4 border-t border-slate-200">
                                        <button
                                            onClick={handleDissolveGroup}
                                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50/60 text-red-600 hover:bg-red-100/70 hover:border-red-300 transition-colors"
                                        >
                                            <LogOut size={18} />
                                            <span className="font-semibold">
                                                Giải tán nhóm
                                            </span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* SettingGroup Modal */}
            {profileData.isGroup && (
                <SettingGroup
                    open={isSettingGroupOpen}
                    onClose={handleCloseSettingGroup}
                    groupId={profileData?.id}
                    token={token}
                />
            )}

            {/* Image Preview Modal */}
            {isImageOpen && profileData.avatar && (
                <div
                    className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center cursor-zoom-out"
                    onClick={handleImageClose}
                >
                    <button
                        onClick={handleImageClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={profileData.avatar}
                        alt="Avatar"
                        className="max-w-[90%] max-h-[90%] object-contain rounded-2xl shadow-2xl"
                    />
                </div>
            )}
        </>
    );
};

export default FriendModal;
