import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState, LoginCredentials, ForgotPasswordRequest } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<void>;
  getToken: () => string | null;
  isReviewer1: boolean;
  isReviewer2: boolean;
  isAnyReviewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map API roles to internal roles
const mapApiRole = (apiRole: string): 'reviewer_1' | 'reviewer_2' | null => {
  switch (apiRole) {
    case 'admin':
    case 'decision_reviewer':
      return 'reviewer_1'; // Sarah - accepts/declines, sends contracts, finalizes
    case 'peer_reviewer':
      return 'reviewer_2'; // Amanda - completes assessment form
    default:
      return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setState({
          user,
          profile: null,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await supabase.functions.invoke('auth-login', {
      body: { email: credentials.email, password: credentials.password },
    });

    if (response.error) {
      throw { message: response.error.message || 'Login failed', status: 401 };
    }

    const data = response.data;
    
    if (!data.token) {
      throw { message: data.error || 'Login failed', status: 401 };
    }

    // Store token
    localStorage.setItem('auth_token', data.token);

    // Map user data
    const user: User = {
      id: data.user?.id || data.id || credentials.email,
      email: data.user?.email || credentials.email,
      name: data.user?.name || data.name || credentials.email.split('@')[0],
      role: mapApiRole(data.user?.role || data.role || ''),
    };

    localStorage.setItem('user', JSON.stringify(user));

    setState({
      user,
      profile: null,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setState({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const forgotPassword = useCallback(async (data: ForgotPasswordRequest) => {
    // For now, just show a message - the external API may have its own flow
    console.log('Password reset requested for:', data.email);
  }, []);

  const getToken = useCallback(() => {
    return localStorage.getItem('auth_token');
  }, []);

  const isReviewer1 = state.user?.role === 'reviewer_1';
  const isReviewer2 = state.user?.role === 'reviewer_2';
  const isAnyReviewer = isReviewer1 || isReviewer2;

  return (
    <AuthContext.Provider 
      value={{ 
        ...state, 
        login, 
        logout, 
        forgotPassword, 
        getToken,
        isReviewer1,
        isReviewer2,
        isAnyReviewer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
