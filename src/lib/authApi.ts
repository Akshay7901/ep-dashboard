import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.ethicspress.com';

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

async function postAuth<T>(endpoint: string, payload: Record<string, unknown>): Promise<T> {
  const { data } = await axios.post<T>(`${API_BASE_URL}/api/proposals${endpoint}`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  if ((data as any)?.error) {
    const err: any = new Error((data as any).error);
    err.response = { data };
    throw err;
  }

  return data;
}

export const authApi = {
  login: async (email: string, password?: string): Promise<LoginResponse> => {
    const payload: Record<string, unknown> = { email };
    if (password) {
      payload.password = password;
    }
    return postAuth<LoginResponse>('/login', payload);
  },

  verifyOtp: async (email: string, otp: string): Promise<VerifyOtpResponse> => {
    return postAuth<VerifyOtpResponse>('/auth/verify-otp', { email, otp });
  },

  setPassword: async (tempToken: string, password: string): Promise<SetPasswordResponse> => {
    return postAuth<SetPasswordResponse>('/auth/set-password', {
      temp_token: tempToken,
      password,
    });
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return postAuth<{ message: string }>('/auth/forgot-password', { email });
  },
};
