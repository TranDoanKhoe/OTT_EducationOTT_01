import localStorage from '../utils/localStoragePolyfill';
import {
    createClass,
    fetchClasses,
    fetchGroupMembers,
    fetchUserGroups,
    joinClassByCode,
} from '../api/groupApi';

const getAuth = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    const role = String(localStorage.getItem('userRole') || 'STUDENT')
        .toUpperCase()
        .replace(/^ROLE_/, '');
    return { token, userId, role };
};

const normalizeClass = (item) => {
    if (!item) return null;
    const groupType = String(item.groupType || '').toUpperCase();
    if (groupType && groupType !== 'CLASS') return null;
    return {
        ...item,
        id: String(item.id || ''),
        name: item.name || 'Unnamed class',
        memberIds: Array.isArray(item.memberIds) ? item.memberIds : [],
    };
};

export const listMyClasses = async () => {
    const { token, userId, role } = getAuth();
    if (!token || !userId) throw new Error('Missing auth');

    if (role === 'TEACHER') {
        const rows = await fetchClasses(token);
        return (Array.isArray(rows) ? rows : []).map(normalizeClass).filter(Boolean);
    }

    const rows = await fetchUserGroups(userId, token);
    return (Array.isArray(rows) ? rows : [])
        .map(normalizeClass)
        .filter((item) => Boolean(item));
};

export const listClassesByKeyword = async (keyword = '') => {
    const { token, role } = getAuth();
    if (!token) throw new Error('Missing auth');
    if (role !== 'TEACHER') return listMyClasses();

    const rows = await fetchClasses(token, keyword);
    return (Array.isArray(rows) ? rows : []).map(normalizeClass).filter(Boolean);
};

export const createNewClass = async (name, memberIds = []) => {
    const { token, userId } = getAuth();
    if (!token || !userId) throw new Error('Missing auth');
    return createClass(name, memberIds, null, token);
};

export const joinClassWithCode = async (code) => {
    const { token } = getAuth();
    if (!token) throw new Error('Missing auth');
    return joinClassByCode(code, token);
};

export const getClassMembers = async (classId) => {
    const { token } = getAuth();
    if (!token) throw new Error('Missing auth');
    return fetchGroupMembers(classId, token);
};

