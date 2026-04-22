import React, { useState } from 'react';
import {
    BiX,
    BiUserPlus,
    BiGroup,
    BiMessageDetail,
    BiRightArrowAlt,
    BiCheckCircle,
    BiXCircle,
    BiCheck,
    BiTrash,
    BiVolumeFull,
    BiBell,
} from 'react-icons/bi';
import { formatRelativeTime } from '../../utils/timeUtils';

const TabPanel = ({ children, value, index }) => {
    return (
        <div role="tabpanel" hidden={value !== index} className="h-full">
            {value === index && <div className="h-full">{children}</div>}
        </div>
    );
};

const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
            checked ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
    >
        <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
        />
    </button>
);

const NotificationPanel = ({
    pendingFriendRequests = [],
    groupInvites = [],
    messageNotifications = [],
    notificationSettings,
    onUpdateNotificationSettings,
    onAcceptFriendRequest,
    onRejectFriendRequest,
    onAcceptGroupInvite,
    onRejectGroupInvite,
    onOpenMessageNotification,
    onMarkMessageNotificationRead,
    onDeleteMessageNotification,
    onOpenFriendRequests,
    onOpenGroupInvites,
    onClose,
}) => {
    const [currentTab, setCurrentTab] = useState(0);
    const [processingId, setProcessingId] = useState(null);

    const handleFriendAction = async (type, requestId) => {
        if (!requestId) return;
        setProcessingId(`friend-${requestId}`);
        try {
            if (type === 'accept') {
                await onAcceptFriendRequest?.(requestId);
            } else {
                await onRejectFriendRequest?.(requestId);
            }
        } finally {
            setProcessingId(null);
        }
    };

    const handleGroupAction = async (type, inviteId) => {
        if (!inviteId) return;
        setProcessingId(`group-${inviteId}`);
        try {
            if (type === 'accept') {
                await onAcceptGroupInvite?.(inviteId);
            } else {
                await onRejectGroupInvite?.(inviteId);
            }
        } finally {
            setProcessingId(null);
        }
    };

    const renderFriendRequest = (request) => {
        const requestId = request.requestId || request.id;
        const isProcessing = processingId === `friend-${requestId}`;

        return (
            <div
                key={requestId}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
            >
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        {request.avatar ? (
                            <img
                                src={request.avatar}
                                alt={request.name}
                                className="w-14 h-14 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center text-xl font-semibold text-white">
                                {request.name?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                            {request.name}
                        </p>
                        <p className="text-sm text-gray-500">
                            {request.phone || 'Muốn kết nối với bạn'}
                        </p>
                        {request.createAt && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {formatRelativeTime(request.createAt)}
                            </p>
                        )}
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() =>
                                    handleFriendAction('accept', requestId)
                                }
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                                <BiCheckCircle size={16} />
                                Chấp nhận
                            </button>
                            <button
                                onClick={() =>
                                    handleFriendAction('reject', requestId)
                                }
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:bg-gray-100 disabled:text-gray-400 text-rose-600 text-sm font-medium rounded-xl transition-colors"
                            >
                                <BiXCircle size={16} />
                                Từ chối
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderGroupInvite = (invite) => {
        const inviteId = invite.inviteId || invite.id;
        const isProcessing = processingId === `group-${inviteId}`;

        return (
            <div
                key={inviteId}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
            >
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-full bg-cyan-600 flex items-center justify-center">
                            <BiGroup size={28} className="text-white" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                            {invite.groupName}
                        </p>
                        <p className="text-sm text-gray-500">
                            {invite.inviterName || 'Mời bạn tham gia nhóm'}
                        </p>
                        {invite.createAt && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {formatRelativeTime(invite.createAt)}
                            </p>
                        )}
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() =>
                                    handleGroupAction('accept', inviteId)
                                }
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                                <BiCheckCircle size={16} />
                                Tham gia
                            </button>
                            <button
                                onClick={() =>
                                    handleGroupAction('reject', inviteId)
                                }
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:bg-gray-100 disabled:text-gray-400 text-rose-600 text-sm font-medium rounded-xl transition-colors"
                            >
                                <BiXCircle size={16} />
                                Từ chối
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderMessageNotification = (notification) => (
        <div
            key={notification.id}
            className={`rounded-2xl border p-4 shadow-sm transition-all ${
                notification.isRead
                    ? 'border-slate-200 bg-white'
                    : 'border-emerald-200 bg-emerald-50/40'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                        {notification.senderName || 'Tin nhắn mới'}
                    </p>
                    <p className="text-sm text-slate-600 truncate mt-0.5">
                        {notification.preview || 'Bạn có tin nhắn mới'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {notification.createAt
                            ? formatRelativeTime(notification.createAt)
                            : ''}
                    </p>
                </div>
                {!notification.isRead && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-2" />
                )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
                <button
                    onClick={() => onOpenMessageNotification?.(notification)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                >
                    Trả lời nhanh
                </button>
                {!notification.isRead && (
                    <button
                        onClick={() =>
                            onMarkMessageNotificationRead?.(notification)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700"
                    >
                        <BiCheck size={14} /> Đã đọc
                    </button>
                )}
                <button
                    onClick={() => onDeleteMessageNotification?.(notification)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-xs font-medium text-rose-600"
                >
                    <BiTrash size={14} /> Xóa thông báo
                </button>
            </div>
        </div>
    );

    const friendRequestsCount = pendingFriendRequests.length;
    const groupInvitesCount = groupInvites.length;

    return (
        <div className="w-full h-full bg-white flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Thông báo
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Trung tâm thông báo chi tiết
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                    <BiX size={24} className="text-gray-600" />
                </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-white">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                    Tùy chỉnh thông báo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BiBell className="text-emerald-600" />
                            <span className="text-sm text-slate-700">
                                Thông báo đẩy
                            </span>
                        </div>
                        <Toggle
                            checked={notificationSettings?.pushEnabled}
                            onChange={(checked) =>
                                onUpdateNotificationSettings?.(
                                    'pushEnabled',
                                    checked,
                                )
                            }
                        />
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BiVolumeFull className="text-emerald-600" />
                            <span className="text-sm text-slate-700">
                                Âm thanh thông báo
                            </span>
                        </div>
                        <Toggle
                            checked={notificationSettings?.soundEnabled}
                            onChange={(checked) =>
                                onUpdateNotificationSettings?.(
                                    'soundEnabled',
                                    checked,
                                )
                            }
                        />
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-sm text-slate-700">
                            Tin nhắn riêng
                        </span>
                        <Toggle
                            checked={
                                notificationSettings?.privateMessageEnabled
                            }
                            onChange={(checked) =>
                                onUpdateNotificationSettings?.(
                                    'privateMessageEnabled',
                                    checked,
                                )
                            }
                        />
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-sm text-slate-700">
                            Tin nhắn nhóm
                        </span>
                        <Toggle
                            checked={notificationSettings?.groupMessageEnabled}
                            onChange={(checked) =>
                                onUpdateNotificationSettings?.(
                                    'groupMessageEnabled',
                                    checked,
                                )
                            }
                        />
                    </div>
                </div>
            </div>

            <div className="border-b border-slate-200 bg-white">
                <div className="flex">
                    <button
                        onClick={() => setCurrentTab(0)}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                            currentTab === 0
                                ? 'text-emerald-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1">
                            <BiMessageDetail /> Tin nhắn
                        </span>
                        {currentTab === 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                        )}
                    </button>
                    <button
                        onClick={() => setCurrentTab(1)}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                            currentTab === 1
                                ? 'text-emerald-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1">
                            <BiUserPlus /> Kết bạn ({friendRequestsCount})
                        </span>
                        {currentTab === 1 && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                        )}
                    </button>
                    <button
                        onClick={() => setCurrentTab(2)}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                            currentTab === 2
                                ? 'text-cyan-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1">
                            <BiGroup /> Nhóm ({groupInvitesCount})
                        </span>
                        {currentTab === 2 && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50">
                <TabPanel value={currentTab} index={0}>
                    {messageNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                            <BiMessageDetail
                                size={64}
                                className="text-gray-300"
                            />
                            <p className="text-sm text-gray-500 mt-4">
                                Chưa có thông báo tin nhắn mới
                            </p>
                        </div>
                    ) : (
                        <div className="p-3 space-y-3">
                            {messageNotifications.map(
                                renderMessageNotification,
                            )}
                        </div>
                    )}
                </TabPanel>

                <TabPanel value={currentTab} index={1}>
                    <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Bạn có {friendRequestsCount} lời mời kết bạn
                        </p>
                        <button
                            onClick={onOpenFriendRequests}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                        >
                            Quản lý chi tiết <BiRightArrowAlt size={16} />
                        </button>
                    </div>
                    {friendRequestsCount === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-6">
                            <BiUserPlus size={64} className="text-gray-300" />
                            <p className="text-sm text-gray-500 mt-4 text-center">
                                Không có lời mời kết bạn nào
                            </p>
                        </div>
                    ) : (
                        <div className="p-3 space-y-3">
                            {pendingFriendRequests.map(renderFriendRequest)}
                        </div>
                    )}
                </TabPanel>

                <TabPanel value={currentTab} index={2}>
                    <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Bạn có {groupInvitesCount} lời mời vào nhóm
                        </p>
                        <button
                            onClick={onOpenGroupInvites}
                            className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800"
                        >
                            Quản lý chi tiết <BiRightArrowAlt size={16} />
                        </button>
                    </div>
                    {groupInvitesCount === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-6">
                            <BiGroup size={64} className="text-gray-300" />
                            <p className="text-sm text-gray-500 mt-4 text-center">
                                Không có lời mời nhóm nào
                            </p>
                        </div>
                    ) : (
                        <div className="p-3 space-y-3">
                            {groupInvites.map(renderGroupInvite)}
                        </div>
                    )}
                </TabPanel>
            </div>
        </div>
    );
};

export default NotificationPanel;
