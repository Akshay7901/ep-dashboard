import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Users, LogOut } from "lucide-react";
import TruncatedCell from "@/components/ui/truncated-cell";
import { format } from "date-fns";
import { useProposals } from "@/hooks/useProposals";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";
import brandLogo from "@/assets/brand-logo.webp";
import { extractCountry } from "@/lib/extractCountry";
import ProposalStatusBadge from "@/components/proposals/ProposalStatusBadge";

const ITEMS_PER_PAGE = 10;

/* ============================================================
   DECISION REVIEWER (reviewer_1) — "Proposal Intake" config
   ============================================================ */

/* ============================================================
   Status chip color config — keyed by API status_summary keys
   ============================================================ */

const statusChipColorMap: Record<string, { colorClass: string }> = {
  total: { colorClass: "bg-[#2d3748] text-white border-[#2d3748]" },
  new: { colorClass: "bg-[#3d5a47] text-white border-[#3d5a47]" },
  in_review: { colorClass: "bg-[#45556c] text-white border-[#45556c]" },
  review_returned: { colorClass: "bg-[#c05621] text-white border-[#c05621]" },
  contract_issued: { colorClass: "bg-[#1d293d] text-white border-[#1d293d]" },
  queries_raised: { colorClass: "bg-[#6b7280] text-white border-[#6b7280]" },
  awaiting_author_approval: { colorClass: "bg-[#45556c] text-white border-[#45556c]" },
  author_approved: { colorClass: "bg-[#276749] text-white border-[#276749]" },
  locked: { colorClass: "bg-gray-600 text-white border-gray-600" },
  declined: { colorClass: "bg-[#9b2c2c] text-white border-[#9b2c2c]" },
  assigned: { colorClass: "bg-[#e5e7eb] text-gray-800 border-[#e5e7eb]" },
  in_progress: { colorClass: "bg-[#f2a627] text-white border-[#f2a627]" },
  completed: { colorClass: "bg-[#93a316] text-white border-[#93a316]" },
  pending: { colorClass: "bg-[#7a2626] text-white border-[#7a2626]" },
};

// Convert API key to display label: replace underscores with spaces, capitalise each word
const formatStatusLabel = (key: string): string =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// PeerReviewStatusBadge removed — the API provides role-appropriate display status directly

/* ============================================================
   Shared components
   ============================================================ */

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
      "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border transition-all rounded-full w-full h-10",
      colorClass,
      isActive && "ring-2 ring-offset-2 ring-primary",
    )}
  >
    {count} {label}
  </button>
);

/* ============================================================
   Main Component
   ============================================================ */

