import axios from 'axios';

// Backend dùng /ai không phải /api/ai
const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'https://ott-education-be.onrender.com';
const API_BASE_URL = `${BACKEND_URL}/ai`;
const AI_REQUEST_TIMEOUT_MS = 45000;

const authHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
});

const unwrapPayload = (payload) => {
    if (payload == null) return payload;
    if (payload.data !== undefined) return payload.data;
    if (payload.result !== undefined) return payload.result;
    return payload;
};

export const askAiAssistant = async (
    message,
    history = [],
    token,
    files = [],
) => {
    const hasFiles = Array.isArray(files) && files.length > 0;

    if (hasFiles) {
        const formData = new FormData();
        formData.append('message', message || '');
        formData.append('history', JSON.stringify(history || []));
        files.forEach((file) => formData.append('files', file));

        const response = await axios.post(
            `${API_BASE_URL}/chat-with-files`,
            formData,
            {
                headers: authHeaders(token),
                timeout: AI_REQUEST_TIMEOUT_MS,
            },
        );

        return unwrapPayload(response.data) || {};
    }

    const response = await axios.post(
        `${API_BASE_URL}/chat`,
        { message, history },
        {
            headers: {
                ...authHeaders(token),
                'Content-Type': 'application/json',
            },
            timeout: AI_REQUEST_TIMEOUT_MS,
        },
    );

    return unwrapPayload(response.data) || {};
};

// Lấy lịch sử chat AI của người dùng
export const fetchAiChatHistory = async (userId, token) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/history/${userId}`, {
            headers: {
                ...authHeaders(token),
                'Content-Type': 'application/json',
            },
            timeout: AI_REQUEST_TIMEOUT_MS,
        });
        return unwrapPayload(response.data);
    } catch (error) {
        console.error('Error fetching AI chat history:', error.message);
        throw error;
    }
};

// Gửi tin nhắn tới AI và nhận phản hồi
export const sendAiMessage = async (userId, message, token) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/chat`,
            { userId, message },
            {
                headers: {
                    ...authHeaders(token),
                    'Content-Type': 'application/json',
                },
                timeout: AI_REQUEST_TIMEOUT_MS,
            },
        );
        return unwrapPayload(response.data);
    } catch (error) {
        console.error('Error sending AI message:', error.message);
        throw error;
    }
};

// Xóa lịch sử chat AI
export const clearAiChatHistory = async (userId, token) => {
    try {
        const response = await axios.delete(
            `${API_BASE_URL}/history/${userId}`,
            {
                headers: {
                    ...authHeaders(token),
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            },
        );
        return unwrapPayload(response.data);
    } catch (error) {
        console.error('Error clearing AI chat history:', error.message);
        throw error;
    }
};

// Quản lý AI conversations
export const getAiConversations = async (token) => {
    const response = await axios.get(`${API_BASE_URL}/conversations`, {
        headers: authHeaders(token),
        timeout: AI_REQUEST_TIMEOUT_MS,
    });
    const payload = unwrapPayload(response.data);
    return Array.isArray(payload) ? payload : (Array.isArray(payload?.conversations) ? payload.conversations : []);
};

export const createAiConversation = async (token, title = '') => {
    const response = await axios.post(
        `${API_BASE_URL}/conversations`,
        { title },
        { headers: authHeaders(token), timeout: AI_REQUEST_TIMEOUT_MS },
    );
    return unwrapPayload(response.data) || {};
};

export const getAiConversationMessages = async (token, conversationId) => {
    const response = await axios.get(
        `${API_BASE_URL}/conversations/${conversationId}/messages`,
        { headers: authHeaders(token), timeout: AI_REQUEST_TIMEOUT_MS },
    );
    const payload = unwrapPayload(response.data);
    return { messages: Array.isArray(payload?.messages) ? payload.messages : [] };
};

export const saveAiConversationMessages = async (token, conversationId, messages, title) => {
    const response = await axios.post(
        `${API_BASE_URL}/conversations/${conversationId}/messages`,
        { messages, title },
        { headers: authHeaders(token), timeout: AI_REQUEST_TIMEOUT_MS },
    );
    return unwrapPayload(response.data) || {};
};

export const deleteAiConversation = async (token, conversationId) => {
    await axios.delete(`${API_BASE_URL}/conversations/${conversationId}`, {
        headers: authHeaders(token),
    });
};

export default {
    askAiAssistant,
    fetchAiChatHistory,
    sendAiMessage,
    clearAiChatHistory,
    getAiConversations,
    createAiConversation,
    getAiConversationMessages,
    saveAiConversationMessages,
    deleteAiConversation,
};
