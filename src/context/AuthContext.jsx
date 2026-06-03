import React, { createContext, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token/user from storage on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      const storedToken =
        (await AsyncStorage.getItem('accessToken')) || (await AsyncStorage.getItem('token'));
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedRole = await AsyncStorage.getItem('userRole');
      if (storedToken && storedUserId) {
        setToken(storedToken);
        setUser({ id: storedUserId, role: storedRole });
      }
      setLoading(false);
    };
    loadStoredAuth();
  }, []);

  const login = async (email, password) => {
    const res = await (await import('../services/authService')).login(email, password);
    setToken(res.accessToken);
    setUser({ id: res.userId, role: res.role });
  };

  const register = async (payload) => {
    const res = await (await import('../services/authService')).register(payload);
    setToken(res.accessToken);
    setUser({ id: res.userId, role: res.role });
  };

  const logout = async () => {
    await (await import('../services/authService')).logout();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
