import localStorage from '../utils/localStoragePolyfill';
import {
    getChatHistory,
    getGroupChatHistory,
    sendGroupMessage,
    sendMessage,
    uploadFile,
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

export const pushPrivateMessage = (payload) => {
    const token = getToken();
    return sendMessage('/app/chat.send', payload, token);
};

export const pushGroupMessage = (payload) => {
    const token = getToken();
    return sendGroupMessage('/app/chat.send', payload, token);
};

export const sendFiles = (files, receiverId, groupId) => {
    const token = getToken();
    return uploadFile(files, receiverId, token, groupId);
};

