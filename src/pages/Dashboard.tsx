import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats, useProposals } from "@/hooks/useProposals";
import { FileText, Clock, CheckCircle2, XCircle, Lock, FileCheck, ArrowRight, Loader2 } from "lucide-react";
import ProposalStatusBadge from "@/components/proposals/ProposalStatusBadge";
import { format } from "date-fns";

const statusTabs = [
  { label: "All Proposals", key: "all", color: "bg-gray-200 text-gray-800" },
  { label: "New", key: "new", color: "bg-green-800 text-white" },
  { label: "In Review", key: "in_review", color: "bg-blue-800 text-white" },
  { label: "Contract Sent", key: "contract_sent", color: "bg-gray-900 text-white" },
  { label: "Declined", key: "declined", color: "bg-red-800 text-white" },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAnyReviewer, isReviewer1, isReviewer2 } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentProposals, isLoading: proposalsLoading } = useProposals({ page: 1, limit: 10 });

  const [activeTab, setActiveTab] = useState("all");
  const [searchAuthor, setSearchAuthor] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredProposals =
    recentProposals?.data.filter((p) => {
      const matchesAuthor = p.author_name.toLowerCase().includes(searchAuthor.toLowerCase());
      const matchesText = p.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = filterStatus === "all" || p.status === filterStatus;
      return matchesAuthor && matchesText && matchesStatus;
    }) || [];

  const statCards = [
    {
      title: "Total Proposals",
      value: stats?.total || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    { title: "Submitted", value: stats?.submitted || 0, icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
    {
      title: "Under Review",
      value: stats?.under_review || 0,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Approved",
      value: stats?.approved || 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Finalised",
      value: stats?.finalised || 0,
      icon: FileCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    { title: "Locked", value: stats?.locked || 0, icon: Lock, color: "text-gray-600", bgColor: "bg-gray-50" },
  ];

  if (!isAnyReviewer) {
    return (
      <DashboardLayout title="Dashboard">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome, {user?.name}!</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have a reviewer role assigned yet. Please contact an administrator to get access to the proposal
              management system.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {profile?.name || user?.name}!</h1>
        </div>

        {/* Stats grid */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Proposal Intake */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Proposal Intake</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate("/peer-reviewers")}>
              Peer Reviewers
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`px-4 py-1 rounded-lg text-sm font-semibold ${activeTab === tab.key ? tab.color : "bg-gray-200 text-gray-800"}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Author"
                className="border rounded px-3 py-2 flex-1"
                value={searchAuthor}
                onChange={(e) => setSearchAuthor(e.target.value)}
              />
              <input
                type="text"
                placeholder="Type here"
                className="border rounded px-3 py-2 flex-1"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <select
                className="border rounded px-3 py-2"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="in_review">In Review</option>
                <option value="contract_sent">Contract Sent</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Author</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Country</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {proposalsLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                      </td>
                    </tr>
                  ) : filteredProposals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No proposals found.
                      </td>
                    </tr>
                  ) : (
                    filteredProposals.map((p) => (
                      <tr
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/proposals/${p.id}`)}
                      >
                        <td className="px-4 py-2">{p.name}</td>
                        <td className="px-4 py-2">{p.author_name}</td>
                        <td className="px-4 py-2">{p.author_email}</td>
                        <td className="px-4 py-2">{p.country}</td>
                        <td className="px-4 py-2">
                          <ProposalStatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-center mt-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/proposals")}>
                View More
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-start gap-1"
                onClick={() => navigate("/proposals")}
              >
                <span className="font-semibold">View All Proposals</span>
                <span className="text-xs text-muted-foreground">Browse and manage all book proposals</span>
              </Button>
              {isReviewer1 && (
                <>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-start gap-1"
                    onClick={() => navigate("/proposals?status=submitted")}
                  >
                    <span className="font-semibold">Review Submissions</span>
                    <span className="text-xs text-muted-foreground">Accept or decline new proposals</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-start gap-1"
                    onClick={() => navigate("/proposals?status=approved")}
                  >
                    <span className="font-semibold">Send Contracts</span>
                    <span className="text-xs text-muted-foreground">Finalize and send contracts to authors</span>
                  </Button>
                </>
              )}
              {isReviewer2 && (
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start gap-1"
                  onClick={() => navigate("/proposals?status=under_review")}
                >
                  <span className="font-semibold">Pending Reviews</span>
                  <span className="text-xs text-muted-foreground">Complete assessment forms for proposals</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
