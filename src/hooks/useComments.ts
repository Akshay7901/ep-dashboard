 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { commentsApi, ProposalComment } from '@/lib/proposalsApi';
 import { useToast } from '@/hooks/use-toast';
 
 export const useComments = (ticketNumber: string | undefined) => {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   const commentsQuery = useQuery({
     queryKey: ['comments', ticketNumber],
     queryFn: () => commentsApi.list(ticketNumber!),
     enabled: !!ticketNumber,
     staleTime: 30000,
   });
 
   const addCommentMutation = useMutation({
     mutationFn: ({ comment }: { comment: string }) => 
       commentsApi.add(ticketNumber!, { comment }),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['comments', ticketNumber] });
       toast({
         title: 'Comment Added',
         description: 'Your comment has been added successfully.',
       });
     },
     onError: (error: Error) => {
       toast({
         title: 'Error',
         description: error.message || 'Failed to add comment',
         variant: 'destructive',
       });
     },
   });
 
   return {
     comments: commentsQuery.data || [],
     isLoading: commentsQuery.isLoading,
     error: commentsQuery.error,
     addComment: addCommentMutation.mutate,
     isAddingComment: addCommentMutation.isPending,
   };
 };