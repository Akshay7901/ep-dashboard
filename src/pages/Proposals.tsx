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
import { extractCountry } from "@/lib/extractCountry";

const ITEMS_PER_PAGE = 10;

// Peer Review Dashboard status filter options
const statusOptions: {
  value: ProposalStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All Statuses" },
  { value: "submitted", label: "Pending Review" },
  { value: "under_review", label: "In Progress" },
  { value: "approved", label: "Completed" },
  { value: "finalised", label: "Completed" },
  { value: "rejected", label: "Declined" },
  { value: "locked", label: "Locked" },
];

// Peer Review status badge config
const peerReviewStatusConfig: Record<string, { label: string; className: string }> = {
  submitted: {
    label: "Pending Review",
    className: "bg-[#c4940a] text-white hover:bg-[#c4940a] border-[#c4940a]",
  },
  under_review: {
    label: "In Progress",
    className: "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c] border-[#9b2c2c]",
  },
  approved: {
    label: "Completed",
    className: "bg-[#3d5a47] text-white hover:bg-[#3d5a47] border-[#3d5a47]",
  },
  finalised: {
    label: "Completed",
    className: "bg-[#3d5a47] text-white hover:bg-[#3d5a47] border-[#3d5a47]",
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

interface StatusChipProps {
  count: number;
  label: string;
  variant: "default" | "pending" | "inProgress" | "completed";
  isActive?: boolean;
  onClick?: () => void;
}

const StatusChip: React.FC<StatusChipProps> = ({ count, label, variant, isActive, onClick }) => {
  const variantStyles = {
    default: "bg-[#2d3748] text-white border-[#2d3748]",
    pending: "bg-[#c4940a] text-white border-[#c4940a]",
    inProgress: "bg-[#9b2c2c] text-white border-[#9b2c2c]",
    completed: "bg-[#3d5a47] text-white border-[#3d5a47]",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-5 py-2 text-sm font-medium border transition-all rounded-full",
        variantStyles[variant],
        isActive && "ring-2 ring-offset-2 ring-primary",
      )}
    >
      {count} {label}
    </button>
  );
};

const Proposals: React.FC = () => {
  const navigate = useNavigate();
  const { isAnyReviewer, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const { data, isLoading, error } = useProposals({
    page: 1,
    limit: 100,
    search: searchQuery,
    status: "all",
  });

  // Calculate status counts
  const statusCounts = React.useMemo(() => {
    if (!data?.data)
      return { total: 0, pending: 0, inProgress: 0, completed: 0 };
    return {
      total: data.data.length,
      pending: data.data.filter((p) => p.status === "submitted").length,
      inProgress: data.data.filter((p) => p.status === "under_review").length,
      completed: data.data.filter((p) => p.status === "approved" || p.status === "finalised").length,
    };
  }, [data?.data]);

  // Filter proposals based on status
  const filteredProposals = React.useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === "all") return data.data;
    if (statusFilter === "approved") {
      return data.data.filter((p) => p.status === "approved" || p.status === "finalised");
    }
    return data.data.filter((p) => p.status === statusFilter);
  }, [data?.data, statusFilter]);

  // Paginate results
  const displayedProposals = filteredProposals.slice(0, displayCount);
  const hasMore = displayCount < filteredProposals.length;

  const handleProposalClick = (id: string) => {
    navigate(`/proposals/${id}`);
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setDisplayCount(ITEMS_PER_PAGE);
  };
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as ProposalStatus | "all");
    setDisplayCount(ITEMS_PER_PAGE);
  };
  const handleViewMore = () => {
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
  };

  if (!isAnyReviewer) {
    return (
      <DashboardLayout title="Peer Review Dashboard">
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

  return (
    <DashboardLayout title="Peer Review Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Peer Review Logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold text-foreground">Peer Review Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => { logout(); navigate("/login"); }}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Status Summary Chips */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip
            count={statusCounts.total}
            label="Assigned"
            variant="default"
            isActive={statusFilter === "all"}
            onClick={() => handleStatusChange("all")}
          />
          <StatusChip
            count={statusCounts.pending}
            label="Pending"
            variant="pending"
            isActive={statusFilter === "submitted"}
            onClick={() => handleStatusChange("submitted")}
          />
          <StatusChip
            count={statusCounts.inProgress}
            label="In Progress"
            variant="inProgress"
            isActive={statusFilter === "under_review"}
            onClick={() => handleStatusChange("under_review")}
          />
          <StatusChip
            count={statusCounts.completed}
            label="Completed"
            variant="completed"
            isActive={statusFilter === "approved"}
            onClick={() => handleStatusChange("approved")}
          />
        </div>

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

        {/* Proposals Table */}
        <div className="space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive">Error loading proposals. Please try again.</p>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!isLoading && !error && displayedProposals.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No proposals found.</p>
              </CardContent>
            </Card>
          )}

          {/* Table */}
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
                        Submitted
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Assigned On
                      </TableHead>
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
                        <TableCell className="text-muted-foreground">
                          {proposal.assigned_at
                            ? format(new Date(proposal.assigned_at), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <PeerReviewStatusBadge status={proposal.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* View More Button */}
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
