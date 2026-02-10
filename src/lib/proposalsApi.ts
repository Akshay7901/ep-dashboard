 import { supabase } from '@/integrations/supabase/client';
 
 // Types for API responses
 export interface PeerReviewer {
   id: string;
   email: string;
   name: string;
   created_at?: string;
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
 
 // Get auth token from localStorage
 const getAuthToken = (): string | null => {
   return localStorage.getItem('auth_token');
 };
 
 // Helper to build headers
 const buildHeaders = () => {
   const token = getAuthToken();
   return {
     'Authorization': token ? `Bearer ${token}` : '',
   };
 };
 
// Peer Reviewers API
export const peerReviewersApi = {
  list: async (): Promise<PeerReviewer[]> => {
    const { data, error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'GET',
      headers: {
        ...buildHeaders(),
        'x-custom-path': '/peer-reviewers',
      },
    });
    
    if (error) throw error;
    // Handle various response structures from the API
    if (Array.isArray(data)) return data;
    if (data?.peer_reviewers && Array.isArray(data.peer_reviewers)) return data.peer_reviewers;
    if (data?.reviewers && Array.isArray(data.reviewers)) return data.reviewers;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  },
 
   create: async (reviewer: { email: string; name: string }): Promise<PeerReviewer> => {
     const { data, error } = await supabase.functions.invoke('proposals-proxy', {
       method: 'POST',
       headers: {
         ...buildHeaders(),
         'x-custom-path': '/peer-reviewers',
       },
       body: reviewer,
     });
     
     if (error) throw error;
     return data;
   },
 
  delete: async (reviewerId: string): Promise<void> => {
    const { data, error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'POST',
      headers: {
        ...buildHeaders(),
        'x-custom-path': `/peer-reviewers/${reviewerId}`,
        'x-custom-method': 'DELETE',
      },
    });

    // For non-2xx responses, supabase-js surfaces the payload via `error`.
    // We still want to extract the upstream JSON so the UI can show a helpful message.
    if (error) {
      const err: any = new Error(error.message || 'Failed to delete peer reviewer');
      err.original = error;

      try {
        const response: Response | undefined = (error as any)?.context?.response;
        if (response) {
          const text = await response.clone().text();
          const parsed = text ? JSON.parse(text) : null;
          if (parsed) {
            err.upstream = parsed.upstream || parsed;
            err.status = response.status;
          }
        }
      } catch {
        // ignore parsing errors; fall back to message-based handling
      }

      throw err;
    }

    // Some backends return 200 with an embedded error
    if ((data as any)?.error || (data as any)?.upstream) {
      const upstreamError = (data as any).upstream || data;
      const err: any = new Error((data as any).error || 'Failed to delete peer reviewer');
      err.upstream = upstreamError;
      throw err;
    }
  },
};
 
// Comments API
export const commentsApi = {
  list: async (ticketNumber: string): Promise<ProposalComment[]> => {
    const { data, error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'GET',
      headers: {
        ...buildHeaders(),
        'x-custom-path': `/comments/${ticketNumber}`,
      },
    });
    
    if (error) throw error;
    return data?.comments || data || [];
  },

  add: async (ticketNumber: string, comment: { comment: string }): Promise<ProposalComment> => {
    const { data, error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'POST',
      headers: {
        ...buildHeaders(),
        'x-custom-path': `/comments/${ticketNumber}`,
      },
      body: comment,
    });
    
    if (error) throw error;
    return data;
  },
};
 
// Status API
export const statusApi = {
  update: async (ticketNumber: string, statusUpdate: StatusUpdate): Promise<void> => {
    const { error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'POST',
      headers: {
        ...buildHeaders(),
        'x-custom-path': `/status/${ticketNumber}`,
        'x-custom-method': 'PATCH',
      },
      body: statusUpdate,
    });
    
    if (error) throw error;
  },
};

// Assignments API
export const assignmentsApi = {
  assign: async (ticketNumber: string, assignment: AssignmentRequest): Promise<void> => {
    const { error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'POST',
      headers: {
        ...buildHeaders(),
        'x-custom-path': `/assign/${ticketNumber}`,
      },
      body: assignment,
    });
    
    if (error) throw error;
  },

  unassign: async (ticketNumber: string): Promise<void> => {
    const { data, error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'POST',
      headers: {
        ...buildHeaders(),
        'x-custom-path': `/assign/${ticketNumber}`,
        'x-custom-method': 'DELETE',
      },
    });
    
    if (error) throw error;
    // Check for wrapped upstream errors
    if ((data as any)?.error || (data as any)?.upstream) {
      const upstreamError = (data as any).upstream || data;
      const err: any = new Error((data as any).error || 'Failed to unassign reviewers');
      err.upstream = upstreamError;
      throw err;
    }
  },
};

// Reassign API
export const reassignApi = {
  reassign: async (ticketNumber: string, body: { from_reviewer_email: string; to_reviewer_email: string }): Promise<any> => {
    const { data, error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'POST',
      headers: {
        ...buildHeaders(),
        'x-custom-path': `/reassign/${ticketNumber}`,
      },
      body,
    });

    if (error) throw error;
    if ((data as any)?.error || (data as any)?.upstream) {
      const upstreamError = (data as any).upstream || data;
      const err: any = new Error((data as any).error || 'Failed to reassign proposal');
      err.upstream = upstreamError;
      throw err;
    }
    return data;
  },
};

// Revisions API
export const revisionsApi = {
  create: async (ticketNumber: string, revisionData: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'POST',
      headers: {
        ...buildHeaders(),
        'x-custom-path': `/revise/${ticketNumber}`,
      },
      body: revisionData,
    });
    
    if (error) throw error;
  },
};

// Delete Proposal API
export const proposalApi = {
  delete: async (ticketNumber: string): Promise<void> => {
    const { error } = await supabase.functions.invoke('proposals-proxy', {
      method: 'POST',
      headers: {
        ...buildHeaders(),
        'x-custom-path': `/proposal/${ticketNumber}`,
        'x-custom-method': 'DELETE',
      },
    });
    
    if (error) throw error;
  },
};