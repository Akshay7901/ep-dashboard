 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { peerReviewersApi, PeerReviewer } from '@/lib/proposalsApi';
 import { useToast } from '@/hooks/use-toast';
 
 export const usePeerReviewers = () => {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   const reviewersQuery = useQuery({
     queryKey: ['peer-reviewers'],
     queryFn: peerReviewersApi.list,
     staleTime: 60000,
   });
 
   const createMutation = useMutation({
     mutationFn: (reviewer: { email: string; name: string }) => 
       peerReviewersApi.create(reviewer),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['peer-reviewers'] });
       toast({
         title: 'Peer Reviewer Created',
         description: 'The peer reviewer has been added successfully.',
       });
     },
     onError: (error: Error) => {
       toast({
         title: 'Error',
         description: error.message || 'Failed to create peer reviewer',
         variant: 'destructive',
       });
     },
   });
 
  const deleteMutation = useMutation({
    mutationFn: (reviewerId: string) => peerReviewersApi.delete(reviewerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-reviewers'] });
      toast({
        title: 'Peer Reviewer Deleted',
        description: 'The peer reviewer has been removed.',
      });
    },
    onError: (error: any) => {
      // Check if this is a 409 conflict due to active assignments
      const errorMessage = error?.message || '';
      const errorData = error?.upstream || error;
      
      // Try to parse the upstream body if available
      let assignedProposals: Array<{ title: string; ticket_number: string }> = [];
      let reviewerName = '';
      
      try {
        if (typeof errorData?.body === 'string') {
          const parsed = JSON.parse(errorData.body);
          assignedProposals = parsed.assigned_proposals || [];
          reviewerName = parsed.reviewer?.name || '';
        } else if (errorData?.assigned_proposals) {
          assignedProposals = errorData.assigned_proposals;
          reviewerName = errorData.reviewer?.name || '';
        }
      } catch {
        // Ignore parsing errors
      }

      if (assignedProposals.length > 0) {
        const proposalList = assignedProposals
          .map(p => `"${p.title}" (${p.ticket_number})`)
          .join(', ');
        
        toast({
          title: 'Cannot Delete Reviewer',
          description: `${reviewerName || 'This reviewer'} has ${assignedProposals.length} active assignment(s): ${proposalList}. Please re-assign these proposals first.`,
          variant: 'destructive',
        });
      } else if (errorMessage.includes('409') || errorMessage.includes('active assignments')) {
        toast({
          title: 'Cannot Delete Reviewer',
          description: 'This reviewer has active proposal assignments. Please re-assign them first.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete peer reviewer',
          variant: 'destructive',
        });
      }
    },
  });
 
   return {
   reviewers: Array.isArray(reviewersQuery.data) ? reviewersQuery.data : [],
     isLoading: reviewersQuery.isLoading,
     error: reviewersQuery.error,
     createReviewer: createMutation.mutate,
     isCreating: createMutation.isPending,
     deleteReviewer: deleteMutation.mutate,
     isDeleting: deleteMutation.isPending,
   };
 };