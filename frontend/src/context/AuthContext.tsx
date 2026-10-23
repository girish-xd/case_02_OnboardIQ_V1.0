import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  register: (payload: { username: string; password: string; fullName: string; email: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch (_) {
      // User is not logged in; remain null so AuthPage renders
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (username: string, password = 'password123') => {
    setLoading(true);
    try {
      const data = await api.login(username, password);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: { username: string; password: string; fullName: string; email: string }) => {
    setLoading(true);
    try {
      await api.register(payload);
      // Auto-login newly registered customer
      const data = await api.login(payload.username, payload.password);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const switchUser = async (username: string) => {
    await login(username, 'password123');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
