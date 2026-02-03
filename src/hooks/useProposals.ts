import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Proposal, ProposalStatus, ReviewerComment, WorkflowLog, ApiProposal, ApiProposalsResponse, ApiProposalStatus } from '@/types';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

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

// Map API proposal to internal Proposal structure
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

export const useProposals = (options: UseProposalsOptions = {}) => {
  const { page = 1, limit = 10, search = '', status = 'all' } = options;

  return useQuery({
    queryKey: ['proposals', page, limit, search, status],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      const response = await api.get<ApiProposalsResponse>('/api/proposals', {
        params: {
          limit,
          offset,
        },
      });

      let proposals = response.data.proposals.map(mapApiProposal);

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
        total: response.data.total,
        page,
        limit,
        totalPages: Math.ceil(response.data.total / limit),
      };
    },
  });
};

export const useProposal = (id: string) => {
  return useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      // Fetch from API and find by ticket_number
      const response = await api.get<ApiProposalsResponse>('/api/proposals', {
        params: { limit: 100 },
      });

      const apiProposal = response.data.proposals.find(p => p.ticket_number === id);
      if (!apiProposal) throw new Error('Proposal not found');

      return mapApiProposal(apiProposal);
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
      const response = await api.get<ApiProposalsResponse>('/api/proposals', {
        params: { limit: 1000 },
      });

      const proposals = response.data.proposals.map(mapApiProposal);

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
