import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractQueriesApi, ContractQuery } from '@/lib/proposalsApi';
import { toast } from '@/hooks/use-toast';

export const useContractQueries = (ticketNumber: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['contract-queries', ticketNumber];

  const { data: queries = [], isLoading, refetch } = useQuery<ContractQuery[]>({
    queryKey,
    queryFn: () => contractQueriesApi.list(ticketNumber),
    enabled: !!ticketNumber,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['proposal', ticketNumber] });
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  const raiseQuery = useMutation({
    mutationFn: (queryText: string) => contractQueriesApi.raise(ticketNumber, queryText),
    onSuccess: () => {
      toast({ title: 'Query sent', description: 'Your query has been submitted successfully.' });
      refreshAll();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to send query', variant: 'destructive' });
    },
  });

  const respondToQuery = useMutation({
    mutationFn: (responseText: string) => contractQueriesApi.respond(ticketNumber, responseText),
    onSuccess: () => {
      toast({ title: 'Response sent', description: 'Your response has been sent to the author.' });
      refreshAll();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to send response', variant: 'destructive' });
    },
  });

  return {
    queries,
    isLoading,
    refetch,
    raiseQuery,
    respondToQuery,
  };
};
