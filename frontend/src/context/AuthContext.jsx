import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    const saved = sessionStorage.getItem('admin') || localStorage.getItem('admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      // axios: response body is at res.data
      const { token, admin } = res.data;

      // Clear both storages before writing
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('admin');
      localStorage.removeItem('token');
      localStorage.removeItem('admin');

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', token);
      storage.setItem('admin', JSON.stringify(admin));

      setAdmin(admin);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Login failed.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('admin');
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
