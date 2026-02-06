import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Proposal, ProposalStatus, ReviewerComment, WorkflowLog, ApiProposal, ApiProposalDetail, ApiProposalsResponse, ApiProposalStatus } from '@/types';
import { toast } from '@/hooks/use-toast';

interface UseProposalsOptions {
  page?: number;
  limit?: number;
  search?: string;
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

// Map API proposal to internal Proposal structure (list view - basic)
const mapApiProposal = (apiProposal: ApiProposal, localOverride?: any): Proposal => ({
  id: localOverride?.id || apiProposal.ticket_number,
  name: apiProposal.title,
  author_name: apiProposal.corresponding_author,
  author_email: apiProposal.email,
  author_phone: null,
  description: null,
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
});

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
    // Extended fields from API
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

// Helper function to fetch proposals list from edge function proxy
const fetchProposalsFromProxy = async (limit: number, offset: number): Promise<ApiProposalsResponse> => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposals-proxy?limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch proposals');
  }

  return response.json();
};

// Helper function to fetch single proposal by ticket number (returns full detail)
const fetchProposalByTicket = async (ticketNumber: string): Promise<ApiProposalDetail> => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposals-proxy?ticket=${ticketNumber}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch proposal');
  }

  return response.json();
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
  // Check if we already have a local record for this ticket
  // Using raw filter to avoid type issues with new ticket_number column
  const { data: existing } = await (supabase
    .from('proposals')
    .select('*')
    .eq('ticket_number', apiProposal.ticket_number)
    .maybeSingle() as any);

  if (existing) {
    return existing.id;
  }

  // Create a new local record synced from API
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

// Get local override data for a ticket number
const getLocalOverride = async (ticketNumber: string) => {
  const { data } = await (supabase
    .from('proposals')
    .select('*')
    .eq('ticket_number', ticketNumber)
    .maybeSingle() as any);
  return data;
};

export const useProposals = (options: UseProposalsOptions = {}) => {
  const { page = 1, limit = 10, search = '', status = 'all' } = options;

  return useQuery({
    queryKey: ['proposals', page, limit, search, status],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      // Fetch proposals only from external API
      const apiData = await fetchProposalsFromProxy(limit, offset).catch(() => ({ proposals: [], total: 0 }));

      // Fetch all local overrides for these proposals
      const ticketNumbers = apiData.proposals.map(p => p.ticket_number);
      const { data: localOverrides } = await supabase
        .from('proposals')
        .select('*')
        .in('ticket_number', ticketNumbers);
      
      // Create a map of ticket_number -> local override
      const overrideMap = new Map(
        (localOverrides || []).map(o => [o.ticket_number, o])
      );

      // Map API proposals with local overrides
      let proposals = apiData.proposals.map(apiProposal => {
        const localOverride = overrideMap.get(apiProposal.ticket_number);
        return mapApiProposal(apiProposal, localOverride);
      });

      // Client-side filtering for search
      if (search) {
        const searchLower = search.toLowerCase();
        proposals = proposals.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.author_name.toLowerCase().includes(searchLower) ||
          p.author_email.toLowerCase().includes(searchLower)
        );
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
    staleTime: 0, // Always refetch to get latest local status
  });
};

