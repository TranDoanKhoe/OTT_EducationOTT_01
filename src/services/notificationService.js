import {
    acceptFriendRequest,
    cancelFriendRequest,
    fetchPendingFriendRequests,
} from '../api/user';
import {
    acceptGroupInvite,
    fetchGroupInvites,
    rejectGroupInvite,
} from '../api/groupApi';
import localStorage from '../utils/localStoragePolyfill';

const mapFriendInvite = (item) => {
    const sender = item?.sender || {};
    const firstName = sender.firstName || item?.senderName || '';
    const lastName = sender.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Lời mời kết bạn';
    return {
        id: String(item?.requestId || item?.id || ''),
        type: 'friend',
        title: fullName,
        subtitle: sender.phone || item?.phone || 'Muốn kết nối với bạn',
        raw: item,
    };
};

const mapGroupInvite = (item) => ({
    id: String(item?.inviteId || item?.id || ''),
    type: 'group',
    title: item?.groupName || 'Group invite',
    subtitle: item?.inviterName || 'Invited you to join',
    raw: item,
});

export const getPendingNotifications = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) throw new Error('Missing auth');

    const [friendRows, groupRows] = await Promise.all([
        fetchPendingFriendRequests().catch(() => []),
        fetchGroupInvites(token).catch(() => []),
    ]);

    return {
        friendRequests: (Array.isArray(friendRows) ? friendRows : []).map(mapFriendInvite),
        groupInvites: (Array.isArray(groupRows) ? groupRows : []).map(mapGroupInvite),
    };
};

export const acceptNotification = async (item) => {
    if (item?.type === 'friend') return acceptFriendRequest(item.id);
    if (item?.type === 'group') {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        return acceptGroupInvite(item.id, token);
    }
    return null;
};

export const rejectNotification = async (item) => {
    if (item?.type === 'friend') return cancelFriendRequest(item.id);
    if (item?.type === 'group') {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        return rejectGroupInvite(item.id, token);
    }
    return null;
};

