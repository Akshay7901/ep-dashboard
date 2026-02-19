import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { extractCountry } from '@/lib/extractCountry';
import { Proposal, ProposalStatus, ReviewerComment, WorkflowLog, ApiProposal, ApiProposalDetail, ApiProposalsResponse, ApiProposalStatus } from '@/types';
import { toast } from '@/hooks/use-toast';
import { statusApi } from '@/lib/proposalsApi';

interface UseProposalsOptions {
  page?: number;
  limit?: number;
  search?: string;
  searchCategory?: string;
  status?: ProposalStatus | 'all';
}

// Helper to check if string is a valid UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Map API status to internal status
const mapApiStatus = (apiStatus: ApiProposalStatus): ProposalStatus => {
  const statusMap: Record<ApiProposalStatus, ProposalStatus> = {
    'new': 'submitted',
    'under_review': 'under_review',
    'approved': 'approved',
    'rejected': 'rejected',
    'published': 'finalised',
  };
  return statusMap[apiStatus] || 'submitted';
};

// Reverse map: internal status -> API status
const mapToApiStatus = (status: ProposalStatus): string => {
  const reverseMap: Record<ProposalStatus, string> = {
    'submitted': 'new',
    'under_review': 'under_review',
    'approved': 'approved',
    'rejected': 'rejected',
    'finalised': 'published',
    'locked': 'locked',
  };
  return reverseMap[status] || status;
};

// Extract earliest assigned_at from assigned_reviewers array
const extractAssignedAt = (assignedReviewers: any): string | null => {
  if (!Array.isArray(assignedReviewers) || assignedReviewers.length === 0) return null;
  const dates = assignedReviewers
    .map((r: any) => r.assigned_at)
    .filter(Boolean);
  if (dates.length === 0) return null;
  return dates.sort()[0];
};

// Map API proposal to internal Proposal structure (list view - basic)
const mapApiProposal = (apiProposal: any): Proposal => {
  const reviewers = extractAssignedReviewers(apiProposal);
  return {
    id: apiProposal.ticket_number,
    name: apiProposal.title,
    author_name: apiProposal.corresponding_author,
    author_email: apiProposal.email,
    author_phone: null,
    description: null,
    status: mapApiStatus(apiProposal.status),
    value: null,
    contract_sent: false,
    contract_sent_at: null,
    finalised_at: null,
    finalised_by: null,
    created_at: apiProposal.submitted_at,
    updated_at: apiProposal.submitted_at,
    ticket_number: apiProposal.ticket_number,
    current_revision: apiProposal.current_revision,
    address: apiProposal.address || null,
    assigned_at: extractAssignedAt(reviewers),
    assigned_reviewers: reviewers,
  };
};

// Extract assigned reviewers from any possible field name the API might use
const extractAssignedReviewers = (apiProposal: any): any[] | null => {
  // Try assignments (detail API format: { reviewer_email, assigned_at })
  if (Array.isArray(apiProposal?.assignments) && apiProposal.assignments.length > 0) {
    return apiProposal.assignments.map((a: any) => ({
      email: a.reviewer_email || a.email,
      assigned_at: a.assigned_at,
    }));
  }
  // Try assigned_reviewers (array of objects with email)
  if (Array.isArray(apiProposal?.assigned_reviewers) && apiProposal.assigned_reviewers.length > 0) {
    return apiProposal.assigned_reviewers;
  }
  // Try assigned_reviewer_emails (array of email strings)
  if (Array.isArray(apiProposal?.assigned_reviewer_emails) && apiProposal.assigned_reviewer_emails.length > 0) {
    return apiProposal.assigned_reviewer_emails.map((email: string) => 
      typeof email === 'string' ? { email } : email
    );
  }
  // Try reviewers (alternative field name)
  if (Array.isArray(apiProposal?.reviewers) && apiProposal.reviewers.length > 0) {
    return apiProposal.reviewers.map((r: any) => 
      typeof r === 'string' ? { email: r } : r
    );
  }
  return null;
};

// Map API proposal detail to internal Proposal structure (detail view - full)
const mapApiProposalDetail = (apiProposal: ApiProposalDetail): Proposal => {
  const currentData = apiProposal.current_data || {};
  return {
    id: apiProposal.ticket_number,
    name: currentData.main_title || apiProposal.title,
    author_name: currentData.corresponding_author_name || apiProposal.corresponding_author,
    author_email: currentData.email || apiProposal.email,
    author_phone: null,
    description: currentData.detailed_description || currentData.short_description || null,
    status: mapApiStatus(apiProposal.status),
    value: null,
    contract_sent: false,
    contract_sent_at: null,
    finalised_at: null,
    finalised_by: null,
    created_at: apiProposal.submitted_at,
    updated_at: apiProposal.submitted_at,
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
    assigned_at: extractAssignedAt(extractAssignedReviewers(apiProposal)),
    assigned_reviewers: extractAssignedReviewers(apiProposal),
  };
};

