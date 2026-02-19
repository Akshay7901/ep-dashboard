import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { extractCountry } from '@/lib/extractCountry';
import { Proposal, ProposalStatus, ReviewerComment, WorkflowLog, ApiProposalDetail, ApiProposalsResponse, ApiProposalStatus, ApiStatusSummary } from '@/types';
import { toast } from '@/hooks/use-toast';

interface UseProposalsOptions {
  page?: number;
  limit?: number;
  search?: string;
  searchCategory?: string;
  status?: ProposalStatus | 'all';
}

// Map API status to internal status
const mapApiStatus = (apiStatus: ApiProposalStatus): ProposalStatus => {
  const statusMap: Record<ApiProposalStatus, ProposalStatus> = {
    'new': 'submitted',
    'under_review': 'under_review',
    'review_returned': 'finalised',
    'contract_sent': 'approved',
    'clarification': 'locked',
    'approved': 'approved',
    'rejected': 'rejected',
    'published': 'finalised',
  };
  return statusMap[apiStatus] || 'submitted';
};

// Map internal status to API status for updates
const mapToApiStatus = (status: ProposalStatus): string => {
  const map: Record<ProposalStatus, string> = {
    'submitted': 'new',
    'under_review': 'under_review',
    'finalised': 'review_returned',
    'approved': 'contract_sent',
    'rejected': 'rejected',
    'locked': 'clarification',
  };
  return map[status] || status;
};

// Extract earliest assigned_at from assignments array
const extractAssignedAt = (assignments: any): string | null => {
  if (!Array.isArray(assignments) || assignments.length === 0) return null;
  const dates = assignments
    .map((r: any) => r.assigned_at)
    .filter(Boolean);
  if (dates.length === 0) return null;
  return dates.sort()[0];
};

// Map API proposal to internal Proposal structure (list view)
const mapApiProposal = (apiProposal: any): Proposal => {
  const assignments = apiProposal.assignments || [];
  return {
    id: apiProposal.ticket_number,
    name: apiProposal.title,
    author_name: apiProposal.corresponding_author,
    author_email: apiProposal.email,
    author_phone: null,
    description: null,
    status: mapApiStatus(apiProposal.status),
    value: null,
    contract_sent: apiProposal.status === 'contract_sent',
    contract_sent_at: null,
    finalised_at: null,
    finalised_by: null,
    created_at: apiProposal.submitted_at,
    updated_at: apiProposal.submitted_at,
    ticket_number: apiProposal.ticket_number,
    current_revision: apiProposal.current_revision,
    address: apiProposal.address || null,
    assigned_at: extractAssignedAt(assignments),
    assigned_reviewers: assignments.length > 0
      ? assignments.map((a: any) => ({ email: a.reviewer_email, assigned_at: a.assigned_at }))
      : null,
  };
};

// Map API proposal detail to internal Proposal structure (detail view)
const mapApiProposalDetail = (apiProposal: ApiProposalDetail): Proposal => {
  const currentData = apiProposal.current_data || {};
  const assignments = apiProposal.assignments || [];
  return {
    id: apiProposal.ticket_number,
    name: currentData.main_title || apiProposal.title || '',
    author_name: currentData.corresponding_author_name || apiProposal.corresponding_author || '',
    author_email: currentData.email || apiProposal.email || '',
    author_phone: null,
    description: currentData.detailed_description || currentData.short_description || null,
    status: mapApiStatus(apiProposal.status),
    value: null,
    contract_sent: apiProposal.status === 'contract_sent',
    contract_sent_at: null,
    finalised_at: null,
    finalised_by: null,
    created_at: apiProposal.submitted_at,
    updated_at: apiProposal.updated_at || apiProposal.submitted_at,
    ticket_number: apiProposal.ticket_number,
    current_revision: apiProposal.current_revision,
    short_description: currentData.short_description || null,
    detailed_description: currentData.detailed_description || null,
    sub_title: currentData.sub_title || null,
    biography: currentData.biography || null,
    institution: currentData.institution || null,
    job_title: currentData.job_title || null,
    keywords: currentData.keywords || null,
    book_type: currentData.book_type || null,
    word_count: currentData.word_count || null,
    expected_completion_date: currentData.expected_completion_date || null,
    table_of_contents: currentData.table_of_contents || null,
    marketing_info: currentData.marketing_info || null,
    co_authors_editors: currentData.co_authors_editors || null,
    referees_reviewers: currentData.referees_reviewers || null,
    file_uploads: currentData.file_uploads || null,
    secondary_email: currentData.secondary_email || null,
    address: currentData.address || null,
    cv_submitted: currentData.cv_submitted || null,
    sample_chapter_submitted: currentData.sample_chapter_submitted || null,
    toc_submitted: currentData.toc_submitted || null,
    permissions_required: currentData.permissions_required || null,
    permissions_docs_submitted: currentData.permissions_docs_submitted || null,
    figures_tables_count: currentData.figures_tables_count || null,
    under_review_elsewhere: currentData.under_review_elsewhere || null,
    submitted_date: currentData.submitted_date || null,
    submitted_time: currentData.submitted_time || null,
    additional_info: currentData.additional_info || null,
    corresponding_author_name: currentData.corresponding_author_name || null,
    referrer_url: currentData.referrer_url || null,
    assigned_at: extractAssignedAt(assignments),
    assigned_reviewers: assignments.length > 0
      ? assignments.map((a: any) => ({ email: a.reviewer_email, assigned_at: a.assigned_at }))
      : null,
  };
};

