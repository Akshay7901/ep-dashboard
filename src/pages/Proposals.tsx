import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProposalStatusBadge from '@/components/proposals/ProposalStatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProposalStatus } from '@/types';
import { Search, LayoutGrid, List, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProposals } from '@/hooks/useProposals';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
const ITEMS_PER_PAGE = 10;
const statusOptions: {
  value: ProposalStatus | 'all';
  label: string;
}[] = [{
  value: 'all',
  label: 'All Status'
}, {
  value: 'submitted',
  label: 'Submitted'
}, {
  value: 'under_review',
  label: 'Under Review'
}, {
  value: 'approved',
  label: 'Approved'
}, {
  value: 'finalised',
  label: 'Finalised'
}, {
  value: 'rejected',
  label: 'Rejected'
}, {
  value: 'locked',
  label: 'Locked'
}];
const Proposals: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAnyReviewer,
    profile
  } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const {
    data,
    isLoading,
    error
  } = useProposals({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchQuery,
    status: statusFilter
  });
  const handleProposalClick = (id: string) => {
    navigate(`/proposals/${id}`);
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as ProposalStatus | 'all');
    setCurrentPage(1);
  };
  if (!isAnyReviewer) {
    return <DashboardLayout title="Proposals">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              You don't have permission to view proposals.
              <br />
              Please contact an administrator to assign you a reviewer role.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>;
  }
  return <DashboardLayout title="Proposals">
      <div className="space-y-6">
        {/* Header with role indicator */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Book Proposals</h1>
            
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search proposals..." value={searchQuery} onChange={handleSearchChange} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-8">
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8">
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>}

        {/* Error state */}
        {error && <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Error loading proposals. Please try again.</p>
            </CardContent>
          </Card>}

        {/* Empty state */}
        {!isLoading && !error && data?.data.length === 0 && <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No proposals found.</p>
            </CardContent>
          </Card>}

        {/* Proposals list */}
        {!isLoading && !error && data && data.data.length > 0 && <>
            {viewMode === 'table' ? <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proposal Name</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map(proposal => <TableRow key={proposal.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleProposalClick(proposal.id)}>
                        <TableCell className="font-medium">{proposal.name}</TableCell>
                        <TableCell>{proposal.author_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {proposal.author_email}
                        </TableCell>
                        <TableCell>
                          <ProposalStatusBadge status={proposal.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.data.map(proposal => <Card key={proposal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleProposalClick(proposal.id)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-foreground line-clamp-2">
                          {proposal.name}
                        </h3>
                        <ProposalStatusBadge status={proposal.status} showIcon={false} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {proposal.author_name}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {proposal.author_email}
                      </p>
                      {proposal.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {proposal.description}
                        </p>}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(proposal.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}

            {/* Pagination */}
            {data.totalPages > 1 && <div className="flex items-center justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {data.totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))} disabled={currentPage === data.totalPages}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>}
          </>}
      </div>
    </DashboardLayout>;
};
export default Proposals;