export const useProposal = (id: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      // Check if ID is a UUID (local database proposal)
      if (isUUID(id)) {
        // Fetch from local Supabase database
        return fetchLocalProposal(id);
      } else {
        // Fetch from external API - no local sync required for viewing
        try {
          const apiProposal = await fetchProposalByTicket(id);

          // Get local override data if it exists (status, contract_sent, etc.)
          const localOverride = await getLocalOverride(id);
          
          // Merge data - local status takes priority if it exists
          const mapped = mapApiProposalDetail(apiProposal, localOverride);
          
          // Return merged data - use local ID if exists, otherwise use ticket number
          return {
            ...mapped,
            // Ensure local status overrides API status when local record exists
            status: localOverride?.status || mapped.status,
            id: localOverride?.id || id, // Use local UUID if synced, otherwise ticket number
          };
        } catch (e) {
          // Detail endpoint failed - try to use cached list data as fallback
          const cachedListData = queryClient.getQueriesData<{
            data: Proposal[];
          }>({ queryKey: ['proposals'] });

          // Search for this proposal in cached list data
          for (const [, queryData] of cachedListData) {
            if (queryData?.data) {
              const cachedProposal = queryData.data.find(
                (p) => p.ticket_number === id || p.id === id
              );
              if (cachedProposal) {
                // Return basic info from list with a flag indicating partial data
                const localOverride = await getLocalOverride(id);
                return {
                  ...cachedProposal,
                  ...(localOverride || {}),
                  status: localOverride?.status || cachedProposal.status,
                  id: localOverride?.id || id,
                  _isPartialData: true, // Flag to indicate this is fallback data
                  _detailFetchError: true,
                };
              }
            }
          }

          // If the user landed directly on the details route (no cached list),
          // fetch the list endpoint once and extract the matching proposal.
          try {
            const apiList = await fetchProposalsFromProxy(1000, 0);
            const found = apiList.proposals?.find((p) => p.ticket_number === id);
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
            // ignore and fall through to throwing original error
          }

          // No cached data available - throw original error
          const message = e instanceof Error ? e.message : 'Failed to fetch proposal details';
          throw new Error(message);
        }
      }
    },
    enabled: !!id,
    retry: false,
    staleTime: 0, // Always refetch to get latest local status
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
    }: { 
      id: string; 
      status: ProposalStatus; 
      previousStatus: ProposalStatus;
      ticketNumber?: string;
      proposalData?: Partial<Proposal>;
    }) => {
      // Get auth token
      const token = localStorage.getItem('auth_token');
      
      const lookupTicket = ticketNumber || proposalData?.ticket_number || id;
      
      // Use edge function to bypass RLS (since we use external API auth)
      // Always pass ticketNumber - never pass ticket number string as 'id' (which expects UUID)
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
      
      // Invalidate all proposals list queries
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      
      // Invalidate the specific proposal query by ticket number
      queryClient.invalidateQueries({ queryKey: ['proposal', lookupTicket] });
      
      // Also invalidate by local ID if we have one
      if (data?.localId) {
        queryClient.invalidateQueries({ queryKey: ['proposal', data.localId] });
      }
      
      // Force refetch the current proposal to get updated local status
      queryClient.refetchQueries({ queryKey: ['proposal', lookupTicket] });
      
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

export const useProposalComments = (proposalId: string) => {
  return useQuery({
    queryKey: ['proposal-comments', proposalId],
    queryFn: async () => {
      // Only query comments for local proposals (UUIDs)
      if (!isUUID(proposalId)) {
        return [] as ReviewerComment[];
      }

      const { data, error } = await supabase
        .from('reviewer_comments')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReviewerComment[];
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
    }: {
      proposalId: string;
      commentText?: string;
      reviewFormData?: Record<string, any>;
      duplicateOf?: string;
     ticketNumber?: string;
   }) => {
     let localProposalId = proposalId;
     
     // If the proposal ID is not a UUID (it's a ticket number), we need to ensure a local record exists
     if (!isUUID(proposalId)) {
       // Fetch the full proposal from API to create local record
       const apiProposal = await fetchProposalByTicket(proposalId);
       localProposalId = await ensureLocalProposal(apiProposal);
     }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('reviewer_comments')
        .insert({
         proposal_id: localProposalId,
          reviewer_id: user.id,
          comment_text: commentText,
          review_form_data: reviewFormData || {},
          is_duplicate_of: duplicateOf,
        });

      if (error) throw error;
     
     return { localProposalId };
    },
   onSuccess: (data) => {
     if (data?.localProposalId) {
       queryClient.invalidateQueries({ queryKey: ['proposal-comments', data.localProposalId] });
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
      // Only query workflow logs for local proposals (UUIDs)
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
      // Fetch proposals only from external API
      const apiData = await fetchProposalsFromProxy(1000, 0).catch(() => ({ proposals: [], total: 0 }));

      const proposals = apiData.proposals.map(mapApiProposal);

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
