import { getAccessTokenSync } from '../utils/authHeader';
import axios from 'axios';

const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'https://ott-education-balancer-1307761869.ap-southeast-1.elb.amazonaws.com';

// Dùng absolute URL - relative URL không hoạt động trên React Native mobile
const API_BASE_URL = `${BACKEND_URL}/api/conversation-settings`;

// Helper to get token
const getToken = () => getAccessTokenSync();

export const getConversationSettings = async (token) => {
    const response = await axios.get(API_BASE_URL, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data || [];
};

export const getConversationSetting = async (conversationId, token) => {
    const response = await axios.get(`${API_BASE_URL}/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const updateConversationSetting = async (
    conversationId,
    updates,
    token,
) => {
    const response = await axios.put(
        `${API_BASE_URL}/${conversationId}`,
        updates,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        },
    );
    return response.data;
};

export const reportGroup = async (groupId, reason, token) => {
    const response = await axios.post(
        `${API_BASE_URL}/group/${groupId}/report`,
        { reason },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        },
    );
    return response.data;
};

export const reportUser = async (reportedUserId, reason, token) => {
    const response = await axios.post(
        `${API_BASE_URL}/user/${reportedUserId}/report`,
        { reason },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        },
    );
    return response.data;
};