// Helper function to fetch proposals list directly from API
const fetchProposalsList = async (limit: number, offset: number): Promise<ApiProposalsResponse> => {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');

  const { data } = await api.get(`/api/proposals?limit=${limit}&offset=${offset}`);

  // Check for 401 in response
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
      const apiData = await fetchProposalsList(limit, offset).catch(() => ({ proposals: [], total: 0 }));

      // Map API proposals directly — no local overrides
      let proposals = (apiData.proposals || []).map((apiProposal: any) => {
        const mapped = mapApiProposal(apiProposal);
        // Attach assigned_reviewer_emails from API assigned_reviewers for peer reviewer filtering
        if (mapped.assigned_reviewers) {
          (mapped as any).assigned_reviewer_emails = mapped.assigned_reviewers.map((r: any) => r.email || r);
        }
        return mapped;
      });

      // Client-side filtering for search — strict by selected category
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
      let ticketNumber = id;

      // If ID is a UUID, find the ticket_number from cache
      if (isUUID(id)) {
        const cachedListData = queryClient.getQueriesData<{
          data: Proposal[];
        }>({ queryKey: ['proposals'] });

        for (const [, queryData] of cachedListData) {
          if (queryData?.data) {
            const cachedProposal = queryData.data.find((p) => p.id === id || p.ticket_number === id);
            if (cachedProposal?.ticket_number) {
              ticketNumber = cachedProposal.ticket_number;
              break;
            }
          }
        }
      }

      // Fetch from external API directly
      try {
        const apiProposal: any = await fetchProposalByTicket(ticketNumber);
        const mapped = mapApiProposalDetail(apiProposal);

        // Get assigned_reviewers from detail, or extract from raw API response, or cached list, or fresh list fetch
        let assignedReviewers = mapped.assigned_reviewers || extractAssignedReviewers(apiProposal);
        if (!assignedReviewers) {
          // Try cache first
          const cachedListData = queryClient.getQueriesData<{ data: Proposal[] }>({ queryKey: ['proposals'] });
          for (const [, queryData] of cachedListData) {
            const cached = queryData?.data?.find(p => p.ticket_number === ticketNumber);
            if (cached?.assigned_reviewers) {
              assignedReviewers = cached.assigned_reviewers;
              break;
            }
          }
        }
        if (!assignedReviewers) {
          // Cache miss (e.g. page reload) — fetch from list API
          try {
            const listData = await fetchProposalsList(1000, 0);
            const listItem: any = (listData.proposals || []).find((p: any) => p.ticket_number === ticketNumber);
            assignedReviewers = extractAssignedReviewers(listItem);
          } catch {
            // ignore
          }
        }

        // Derive assigned_reviewer_emails from assigned_reviewers
        const assignedReviewerEmails = assignedReviewers
          ? assignedReviewers.map((r: any) => r.email || r)
          : null;

        return {
          ...mapped,
          assigned_reviewers: assignedReviewers,
          assigned_reviewer_emails: assignedReviewerEmails,
        };
      } catch (e) {
        // Detail endpoint failed - try cached list data
        const cachedListData = queryClient.getQueriesData<{
          data: Proposal[];
        }>({ queryKey: ['proposals'] });

        for (const [, queryData] of cachedListData) {
          if (queryData?.data) {
            const cachedProposal = queryData.data.find(
              (p) => p.ticket_number === id || p.id === id
            );
            if (cachedProposal) {
              return {
                ...cachedProposal,
                _isPartialData: true,
                _detailFetchError: true,
              };
            }
          }
        }

        // If no cached list, fetch list and find
        try {
          const apiList = await fetchProposalsList(1000, 0);
          const found = apiList.proposals?.find((p: any) => p.ticket_number === id);
          if (found) {
            const mapped = mapApiProposal(found);
            return {
              ...mapped,
              _isPartialData: true,
              _detailFetchError: true,
            };
          }
        } catch {
          // ignore
        }

        const message = e instanceof Error ? e.message : 'Failed to fetch proposal details';
        throw new Error(message);
      }
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
      
      // Update status via external API directly
      const apiStatus = mapToApiStatus(status);
      await statusApi.update(lookupTicket, { status: apiStatus, notes: `Status changed from ${previousStatus} to ${status}` });

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

        // Detect serialized review form data in comment text
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
        }
        // Detect old-style submitted comments
        else if (rawText.startsWith('[Peer Review Submitted]')) {
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

      // If we have structured review form data, serialize it into comment_text
      let finalCommentText = commentText || '';
      if (reviewFormData && Object.keys(reviewFormData).length > 0) {
        finalCommentText = REVIEW_DATA_MARKER + JSON.stringify(reviewFormData);
      }

      // Post comment to external API
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
      // Workflow logs were stored locally — no longer available without local DB
      // Return empty array; consider adding a /logs endpoint to the API
      return [] as WorkflowLog[];
    },
    enabled: !!proposalId,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const apiData = await fetchProposalsList(1000, 0).catch(() => ({ proposals: [], total: 0 }));

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
