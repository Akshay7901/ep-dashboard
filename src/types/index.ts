// Types for the Proposal Management Dashboard

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type ProposalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface Proposal {
  id: string;
  name: string;
  client: string;
  clientEmail?: string;
  clientPhone?: string;
  status: ProposalStatus;
  description: string;
  createdAt: string;
  updatedAt?: string;
  attachments?: Attachment[];
  value?: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  status: number;
}
