import { useMutation, useQueryClient } from '@tanstack/react-query';
import { statusApi, assignmentsApi, proposalApi, reassignApi } from '@/lib/proposalsApi';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useProposalActions = (ticketNumber: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) => 
      statusApi.update(ticketNumber!, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', ticketNumber] });
      toast({
        title: 'Status Updated',
        description: 'The proposal status has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (reviewerEmails: string[]) => {
      await assignmentsApi.assign(ticketNumber!, { reviewer_emails: reviewerEmails });
      // Persist assigned reviewer emails locally so they survive page refresh
      if (ticketNumber) {
        await (supabase.from('proposals') as any)
          .update({ assigned_reviewer_emails: reviewerEmails })
          .eq('ticket_number', ticketNumber);
      }
    },
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
    mutationFn: async () => {
      await assignmentsApi.unassign(ticketNumber!);
      // Clear local assigned reviewer emails
      if (ticketNumber) {
        await (supabase.from('proposals') as any)
          .update({ assigned_reviewer_emails: [] })
          .eq('ticket_number', ticketNumber);
      }
    },
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

  const reassignMutation = useMutation({
    mutationFn: ({ fromEmail, toEmail }: { fromEmail: string; toEmail: string }) =>
      reassignApi.reassign(ticketNumber!, { from_reviewer_email: fromEmail, to_reviewer_email: toEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', ticketNumber] });
      toast({
        title: 'Proposal Reassigned',
        description: 'The proposal has been reassigned to the new reviewer.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reassign proposal',
        variant: 'destructive',
      });
    },
  });

  return {
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    assignReviewers: assignMutation.mutate,
    isAssigning: assignMutation.isPending,
    unassignReviewers: unassignMutation.mutateAsync,
    isUnassigning: unassignMutation.isPending,
    deleteProposal: deleteProposalMutation.mutate,
    isDeleting: deleteProposalMutation.isPending,
    reassignProposal: reassignMutation.mutate,
    reassignProposalAsync: reassignMutation.mutateAsync,
    isReassigning: reassignMutation.isPending,
  };
};