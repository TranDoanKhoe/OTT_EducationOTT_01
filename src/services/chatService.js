import localStorage from '../utils/localStoragePolyfill';
import {
    getChatHistory,
    getGroupChatHistory,
    sendGroupMessage,
    sendMessage,
    uploadFile,
    waitForWebSocketConnection,
} from '../api/messageApi';

const getToken = () =>
    localStorage.getItem('token') || localStorage.getItem('accessToken');

export const fetchPrivateHistory = async (otherUserId) => {
    const token = getToken();
    return getChatHistory(otherUserId, token);
};

export const fetchGroupHistory = async (groupId) => {
    const token = getToken();
    return getGroupChatHistory(groupId, token);
};

export const pushPrivateMessage = async (payload) => {
    const token = getToken();
    const ready = await waitForWebSocketConnection(15000);
    if (!ready) return false;
    return sendMessage('/app/chat.send', payload, token);
};

export const pushGroupMessage = async (payload) => {
    const token = getToken();
    const ready = await waitForWebSocketConnection(15000);
    if (!ready) return false;
    return sendGroupMessage('/app/chat.send', payload, token);
};

export const sendFiles = (files, receiverId, groupId) => {
    const token = getToken();
    return uploadFile(files, receiverId, token, groupId);
};

