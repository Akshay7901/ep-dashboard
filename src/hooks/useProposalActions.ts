import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi, proposalApi } from '@/lib/proposalsApi';
import { useToast } from '@/hooks/use-toast';

export const useProposalActions = (ticketNumber: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const assignMutation = useMutation({
    mutationFn: ({ reviewerEmail, note }: { reviewerEmail: string; note?: string }) => 
      assignmentsApi.assign(ticketNumber!, { reviewer_email: reviewerEmail, ...(note ? { note } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', ticketNumber] });
      toast({
        title: 'Reviewers Assigned',
        description: 'The proposal has been assigned to the selected reviewers.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign reviewers',
        variant: 'destructive',
      });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: () => assignmentsApi.unassign(ticketNumber!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', ticketNumber] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unassign reviewers',
        variant: 'destructive',
      });
    },
  });

  const deleteProposalMutation = useMutation({
    mutationFn: () => proposalApi.delete(ticketNumber!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({
        title: 'Proposal Deleted',
        description: 'The proposal has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete proposal',
        variant: 'destructive',
      });
    },
  });

  return {
    assignReviewers: assignMutation.mutate as (params: { reviewerEmail: string; note?: string }, options?: any) => void,
    isAssigning: assignMutation.isPending,
    unassignReviewers: unassignMutation.mutateAsync,
    isUnassigning: unassignMutation.isPending,
    deleteProposal: deleteProposalMutation.mutate,
    isDeleting: deleteProposalMutation.isPending,
  };
};
