import { useQuery } from '@tanstack/react-query';
import { contractApi } from '@/lib/proposalsApi';

export interface ContractDetails {
  id: number;
  contract_version: number;
  contract_type: string;
  status: string;
  docusign_envelope_id?: string;
  docusign_status?: string;
  docusign_signing_url?: string;
  docusign_view_url?: string;
  docusign_sent_at?: string;
  docusign_completed_at?: string;
  docusign_declined_at?: string;
  docusign_decline_reason?: string;
  docusign_expires_at?: string;
  recipient_email?: string;
  recipient_name?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const useContract = (ticketNumber: string | undefined) => {
  const query = useQuery({
    queryKey: ['contract', ticketNumber],
    queryFn: async () => {
      const result = await contractApi.get(ticketNumber!);
      return result;
    },
    enabled: !!ticketNumber,
    staleTime: 0,
    refetchOnMount: 'always' as const,
    retry: false,
  });

  const contracts: ContractDetails[] = query.data?.contracts || [];
  const latestContract = contracts[0] || null;

  return {
    contractData: query.data,
    contracts,
    latestContract,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
