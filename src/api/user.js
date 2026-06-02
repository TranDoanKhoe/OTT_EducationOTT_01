import { File, Paths } from 'expo-file-system';
import localStorage from '../utils/localStoragePolyfill';
import { getAccessTokenSync } from '../utils/authHeader';
import '../api/axiosConfig';

const DEFAULT_BACKEND_URL =
    'http://ott-education-balancer-1307761869.ap-southeast-1.elb.amazonaws.com';

const sanitizeUrl = (value) =>
    (value || '')
        .toString()
        .trim()
        .replace(/^['\"]|['\"]$/g, '')
        .replace(/\/$/, '');

const RAW_BACKEND_URL = sanitizeUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
const BACKEND_BASE_URL = sanitizeUrl(
    /^https?:\/\//i.test(RAW_BACKEND_URL)
        ? RAW_BACKEND_URL
        : RAW_BACKEND_URL
          ? `http://${RAW_BACKEND_URL}`
          : DEFAULT_BACKEND_URL,
).replace(/\/api$/i, '');

const API_BASE_URL = BACKEND_BASE_URL;
const AUTH_BASE_URL = BACKEND_BASE_URL;

const buildCandidateUrls = (path) => {
    const base = sanitizeUrl(BACKEND_BASE_URL).replace(/\/api$/i, '');
    const candidates = [`${base}${path}`, `${base}/api${path}`];
    return Array.from(new Set(candidates));
};

// Use authHeader utility instead of direct localStorage access
const getToken = () => {
    // Try new authHeader first (sync version for fetch calls)
    const token = getAccessTokenSync();
    if (token) return token;

    // Fallback to localStorage for backward compatibility
    const fallback =
        localStorage.getItem('accessToken') || localStorage.getItem('token');
    return fallback
        ? String(fallback)
              .trim()
              .replace(/^Bearer\s+/i, '')
        : null;
};

const buildError = (message, status, code) => {
    const err = new Error(message || 'Update profile failed');
    if (status) err.status = status;
    if (code) err.code = code;
    return err;
};

const normalizeGender = (value) => {
    const v = String(value || '')
        .trim()
        .toUpperCase();
    if (v === 'MALE' || v === 'FEMALE' || v === 'OTHER') return v;
    return null;
};

const ensureUploadableAvatar = async (avatar) => {
    if (!avatar?.uri) return null;

    let uri = avatar.uri;
    const rawName = avatar.name || `avatar-${Date.now()}.jpg`;
    const safeName = String(rawName).replace(/\s+/g, '_');
    const type = avatar.type || 'image/jpeg';

    // Android image pickers often return content:// URIs that fail with multipart in fetch/axios.
    if (/^content:\/\//i.test(uri)) {
        const extensionMatch = safeName.match(/\.[A-Za-z0-9]+$/);
        const extension = extensionMatch ? extensionMatch[0] : '.jpg';
        const tempFile = new File(
            Paths.cache,
            `avatar-upload-${Date.now()}${extension}`,
        );

        /*
            throw buildError('Không tìm thấy thư mục tạm để tải ảnh');
        }

        */
        new File(uri).copy(tempFile);
        uri = tempFile.uri;
    }

    return {
        uri,
        name: safeName,
        type,
    };
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

const safeJson = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (_e) {
        return null;
    }
};

const throwIfNotOk = async (response, fallbackMessage) => {
    if (response.ok) return;
    const data = await safeJson(response);
    const message = (data && (data.message || data.error)) || fallbackMessage;
    throw new Error(message);
};

export const fetchUserProfile = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/user/get-info-for-user`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        await throwIfNotOk(response, 'Failed to fetch profile');
        return response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};

export const updateUserProfile = async (data) => {
    const token = getToken();
    if (!token) {
        throw new Error('Thiếu token đăng nhập');
    }

    const requestData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        gender: normalizeGender(data.gender),
        birthday: typeof data.birthday === 'string' ? data.birthday : null,
    };

    const uploadAvatar = await ensureUploadableAvatar(data.avatar);
    const hasAvatar = Boolean(uploadAvatar?.uri);

    const parseResponseError = async (response) => {
        const body = await safeJson(response);
        const message =
            (body && (body.message || body.error)) ||
            `Cập nhật hồ sơ thất bại (HTTP ${response.status})`;
        return buildError(message, response.status);
    };

    const createFormData = async (mode = 'blob') => {
        const formData = new FormData();

        if (mode === 'json-file') {
            const requestFile = new File(
                Paths.cache,
                `request-${Date.now()}.json`,
            );

            /*
            // Fallback for environments where Expo directories are unavailable.
            if (
                !dir &&
                uploadAvatar?.uri &&
                /^file:\/\//i.test(uploadAvatar.uri)
            ) {
                const normalized = uploadAvatar.uri.replace(/\\/g, '/');
                dir = normalized.substring(0, normalized.lastIndexOf('/') + 1);
            }

            if (!dir) {
                throw buildError(
                    'Không tìm thấy thư mục tạm để tạo request JSON',
                );
            }

            */
            requestFile.write(JSON.stringify(requestData));
            formData.append('request', {
                uri: requestFile.uri,
                name: 'request.json',
                type: 'application/json',
            });
        } else if (mode === 'blob' && typeof Blob !== 'undefined') {
            formData.append(
                'request',
                new Blob([JSON.stringify(requestData)], {
                    type: 'application/json',
                }),
            );
        } else {
            formData.append('request', JSON.stringify(requestData));
        }

        if (uploadAvatar?.uri) {
            formData.append('avatar', {
                uri: uploadAvatar.uri,
                name: uploadAvatar.name,
                type: uploadAvatar.type,
            });
        }

        return formData;
    };

    const sendUpdateByFetch = async (endpoint, mode = 'blob') => {
        const formData = await createFormData(mode);
        console.log('updateUserProfile attempt:', {
            endpoint,
            method: 'PUT',
            mode: mode === 'blob' ? 'multipart-blob' : 'multipart-string',
            hasAvatar,
        });
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
            body: formData,
        });

        if (!response.ok) {
            throw await parseResponseError(response);
        }

        return safeJson(response);
    };

    const sendUpdateJson = async (endpoint) => {
        console.log('updateUserProfile attempt:', {
            endpoint,
            method: 'PUT',
            mode: 'json-body',
            hasAvatar: false,
        });
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            throw await parseResponseError(response);
        }

        return safeJson(response);
    };

    try {
        if (!hasAvatar) {
            const jsonEndpoints = buildCandidateUrls('/user/update-json');
            const jsonAttempts = [];

            for (const endpoint of jsonEndpoints) {
                try {
                    return await sendUpdateJson(endpoint);
                } catch (err) {
                    jsonAttempts.push(
                        `PUT ${endpoint} json: ${err?.message || 'unknown'}`,
                    );
                }
            }

            // Fallback to original multipart endpoint if update-json is unavailable in runtime env.
            const fallbackEndpoints = buildCandidateUrls('/user/update');
            for (const endpoint of fallbackEndpoints) {
                try {
                    return await sendUpdateByFetch(endpoint, 'string');
                } catch (err) {
                    jsonAttempts.push(
                        `PUT ${endpoint} fetch-string-fallback: ${err?.message || 'unknown'}`,
                    );
                }

                try {
                    return await sendUpdateByFetch(endpoint, 'blob');
                } catch (err) {
                    jsonAttempts.push(
                        `PUT ${endpoint} fetch-blob-fallback: ${err?.message || 'unknown'}`,
                    );
                }
            }

            throw buildError(
                `Update profile failed. ${jsonAttempts.join(' | ')}`,
                undefined,
                'ERR_UPDATE_TEXT_FAILED',
            );
        }

        const endpoints = buildCandidateUrls('/user/update');
        const attempts = [];

        for (const endpoint of endpoints) {
            try {
                return await sendUpdateByFetch(endpoint, 'json-file');
            } catch (err) {
                attempts.push(
                    `PUT ${endpoint} fetch-json-file: ${err?.message || 'unknown'}`,
                );
            }

            try {
                return await sendUpdateByFetch(endpoint, 'blob');
            } catch (err) {
                attempts.push(
                    `PUT ${endpoint} fetch-blob: ${err?.message || 'unknown'}`,
                );
            }

            try {
                // Final fallback for environments that cannot attach JSON part as file/blob.
                return await sendUpdateByFetch(endpoint, 'string');
            } catch (err) {
                attempts.push(
                    `PUT ${endpoint} fetch-string: ${err?.message || 'unknown'}`,
                );
            }
        }

        throw buildError(
            `Update profile failed. ${attempts.join(' | ')}`,
            undefined,
            'ERR_UPDATE_FAILED',
        );
    } catch (error) {
        console.error('Update profile failed:', {
            message: error?.message,
            status: error?.status,
            code: error?.code,
            stack: error?.stack,
        });

        throw buildError(
            error?.message || 'Update profile failed',
            error?.status,
            error?.code,
        );
    }
};

export const updatePassword = async (oldPassword, newPassword) => {
    try {
        const response = await fetch(`${API_BASE_URL}/user/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ oldPassword, newPassword }),
        });
        await throwIfNotOk(response, 'Failed to update password');
        return response.json();
    } catch (error) {
        console.error('Error updating password:', error);
        return null;
    }
};

