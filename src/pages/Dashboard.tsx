import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

// Mock stats for dashboard
const stats = [
  {
    title: 'Total Proposals',
    value: '24',
    change: '+12%',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Pending',
    value: '8',
    change: '+3',
    icon: Clock,
    color: 'text-status-pending',
    bgColor: 'bg-status-pending/10',
  },
  {
    title: 'Approved',
    value: '14',
    change: '+5',
    icon: CheckCircle,
    color: 'text-status-approved',
    bgColor: 'bg-status-approved/10',
  },
  {
    title: 'Rejected',
    value: '2',
    change: '-1',
    icon: XCircle,
    color: 'text-status-rejected',
    bgColor: 'bg-status-rejected/10',
  },
];

const Dashboard: React.FC = () => {
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
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

        {/* Quick actions or recent activity could go here */}
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
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
