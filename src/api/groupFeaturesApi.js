import { getAccessTokenSync } from '../utils/authHeader';
import axios from 'axios';

const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'https://ott-education-be.onrender.com';

// Dùng BACKEND_URL trực tiếp - không dùng relative URL vì mobile không có base URL
const API_URL = (
    process.env.EXPO_PUBLIC_API_URL ||
    `${BACKEND_URL}/api`
).replace(/\/$/, '');

// Helper to get token
const getToken = () => getAccessTokenSync();

// Group Notes APIs
export const getGroupNotes = async (groupId, token) => {
    try {
        const response = await axios.get(
            `${API_URL}/group-notes/group/${groupId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        return response.data;
    } catch (error) {
        if (error?.response?.status === 403) {
            throw error;
        }
        console.error('Error fetching group notes:', error);
        throw error;
    }
};

export const createGroupNote = async (groupId, title, content, token) => {
    try {
        const response = await axios.post(
            `${API_URL}/group-notes`,
            {
                groupId,
                title,
                content,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error creating note:', error);
        throw error;
    }
};

export const updateGroupNote = async (noteId, title, content, token) => {
    try {
        const response = await axios.put(
            `${API_URL}/group-notes/${noteId}`,
            {
                title,
                content,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error updating note:', error);
        throw error;
    }
};

export const deleteGroupNote = async (noteId, token) => {
    try {
        await axios.delete(`${API_URL}/group-notes/${noteId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (error) {
        console.error('Error deleting note:', error);
        throw error;
    }
};

// Poll APIs
export const getGroupPolls = async (groupId, token) => {
    try {
        const response = await axios.get(`${API_URL}/polls/group/${groupId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        if (error?.response?.status === 403) {
            throw error;
        }
        console.error('Error fetching polls:', error);
        throw error;
    }
};

export const createPoll = async (
    groupId,
    question,
    options,
    allowMultiple,
    token,
) => {
    try {
        const response = await axios.post(
            `${API_URL}/polls`,
            {
                groupId,
                question,
                options,
                allowMultiple,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error creating poll:', error);
        throw error;
    }
};

export const votePoll = async (pollId, optionIndex, token) => {
    try {
        const response = await axios.post(
            `${API_URL}/polls/${pollId}/vote`,
            {
                optionIndex,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        return response.data;
    } catch (error) {
        console.error('Error voting poll:', error);
        throw error;
    }
};

