import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProposalStatus } from "@/types";
import { Search, Loader2, Users, LogOut } from "lucide-react";
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

const decisionStatusOptions: { value: ProposalStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "submitted", label: "New" },
  { value: "under_review", label: "In Review" },
  { value: "approved", label: "Contract Sent" },
  { value: "rejected", label: "Declined" },
  { value: "finalised", label: "Finalised" },
  { value: "locked", label: "Locked" },
];

/* ============================================================
   PEER REVIEWER (reviewer_2) — "Peer Review Dashboard" config
   ============================================================ */

const peerStatusOptions: { value: ProposalStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "submitted", label: "Pending Review" },
  { value: "under_review", label: "In Progress" },
  { value: "approved", label: "Completed" },
  { value: "rejected", label: "Declined" },
  { value: "locked", label: "Locked" },
];

const peerReviewStatusConfig: Record<string, { label: string; className: string }> = {
  submitted: {
    label: "Pending Review",
    className: "bg-[#7a2626] text-white hover:bg-[#7a2626] border-[#7a2626]",
  },
  under_review: {
    label: "In Progress",
    className: "bg-[#f2a627] text-white hover:bg-[#f2a627] border-[#f2a627]",
  },
  approved: {
    label: "Completed",
    className: "bg-[#93a316] text-white hover:bg-[#93a316] border-[#93a316]",
  },
  finalised: {
    label: "Completed",
    className: "bg-[#93a316] text-white hover:bg-[#93a316] border-[#93a316]",
  },
  rejected: {
    label: "Declined",
    className: "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c] border-[#9b2c2c]",
  },
  locked: {
    label: "Locked",
    className: "bg-gray-600 text-white hover:bg-gray-600 border-gray-600",
  },
};

