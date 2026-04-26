// Cấu hình Axios dùng chung cho toàn bộ ứng dụng Mobile
// URL backend lấy từ biến môi trường
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ott-education-be.onrender.com';

// Gán baseURL toàn cục để các file api khác không cần khai báo lại
axios.defaults.baseURL = BACKEND_URL;

// Timeout 30s cho Render.com cold start
axios.defaults.timeout = 30000;

export default axios;
