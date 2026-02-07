 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { peerReviewersApi, PeerReviewer } from '@/lib/proposalsApi';
 import { useToast } from '@/hooks/use-toast';
 
 export const usePeerReviewers = () => {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
  const reviewersQuery = useQuery({
    queryKey: ['peer-reviewers'],
    queryFn: async () => {
      const result = await peerReviewersApi.list();
      // Handle graceful upstream errors (403/404 returned as 200 with error field)
      if (result && typeof result === 'object' && 'error' in result) {
        console.warn('Peer reviewers API returned error:', result);
        return []; // Return empty array on permission errors
      }
      return result;
    },
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
       // Parse 409 conflict errors for active assignments
       const upstream = error?.upstream?.body || error?.upstream;
       const assignmentCount = upstream?.total_assignments;
       
       if (assignmentCount) {
         toast({
           title: 'Cannot Delete Reviewer',
           description: `This reviewer has ${assignmentCount} active proposal assignment(s). Please expand the reviewer card and unassign all proposals first.`,
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