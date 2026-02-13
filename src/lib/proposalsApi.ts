import api from '@/lib/api';

// Types for API responses
export interface PeerReviewer {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  assigned_proposals_count?: number;
}

export interface ProposalComment {
  id: string;
  ticket_number: string;
  comment: string;
  author: string;
  author_email: string;
  created_at: string;
  role?: string;
}

export interface StatusUpdate {
  status: string;
  notes?: string;
}

export interface AssignmentRequest {
  reviewer_emails: string[];
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

// Comments API
export const commentsApi = {
  list: async (ticketNumber: string): Promise<ProposalComment[]> => {
    const { data } = await api.get(`/api/proposals/${encodeURIComponent(ticketNumber)}/comments`);
    return data?.comments || data || [];
  },

  add: async (ticketNumber: string, comment: { comment: string }): Promise<ProposalComment> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/comments`, { comment_text: comment.comment });
    return data;
  },
};

// Status API
export const statusApi = {
  update: async (ticketNumber: string, statusUpdate: StatusUpdate): Promise<void> => {
    await api.patch(`/api/proposals/${encodeURIComponent(ticketNumber)}/status`, statusUpdate);
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

// Reassign API
export const reassignApi = {
  reassign: async (ticketNumber: string, body: { from_reviewer_email: string; to_reviewer_email: string }): Promise<any> => {
    const { data } = await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/reassign`, body);
    return data;
  },
};

// Revisions API
export const revisionsApi = {
  create: async (ticketNumber: string, revisionData: Record<string, unknown>): Promise<void> => {
    await api.post(`/api/proposals/${encodeURIComponent(ticketNumber)}/revise`, revisionData);
  },
};

// Delete Proposal API
export const proposalApi = {
  delete: async (ticketNumber: string): Promise<void> => {
    await api.delete(`/api/proposals/${encodeURIComponent(ticketNumber)}`);
  },
};
