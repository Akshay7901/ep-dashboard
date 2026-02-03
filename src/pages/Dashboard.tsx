import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, useProposals } from '@/hooks/useProposals';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  FileCheck,
  ArrowRight,
  Loader2
} from 'lucide-react';
import ProposalStatusBadge from '@/components/proposals/ProposalStatusBadge';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAnyReviewer, isReviewer1, isReviewer2 } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentProposals, isLoading: proposalsLoading } = useProposals({ 
    page: 1, 
    limit: 5 
  });

  const statCards = [
    {
      title: 'Total Proposals',
      value: stats?.total || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Submitted',
      value: stats?.submitted || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Under Review',
      value: stats?.under_review || 0,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Approved',
      value: stats?.approved || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Finalised',
      value: stats?.finalised || 0,
      icon: FileCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Locked',
      value: stats?.locked || 0,
      icon: Lock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  if (!isAnyReviewer) {
    return (
      <DashboardLayout title="Dashboard">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome, {user?.name}!</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have a reviewer role assigned yet. 
              Please contact an administrator to get access to the proposal management system.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.name || user?.name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {isReviewer1 
              ? "You're logged in as Reviewer 1 (Sarah) - Primary reviewer with full access"
              : "You're logged in as Reviewer 2 (Amanda) - Secondary reviewer for assessments"
            }
          </p>
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

        {/* Recent proposals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Proposals</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/proposals')}>
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {proposalsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : recentProposals?.data.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No proposals yet.
              </p>
            ) : (
              <div className="space-y-4">
                {recentProposals?.data.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/proposals/${proposal.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {proposal.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {proposal.author_name} • {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <ProposalStatusBadge status={proposal.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions based on role */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-start gap-1"
                onClick={() => navigate('/proposals')}
              >
                <span className="font-semibold">View All Proposals</span>
                <span className="text-xs text-muted-foreground">
                  Browse and manage all book proposals
                </span>
              </Button>
              
              {isReviewer1 && (
                <>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-start gap-1"
                    onClick={() => navigate('/proposals?status=submitted')}
                  >
                    <span className="font-semibold">Review Submissions</span>
                    <span className="text-xs text-muted-foreground">
                      Accept or decline new proposals
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-start gap-1"
                    onClick={() => navigate('/proposals?status=approved')}
                  >
                    <span className="font-semibold">Send Contracts</span>
                    <span className="text-xs text-muted-foreground">
                      Finalize and send contracts to authors
                    </span>
                  </Button>
                </>
              )}
              
              {isReviewer2 && (
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start gap-1"
                  onClick={() => navigate('/proposals?status=under_review')}
                >
                  <span className="font-semibold">Pending Reviews</span>
                  <span className="text-xs text-muted-foreground">
                    Complete assessment forms for proposals
                  </span>
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
