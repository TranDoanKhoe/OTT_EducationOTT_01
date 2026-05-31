import localStorage from '../utils/localStoragePolyfill';
import { getAccessTokenSync } from '../utils/authHeader';
import axios from 'axios';

// Lấy backend URL trực tiếp từ env - không dùng URL tương đối trên mobile
const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'https://ott-education-balancer-1307761869.ap-southeast-1.elb.amazonaws.com';
// Backend endpoint là /group (không có /api prefix - Vite proxy dày /api rồi xóa nó)
const API_BASE_URL = `${BACKEND_URL}/group`;

// Helper to get token
const getToken = () => {
    const token = getAccessTokenSync();
    if (token) return token;
    return localStorage.getItem('accessToken') || localStorage.getItem('token');
};

export const createGroup = async (
    name,
    memberIds,
    avatarGroup,
    token,
    options = {},
) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    const userId = localStorage.getItem('userId') || '680e6d95a73e35151128bf65';
    const finalMemberIds = [...new Set([...memberIds, userId])];
    try {
        const response = await axios.post(
            API_BASE_URL,
            {
                name,
                createId: userId,
                memberIds: finalMemberIds,
                avatarGroup: avatarGroup,
                groupType: options.groupType || 'GROUP',
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        console.log('Create group response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating group:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

export const createClass = async (name, memberIds, avatarGroup, token) => {
    return createGroup(name, memberIds, avatarGroup, token, {
        groupType: 'CLASS',
    });
};

// Hàm lấy danh sách cuộc trò chuyện của user
export const fetchUserGroups = async (userId, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const url = `${BACKEND_URL}/group/user/${userId}`;
        console.log('📡 fetchUserGroups URL:', url);
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 90000,
        });
        console.log('✅ groups loaded:', response.data?.length);
        return response.data;
    } catch (error) {
        console.error('❌ fetchUserGroups error:', error.message);
        throw error;
    }
};

export const fetchClasses = async (token, keyword = '') => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.get(`${API_BASE_URL}/classes`, {
            headers: { Authorization: `Bearer ${token}` },
            params: keyword ? { keyword } : {},
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching classes:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

export const fetchGroupDetail = async (groupId, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    const response = await axios.get(`${API_BASE_URL}/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const joinClass = async (groupId, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    const response = await axios.post(
        `${API_BASE_URL}/${groupId}/join`,
        {},
        {
            headers: { Authorization: `Bearer ${token}` },
        },
    );
    return response.data;
};

export const joinClassByCode = async (classCode, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    const response = await axios.post(
        `${API_BASE_URL}/join-by-code/${encodeURIComponent(classCode)}`,
        {},
        {
            headers: { Authorization: `Bearer ${token}` },
        },
    );
    return response.data;
};

export const fetchGroupMembers = async (groupId, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.get(`${API_BASE_URL}/${groupId}/members`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetch group members response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching group members:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

export const addGroupMembers = async (groupId, userIds, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.post(
            `${API_BASE_URL}/${groupId}/members`,
            userIds,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        console.log('Add group members response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error adding group members:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

export const removeGroupMember = async (groupId, userId, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.delete(
            `${API_BASE_URL}/${groupId}/members/${userId}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        console.log('Remove group member response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error removing group member:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

export const dissolveGroup = async (groupId, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.delete(`${API_BASE_URL}/${groupId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Dissolve group response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error dissolving group:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

export const assignGroupRole = async (groupId, userId, role, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.put(
            `${API_BASE_URL}/${groupId}/roles/${userId}`,
            {},
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { role },
            },
        );
        console.log('Assign group role response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error assigning group role:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};
//loc thanh vien trong nhom
export const fetchEligibleFriends = async (groupId, token) => {
    const response = await axios.get(
        `${API_BASE_URL}/${groupId}/eligible-members`,
        {
            headers: { Authorization: `Bearer ${token}` },
        },
    );
    return response.data;
};

export const addMembersToGroup = async (groupId, memberIds, token) => {
    const response = await axios.post(
        `${API_BASE_URL}/${groupId}/members`,
        memberIds, // Là 1 mảng userId
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        },
    );
    return response.data;
};
export const addAllFriendsToGroup = async (groupId, token) => {
    if (!token) throw new Error('Token is missing');

    try {
        // Lấy danh sách bạn bè có thể thêm
        const eligibleFriends = await fetchEligibleFriends(groupId, token);
        const eligibleIds = eligibleFriends.map((friend) => friend.id);

        if (eligibleIds.length === 0) {
            console.log('Không có bạn bè nào để thêm vào nhóm.');
            return;
        }

        // Gửi API để thêm
        const updatedGroup = await addMembersToGroup(
            groupId,
            eligibleIds,
            token,
        );
        console.log('Đã thêm bạn bè vào nhóm:', updatedGroup);
        return updatedGroup;
    } catch (err) {
        console.error('Lỗi khi thêm bạn bè vào nhóm:', err);
        throw err;
    }
};

export const updateGroupInfo = async (groupId, updates, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const formData = new FormData();

        // Thêm tên nhóm nếu có
        if (updates.name) {
            formData.append('name', updates.name);
        }

        // Handle avatar - supports URI (from ImagePicker) or data URI
        if (updates.avatarGroup) {
            if (
                updates.avatarGroup.startsWith('file://') ||
                updates.avatarGroup.startsWith('content://')
            ) {
                // React Native file URI from ImagePicker
                formData.append('avatarGroup', {
                    uri: updates.avatarGroup,
                    name: 'avatar.jpg',
                    type: 'image/jpeg',
                });
            } else if (updates.avatarGroup.startsWith('data:image')) {
                // Web-style base64 — append as-is, backend may handle it
                formData.append('avatarGroup', updates.avatarGroup);
            }
        }

        const response = await axios.put(
            `${API_BASE_URL}/${groupId}`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    // Let axios set Content-Type with the correct multipart boundary
                },
            },
        );
        console.log('Update group info response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating group info:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

// Lấy danh sách lời mời vào nhóm
export const fetchGroupInvites = async (token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.get(`${API_BASE_URL}/invites/pending`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetch group invites response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching group invites:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

// Chấp nhận lời mời vào nhóm
export const acceptGroupInvite = async (inviteId, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.post(
            `${API_BASE_URL}/invites/${inviteId}/accept`,
            {},
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        console.log('Accept group invite response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error accepting group invite:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

// Từ chối lời mời vào nhóm
export const rejectGroupInvite = async (inviteId, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.post(
            `${API_BASE_URL}/invites/${inviteId}/reject`,
            {},
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        console.log('Reject group invite response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error rejecting group invite:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

// Gửi lời mời vào nhóm cho người dùng
export const sendGroupInvite = async (groupId, userIds, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.post(
            `${API_BASE_URL}/${groupId}/invite`,
            userIds, // Array of user IDs
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        console.log('Send group invite response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending group invite:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

// Rời khỏi nhóm
export const leaveGroup = async (groupId, userId, token) => {
    if (!token) {
        throw new Error('Token is missing');
    }
    try {
        const response = await axios.delete(
            `${API_BASE_URL}/${groupId}/members/${userId}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        console.log('Leave group response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error leaving group:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};
