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
const mapApiProposal = (apiProposal: ApiProposal): Proposal => ({
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
});

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
    // Extended fields
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
    // Additional submission fields
    cv_submitted: currentData.cv_submitted || null,
    sample_chapter_submitted: currentData.sample_chapter_submitted || null,
    toc_submitted: currentData.toc_submitted || null,
    permissions_required: currentData.permissions_required || null,
    permissions_docs_submitted: currentData.permissions_docs_submitted || null,
    figures_tables_count: currentData.figures_tables_count || null,
    under_review_elsewhere: currentData.under_review_elsewhere || null,
    submitted_date: currentData.submitted_date || null,
    submitted_time: currentData.submitted_time || null,
  };
};

// Helper function to fetch proposals list from edge function proxy
const fetchProposalsFromProxy = async (limit: number, offset: number): Promise<ApiProposalsResponse> => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposals-proxy?limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposals-proxy?ticket=${ticketNumber}`,
    {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch proposal');
  }

  return response.json();
};

export const useProposals = (options: UseProposalsOptions = {}) => {
  const { page = 1, limit = 10, search = '', status = 'all' } = options;

  return useQuery({
    queryKey: ['proposals', page, limit, search, status],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      const data = await fetchProposalsFromProxy(limit, offset);
      let proposals = data.proposals.map(mapApiProposal);

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
        total: data.total,
        page,
        limit,
        totalPages: Math.ceil(data.total / limit),
      };
    },
  });
};

export const useProposal = (id: string) => {
  return useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      // Fetch single proposal by ticket number directly (full details)
      const apiProposal = await fetchProposalByTicket(id);
      return mapApiProposalDetail(apiProposal);
    },
    enabled: !!id,
  });
};

export const useUpdateProposalStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      previousStatus 
    }: { 
      id: string; 
      status: ProposalStatus; 
      previousStatus: ProposalStatus;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update proposal status
      const { error: updateError } = await supabase
        .from('proposals')
        .update({ 
          status,
          ...(status === 'locked' ? { 
            finalised_at: new Date().toISOString(),
            finalised_by: user?.id 
          } : {})
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Log the workflow action
      const { error: logError } = await supabase
        .from('workflow_logs')
        .insert({
          proposal_id: id,
          user_id: user?.id,
          action: `Status changed from ${previousStatus} to ${status}`,
          previous_status: previousStatus,
          new_status: status,
        });

      if (logError) console.error('Error logging workflow:', logError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal'] });
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
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('reviewer_comments')
        .insert({
          proposal_id: proposalId,
          reviewer_id: user.id,
          comment_text: commentText,
          review_form_data: reviewFormData || {},
          is_duplicate_of: duplicateOf,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-comments', variables.proposalId] });
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
      const data = await fetchProposalsFromProxy(1000, 0);
      const proposals = data.proposals.map(mapApiProposal);

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
