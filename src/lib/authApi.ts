import { supabase } from '@/integrations/supabase/client';

export interface LoginResponse {
  token?: string;
  requires_otp?: boolean;
  purpose?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  };
  message?: string;
  error?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface VerifyOtpResponse {
  requires_password_setup?: boolean;
  temp_token?: string;
  token?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  };
  message?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface SetPasswordResponse {
  token: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  };
  message?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

async function invokeAuthProxy<T>(endpoint: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('auth-proxy', {
    body: { endpoint, ...payload },
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    const err: any = new Error(data.error);
    err.response = { data };
    throw err;
  }

  return data as T;
}

export const authApi = {
  login: async (email: string, password?: string): Promise<LoginResponse> => {
    const payload: Record<string, unknown> = { email };
    if (password) {
      payload.password = password;
    }
    return invokeAuthProxy<LoginResponse>('/login', payload);
  },

  verifyOtp: async (email: string, otp: string): Promise<VerifyOtpResponse> => {
    return invokeAuthProxy<VerifyOtpResponse>('/verify-otp', { email, otp });
  },

  setPassword: async (tempToken: string, password: string): Promise<SetPasswordResponse> => {
    return invokeAuthProxy<SetPasswordResponse>('/set-password', {
      temp_token: tempToken,
      password,
    });
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return invokeAuthProxy<{ message: string }>('/forgot-password', { email });
  },
};
