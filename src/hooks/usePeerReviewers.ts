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
     onError: (error: Error) => {
       toast({
         title: 'Error',
         description: error.message || 'Failed to delete peer reviewer',
         variant: 'destructive',
       });
     },
   });
 
   return {
     reviewers: reviewersQuery.data || [],
     isLoading: reviewersQuery.isLoading,
     error: reviewersQuery.error,
     createReviewer: createMutation.mutate,
     isCreating: createMutation.isPending,
     deleteReviewer: deleteMutation.mutate,
     isDeleting: deleteMutation.isPending,
   };
 };