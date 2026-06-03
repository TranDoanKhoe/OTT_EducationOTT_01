import api from './api';

export const getAll = async () => {
  const res = await api.get('/courses');
  return res.data; // assume array of courses
};

export const getById = async (id) => {
  const res = await api.get(`/courses/${id}`);
  return res.data;
};
