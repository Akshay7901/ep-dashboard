import React from 'react';
import { ProposalStatus } from '@/types';
import { cn } from '@/lib/utils';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
}

const statusConfig: Record<ProposalStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-status-draft/10 text-status-draft',
  },
  pending: {
    label: 'Pending',
    className: 'bg-status-pending/10 text-status-pending',
  },
  approved: {
    label: 'Approved',
    className: 'bg-status-approved/10 text-status-approved',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-status-rejected/10 text-status-rejected',
  },
};

const ProposalStatusBadge: React.FC<ProposalStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <span className={cn('status-badge', config.className)}>
      {config.label}
    </span>
  );
};

export default ProposalStatusBadge;
