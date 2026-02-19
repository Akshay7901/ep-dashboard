import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import api from '@/lib/api';
import { extractCountry } from '@/lib/extractCountry';
import { Proposal, ProposalStatus, ReviewerComment, WorkflowLog, ApiProposal, ApiProposalDetail, ApiProposalsResponse, ApiProposalStatus } from '@/types';
import { toast } from '@/hooks/use-toast';

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
const mapApiProposal = (apiProposal: any, localOverride?: any): Proposal => {
  const inferredStatus = localOverride?.status
    || mapApiStatus(apiProposal.status);

  return {
    id: localOverride?.id || apiProposal.ticket_number,
    name: apiProposal.title,
    author_name: apiProposal.corresponding_author,
    author_email: apiProposal.email,
    author_phone: null,
    description: null,
    status: inferredStatus,
    value: localOverride?.value || null,
    contract_sent: localOverride?.contract_sent || false,
    contract_sent_at: localOverride?.contract_sent_at || null,
    finalised_at: localOverride?.finalised_at || null,
    finalised_by: localOverride?.finalised_by || null,
    created_at: apiProposal.submitted_at,
    updated_at: localOverride?.updated_at || apiProposal.submitted_at,
    ticket_number: apiProposal.ticket_number,
    current_revision: apiProposal.current_revision,
    address: apiProposal.address || null,
    assigned_at: extractAssignedAt(apiProposal.assigned_reviewers) || (localOverride?.assigned_reviewer_emails?.length > 0 ? localOverride.updated_at : null),
    assigned_reviewers: (Array.isArray(apiProposal.assigned_reviewers) && apiProposal.assigned_reviewers.length > 0) ? apiProposal.assigned_reviewers : null,
  };
};

// Map API proposal detail to internal Proposal structure (detail view - full)
const mapApiProposalDetail = (apiProposal: ApiProposalDetail, localOverride?: any): Proposal => {
  const currentData = apiProposal.current_data || {};
  return {
    id: localOverride?.id || apiProposal.ticket_number,
    name: currentData.main_title || apiProposal.title,
    author_name: currentData.corresponding_author_name || apiProposal.corresponding_author,
    author_email: currentData.email || apiProposal.email,
    author_phone: null,
    description: currentData.detailed_description || currentData.short_description || null,
    status: localOverride?.status || mapApiStatus(apiProposal.status),
    value: localOverride?.value || null,
    contract_sent: localOverride?.contract_sent || false,
    contract_sent_at: localOverride?.contract_sent_at || null,
    finalised_at: localOverride?.finalised_at || null,
    finalised_by: localOverride?.finalised_by || null,
    created_at: apiProposal.submitted_at,
    updated_at: localOverride?.updated_at || apiProposal.submitted_at,
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
    assigned_at: extractAssignedAt((apiProposal as any).assigned_reviewers),
    assigned_reviewers: Array.isArray((apiProposal as any).assigned_reviewers) ? (apiProposal as any).assigned_reviewers : null,
  };
};

// Map local Supabase proposal to internal Proposal structure
const mapLocalProposal = (dbProposal: any): Proposal => ({
  id: dbProposal.id,
  name: dbProposal.name,
  author_name: dbProposal.author_name,
  author_email: dbProposal.author_email,
  author_phone: dbProposal.author_phone,
  description: dbProposal.description,
  status: dbProposal.status,
  value: dbProposal.value,
  contract_sent: dbProposal.contract_sent,
  contract_sent_at: dbProposal.contract_sent_at,
  finalised_at: dbProposal.finalised_at,
  finalised_by: dbProposal.finalised_by,
  created_at: dbProposal.created_at,
  updated_at: dbProposal.updated_at,
  ticket_number: dbProposal.ticket_number || null,
  current_revision: null,
  short_description: dbProposal.description,
  detailed_description: dbProposal.description,
});

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

