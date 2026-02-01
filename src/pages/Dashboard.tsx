import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, XCircle, TrendingUp, Loader2 } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await mockApi.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Proposals',
      value: stats.total,
      change: '+12%',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pending',
      value: stats.pending,
      change: '+3',
      icon: Clock,
      color: 'text-status-pending',
      bgColor: 'bg-status-pending/10',
    },
    {
      title: 'Approved',
      value: stats.approved,
      change: '+5',
      icon: CheckCircle,
      color: 'text-status-approved',
      bgColor: 'bg-status-approved/10',
    },
    {
      title: 'Rejected',
      value: stats.rejected,
      change: '-1',
      icon: XCircle,
      color: 'text-status-rejected',
      bgColor: 'bg-status-rejected/10',
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome section */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Welcome back! 👋</h2>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your proposals today.
          </p>
        </div>

        {/* Stats grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-status-approved" />
                    <span className="text-xs text-muted-foreground">
                      {stat.change} from last month
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent activity */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { text: 'New proposal submitted for Acme Corp', time: '2 hours ago' },
                { text: 'Proposal #1024 was approved', time: '5 hours ago' },
                { text: 'Client feedback received on Project Alpha', time: '1 day ago' },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test credentials notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-foreground">
              <strong>🧪 Test Mode:</strong> You're using mock data. Login credentials: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">demo@example.com</code> / <code className="bg-muted px-1.5 py-0.5 rounded text-xs">password123</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
