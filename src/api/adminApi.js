import { getAccessTokenSync } from '../utils/authHeader';
import axios from 'axios';

const DEFAULT_BACKEND_URL =
    'https://ott-education-balancer-1307761869.ap-southeast-1.elb.amazonaws.com';
const sanitizeUrl = (value) =>
    (value || '')
        .toString()
        .trim()
        .replace(/^['\"]|['\"]$/g, '')
        .replace(/\/$/, '');

const RAW_BACKEND_URL = sanitizeUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
const AUTH_BASE_URL = sanitizeUrl(
    /^https?:\/\//i.test(RAW_BACKEND_URL)
        ? RAW_BACKEND_URL
        : RAW_BACKEND_URL
          ? `https://${RAW_BACKEND_URL}`
          : DEFAULT_BACKEND_URL,
).replace(/\/api$/i, '');

// Dùng absolute URL - relative URL không hoạt động trên React Native mobile
const API_BASE_URL = `${AUTH_BASE_URL}/api/admin`;

// Helper to get token
const getToken = () => getAccessTokenSync();

// Get dashboard statistics
export const getAdminStats = async (token) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/stats`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        throw error;
    }
};

// Get all users (paginated)
export const getAdminUsers = async (
    token,
    page = 0,
    size = 10,
    search = '',
) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/users`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: { page, size, search },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};

// Get single user details
export const getAdminUserDetails = async (token, userId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching user details:', error);
        throw error;
    }
};

// Update user status (block/unblock)
export const updateUserStatus = async (token, userId, status) => {
    try {
        const response = await axios.put(
            `${API_BASE_URL}/users/${userId}/status`,
            { status },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error updating user status:', error);
        throw error;
    }
};

// Update user role
export const updateUserRole = async (token, userId, role) => {
    try {
        const response = await axios.put(
            `${API_BASE_URL}/users/${userId}/role`,
            { role },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error updating user role:', error);
        throw error;
    }
};

// Delete user
export const deleteUser = async (token, userId) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/users/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

// Check admin access
export const checkAdminAccess = async (token) => {
    try {
        const response = await axios.get(`${AUTH_BASE_URL}/auth/check-role`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error checking admin access:', error);
        return { isAdmin: false };
    }
};

// Get detailed statistics with charts data
export const getDetailedStatistics = async (token, period = 'week') => {
    try {
        const response = await axios.get(`${API_BASE_URL}/statistics`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: { period },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching detailed statistics:', error);
        throw error;
    }
};

// Export statistics - NOTE: window/document APIs không khả dụng trên React Native.
// Hàm này chỉ trả về dữ liệu blob, không tự download.
export const exportStatistics = async (token, type = 'users') => {
    try {
        const response = await axios.get(`${API_BASE_URL}/statistics/export`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: { type },
            responseType: 'blob',
        });
        return response.data;
    } catch (error) {
        console.error('Error exporting statistics:', error);
        throw error;
    }
};

// Reset user password
export const resetUserPassword = async (token, userId, newPassword) => {
    try {
        const response = await axios.put(
            `${API_BASE_URL}/users/${userId}/reset-password`,
            { newPassword },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error resetting user password:', error);
        throw error;
    }
};

// Get all groups (paginated)
export const getAdminGroups = async (
    token,
    page = 0,
    size = 10,
    search = '',
) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/groups`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: { page, size, search },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching groups:', error);
        throw error;
    }
};

// Get group details
export const getAdminGroupDetails = async (token, groupId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/groups/${groupId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching group details:', error);
        throw error;
    }
};

// Delete group
export const deleteGroup = async (token, groupId) => {
    try {
        const response = await axios.delete(
            `${API_BASE_URL}/groups/${groupId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error deleting group:', error);
        throw error;
    }
};

// Assign teacher to group
export const assignTeacherToGroup = async (token, groupId, teacherId) => {
    try {
        const response = await axios.put(
            `${API_BASE_URL}/groups/${groupId}/assign-teacher`,
            { teacherId },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error assigning teacher to group:', error);
        throw error;
    }
};

// Remove member from group
export const removeMemberFromGroup = async (token, groupId, memberId) => {
    try {
        const response = await axios.delete(
            `${API_BASE_URL}/groups/${groupId}/members/${memberId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error removing member from group:', error);
        throw error;
    }
};
