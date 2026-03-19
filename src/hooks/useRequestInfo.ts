import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestInfoApi, InfoRequestItem } from '@/lib/proposalsApi';
import { useToast } from '@/hooks/use-toast';

export const useRequestInfo = (ticketNumber: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: infoRequests = [], isLoading, refetch } = useQuery({
    queryKey: ['info-requests', ticketNumber],
    queryFn: () => requestInfoApi.getHistory(ticketNumber),
    enabled: !!ticketNumber,
    staleTime: 0,
    refetchInterval: 15000,
  });

  const pendingRequest = infoRequests.find((r) => r.status === 'pending' || r.status === 'open');

  const sendRequest = useMutation({
    mutationFn: (payload: { items: InfoRequestItem[]; note?: string }) =>
      requestInfoApi.request(ticketNumber, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['info-requests', ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ['proposal', ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Information Requested', description: 'The author has been notified.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error?.message || 'Failed to send request',
        variant: 'destructive',
      });
    },
  });

  const respondToRequest = useMutation({
    mutationFn: (payload: { request_id: number; response_note: string; updated_fields: Record<string, string> }) =>
      requestInfoApi.respond(ticketNumber, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['info-requests', ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ['proposal', ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Response Submitted', description: 'Your response has been sent to the editorial team.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error?.message || 'Failed to submit response',
        variant: 'destructive',
      });
    },
  });

  return {
    infoRequests,
    pendingRequest,
    isLoading,
    refetch,
    sendRequest,
    respondToRequest,
  };
};
