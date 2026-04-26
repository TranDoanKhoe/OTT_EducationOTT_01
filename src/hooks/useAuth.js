import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook to access authentication context.
 * Returns { user, token, loading, login, register, logout }
 */
export const useAuth = () => {
    return useContext(AuthContext);
};
