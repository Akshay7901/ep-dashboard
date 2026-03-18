import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TruncatedCell from "@/components/ui/truncated-cell";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpDown } from "lucide-react";
import ProfileDropdown from "@/components/layout/ProfileDropdown";
import { format } from "date-fns";
import { useProposals } from "@/hooks/useProposals";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import brandLogo from "@/assets/brand-logo.webp";
import ProposalStatusBadge from "@/components/proposals/ProposalStatusBadge";

const ITEMS_PER_PAGE = 10;

// Status badge and config removed — using ProposalStatusBadge which reads raw API display text

/* ---- Action Required logic — now driven by API field ---- */

/* ---- Status Chip ---- */
interface StatusChipProps {
  count: number;
  label: string;
  colorClass: string;
  isActive?: boolean;
  onClick?: () => void;
}

const StatusChip: React.FC<StatusChipProps> = ({ count, label, colorClass, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-2 px-5 py-2 text-sm font-medium border transition-all rounded-full",
      colorClass,
      isActive && "ring-2 ring-offset-2 ring-primary",
    )}
  >
    {label} [{count}]
  </button>
);

/* ---- Main ---- */

const AuthorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  const { data, isLoading, error } = useProposals({
    page: 1,
    limit: 100,
    search: "",
    searchCategory: "author",
    status: "all",
    sortOrder,
  });

  // Filter proposals to only those matching the author's email
  const authorProposals = React.useMemo(() => {
    if (!data?.data) return [];
    const email = user?.email?.toLowerCase();
    if (!email) return [];
    return data.data.filter((p) => p.author_email?.toLowerCase() === email);
  }, [data?.data, user?.email]);

  // Use status_summary from API response directly
  const statusSummary: Record<string, number> | null = data?.status_summary || null;

  // Normalize status for comparison: "Submitted" -> "submitted"
  const normalizeStatus = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '_');

  const filteredProposals = React.useMemo(() => {
    if (statusFilter.length === 0) return authorProposals;
    return authorProposals.filter((p) => statusFilter.includes(normalizeStatus(p.status)));
  }, [authorProposals, statusFilter]);

  const displayedProposals = filteredProposals.slice(0, displayCount);
  const hasMore = displayCount < filteredProposals.length;

  const handleStatusChange = (value: string) => {
    setStatusFilter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
    setDisplayCount(ITEMS_PER_PAGE);
  };

  return (
    <DashboardLayout title="Author Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold text-foreground">Author Dashboard</h1>
          </div>
          <ProfileDropdown />
        </div>

        {/* Status Chips — dynamically rendered from API status_summary */}
        {statusSummary && (
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(statusSummary).map(([key, count]) => {
              if (key === "total") return null;
              const chipColorMap: Record<string, string> = {
                submitted: "bg-[#3B82F6] text-white border-[#3B82F6]",
                editorial_review: "bg-[#7C3AED] text-white border-[#7C3AED]",
                peer_review: "bg-[#7C3AED] text-white border-[#7C3AED]",
                in_review: "bg-[#7C3AED] text-white border-[#7C3AED]",
                feedback_and_agreement_pending: "bg-[#0D9488] text-white border-[#0D9488]",
                feedback_and_contract_issued: "bg-[#0D9488] text-white border-[#0D9488]",
                final_review_and_confirmation: "bg-[#F59E0B] text-white border-[#F59E0B]",
                confirmed_and_finalised: "bg-[#16A34A] text-white border-[#16A34A]",
                declined: "bg-[#DC2626] text-white border-[#DC2626]",
              };
              const colorClass = chipColorMap[key] || "bg-gray-500 text-white border-gray-500";
              const label = key.replace(/_/g, ' ').replace(/\band\b/g, '&').replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <StatusChip
                  key={key}
                  count={count}
                  label={label}
                  colorClass={colorClass}
                  isActive={statusFilter.includes(key)}
                  onClick={() => handleStatusChange(key)}
                />
              );
            })}
          </div>
        )}

        {/* Sort Control */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); setDisplayCount(ITEMS_PER_PAGE); }}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-full transition-all whitespace-nowrap",
              "bg-background text-foreground border-border hover:bg-muted"
            )}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>

        {/* Proposals Table */}
        <div className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Card className="py-12 text-center">
              <p className="text-destructive">Error loading proposals. Please try again.</p>
            </Card>
          )}

          {!isLoading && !error && displayedProposals.length === 0 && (
            <Card className="py-12 text-center">
              <p className="text-muted-foreground">No proposals found.</p>
            </Card>
          )}

          {!isLoading && !error && displayedProposals.length > 0 && (
            <>
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Title
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Submitted
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide text-right">
                        Action Required
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedProposals.map((proposal) => (
                        <TableRow
                          key={proposal.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/author/proposals/${proposal.id}`)}
                        >
                          <TableCell className="font-medium text-foreground max-w-md">
                            <TruncatedCell text={proposal.name} maxLines={2} />
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {proposal.created_at
                              ? format(new Date(proposal.created_at), "MMM dd, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <ProposalStatusBadge status={proposal.status} showIcon={false} />
                          </TableCell>
                          <TableCell className="text-right">
                            {proposal.action_required ? (
                              <Badge variant="outline" className="rounded-full px-4 py-1 font-medium text-xs border-[#c05621] text-[#c05621]">
                                Action Required
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">No action</span>
                            )}
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setDisplayCount((prev) => prev + ITEMS_PER_PAGE)} className="px-8">
                    View More
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuthorDashboard;
