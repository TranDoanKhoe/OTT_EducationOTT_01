import { getAccessTokenSync } from '../utils/authHeader';
import axios from 'axios';

// Backend dùng /ai không phải /api/ai
const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'http://ott-education-balancer-1307761869.ap-southeast-1.elb.amazonaws.com';
const API_BASE_URL = `${BACKEND_URL}/ai`;
const AI_REQUEST_TIMEOUT_MS = 45000;

// ── Gemini AI trực tiếp ──────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Gọi trực tiếp Gemini AI API.
 * history: mảng { role: 'user'|'assistant', content: string }
 * Trả về chuỗi reply.
 */
const callGeminiDirect = async (message, history = []) => {
    const geminiContents = [];
    const trimmedHistory = (history || []).slice(-20);

    trimmedHistory.forEach((item) => {
        const role = item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';
        const text = item.content || '';

        if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === role) {
            geminiContents[geminiContents.length - 1].parts[0].text += '\n' + text;
        } else {
            geminiContents.push({ role, parts: [{ text }] });
        }
    });

    if (geminiContents.length > 0 && geminiContents[0].role === 'model') {
        geminiContents.shift();
    }

    if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === 'user') {
        geminiContents[geminiContents.length - 1].parts[0].text += '\n' + (message || '');
    } else {
        geminiContents.push({ role: 'user', parts: [{ text: message || '' }] });
    }

    const response = await axios.post(
        GEMINI_API_URL,
        {
            contents: geminiContents,
            systemInstruction: {
                parts: [
                    {
                        text: 'Bạn là Trợ lý AI của OTT Education — một nền tảng giáo dục trực tuyến. Hãy trả lời bằng tiếng Việt, thân thiện, chính xác và hữu ích cho học sinh/sinh viên.',
                    },
                ],
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        },
        {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: AI_REQUEST_TIMEOUT_MS,
        },
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error('Gemini trả về phản hồi rỗng');
    return reply;
};
// ─────────────────────────────────────────────────────────────────────────────

// Helper to get token
const getToken = () => getAccessTokenSync();

const authHeaders = (token) => ({
    Authorization: `Bearer ${token || getToken()}`,
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

    // ── Ưu tiên Gemini AI trực tiếp (không phụ thuộc backend) ─────────────────
    if (!hasFiles) {
        try {
            const reply = await callGeminiDirect(message, history);
            return { reply };
        } catch (geminiErr) {
            const detail = geminiErr.response?.data 
                ? JSON.stringify(geminiErr.response.data) 
                : geminiErr.message;
            console.warn('Gemini AI lỗi (đang tự động fallback về backend):', detail);
            // Fallback về backend bên dưới
        }
    }
    // ─────────────────────────────────────────────────────────────────────────

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
    return Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.conversations)
          ? payload.conversations
          : [];
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
    return {
        messages: Array.isArray(payload?.messages) ? payload.messages : [],
    };
};

export const saveAiConversationMessages = async (
    token,
    conversationId,
    messages,
    title,
) => {
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
