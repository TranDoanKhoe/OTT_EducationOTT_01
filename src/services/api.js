import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseFromEnv = (process.env.EXPO_PUBLIC_API_URL || '')
    .trim()
    .replace(/\/$/, '');
const backendFromEnv = (process.env.EXPO_PUBLIC_BACKEND_URL || '')
    .trim()
    .replace(/\/$/, '');
const BASE_URL =
    baseFromEnv ||
    `${backendFromEnv || 'https://ott-education-be.onrender.com'}/api`;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

// Attach JWT token to every request if it exists
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
