import api from './api';

// Fetch a single lesson (including video URL, description, etc.)
export const getById = async (lessonId) => {
  const res = await api.get(`/lessons/${lessonId}`);
  return res.data;
};