const Proposals: React.FC = () => {
  const navigate = useNavigate();
  const { isAnyReviewer, isReviewer1, isReviewer2, logout, isAuthor } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState<string>("author");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionRequiredFilter, setActionRequiredFilter] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const { data, isLoading, error } = useProposals({
    page: 1,
    limit: 100,
    search: searchQuery,
    searchCategory,
    status: "all",
  });

  /* ---------- Derived data ---------- */

  const { user } = useAuth();

  // For peer reviewers, the API already filters to only assigned proposals,
  // so we show all returned proposals. For reviewer_1, show everything.
  // The API already provides role-appropriate display status, no overrides needed.
  const roleFilteredProposals = React.useMemo(() => {
    if (!data?.data) return [];
    if (isReviewer1) return data.data;
    // For peer reviewers: the API already returns only their assigned proposals
    const userEmail = user?.email?.toLowerCase();
    if (!userEmail) return data.data;
    const emailFiltered = data.data.filter((p) => {
      const reviewers = p.assigned_reviewers || [];
      const apiEmails = reviewers.map((r: any) => r.email).filter(Boolean);
      if (apiEmails.length === 0) return true;
      return apiEmails.some((e: string) => e?.toLowerCase() === userEmail);
    });
    return emailFiltered;
  }, [data?.data, isReviewer1, user?.email]);

  // Use status_summary from API response directly
  const statusSummary: Record<string, number> | null = data?.status_summary || null;

  // Build status options for dropdown from status_summary keys
  const statusOptions = React.useMemo(() => {
    if (!statusSummary) return [{ value: "all" as const, label: "All Statuses" }];
    const options: { value: string; label: string }[] = [{ value: "all", label: "All Statuses" }];
    Object.keys(statusSummary).forEach((key) => {
      if (key === "total") return;
      options.push({ value: key, label: formatStatusLabel(key) });
    });
    return options;
  }, [statusSummary]);

  // Normalize status for comparison: "In Review" -> "in_review"
  const normalizeStatus = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '_');

  const filteredProposals = React.useMemo(() => {
    if (!roleFilteredProposals.length) return [];
    let result = roleFilteredProposals;
    if (statusFilter !== "all") {
      result = result.filter((p) => normalizeStatus(p.status) === statusFilter);
    }
    if (actionRequiredFilter) {
      result = result.filter((p) => p.action_required === true);
    }
    return result;
  }, [roleFilteredProposals, statusFilter, actionRequiredFilter]);

  const displayedProposals = filteredProposals.slice(0, displayCount);
  const hasMore = displayCount < filteredProposals.length;

  /* ---------- Handlers ---------- */

  const handleProposalClick = (id: string) => navigate(`/proposals/${id}`);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setDisplayCount(ITEMS_PER_PAGE);
  };
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setDisplayCount(ITEMS_PER_PAGE);
  };
  const handleViewMore = () => setDisplayCount((prev) => prev + ITEMS_PER_PAGE);

  /* ---------- Guards ---------- */

  // Redirect authors to their dashboard
  if (isAuthor) {
    return <Navigate to="/author/proposals" replace />;
  }

  // If user role is not recognized as reviewer, also redirect authors or show appropriate message
  if (!isAnyReviewer) {
    // If user exists but isn't a reviewer, redirect to author dashboard as fallback
    if (user) {
      return <Navigate to="/author/proposals" replace />;
    }
    return (
      <DashboardLayout title="Dashboard">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              You don't have permission to view proposals.
              <br />
              Please contact an administrator to assign you a reviewer role.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <DashboardLayout title={isReviewer1 ? "Proposal Intake" : "Peer Review Dashboard"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={isReviewer1 ? brandLogo : logo}
              alt="Logo"
              className="h-10 w-auto"
            />
            <h1 className="text-2xl font-bold text-foreground">
              {isReviewer1 ? "Proposal Intake" : "Peer Review Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {isReviewer1 && (
              <Button variant="outline" className="gap-2" onClick={() => navigate("/peer-reviewers")}>
                <Users className="h-4 w-4" />
                Peer Reviewers
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={() => { logout(); navigate("/login"); }}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Status Summary Chips — dynamically rendered from API status_summary */}
        {statusSummary && (
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(statusSummary).map(([key, count]) => {
              const config = statusChipColorMap[key];
              // Fallback: render even unknown keys with a default gray style
              const colorClass = config?.colorClass || "bg-gray-500 text-white border-gray-500";
              const filterValue = key === "total" ? "all" : key;
              return (
                <StatusChip
                  key={key}
                  count={count}
                  label={formatStatusLabel(key)}
                  colorClass={colorClass}
                  isActive={statusFilter === filterValue}
                  onClick={() => handleStatusChange(filterValue)}
                />
              );
            })}
          </div>
        )}

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Search by:</span>
            <Select value={searchCategory} onValueChange={(v) => { setSearchCategory(v); setDisplayCount(ITEMS_PER_PAGE); }}>
              <SelectTrigger className="w-28 h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="author">Author</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="country">Country</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type here"
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 bg-background"
            />
          </div>

          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36 h-9 bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isReviewer1 && (
            <button
              onClick={() => { setActionRequiredFilter((prev) => !prev); setDisplayCount(ITEMS_PER_PAGE); }}
              className={cn(
                "inline-flex items-center gap-2 px-4 h-9 text-sm font-medium border rounded-full transition-all whitespace-nowrap",
                actionRequiredFilter
                  ? "bg-[#c05621] text-white border-[#c05621] ring-2 ring-offset-2 ring-[#c05621]"
                  : "bg-background text-[#c05621] border-[#c05621] hover:bg-[#c05621]/10"
              )}
            >
              Action Required
            </button>
          )}
        </div>

        {/* Section label */}
        {isReviewer1 && (
          <h2 className="text-lg font-semibold text-foreground">Recent Submissions</h2>
        )}

        {/* Proposals Table */}
        <div className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive">Error loading proposals. Please try again.</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && displayedProposals.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No proposals found.</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && displayedProposals.length > 0 && (
            <>
              <Card className="overflow-hidden">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide w-[30%]">
                        Title
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide w-[14%]">
                        Author
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide w-[18%]">
                        Email
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide w-[8%]">
                        Country
                      </TableHead>
                      {isReviewer1 && (
                        <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide whitespace-nowrap w-[10%]">
                          Submitted
                        </TableHead>
                      )}
                      {isReviewer1 && (
                        <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide whitespace-nowrap w-[10%]">
                          Assigned
                        </TableHead>
                      )}
                      {isReviewer2 && (
                        <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide whitespace-nowrap w-[10%]">
                          Assigned
                        </TableHead>
                      )}
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide text-right w-[10%]">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedProposals.map((proposal) => (
                      <TableRow
                        key={proposal.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleProposalClick(proposal.id)}
                      >
                        <TableCell className="font-medium text-foreground">
                          <TruncatedCell text={proposal.name} maxLines={2} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <TruncatedCell text={proposal.author_name} maxLines={1} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <TruncatedCell text={proposal.author_email} maxLines={1} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {proposal.country || extractCountry(proposal.address) || "—"}
                        </TableCell>
                        {isReviewer1 && (
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {proposal.created_at
                              ? format(new Date(proposal.created_at), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                        )}
                        {isReviewer1 && (
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {proposal.assigned_at
                              ? format(new Date(proposal.assigned_at), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                        )}
                        {isReviewer2 && (
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {proposal.assigned_at
                              ? format(new Date(proposal.assigned_at), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <ProposalStatusBadge status={proposal.status} showIcon={false} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={handleViewMore} className="px-8">
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

export default Proposals;
