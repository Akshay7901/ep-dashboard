import api from '@/lib/api';

// Types for API responses
export interface PeerReviewer {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  assigned_proposals_count?: number;
}

export interface AssignmentRequest {
  reviewer_email: string;
}

// Peer Reviewers API
export const peerReviewersApi = {
  list: async (): Promise<PeerReviewer[]> => {
    const { data } = await api.get('/api/proposals/users/peer-reviewers');
    if (Array.isArray(data)) return data;
    if (data?.peer_reviewers && Array.isArray(data.peer_reviewers)) return data.peer_reviewers;
    if (data?.reviewers && Array.isArray(data.reviewers)) return data.reviewers;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  },

  create: async (reviewer: { email: string; name: string }): Promise<PeerReviewer> => {
    const { data } = await api.post('/api/proposals/users/peer-reviewers', reviewer);
    return data;
  },

  delete: async (reviewerId: string): Promise<void> => {
    await api.delete(`/api/proposals/users/peer-reviewers/${encodeURIComponent(reviewerId)}`);
  },
};

// Reviews API (peer review submission and retrieval)
export const reviewsApi = {
  get: async (ticketNumber: string): Promise<any> => {
    try {
      const { data } = await api.get(`/api/proposals/${encodeURIComponent(ticketNumber)}/review`);
      return data;
    } catch (error: any) {
      // If no review exists yet (404), return null instead of throwing
      if (error?.status === 404 || error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  saveDraft: async (ticketNumber: string, reviewData: Record<string, any>): Promise<any> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/review/save`, reviewData);
    return data;
  },

  submit: async (ticketNumber: string, reviewData: Record<string, any>): Promise<any> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/review/submit`, reviewData);
    return data;
  },
};

// Assignments API
export const assignmentsApi = {
  assign: async (ticketNumber: string, assignment: AssignmentRequest): Promise<void> => {
    await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/assign`, assignment);
  },

  unassign: async (ticketNumber: string): Promise<void> => {
    await api.delete(`/api/proposals/${encodeURIComponent(ticketNumber)}/assign`);
  },
};

// Revisions API
export const revisionsApi = {
  create: async (ticketNumber: string, revisionData: Record<string, unknown>): Promise<void> => {
    await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/revise`, revisionData);
  },
};

// Contract API
export const contractApi = {
  get: async (ticketNumber: string): Promise<any> => {
    try {
      const { data } = await api.get(`/api/proposals/${encodeURIComponent(ticketNumber)}/contract`);
      return data;
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) return null;
      throw error;
    }
  },

  getDocumentUrl: (ticketNumber: string): string => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.ethicspress.com';
    return `${baseUrl}/api/proposals/${encodeURIComponent(ticketNumber)}/contract/document`;
  },

  getDocumentBlob: async (ticketNumber: string): Promise<string> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.ethicspress.com';
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${baseUrl}/api/proposals/${encodeURIComponent(ticketNumber)}/contract/document`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error(`Failed to fetch document: ${response.status}`);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
};

// Delete Proposal API
export const proposalApi = {
  delete: async (ticketNumber: string): Promise<void> => {
    await api.delete(`/api/proposals/${encodeURIComponent(ticketNumber)}`);
  },

  decline: async (ticketNumber: string): Promise<{ status: string; message: string; ticket_number: string; email_sent: boolean }> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/decline`);
    return data;
  },

  acceptContract: async (ticketNumber: string): Promise<any> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/contract/accept`);
    return data;
  },

  sendContract: async (ticketNumber: string, payload: { contract_type: string; title?: string; subtitle?: string; expiry_days?: number; notes?: string }): Promise<any> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/contract/send`, payload);
    return data;
  },




  raiseQuestions: async (ticketNumber: string, message: string): Promise<any> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/contract/questions`, { message });
    return data;
  },
};

// Metadata API
export interface MetadataAuthor {
  title?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  email_2?: string;
  institution?: string;
  country?: string;
}

export interface ProposalMetadata {
  full_title?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  display_names?: string;
  display_bios?: string;
  authors?: MetadataAuthor[];
  book_description?: string;
  keywords?: string;
  website_classification?: string;
  bic?: string;
}

export interface MetadataResponse {
  ticket_number: string;
  current_version: number;
  metadata: ProposalMetadata;
  created_at: string;
  updated_at: string;
  revisions?: any[];
}

export const metadataApi = {
  get: async (ticketNumber: string): Promise<MetadataResponse | null> => {
    try {
      const { data } = await api.get(`/api/proposals/${encodeURIComponent(ticketNumber)}/metadata`);
      return data;
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) return null;
      throw error;
    }
  },

  update: async (ticketNumber: string, payload: Partial<ProposalMetadata> & { notes?: string; updated_by?: string }): Promise<any> => {
    const { data } = await api.put(`/api/proposals/${encodeURIComponent(ticketNumber)}/metadata`, payload);
    return data;
  },
};

// Contract Queries API
export interface ContractQuery {
  id: number;
  ticket_number?: string;
  type: 'query' | 'response';
  category?: string | null;
  text?: string;
  query_text?: string;
  response_text?: string;
  raised_by?: string;
  raised_by_name?: string;
  raised_by_role?: string;
  parent_query_id?: number | null;
  created_at: string;
  created_by?: string;
  created_by_role?: string;
}

export const contractQueriesApi = {
  list: async (ticketNumber: string): Promise<ContractQuery[]> => {
    const { data } = await api.get(`/api/proposals/${encodeURIComponent(ticketNumber)}/contract/queries`);
    return data?.queries || data || [];
  },

  raise: async (ticketNumber: string, queryText: string, category: string): Promise<any> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/contract/query`, { query_text: queryText, category });
    return data;
  },

  respond: async (ticketNumber: string, queryId: number, responseText: string): Promise<any> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/contract/query/respond`, { query_id: queryId, response_text: responseText });
    return data;
  },
};
