import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.ethicspress.com';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export interface LoginResponse {
  token?: string;
  requires_otp?: boolean;
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

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await authClient.post('/api/auth/login', { email, password });
    return res.data;
  },

  verifyOtp: async (email: string, otp: string): Promise<VerifyOtpResponse> => {
    const res = await authClient.post('/api/auth/verify-otp', { email, otp });
    return res.data;
  },

  setPassword: async (tempToken: string, password: string): Promise<SetPasswordResponse> => {
    const res = await authClient.post('/api/auth/set-password', {
      temp_token: tempToken,
      password,
    });
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await authClient.post('/api/auth/forgot-password', { email });
    return res.data;
  },
};
