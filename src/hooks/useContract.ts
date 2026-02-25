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

  // Flexibly parse contract data from various API response shapes
  const rawData = query.data;
  let contracts: ContractDetails[] = [];
  if (rawData) {
    if (Array.isArray(rawData.contracts)) {
      contracts = rawData.contracts;
    } else if (Array.isArray(rawData.data)) {
      contracts = rawData.data;
    } else if (rawData.contract && typeof rawData.contract === 'object') {
      contracts = [rawData.contract];
    } else if (Array.isArray(rawData)) {
      contracts = rawData;
    } else if (rawData.id || rawData.status || rawData.contract_type) {
      // The response itself is a single contract object
      contracts = [rawData as ContractDetails];
    }
  }
  console.log('[useContract] raw:', rawData, '→ contracts:', contracts);
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
