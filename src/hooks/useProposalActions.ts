 import { useMutation, useQueryClient } from '@tanstack/react-query';
 import { statusApi, assignmentsApi, proposalApi } from '@/lib/proposalsApi';
 import { useToast } from '@/hooks/use-toast';
 
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
     mutationFn: (reviewerIds: string[]) => 
       assignmentsApi.assign(ticketNumber!, { reviewer_ids: reviewerIds }),
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
     updateStatus: updateStatusMutation.mutate,
     isUpdatingStatus: updateStatusMutation.isPending,
     assignReviewers: assignMutation.mutate,
     isAssigning: assignMutation.isPending,
     deleteProposal: deleteProposalMutation.mutate,
     isDeleting: deleteProposalMutation.isPending,
   };
 };