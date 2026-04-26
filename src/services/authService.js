import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const login = async (email, password) => {
  const res = await api.post('/auth/login', { email, password });
  const { token, userId, role } = res.data;
  await AsyncStorage.setItem('token', token);
  await AsyncStorage.setItem('userId', String(userId));
  await AsyncStorage.setItem('userRole', role);
  return res.data;
};

export const register = async ({ name, email, password }) => {
  await api.post('/auth/register', { name, email, password });
  // Auto login after successful registration
  return login(email, password);
};

export const logout = async () => {
  await AsyncStorage.multiRemove(['token', 'userId', 'userRole']);
};
