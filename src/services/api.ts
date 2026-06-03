// src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Retrieve the backend base URL from environment variables.
// expo-constants SDK 50+ uses expoConfig instead of manifest.
// If the key is missing we fall back to the env variable or a sane default.
const BASE_URL: string =
  (process.env.EXPO_PUBLIC_BACKEND_URL
    ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
    : 'https://ott-education-be.onrender.com/api');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Automatically attach JWT token stored in AsyncStorage to every request.
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export default api;
