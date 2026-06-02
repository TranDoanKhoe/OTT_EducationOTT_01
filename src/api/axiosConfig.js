// Cấu hình Axios dùng chung cho toàn bộ ứng dụng Mobile
// Đồng bộ với Web: Auto-refresh token khi 401/403
import axios from 'axios';
import {
    getAccessTokenSync,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    clearAuth,
} from '../utils/authHeader';
import eventEmitter from '../utils/eventEmitter';

const RAW_BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'http://ott-education-balancer-1307761869.ap-southeast-1.elb.amazonaws.com';

// Sanitize URL (remove trailing slash, ensure http)
const BACKEND_URL = (
    /^https?:\/\//i.test(RAW_BACKEND_URL)
        ? RAW_BACKEND_URL
        : `http://${RAW_BACKEND_URL}`
).replace(/\/$/, '');

// Gán baseURL toàn cục
axios.defaults.baseURL = BACKEND_URL;

// Timeout 30s để tránh treo request trên mobile
axios.defaults.timeout = 30000;

console.log('📡 Axios configured with baseURL:', BACKEND_URL);

// ============ REQUEST INTERCEPTOR ============
// Auto-attach Authorization on every axios call
// Skip for auth endpoints (refresh, login, register, third-party AI APIs)
axios.interceptors.request.use(
    (config) => {
        const skipAuth =
            config.url?.includes('/auth/refresh') ||
            config.url?.includes('/auth/login') ||
            config.url?.includes('/auth/register') ||
            config.url?.includes('googleapis.com') ||
            config.url?.includes('mistral.ai');

        if (!skipAuth) {
            const token = getAccessTokenSync();
            if (token) {
                config.headers = config.headers || {};
                // Don't override caller-provided header
                if (!config.headers.Authorization) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// ============ RESPONSE INTERCEPTOR (REFRESH ON 401/403) ============
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
    failedQueue = [];
};

axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error?.response?.status;

        // Check if we should attempt token refresh
        if (
            (status === 401 || status === 403) &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh') &&
            !originalRequest.url?.includes('/auth/login')
        ) {
            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest._retry = true;
                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers['Authorization'] =
                            `Bearer ${token}`;
                        return axios(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = await getRefreshToken();
            if (!refreshToken) {
                console.log('❌ No refresh token available, clearing auth');
                isRefreshing = false;
                await clearAuth();
                // Navigate to login (handled by navigation listener)
                return Promise.reject(error);
            }

            try {
                console.log('🔄 Attempting to refresh access token...');
                const { data } = await axios.post(
                    `${BACKEND_URL}/auth/refresh`,
                    { refreshToken },
                    { headers: { 'Content-Type': 'application/json' } },
                );

                const newToken = data.accessToken;
                await setAccessToken(newToken);
                if (data.refreshToken) {
                    await setRefreshToken(data.refreshToken);
                }

                console.log('✅ Token refreshed successfully');

                // Emit event for WebSocket reconnection
                eventEmitter.emit('auth:tokenRefreshed', { token: newToken });

                // Update original request with new token
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

                // Process queued requests
                processQueue(null, newToken);

                // Retry original request
                return axios(originalRequest);
            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError);
                processQueue(refreshError, null);
                await clearAuth();
                // Navigate to login (handled by navigation listener)
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export default axios;
