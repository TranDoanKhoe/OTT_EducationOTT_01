import axios from 'axios';

const API_BASE_URL = '/api/ai';
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

const toArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.conversations)) return payload.conversations;
    return [];
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

export const getAiConversations = async (token) => {
    const response = await axios.get(`${API_BASE_URL}/conversations`, {
        headers: authHeaders(token),
    });
    return toArray(unwrapPayload(response.data));
};

export const createAiConversation = async (token, title = '') => {
    const response = await axios.post(
        `${API_BASE_URL}/conversations`,
        { title },
        {
            headers: {
                ...authHeaders(token),
                'Content-Type': 'application/json',
            },
        },
    );
    return unwrapPayload(response.data) || {};
};

export const getAiConversationMessages = async (token, conversationId) => {
    const response = await axios.get(
        `${API_BASE_URL}/conversations/${conversationId}/messages`,
        {
            headers: authHeaders(token),
        },
    );
    const payload = unwrapPayload(response.data);
    if (Array.isArray(payload)) {
        return { messages: payload };
    }
    return {
        ...(payload || {}),
        messages: Array.isArray(payload?.messages) ? payload.messages : [],
    };
};

export const saveAiConversationMessages = async (
    token,
    conversationId,
    messages,
    title,
) => {
    const response = await axios.put(
        `${API_BASE_URL}/conversations/${conversationId}/messages`,
        { messages, title },
        {
            headers: {
                ...authHeaders(token),
                'Content-Type': 'application/json',
            },
        },
    );
    return unwrapPayload(response.data) || {};
};

export const deleteAiConversation = async (token, conversationId) => {
    await axios.delete(`${API_BASE_URL}/conversations/${conversationId}`, {
        headers: authHeaders(token),
    });
};
