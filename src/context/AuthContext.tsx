'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: 'employee' | 'hr';
  department: string;
  designation: string;
  address: string;
  phone: string;
  profile_pic: string;
  join_date: string;
  status: 'active' | 'inactive';
}

interface AuthContextType {
  user: User | null;
  adminUser: User | null; // Keeps track of original HR user when impersonating
  impersonating: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  impersonateEmployee: (employeeId: string) => Promise<boolean>;
  stopImpersonating: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setErrorMsg: (msg: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Load theme and session on mount
  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('hrms_theme') as 'dark' | 'light' || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Session check
    refreshSession().finally(() => {
      setIsInitializing(false);
    });
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('hrms_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const refreshSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {};
      const impId = localStorage.getItem('impersonated_id');
      if (impId) {
        headers['x-impersonate-employee'] = impId;
      }

      const res = await fetch('/api/auth/me', { headers });
      const data = await res.json();
      
      if (res.ok && data.authenticated) {
        setUser(data.user);
        setIsAuthenticated(true);
        if (data.impersonating) {
          setImpersonating(true);
          setAdminUser(data.adminUser);
        } else {
          setImpersonating(false);
          setAdminUser(null);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setImpersonating(false);
        setAdminUser(null);
        localStorage.removeItem('impersonated_id');
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        setImpersonating(false);
        setAdminUser(null);
        localStorage.removeItem('impersonated_id');
        setIsLoading(false);
        return { success: true };
      } else {
        const errorMsg = data.error || 'Invalid email or password';
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = 'Network connection failed';
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const loginWithGoogle = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, isGoogle: true })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        setImpersonating(false);
        setAdminUser(null);
        localStorage.removeItem('impersonated_id');
        setIsLoading(false);
        return { success: true };
      } else {
        const errorMsg = data.error || 'Google login failed';
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = 'Network connection failed';
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
      setAdminUser(null);
      setIsAuthenticated(false);
      setImpersonating(false);
      localStorage.removeItem('impersonated_id');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const impersonateEmployee = async (employeeId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'x-impersonate-employee': employeeId }
      });
      const data = await res.json();
      
      if (res.ok && data.authenticated && data.impersonating) {
        localStorage.setItem('impersonated_id', employeeId);
        setUser(data.user);
        setAdminUser(data.adminUser);
        setImpersonating(true);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('Impersonation error:', err);
      setIsLoading(false);
      return false;
    }
  };

  const stopImpersonating = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('impersonated_id');
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      
      if (res.ok && data.authenticated) {
        setUser(data.user);
        setImpersonating(false);
        setAdminUser(null);
      }
    } catch (err) {
      console.error('Stop impersonating error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setErrorMsg = useCallback((msg: string | null) => {
    setError(msg);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      adminUser,
      impersonating,
      isAuthenticated,
      isLoading,
      isInitializing,
      error,
      theme,
      toggleTheme,
      login,
      loginWithGoogle,
      logout,
      impersonateEmployee,
      stopImpersonating,
      refreshSession,
      setErrorMsg
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