// Helper function to fetch local proposal by UUID
const fetchLocalProposal = async (id: string): Promise<Proposal> => {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Proposal not found');

  return mapLocalProposal(data);
};

// Helper to find or create local record for API proposal
const ensureLocalProposal = async (apiProposal: ApiProposalDetail): Promise<string> => {
  const { data: existing } = await (supabase
    .from('proposals')
    .select('*')
    .eq('ticket_number', apiProposal.ticket_number)
    .maybeSingle() as any);

  if (existing) {
    return existing.id;
  }

  const currentData = apiProposal.current_data || {};
  const insertData = {
    name: currentData.main_title || apiProposal.title,
    author_name: currentData.corresponding_author_name || apiProposal.corresponding_author,
    author_email: currentData.email || apiProposal.email,
    description: currentData.short_description || null,
    status: mapApiStatus(apiProposal.status),
    ticket_number: apiProposal.ticket_number,
  };
  
  const { data: newRecord, error } = await (supabase
    .from('proposals')
    .insert(insertData)
    .select('id')
    .single() as any);

  if (error) throw error;
  return newRecord.id;
};

// Get local override data for a ticket number (via edge function to bypass RLS)
const getLocalOverride = async (ticketNumber: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('proposal-workflow', {
      body: { action: 'getOverride', ticketNumber },
    });
    if (error) {
      console.error('getLocalOverride error:', error);
      return null;
    }
    return data?.data || null;
  } catch {
    return null;
  }
};

// Get local overrides for multiple ticket numbers (via edge function to bypass RLS)
const getLocalOverrides = async (ticketNumbers: string[]): Promise<Map<string, any>> => {
  const map = new Map();
  if (ticketNumbers.length === 0) return map;

  try {
    const { data, error } = await supabase.functions.invoke('proposal-workflow', {
      body: { action: 'getOverrides', ticketNumbers },
    });
    if (error) {
      console.error('getLocalOverrides error:', error);
      return map;
    }
    for (const row of (data?.data || [])) {
      if (row.ticket_number) {
        map.set(row.ticket_number, row);
      }
    }
  } catch {
    // Fall through
  }

  return map;
};

