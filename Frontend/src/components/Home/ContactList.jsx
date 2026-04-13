import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BiGroup, BiBell, BiPin, BiBookReader } from 'react-icons/bi';
import { HiAcademicCap } from 'react-icons/hi';
import { FaChalkboardTeacher } from 'react-icons/fa';
import { cancelFriendRequest } from '../../api/user';
import ProfileModal from './ProfileModal';
import { toast } from 'react-toastify';

const ContactList = ({
    contacts,
    selectedContact,
    onContactSelect,
    pendingRequests,
    onAcceptFriendRequest,
    isLoading,
    fetchPendingFriendRequests,
}) => {
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');

    const handleCancelRequest = async (requestId) => {
        try {
            const result = await cancelFriendRequest(requestId);
            if (result) {
                toast.dismiss();
                toast.success(result.message || 'Đã hủy lời mời kết bạn');
                await fetchPendingFriendRequests();
            }
        } catch (error) {
            toast.dismiss();
            toast.error(error.message || 'Hủy lời mời kết bạn thất bại');
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-emerald-50/30 relative">
            {/* Decorative Background */}
            <motion.div
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl"
            />
            <motion.div
                animate={{
                    opacity: [0.2, 0.4, 0.2],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 2,
                }}
                className="absolute bottom-0 left-0 w-48 h-48 bg-blue-200/20 rounded-full blur-3xl"
            />

            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="px-4 py-4 bg-white/80 backdrop-blur-md border-b border-emerald-100/50 shadow-sm relative z-10"
            >
                <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
                    <BiBookReader className="text-emerald-600" size={24} />
                    Cuộc trò chuyện
                </h2>
            </motion.div>

            {/* Pending Friend Requests */}
            <AnimatePresence>
                {pendingRequests?.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100"
                    >
                        <h3 className="px-4 py-3 text-sm font-bold text-amber-800 flex items-center gap-2">
                            <HiAcademicCap size={18} />
                            Lời mời kết bạn ({pendingRequests.length})
                        </h3>
                        <div className="max-h-[200px] overflow-auto">
                            {pendingRequests.map((request) => (
                                <motion.div
                                    key={request.requestId || request.id}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="py-3 px-4 bg-white mx-3 mb-2 rounded-xl shadow-sm"
                                >
                                    <div className="flex items-center w-full">
                                        <div className="flex-shrink-0 mr-3">
                                            {request.avatar ? (
                                                <img
                                                    src={request.avatar}
                                                    alt={
                                                        request.name || 'Avatar'
                                                    }
                                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-100"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-lg font-semibold text-white">
                                                    {(
                                                        request.name ||
                                                        request.lastName ||
                                                        'U'
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 truncate">
                                                {request.name ||
                                                    request.lastName ||
                                                    request.senderName ||
                                                    'Người dùng'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Muốn kết nối với bạn
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() =>
                                                onAcceptFriendRequest(
                                                    request.requestId,
                                                )
                                            }
                                            disabled={isLoading}
                                            className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                                        >
                                            ✓ Chấp nhận
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleCancelRequest(
                                                    request.requestId,
                                                )
                                            }
                                            disabled={isLoading}
                                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Contact List */}
            {contacts.length > 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="overflow-auto flex-1 py-2 relative z-10"
                >
                    <AnimatePresence>
                        {contacts.map((contact, index) => (
                            <motion.button
                                key={
                                    contact.isGroup
                                        ? `group-${contact.id}`
                                        : `contact-${contact.id}`
                                }
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{
                                    scale: 1.02,
                                    x: 4,
                                    transition: { duration: 0.2 },
                                }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onContactSelect(contact)}
                                className={`w-full py-3 px-4 flex items-center transition-all duration-200 border-none cursor-pointer text-left mx-2 rounded-xl mb-1 backdrop-blur-sm ${
                                    selectedContact?.id === contact.id
                                        ? 'bg-gradient-to-r from-emerald-100/90 to-teal-100/90 border-l-4 border-l-emerald-500 shadow-lg shadow-emerald-200/50'
                                        : 'bg-white/70 hover:bg-white/90 hover:shadow-md'
                                }`}
                                style={{ width: 'calc(100% - 16px)' }}
                            >
                                {/* Avatar with Status Badge */}
                                <div className="flex-shrink-0 mr-3 relative">
                                    {contact.avatar ? (
                                        <img
                                            src={contact.avatar}
                                            alt={contact.name}
                                            className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                                        />
                                    ) : (
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                contact.isGroup
                                                    ? 'bg-gradient-to-br from-violet-400 to-purple-600'
                                                    : 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                                            }`}
                                        >
                                            {contact.isGroup ? (
                                                <FaChalkboardTeacher
                                                    size={22}
                                                    className="text-white"
                                                />
                                            ) : (
                                                <span className="text-white font-semibold text-lg">
                                                    {(
                                                        contact.username ||
                                                        contact.name ||
                                                        'U'
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {/* Status Dot */}
                                    {!contact.isGroup && (
                                        <span
                                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                                contact.status === 'online'
                                                    ? 'bg-emerald-500'
                                                    : 'bg-gray-300'
                                            }`}
                                        />
                                    )}
                                </div>

                                {/* Contact Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        {contact.isPinned && (
                                            <BiPin
                                                size={14}
                                                className="text-amber-500"
                                            />
                                        )}
                                        {contact.isGroup && (
                                            <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">
                                                Nhóm
                                            </span>
                                        )}
                                        <span
                                            className={`text-sm truncate ${
                                                contact.unreadCount > 0
                                                    ? 'font-bold text-gray-900'
                                                    : 'font-medium text-gray-800'
                                            }`}
                                        >
                                            {contact.isGroup
                                                ? contact.name
                                                : contact.username}
                                        </span>
                                    </div>
                                    <div
                                        className={`text-xs truncate ${
                                            contact.unreadCount > 0
                                                ? 'font-medium text-gray-700'
                                                : 'text-gray-500'
                                        }`}
                                    >
                                        {contact.lastMessage?.trim() ||
                                            'Chưa có tin nhắn'}
                                    </div>
                                </div>

                                {/* Unread Badge */}
                                {contact.unreadCount > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="ml-2 bg-emerald-500 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold badge-pulse"
                                    >
                                        {contact.unreadCount > 99
                                            ? '99+'
                                            : contact.unreadCount}
                                    </motion.div>
                                )}
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                        <BiBookReader size={40} className="text-emerald-500" />
                    </div>
                    <p className="text-gray-500 text-sm">
                        Chưa có cuộc trò chuyện nào
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                        Hãy kết nối với bạn bè hoặc tạo nhóm học tập!
                    </p>
                </div>
            )}

            <ProfileModal
                userId={userId}
                token={token}
                contacts={contacts}
                onContactSelect={onContactSelect}
            />
        </div>
    );
};

export default ContactList;