// Helper function to fetch proposals list directly from API
const fetchProposalsList = async (limit: number, offset: number): Promise<ApiProposalsResponse> => {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');

  const { data } = await api.get(`/api/proposals?limit=${limit}&offset=${offset}`);

  if (data?.upstream?.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return data;
};

// Helper function to fetch single proposal by ticket number directly from API
const fetchProposalByTicket = async (ticketNumber: string): Promise<ApiProposalDetail> => {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');

  const { data } = await api.get(`/api/proposals/${encodeURIComponent(ticketNumber)}`);

  if (data?.upstream?.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return data;
};

export const useProposals = (options: UseProposalsOptions = {}) => {
  const { page = 1, limit = 10, search = '', searchCategory = 'author', status = 'all' } = options;

  return useQuery({
    queryKey: ['proposals', page, limit, search, searchCategory, status],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      // Fetch proposals directly from external API
      const apiData = await fetchProposalsList(limit, offset).catch(() => ({ proposals: [], total: 0 } as any));

      // The list endpoint already returns assignments, so we only need detail fetch for address
      const detailPromises = (apiData.proposals || []).map(async (p: any) => {
        try {
          const detail = await fetchProposalByTicket(p.ticket_number);
          return {
            ticket_number: p.ticket_number,
            address: (detail as any)?.current_data?.address || null,
          };
        } catch {
          return { ticket_number: p.ticket_number, address: null };
        }
      });

      const details = await Promise.all(detailPromises);
      const detailsMap = new Map(details.map((d: any) => [d.ticket_number, d]));

      // Map API proposals - no more Supabase overrides
      let proposals = (apiData.proposals || []).map((apiProposal: any) => {
        const detail = detailsMap.get(apiProposal.ticket_number);
        apiProposal.address = detail?.address || null;
        return mapApiProposal(apiProposal);
      });

      // Client-side filtering for search
      if (search) {
        const searchLower = search.toLowerCase();
        proposals = proposals.filter(p => {
          switch (searchCategory) {
            case 'title':
              return p.name?.toLowerCase().includes(searchLower);
            case 'email':
              return p.author_email?.toLowerCase().includes(searchLower);
            case 'country': {
              const country = extractCountry(p.address);
              return country?.toLowerCase().includes(searchLower) ?? false;
            }
            case 'author':
            default:
              return p.author_name?.toLowerCase().includes(searchLower);
          }
        });
      }

      // Client-side filtering for status
      if (status !== 'all') {
        proposals = proposals.filter(p => p.status === status);
      }

      return {
        data: proposals,
        total: apiData.total,
        page,
        limit,
        totalPages: Math.ceil(apiData.total / limit),
        statusSummary: apiData.status_summary || null,
      };
    },
    staleTime: 0,
  });
};

export const useProposal = (id: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      // Fetch from external API directly
      const apiProposal = await fetchProposalByTicket(id);
      return mapApiProposalDetail(apiProposal);
    },
    enabled: !!id,
    retry: false,
    staleTime: 0,
  });
};

export const useUpdateProposalStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      previousStatus,
      ticketNumber,
      proposalData,
      assignedReviewerEmails,
    }: { 
      id: string; 
      status: ProposalStatus; 
      previousStatus: ProposalStatus;
      ticketNumber?: string;
      proposalData?: Partial<Proposal>;
      assignedReviewerEmails?: string[];
    }) => {
      const lookupTicket = ticketNumber || proposalData?.ticket_number || id;
      
      // Update status via external API
      const apiStatus = mapToApiStatus(status);
      await api.patch(`/api/proposals/${encodeURIComponent(lookupTicket)}/status`, {
        status: apiStatus,
      });

      return { 
        ticketNumber: lookupTicket,
        newStatus: status,
      };
    },
    onSuccess: (data, variables) => {
      const lookupTicket = variables.ticketNumber || variables.proposalData?.ticket_number || variables.id;
      
      queryClient.setQueryData(['proposal', lookupTicket], (oldData: Proposal | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            status: data.newStatus,
          };
        }
        return oldData;
      });
      
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      
      toast({
        title: 'Status updated',
        description: 'Proposal status has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update proposal status.',
      });
    },
  });
};

