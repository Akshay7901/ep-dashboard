import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProposalStatusBadge from '@/components/proposals/ProposalStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Proposal } from '@/types';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone,
  FileIcon,
  Download,
  Loader2,
} from 'lucide-react';

// Mock data - in real app, fetch from API
const mockProposals: Record<string, Proposal> = {
  '1': {
    id: '1',
    name: 'Website Redesign Proposal',
    client: 'Acme Corporation',
    clientEmail: 'contact@acmecorp.com',
    clientPhone: '+1 (555) 123-4567',
    status: 'approved',
    description: `Complete redesign of corporate website with modern UI/UX principles and responsive design.

This proposal outlines a comprehensive website redesign project that will transform your current online presence into a modern, user-centric digital experience. Our approach focuses on:

• User Research & Analysis: Understanding your target audience and their needs
• Information Architecture: Restructuring content for optimal navigation
• Visual Design: Creating a fresh, modern aesthetic aligned with your brand
• Responsive Development: Ensuring seamless experience across all devices
• Performance Optimization: Fast loading times and efficient code
• SEO Implementation: Built-in search engine optimization best practices

The project timeline is estimated at 12 weeks from kickoff to launch, with regular milestone reviews and client feedback sessions.`,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-28T14:30:00Z',
    attachments: [
      { id: 'a1', name: 'Project_Scope.pdf', url: '#', type: 'pdf', size: 2500000 },
      { id: 'a2', name: 'Design_Mockups.zip', url: '#', type: 'zip', size: 15000000 },
    ],
    value: 45000,
  },
  '2': {
    id: '2',
    name: 'Mobile App Development',
    client: 'TechStart Inc',
    clientEmail: 'hello@techstart.io',
    clientPhone: '+1 (555) 987-6543',
    status: 'pending',
    description: 'Development of iOS and Android mobile applications for customer engagement platform.',
    createdAt: '2025-01-20T14:30:00Z',
    value: 78000,
  },
  '3': {
    id: '3',
    name: 'E-commerce Platform',
    client: 'RetailPlus',
    clientEmail: 'projects@retailplus.com',
    status: 'draft',
    description: 'Full-scale e-commerce solution with inventory management and payment integration.',
    createdAt: '2025-01-22T09:15:00Z',
    value: 95000,
  },
  '4': {
    id: '4',
    name: 'Cloud Migration Services',
    client: 'DataFlow Systems',
    clientEmail: 'tech@dataflow.com',
    status: 'rejected',
    description: 'Migration of legacy infrastructure to AWS cloud with improved scalability.',
    createdAt: '2025-01-10T16:45:00Z',
    value: 65000,
  },
  '5': {
    id: '5',
    name: 'CRM Integration Project',
    client: 'Sales Force Pro',
    clientEmail: 'info@salesforcepro.com',
    status: 'approved',
    description: 'Integration of Salesforce CRM with existing business processes and workflows.',
    createdAt: '2025-01-18T11:20:00Z',
    value: 32000,
  },
  '6': {
    id: '6',
    name: 'Security Audit & Compliance',
    client: 'FinanceSecure Ltd',
    clientEmail: 'security@financesecure.com',
    status: 'pending',
    description: 'Comprehensive security audit and implementation of compliance measures.',
    createdAt: '2025-01-25T08:00:00Z',
    value: 28000,
  },
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ProposalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API fetch
    const fetchProposal = async () => {
      setIsLoading(true);
      setError(null);
      
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (id && mockProposals[id]) {
        setProposal(mockProposals[id]);
      } else {
        setError('Proposal not found');
      }
      
      setIsLoading(false);
    };

    fetchProposal();
  }, [id]);

  if (isLoading) {
    return (
      <DashboardLayout title="Proposal Details">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !proposal) {
    return (
      <DashboardLayout title="Proposal Details">
        <div className="text-center py-12 space-y-4">
          <p className="text-destructive">{error || 'Proposal not found'}</p>
          <Button variant="outline" onClick={() => navigate('/proposals')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Proposals
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Proposal Details">
      <div className="space-y-6 max-w-4xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/proposals')}
          className="text-muted-foreground hover:text-foreground -ml-3"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Proposals
        </Button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{proposal.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <ProposalStatusBadge status={proposal.status} />
              {proposal.value && (
                <span className="text-lg font-semibold text-primary">
                  ${proposal.value.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-line leading-relaxed">
                  {proposal.description}
                </p>
              </CardContent>
            </Card>

            {/* Attachments */}
            {proposal.attachments && proposal.attachments.length > 0 && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {proposal.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Client info */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="text-sm font-medium text-foreground">{proposal.client}</p>
                  </div>
                </div>

                {proposal.clientEmail && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium text-foreground">{proposal.clientEmail}</p>
                    </div>
                  </div>
                )}

                {proposal.clientPhone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium text-foreground">{proposal.clientPhone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(proposal.createdAt), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {proposal.updatedAt && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(proposal.updatedAt), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProposalDetails;