const PeerReviewStatusBadge: React.FC<{ status: ProposalStatus }> = ({ status }) => {
  const config = peerReviewStatusConfig[status] || peerReviewStatusConfig.submitted;
  return (
    <Badge className={cn(config.className, "rounded-full px-4 py-1 font-medium text-xs")}>
      {config.label}
    </Badge>
  );
};

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
      "inline-flex items-center gap-2 px-5 py-2 text-sm font-medium border transition-all rounded-full",
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
  const { isAnyReviewer, isReviewer1, isReviewer2, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const { data, isLoading, error } = useProposals({
    page: 1,
    limit: 100,
    search: searchQuery,
    status: "all",
  });

  /* ---------- Derived data ---------- */

  const { user } = useAuth();

  // For peer reviewers, filter to only show proposals assigned to them
  const roleFilteredProposals = React.useMemo(() => {
    if (!data?.data) return [];
    if (isReviewer1) return data.data;
    // Peer reviewer: only show proposals where their email is in assigned_reviewers
    const userEmail = user?.email?.toLowerCase();
    if (!userEmail) return [];
    return data.data.filter((p) => {
      const assignedEmails = (p as any).assigned_reviewer_emails
        || p.assigned_reviewers?.map((r: any) => r.email)
        || [];
      return assignedEmails.some((e: string) => e?.toLowerCase() === userEmail);
    });
  }, [data?.data, isReviewer1, user?.email]);

  const statusCounts = React.useMemo(() => {
    if (!roleFilteredProposals.length) return { total: 0, newCount: 0, inReview: 0, contractSent: 0, declined: 0, pending: 0, inProgress: 0, completed: 0 };
    const d = roleFilteredProposals;
    return {
      total: d.length,
      newCount: d.filter((p) => p.status === "submitted").length,
      inReview: d.filter((p) => p.status === "under_review").length,
      contractSent: d.filter((p) => p.status === "approved").length,
      declined: d.filter((p) => p.status === "rejected").length,
      pending: d.filter((p) => p.status === "submitted").length,
      inProgress: d.filter((p) => p.status === "under_review").length,
      completed: d.filter((p) => p.status === "approved" || p.status === "finalised").length,
    };
  }, [roleFilteredProposals]);

  const filteredProposals = React.useMemo(() => {
    if (!roleFilteredProposals.length) return [];
    if (statusFilter === "all") return roleFilteredProposals;
    if (statusFilter === "approved") {
      return roleFilteredProposals.filter((p) => p.status === "approved" || p.status === "finalised");
    }
    return roleFilteredProposals.filter((p) => p.status === statusFilter);
  }, [roleFilteredProposals, statusFilter]);

  const displayedProposals = filteredProposals.slice(0, displayCount);
  const hasMore = displayCount < filteredProposals.length;

  /* ---------- Handlers ---------- */

  const handleProposalClick = (id: string) => navigate(`/proposals/${id}`);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setDisplayCount(ITEMS_PER_PAGE);
  };
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as ProposalStatus | "all");
    setDisplayCount(ITEMS_PER_PAGE);
  };
  const handleViewMore = () => setDisplayCount((prev) => prev + ITEMS_PER_PAGE);

  /* ---------- Guards ---------- */

  if (!isAnyReviewer) {
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

  const statusOptions = isReviewer1 ? decisionStatusOptions : peerStatusOptions;

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

        {/* Status Summary Chips — different per role */}
        {isReviewer1 ? (
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip
              count={statusCounts.total}
              label="Proposals"
              colorClass="bg-[#2d3748] text-white border-[#2d3748]"
              isActive={statusFilter === "all"}
              onClick={() => handleStatusChange("all")}
            />
            <StatusChip
              count={statusCounts.newCount}
              label="New"
              colorClass="bg-[#3d5a47] text-white border-[#3d5a47]"
              isActive={statusFilter === "submitted"}
              onClick={() => handleStatusChange("submitted")}
            />
            <StatusChip
              count={statusCounts.inReview}
              label="In Review"
              colorClass="bg-[#45556c] text-white border-[#45556c]"
              isActive={statusFilter === "under_review"}
              onClick={() => handleStatusChange("under_review")}
            />
            <StatusChip
              count={statusCounts.contractSent}
              label="Contract Sent"
              colorClass="bg-[#1d293d] text-white border-[#1d293d]"
              isActive={statusFilter === "approved"}
              onClick={() => handleStatusChange("approved")}
            />
            <StatusChip
              count={statusCounts.declined}
              label="Declined"
              colorClass="bg-[#9b2c2c] text-white border-[#9b2c2c]"
              isActive={statusFilter === "rejected"}
              onClick={() => handleStatusChange("rejected")}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip
              count={statusCounts.total}
              label="Assigned"
              colorClass="bg-[#e5e7eb] text-gray-800 border-[#e5e7eb]"
              isActive={statusFilter === "all"}
              onClick={() => handleStatusChange("all")}
            />
            <StatusChip
              count={statusCounts.pending}
              label="Pending"
              colorClass="bg-[#7a2626] text-white border-[#7a2626]"
              isActive={statusFilter === "submitted"}
              onClick={() => handleStatusChange("submitted")}
            />
            <StatusChip
              count={statusCounts.inProgress}
              label="In Progress"
              colorClass="bg-[#f2a627] text-white border-[#f2a627]"
              isActive={statusFilter === "under_review"}
              onClick={() => handleStatusChange("under_review")}
            />
            <StatusChip
              count={statusCounts.completed}
              label="Completed"
              colorClass="bg-[#93a316] text-white border-[#93a316]"
              isActive={statusFilter === "approved"}
              onClick={() => handleStatusChange("approved")}
            />
          </div>
        )}

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Search by:</span>
            <Select defaultValue="author">
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Title
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Author
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Email
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Country
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        {isReviewer1 ? "Date Submitted" : "Submitted"}
                      </TableHead>
                      {isReviewer1 && (
                        <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                          Assigned To
                        </TableHead>
                      )}
                      {isReviewer2 && (
                        <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                          Assigned On
                        </TableHead>
                      )}
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide text-right">
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
                        <TableCell className="font-medium text-foreground max-w-xs">
                          <span className="line-clamp-2">{proposal.name}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{proposal.author_name}</TableCell>
                        <TableCell className="text-muted-foreground">{proposal.author_email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {extractCountry(proposal.address) || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {proposal.created_at
                            ? format(new Date(proposal.created_at), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        {isReviewer1 && (
                          <TableCell className="text-muted-foreground text-sm">
                            {proposal.assigned_reviewers && proposal.assigned_reviewers.length > 0
                              ? proposal.assigned_reviewers.map((r) => r.name || r.email).join(", ")
                              : "—"}
                          </TableCell>
                        )}
                        {isReviewer2 && (
                          <TableCell className="text-muted-foreground">
                            {proposal.assigned_at
                              ? format(new Date(proposal.assigned_at), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          {isReviewer1 ? (
                            <ProposalStatusBadge status={proposal.status} showIcon={false} />
                          ) : (
                            <PeerReviewStatusBadge status={proposal.status} />
                          )}
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
