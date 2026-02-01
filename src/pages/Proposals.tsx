import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProposalCard from '@/components/proposals/ProposalCard';
import ProposalTable from '@/components/proposals/ProposalTable';
import Pagination from '@/components/proposals/Pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Proposal } from '@/types';
import { Search, LayoutGrid, List, Loader2 } from 'lucide-react';

// Mock data - replace with API call
const mockProposals: Proposal[] = [
  {
    id: '1',
    name: 'Website Redesign Proposal',
    client: 'Acme Corporation',
    status: 'approved',
    description: 'Complete redesign of corporate website with modern UI/UX principles and responsive design.',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Mobile App Development',
    client: 'TechStart Inc',
    status: 'pending',
    description: 'Development of iOS and Android mobile applications for customer engagement platform.',
    createdAt: '2025-01-20T14:30:00Z',
  },
  {
    id: '3',
    name: 'E-commerce Platform',
    client: 'RetailPlus',
    status: 'draft',
    description: 'Full-scale e-commerce solution with inventory management and payment integration.',
    createdAt: '2025-01-22T09:15:00Z',
  },
  {
    id: '4',
    name: 'Cloud Migration Services',
    client: 'DataFlow Systems',
    status: 'rejected',
    description: 'Migration of legacy infrastructure to AWS cloud with improved scalability.',
    createdAt: '2025-01-10T16:45:00Z',
  },
  {
    id: '5',
    name: 'CRM Integration Project',
    client: 'Sales Force Pro',
    status: 'approved',
    description: 'Integration of Salesforce CRM with existing business processes and workflows.',
    createdAt: '2025-01-18T11:20:00Z',
  },
  {
    id: '6',
    name: 'Security Audit & Compliance',
    client: 'FinanceSecure Ltd',
    status: 'pending',
    description: 'Comprehensive security audit and implementation of compliance measures.',
    createdAt: '2025-01-25T08:00:00Z',
  },
];

const ITEMS_PER_PAGE = 6;

const Proposals: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isLoading] = useState(false);

  // Filter proposals based on search
  const filteredProposals = useMemo(() => {
    if (!searchQuery) return mockProposals;
    
    const query = searchQuery.toLowerCase();
    return mockProposals.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.client.toLowerCase().includes(query) ||
        p.status.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Paginate proposals
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProposals.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProposals, currentPage]);

  const totalPages = Math.ceil(filteredProposals.length / ITEMS_PER_PAGE);

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
        {!isLoading && filteredProposals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No proposals found.</p>
          </div>
        )}

        {/* Proposals list */}
        {!isLoading && filteredProposals.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedProposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onClick={handleProposalClick}
                  />
                ))}
              </div>
            ) : (
              <ProposalTable
                proposals={paginatedProposals}
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
