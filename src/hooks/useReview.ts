import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/proposalsApi';
import { toast } from '@/hooks/use-toast';

export const useReview = (ticketNumber: string | undefined) => {
  const queryClient = useQueryClient();

  const reviewQuery = useQuery({
    queryKey: ['review', ticketNumber],
    queryFn: async () => {
      const result = await reviewsApi.get(ticketNumber!);
      return result;
    },
    enabled: !!ticketNumber,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });

  const saveDraftMutation = useMutation({
    mutationFn: (reviewData: Record<string, any>) =>
      reviewsApi.saveDraft(ticketNumber!, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', ticketNumber] });
      toast({
        title: 'Draft Saved',
        description: 'Your review draft has been saved.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save draft.',
      });
    },
  });

  // Quiet version: saves draft without invalidating queries (used by diff checker)
  const saveDraftQuietMutation = useMutation({
    mutationFn: (reviewData: Record<string, any>) =>
      reviewsApi.saveDraft(ticketNumber!, reviewData),
    onSuccess: () => {
      toast({
        title: 'Draft Saved',
        description: 'Your review draft has been saved.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save draft.',
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (reviewData: Record<string, any>) =>
      reviewsApi.submit(ticketNumber!, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal'] });
      toast({
        title: 'Review Submitted',
        description: 'Your peer review has been submitted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit review.',
      });
    },
  });

  return {
    review: reviewQuery.data,
    isLoading: reviewQuery.isLoading,
    error: reviewQuery.error,
    refetchReview: reviewQuery.refetch,
    saveDraft: saveDraftMutation.mutateAsync,
    isSavingDraft: saveDraftMutation.isPending,
    submitReview: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
};
