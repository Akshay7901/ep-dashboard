import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProposalCard from '@/components/proposals/ProposalCard';
import ProposalTable from '@/components/proposals/ProposalTable';
import Pagination from '@/components/proposals/Pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Proposal } from '@/types';
import { Search, LayoutGrid, List, Loader2 } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import { toast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 6;

const Proposals: React.FC = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await mockApi.getProposals({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchQuery,
      });
      setProposals(response.data);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to fetch proposals',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleProposalClick = (id: string) => {
    navigate(`/proposals/${id}`);
  };

  // Reset to page 1 when search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title="Proposals">
      <div className="space-y-6">
        {/* Header with search and view toggle */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search proposals..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && proposals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No proposals found.</p>
          </div>
        )}

        {/* Proposals list */}
        {!isLoading && proposals.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {proposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onClick={handleProposalClick}
                  />
                ))}
              </div>
            ) : (
              <ProposalTable
                proposals={proposals}
                onRowClick={handleProposalClick}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Proposals;
