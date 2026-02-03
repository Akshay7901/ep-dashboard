import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState, LoginCredentials, ForgotPasswordRequest, Profile } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  isReviewer1: boolean;
  isReviewer2: boolean;
  isAnyReviewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapSupabaseUser = (supabaseUser: SupabaseUser, profile?: Profile | null): User => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
  avatar: supabaseUser.user_metadata?.avatar_url,
  role: profile?.role || null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data as Profile | null;
  };

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Fetch profile with a small delay to ensure it's created
          setTimeout(async () => {
            const profile = await fetchProfile(session.user.id);
            setState({
              user: mapSupabaseUser(session.user, profile),
              profile,
              isAuthenticated: true,
              isLoading: false,
            });
          }, 0);
        } else {
          setState({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: mapSupabaseUser(session.user, profile),
          profile,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw { message: error.message, status: 401 };
    }

    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      setState({
        user: mapSupabaseUser(data.user, profile),
        profile,
        isAuthenticated: true,
        isLoading: false,
      });
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      throw { message: error.message, status: 400 };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const forgotPassword = useCallback(async (data: ForgotPasswordRequest) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw { message: error.message, status: 400 };
    }
  }, []);

  const isReviewer1 = state.profile?.role === 'reviewer_1';
  const isReviewer2 = state.profile?.role === 'reviewer_2';
  const isAnyReviewer = isReviewer1 || isReviewer2;

  return (
    <AuthContext.Provider 
      value={{ 
        ...state, 
        login, 
        logout, 
        forgotPassword, 
        signUp,
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
