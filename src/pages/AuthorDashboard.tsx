import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, LogOut } from "lucide-react";
import { format } from "date-fns";
import { useProposals } from "@/hooks/useProposals";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";
import { ProposalStatus } from "@/types";

const ITEMS_PER_PAGE = 10;

const authorStatusConfig: Record<string, { label: string; className: string }> = {
  submitted: {
    label: "Submitted",
    className: "bg-[#3d5a47] text-white hover:bg-[#3d5a47] border-[#3d5a47]",
  },
  under_review: {
    label: "Under Review",
    className: "bg-[#f2a627] text-white hover:bg-[#f2a627] border-[#f2a627]",
  },
  approved: {
    label: "Contract Sent",
    className: "bg-[#1d293d] text-white hover:bg-[#1d293d] border-[#1d293d]",
  },
  finalised: {
    label: "Accepted",
    className: "bg-[#276749] text-white hover:bg-[#276749] border-[#276749]",
  },
  rejected: {
    label: "Declined",
    className: "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c] border-[#9b2c2c]",
  },
  locked: {
    label: "Clarification Needed",
    className: "bg-gray-600 text-white hover:bg-gray-600 border-gray-600",
  },
};

const AuthorStatusBadge: React.FC<{ status: ProposalStatus }> = ({ status }) => {
  const config = authorStatusConfig[status] || authorStatusConfig.submitted;
  return (
    <Badge className={cn(config.className, "rounded-full px-4 py-1 font-medium text-xs")}>
      {config.label}
    </Badge>
  );
};

const AuthorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  const { data, isLoading, error } = useProposals({
    page: 1,
    limit: 100,
    search: "",
    searchCategory: "author",
    status: "all",
  });

  // Filter proposals to only those matching the author's email
  const authorProposals = React.useMemo(() => {
    if (!data?.data) return [];
    const email = user?.email?.toLowerCase();
    if (!email) return [];
    let filtered = data.data.filter(
      (p) => p.author_email?.toLowerCase() === email
    );
    // Client-side search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.ticket_number?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [data?.data, user?.email, searchQuery]);

  const statusCounts = React.useMemo(() => {
    const d = authorProposals;
    return {
      total: d.length,
      submitted: d.filter((p) => p.status === "submitted").length,
      underReview: d.filter((p) => p.status === "under_review").length,
      contractSent: d.filter((p) => p.status === "approved").length,
      accepted: d.filter((p) => p.status === "finalised").length,
      declined: d.filter((p) => p.status === "rejected").length,
    };
  }, [authorProposals]);

  const displayedProposals = authorProposals.slice(0, displayCount);
  const hasMore = displayCount < authorProposals.length;

  return (
    <DashboardLayout title="My Proposals">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Proposals</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user?.name || user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total", count: statusCounts.total, color: "bg-[#2d3748]" },
            { label: "Submitted", count: statusCounts.submitted, color: "bg-[#3d5a47]" },
            { label: "Under Review", count: statusCounts.underReview, color: "bg-[#f2a627]" },
            { label: "Contract Sent", count: statusCounts.contractSent, color: "bg-[#1d293d]" },
            { label: "Accepted", count: statusCounts.accepted, color: "bg-[#276749]" },
            { label: "Declined", count: statusCounts.declined, color: "bg-[#9b2c2c]" },
          ].map((item) => (
            <Card key={item.label} className="overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn(item.color, "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg")}>
                  {item.count}
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or ticket number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDisplayCount(ITEMS_PER_PAGE);
            }}
            className="pl-10 bg-background"
          />
        </div>

        {/* Table */}
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
                        Ticket #
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Title
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-xs tracking-wide">
                        Date Submitted
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
                        onClick={() => navigate(`/author/proposals/${proposal.id}`)}
                      >
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {proposal.ticket_number || "—"}
                        </TableCell>
                        <TableCell className="font-medium text-foreground max-w-xs">
                          <span className="line-clamp-2">{proposal.name}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {proposal.created_at
                            ? format(new Date(proposal.created_at), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <AuthorStatusBadge status={proposal.status} />
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