export const useProposalComments = (proposalId: string, ticketNumber?: string) => {
  return useQuery({
    queryKey: ['proposal-comments', proposalId],
    queryFn: async () => {
      const tn = ticketNumber || proposalId;
      if (!tn) return [] as ReviewerComment[];

      // Fetch comments from external API only
      const apiResult = await api.get(`/api/proposals/${encodeURIComponent(tn)}/comments`).catch(() => ({ data: [] }));
      const apiComments = apiResult.data?.comments || apiResult.data || [];

      const REVIEW_DATA_MARKER = '[PEER_REVIEW_DATA]';

      return apiComments.map((ac: any) => {
        const rawText = ac.text || ac.comment || ac.comment_text || '';
        let reviewFormData: Record<string, any> = {};
        let submittedForAuth = false;
        let displayText = rawText;

        if (rawText.startsWith(REVIEW_DATA_MARKER)) {
          try {
            const jsonStr = rawText.slice(REVIEW_DATA_MARKER.length);
            const parsed = JSON.parse(jsonStr);
            reviewFormData = parsed;
            submittedForAuth = !!parsed.submittedForAuthorization;
            displayText = parsed.otherComments || `Recommendation: ${parsed.recommendation || 'N/A'}`;
          } catch {
            // Not valid JSON, treat as plain text
          }
        } else if (rawText.startsWith('[Peer Review Submitted]')) {
          submittedForAuth = true;
        }

        return {
          id: ac.id?.toString() || crypto.randomUUID(),
          proposal_id: proposalId,
          reviewer_id: ac.commented_by || '',
          comment_text: displayText,
          review_form_data: reviewFormData,
          submitted_for_authorization: submittedForAuth,
          is_duplicate_of: null,
          created_at: ac.created_at || new Date().toISOString(),
          updated_at: ac.created_at || new Date().toISOString(),
          author: ac.commented_by,
          author_email: ac.commented_by,
          type: ac.type,
        } as any;
      }) as ReviewerComment[];
    },
    enabled: !!proposalId,
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      commentText,
      reviewFormData,
      duplicateOf,
      ticketNumber,
    }: {
      proposalId: string;
      commentText?: string;
      reviewFormData?: Record<string, any>;
      duplicateOf?: string;
      ticketNumber?: string;
    }) => {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) throw new Error('Not authenticated');

      const tn = ticketNumber || proposalId;

      const REVIEW_DATA_MARKER = '[PEER_REVIEW_DATA]';

      let finalCommentText = commentText || '';
      if (reviewFormData && Object.keys(reviewFormData).length > 0) {
        finalCommentText = REVIEW_DATA_MARKER + JSON.stringify(reviewFormData);
      }

      await api.post(`/api/proposals/${encodeURIComponent(tn)}/comments`, {
        comment_text: finalCommentText,
        comment_type: 'internal',
        commented_by: user.email,
      });

      return { proposalId };
    },
    onSuccess: (data) => {
      if (data?.proposalId) {
        queryClient.invalidateQueries({ queryKey: ['proposal-comments', data.proposalId] });
      }
      queryClient.invalidateQueries({ queryKey: ['proposal'] });
      toast({
        title: 'Comment added',
        description: 'Your review has been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add comment.',
      });
    },
  });
};

export const useWorkflowLogs = (proposalId: string) => {
  return useQuery({
    queryKey: ['workflow-logs', proposalId],
    queryFn: async () => {
      // Workflow logs are no longer stored locally - return empty
      return [] as WorkflowLog[];
    },
    enabled: !!proposalId,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const apiData = await fetchProposalsList(1000, 0).catch(() => ({ proposals: [], total: 0 } as any));

      const proposals = (apiData.proposals || []).map((p: any) => mapApiProposal(p));

      const stats = {
        total: proposals.length,
        submitted: proposals.filter(p => p.status === 'submitted').length,
        under_review: proposals.filter(p => p.status === 'under_review').length,
        approved: proposals.filter(p => p.status === 'approved').length,
        finalised: proposals.filter(p => p.status === 'finalised').length,
        rejected: proposals.filter(p => p.status === 'rejected').length,
        locked: proposals.filter(p => p.status === 'locked').length,
      };

      return stats;
    },
  });
};
