// Types for the Proposal Management Dashboard

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: ReviewerRole | null;
}

export type ReviewerRole = 'reviewer_1' | 'reviewer_2';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: ReviewerRole | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  profile: Profile | null;
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

export type ProposalStatus = 
  | 'submitted' 
  | 'under_review' 
  | 'approved' 
  | 'finalised' 
  | 'rejected' 
  | 'locked';

export interface Proposal {
  id: string;
  name: string;
  author_name: string;
  author_email: string;
  author_phone?: string | null;
  description?: string | null;
  status: ProposalStatus;
  value?: number | null;
  contract_sent: boolean;
  contract_sent_at?: string | null;
  finalised_at?: string | null;
  finalised_by?: string | null;
  created_at: string;
  updated_at: string;
  // Legacy compatibility
  client?: string;
  clientEmail?: string;
  clientPhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProposalAttachment {
  id: string;
  proposal_id: string;
  file_name: string;
  file_path: string;
  file_type?: string | null;
  file_size?: number | null;
  uploaded_at: string;
}

export interface ReviewerComment {
  id: string;
  proposal_id: string;
  reviewer_id: string;
  comment_text?: string | null;
  review_form_data: Record<string, any>;
  submitted_for_authorization: boolean;
  is_duplicate_of?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowLog {
  id: string;
  proposal_id: string;
  user_id?: string | null;
  action: string;
  previous_status?: ProposalStatus | null;
  new_status?: ProposalStatus | null;
  details: Record<string, any>;
  created_at: string;
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
