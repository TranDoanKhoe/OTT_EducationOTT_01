// Single source of truth for auth tokens on Mobile (React Native)
// Tương tự Web nhưng dùng AsyncStorage thay vì sessionStorage/localStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_ID_KEY = 'userId';
const USER_ROLE_KEY = 'userRole';
const REMEMBER_ME_KEY = 'rememberMe';

// ============ REMEMBER ME ============
export const setRememberMe = async (value) => {
    try {
        if (value) {
            await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
        } else {
            await AsyncStorage.removeItem(REMEMBER_ME_KEY);
        }
    } catch (error) {
        console.error('Error setting rememberMe:', error);
    }
};

export const getRememberMe = async () => {
    try {
        const value = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        return value === 'true';
    } catch {
        return false;
    }
};

// ============ ACCESS TOKEN ============
export const getAccessToken = async () => {
    try {
        // Mobile không có sessionStorage, chỉ dùng AsyncStorage
        const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
        return token;
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
};

// Sync version for places that can't use async (like axios interceptors)
export const getAccessTokenSync = () => {
    // Fallback: try to get from memory cache if available
    if (global.__accessToken) {
        return global.__accessToken;
    }
    return null;
};

export const setAccessToken = async (token) => {
    try {
        if (token) {
            await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
            // Cache in memory for sync access
            global.__accessToken = token;
        } else {
            await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
            global.__accessToken = null;
        }
    } catch (error) {
        console.error('Error setting access token:', error);
    }
};

// ============ REFRESH TOKEN ============
export const getRefreshToken = async () => {
    try {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
        console.error('Error getting refresh token:', error);
        return null;
    }
};

export const setRefreshToken = async (token) => {
    try {
        if (token) {
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
        } else {
            await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        }
    } catch (error) {
        console.error('Error setting refresh token:', error);
    }
};

// ============ USER ID ============
export const getUserId = async () => {
    try {
        return await AsyncStorage.getItem(USER_ID_KEY);
    } catch (error) {
        console.error('Error getting user ID:', error);
        return null;
    }
};

export const setUserId = async (userId) => {
    try {
        if (userId) {
            await AsyncStorage.setItem(USER_ID_KEY, String(userId));
        } else {
            await AsyncStorage.removeItem(USER_ID_KEY);
        }
    } catch (error) {
        console.error('Error setting user ID:', error);
    }
};

// ============ USER ROLE ============
export const getUserRole = async () => {
    try {
        return await AsyncStorage.getItem(USER_ROLE_KEY);
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
};

export const setUserRole = async (role) => {
    try {
        if (role) {
            await AsyncStorage.setItem(USER_ROLE_KEY, role);
        } else {
            await AsyncStorage.removeItem(USER_ROLE_KEY);
        }
    } catch (error) {
        console.error('Error setting user role:', error);
    }
};

// ============ CLEAR AUTH ============
export const clearAuth = async () => {
    try {
        await AsyncStorage.multiRemove([
            ACCESS_TOKEN_KEY,
            REFRESH_TOKEN_KEY,
            USER_ID_KEY,
            USER_ROLE_KEY,
            REMEMBER_ME_KEY,
        ]);
        global.__accessToken = null;
        console.log('✅ Auth cleared successfully');
    } catch (error) {
        console.error('Error clearing auth:', error);
    }
};

// ============ AUTH HEADER ============
/**
 * Returns headers object with Authorization if token exists, otherwise empty.
 * Use with spread: `{ headers: { ...await getAuthHeader(), 'Content-Type': '...' } }`.
 */
export const getAuthHeader = async () => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Sync version for axios interceptors
export const getAuthHeaderSync = () => {
    const token = getAccessTokenSync();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ============ IS AUTHENTICATED ============
/**
 * Boolean check — does the user appear authenticated?
 * Doesn't validate the token (could be expired); just checks presence.
 */
export const isAuthenticated = async () => {
    const token = await getAccessToken();
    return Boolean(token);
};

// ============ INIT AUTH (Load token to memory on app start) ============
export const initAuth = async () => {
    try {
        const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
        if (token) {
            global.__accessToken = token;
            console.log('✅ Auth initialized with cached token');
        }
    } catch (error) {
        console.error('Error initializing auth:', error);
    }
};