export const uploadAvatar = async (file) => {
    try {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await fetch(`${API_BASE_URL}/user/upload-avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
        });
        await throwIfNotOk(response, 'Upload failed');
        return response.json();
    } catch (error) {
        console.error('Upload avatar failed:', error);
        return null;
    }
};

export const fetchFriendsList = async () => {
    const response = await fetch(`${BACKEND_BASE_URL}/friend`, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    await throwIfNotOk(response, 'Failed to fetch friends list');
    return response.json();
};

export const fetchPendingFriendRequests = async () => {
    const response = await fetch(
        `${BACKEND_BASE_URL}/friend/requests/pending`,
        {
            headers: { Authorization: `Bearer ${getToken()}` },
        },
    );
    await throwIfNotOk(response, 'Failed to fetch pending friend requests');
    const data = await safeJson(response);
    return Array.isArray(data) ? data : [];
};

export const sendFriendRequest = async (phone) => {
    const response = await fetch(
        `${BACKEND_BASE_URL}/friend/send-request/${phone}`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
        },
    );
    await throwIfNotOk(response, 'Failed to send friend request');
    return safeJson(response);
};

export const acceptFriendRequest = async (requestId) => {
    const response = await fetch(
        `${BACKEND_BASE_URL}/friend/request/${requestId}/accept`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
        },
    );
    await throwIfNotOk(response, 'Failed to accept friend request');
    return safeJson(response);
};

export const cancelFriendRequest = async (requestId) => {
    const response = await fetch(
        `${BACKEND_BASE_URL}/friend/request/${requestId}/cancel`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
        },
    );
    await throwIfNotOk(response, 'Failed to cancel friend request');
    return safeJson(response);
};

export const deleteFriend = async (friendId) => {
    const response = await fetch(`${BACKEND_BASE_URL}/friend/${friendId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    await throwIfNotOk(response, 'Failed to delete friend');
    return safeJson(response);
};

export const blockUser = async (blockedUserId) => {
    const response = await fetch(
        `${BACKEND_BASE_URL}/friend/block/${blockedUserId}`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
        },
    );
    await throwIfNotOk(response, 'Failed to block user');
    return safeJson(response);
};

export const unblockUser = async (blockedUserId) => {
    const response = await fetch(
        `${BACKEND_BASE_URL}/friend/unblock/${blockedUserId}`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
        },
    );
    await throwIfNotOk(response, 'Failed to unblock user');
    return safeJson(response);
};

export const getFriendById = async (friendId) => {
    const response = await fetch(`${BACKEND_BASE_URL}/friend/${friendId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    await throwIfNotOk(response, 'Failed to fetch friend details');
    return response.json();
};

export const resetPassword = async (email) => {
    const response = await fetch(`${AUTH_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    await throwIfNotOk(response, 'Failed to request reset password');
    return safeJson(response);
};

export const sendVerificationEmail = async (email) => {
    const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    };

    let response = await fetchWithTimeout(
        `${AUTH_BASE_URL}/auth/verify-email`,
        payload,
        20000,
    );

    if (
        !response.ok &&
        response.status === 403 &&
        AUTH_BASE_URL !== DEFAULT_BACKEND_URL
    ) {
        response = await fetchWithTimeout(
            `${DEFAULT_BACKEND_URL}/auth/verify-email`,
            payload,
            20000,
        );
    }

    await throwIfNotOk(response, 'Failed to send verification email');
    return true;
};

export const verifyEmailWithCode = async (email, code, userRegisterRequest) => {
    const response = await fetchWithTimeout(
        `${AUTH_BASE_URL}/auth/verify-email-code`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, userRegisterRequest }),
        },
        20000,
    );

    await throwIfNotOk(response, 'Email verification failed');
    return response.json();
};

export const fetchUserByPhone = async (phone) => {
    const response = await fetch(
        `${API_BASE_URL}/user/get-user-by-phone/${phone}`,
        {
            headers: { Authorization: `Bearer ${getToken()}` },
        },
    );
    await throwIfNotOk(response, 'Failed to fetch user by phone');
    return response.json();
};

export const fetchUserById = async (userId) => {
    const response = await fetch(
        `${API_BASE_URL}/user/get-user-by-id/${userId}`,
        {
            headers: { Authorization: `Bearer ${getToken()}` },
        },
    );
    await throwIfNotOk(response, 'Failed to fetch user by id');
    return response.json();
};

export const searchUsersByPhones = async (phones) => {
    const response = await fetch(
        `${API_BASE_URL}/user/batch-search-by-phones`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify(phones),
        },
    );
    await throwIfNotOk(response, 'Failed to batch search users by phones');
    return response.json();
};
