import React from 'react';
import { Proposal } from '@/types';
import ProposalStatusBadge from './ProposalStatusBadge';
import { format } from 'date-fns';
import { Calendar, User } from 'lucide-react';

interface ProposalCardProps {
  proposal: Proposal;
  onClick: (id: string) => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onClick }) => {
  return (
    <div
      onClick={() => onClick(proposal.id)}
      className="group bg-card rounded-lg border border-border p-5 cursor-pointer transition-all hover:shadow-card-hover hover:border-primary/20"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {proposal.name}
        </h3>
        <ProposalStatusBadge status={proposal.status} />
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {proposal.description}
      </p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          <span>{proposal.client}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(proposal.createdAt), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </div>
  );
};

export default ProposalCard;