export const useProposals = (options: UseProposalsOptions = {}) => {
  const { page = 1, limit = 10, search = '', searchCategory = 'author', status = 'all' } = options;

  return useQuery({
    queryKey: ['proposals', page, limit, search, searchCategory, status],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      // Fetch proposals directly from external API
      const apiData = await fetchProposalsList(limit, offset).catch(() => ({ proposals: [], total: 0 }));

      // Use list-level data only — no individual detail calls
      // Address and assigned_reviewers are available from list API or local overrides
      const detailsMap = new Map<string, any>();

      // Get local overrides from Supabase
      const ticketNumbers = (apiData.proposals || []).map((p: any) => p.ticket_number).filter(Boolean);
      const overrideMap = await getLocalOverrides(ticketNumbers);

      // Map API proposals with local overrides and detail data
      let proposals = (apiData.proposals || []).map((apiProposal: any) => {
        const localOverride = overrideMap.get(apiProposal.ticket_number) || null;
        
        // Use address and assigned_reviewers from list API data directly
        // (these fields come from the list endpoint already if available)
        
        // Override status from local
        if (localOverride) {
          apiProposal.status = localOverride.status;
        }

        const mapped = mapApiProposal(apiProposal, localOverride);
        // Attach local assigned_reviewer_emails for peer reviewer filtering
        if (localOverride?.assigned_reviewer_emails) {
          (mapped as any).assigned_reviewer_emails = localOverride.assigned_reviewer_emails;
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

      // If ID is a UUID, find the ticket_number
      if (isUUID(id)) {
        const cachedListData = queryClient.getQueriesData<{
          data: Proposal[];
        }>({ queryKey: ['proposals'] });

        for (const [, queryData] of cachedListData) {
          if (queryData?.data) {
            const cachedProposal = queryData.data.find((p) => p.id === id);
            if (cachedProposal?.ticket_number) {
              ticketNumber = cachedProposal.ticket_number;
              break;
            }
          }
        }

        // If still a UUID, fetch list to find it
        if (isUUID(ticketNumber)) {
          try {
            const apiList = await fetchProposalsList(1000, 0);
            // Need to also get local overrides to match by local ID
            const tns = (apiList.proposals || []).map((p: any) => p.ticket_number).filter(Boolean);
            const overrides = await getLocalOverrides(tns);
            
            const found = apiList.proposals?.find((p: any) => {
              const override = overrides.get(p.ticket_number);
              return override?.id === id;
            });
            if (found) {
              ticketNumber = found.ticket_number;
            }
          } catch {
            // Fall through
          }
        }
      }

      // Fetch from external API directly
      try {
        const apiProposal: any = await fetchProposalByTicket(ticketNumber);

        // Get local override from Supabase
        const localOverride = await getLocalOverride(ticketNumber);

        const mapped = mapApiProposalDetail(apiProposal, localOverride);

        // Try to get assigned_reviewers from cached list data (detail API doesn't return it)
        let assignedReviewers = mapped.assigned_reviewers;
        if (!assignedReviewers) {
          const cachedListData = queryClient.getQueriesData<{ data: Proposal[] }>({ queryKey: ['proposals'] });
          for (const [, queryData] of cachedListData) {
            const cached = queryData?.data?.find(p => p.ticket_number === ticketNumber);
            if (cached?.assigned_reviewers) {
              assignedReviewers = cached.assigned_reviewers;
              break;
            }
          }
        }

        // Fallback: use assigned_reviewer_emails from local override
        if (!assignedReviewers && localOverride?.assigned_reviewer_emails?.length > 0) {
          assignedReviewers = localOverride.assigned_reviewer_emails.map((email: string) => ({ email }));
        }

        // Derive assigned_at: prefer mapped value, then local override created_at (when assignment exists)
        const assignedAt = mapped.assigned_at
          || (localOverride?.assigned_reviewer_emails?.length > 0 ? localOverride.created_at : null);

        return {
          ...mapped,
          status: localOverride?.status || mapped.status,
          id: localOverride?.id || id,
          assigned_reviewers: assignedReviewers,
          assigned_reviewer_emails: localOverride?.assigned_reviewer_emails || null,
          assigned_at: assignedAt,
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
              const localOverride = await getLocalOverride(id);
              return {
                ...cachedProposal,
                ...(localOverride || {}),
                status: localOverride?.status || cachedProposal.status,
                id: localOverride?.id || id,
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
            const localOverride = await getLocalOverride(id);
            return {
              ...mapped,
              ...(localOverride || {}),
              status: localOverride?.status || mapped.status,
              id: localOverride?.id || id,
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
      const token = localStorage.getItem('auth_token');
      
      const lookupTicket = ticketNumber || proposalData?.ticket_number || id;
      
      const response = await supabase.functions.invoke('proposal-workflow', {
        body: {
          action: 'updateStatus',
          proposalData: proposalData ? {
            ...proposalData,
            ticket_number: lookupTicket,
          } : {
            ticket_number: lookupTicket,
          },
          status,
          previousStatus,
          ticketNumber: lookupTicket,
          assignedReviewerEmails,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update status');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return { 
        localId: response.data?.id,
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
            id: data.localId || oldData.id,
          };
        }
        return oldData;
      });
      
      if (data?.localId) {
        queryClient.setQueryData(['proposal', data.localId], (oldData: Proposal | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              status: data.newStatus,
            };
          }
          return oldData;
        });
      }
      
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
      if (!isUUID(proposalId)) {
        return [] as WorkflowLog[];
      }

      const { data, error } = await supabase
        .from('workflow_logs')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkflowLog[];
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
