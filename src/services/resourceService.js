import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
    getResources,
    getStorageInfo,
    uploadResource,
    createFolder,
    deleteResource,
    shareResource,
} from '../api/resourceApi';
import { fetchFriendsList } from '../api/user';
import { fetchUserGroups } from '../api/groupApi';
import localStorage from '../utils/localStoragePolyfill';

const getToken = () =>
    localStorage.getItem('token') || localStorage.getItem('accessToken');

export const listResources = async (category = 'all') => {
    const token = getToken();
    if (!token) throw new Error('Missing auth');
    const rows = await getResources(token, category);
    return Array.isArray(rows) ? rows : [];
};

export const fetchStorage = async () => {
    const token = getToken();
    if (!token) throw new Error('Missing auth');
    return getStorageInfo(token);
};

export const uploadNewResource = async (fileAsset, folderId = null) => {
    const token = getToken();
    if (!token) throw new Error('Missing auth');

    const uploadFile = {
        uri: fileAsset.uri,
        name: fileAsset.name || 'upload-file',
        type: fileAsset.mimeType || 'application/octet-stream',
    };

    return uploadResource(uploadFile, token, folderId);
};

export const createNewFolder = async (name, parentId = null) => {
    const token = getToken();
    if (!token) throw new Error('Missing auth');
    return createFolder(name, parentId, token);
};

export const removeResource = async (resourceId) => {
    const token = getToken();
    if (!token) throw new Error('Missing auth');
    return deleteResource(resourceId, token);
};

export const openResourceFile = async (resource) => {
    if (!resource?.fileUrl) return false;
    const isHttp = /^https?:\/\//i.test(resource.fileUrl);
    if (isHttp) {
        await WebBrowser.openBrowserAsync(resource.fileUrl);
        return true;
    }
    await Linking.openURL(resource.fileUrl);
    return true;
};

export const fetchShareTargets = async () => {
    const token = getToken();
    const userId = localStorage.getItem('userId');
    if (!token || !userId) throw new Error('Missing auth');

    const [friends, groups] = await Promise.all([
        fetchFriendsList().catch(() => []),
        fetchUserGroups(userId, token).catch(() => []),
    ]);

    return {
        friends: Array.isArray(friends) ? friends : [],
        groups: Array.isArray(groups) ? groups : [],
    };
};

export const shareOneResource = async (resourceId, targetId, targetType) => {
    const token = getToken();
    if (!token) throw new Error('Missing auth');
    return shareResource(resourceId, targetId, targetType, token);
};
