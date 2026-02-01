import React from 'react';
import { Proposal } from '@/types';
import ProposalStatusBadge from './ProposalStatusBadge';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProposalTableProps {
  proposals: Proposal[];
  onRowClick: (id: string) => void;
}

const ProposalTable: React.FC<ProposalTableProps> = ({ proposals, onRowClick }) => {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Proposal Name</TableHead>
            <TableHead className="font-semibold">Client</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((proposal) => (
            <TableRow
              key={proposal.id}
              onClick={() => onRowClick(proposal.id)}
              className="table-row-hover"
            >
              <TableCell className="font-medium text-foreground">
                {proposal.name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {proposal.client}
              </TableCell>
              <TableCell>
                <ProposalStatusBadge status={proposal.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(proposal.createdAt), 'MMM d, yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProposalTable;
