import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProposalStatusBadge from '@/components/proposals/ProposalStatusBadge';
import ReviewerActions from '@/components/proposals/ReviewerActions';
import AssessmentForm from '@/components/proposals/AssessmentForm';
import Reviewer1CommentForm from '@/components/proposals/Reviewer1CommentForm';
import ReviewCommentsDisplay from '@/components/proposals/ReviewCommentsDisplay';
import FinalReviewSummary from '@/components/proposals/FinalReviewSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProposal, useUpdateProposalStatus, useProposalComments, useWorkflowLogs } from '@/hooks/useProposals';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Loader2,
  Lock,
  FileText,
  Hash,
  RefreshCw,
  FileCheck,
  Download,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';

const ProposalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isReviewer1, isReviewer2 } = useAuth();
  
  const { data: proposal, isLoading, error } = useProposal(id || '');
  const { data: comments = [] } = useProposalComments(id || '');
  const { data: logs = [] } = useWorkflowLogs(id || '');
  const updateStatus = useUpdateProposalStatus();

  const handleStatusChange = (newStatus: 'under_review' | 'approved' | 'rejected' | 'finalised' | 'locked') => {
    if (!proposal) return;
    updateStatus.mutate({
      id: proposal.id,
      status: newStatus,
      previousStatus: proposal.status,
    });
  };

  // Check if Reviewer 2 has submitted comments
  const hasReviewer2Comments = comments.some(c => c.review_form_data?.submittedForAuthorization);

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
          <p className="text-destructive">Proposal not found</p>
          <Button variant="outline" onClick={() => navigate('/proposals')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Proposals
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isLocked = proposal.status === 'locked';

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
            <div className="flex items-center gap-3 mb-1">
              {proposal.ticket_number && (
                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {proposal.ticket_number}
                </span>
              )}
              {proposal.current_revision && (
                <span className="text-xs text-muted-foreground">
                  Rev. {proposal.current_revision}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{proposal.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <ProposalStatusBadge status={proposal.status} />
              {proposal.value && (
                <span className="text-lg font-semibold text-primary">
                  £{proposal.value.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reviewer Actions - Role-based workflow steps */}
        <ReviewerActions
          proposal={proposal}
          isReviewer1={isReviewer1}
          isReviewer2={isReviewer2}
          onStatusChange={handleStatusChange}
          isPending={updateStatus.isPending}
          hasReviewer2Comments={hasReviewer2Comments}
        />

        {/* Screen 4: Final Review Summary (Reviewer 1 only, when finalised) */}
        <FinalReviewSummary
          proposal={proposal}
          comments={comments}
          logs={logs}
          isReviewer1={isReviewer1}
        />

        {/* Screen 2: Assessment Form (Reviewer 2 only) */}
        <AssessmentForm
          proposal={proposal}
          isReviewer2={isReviewer2}
        />

        {/* Review Comments Display (for Reviewer 1 to review) */}
        {isReviewer1 && comments.length > 0 && (
          <ReviewCommentsDisplay
            comments={comments}
            isReviewer1={isReviewer1}
          />
        )}

        {/* Screen 3: Reviewer 1 Additional Comments Form */}
        <Reviewer1CommentForm
          proposal={proposal}
          isReviewer1={isReviewer1}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Short Description */}
            {proposal.short_description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Short Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line leading-relaxed">
                    {proposal.short_description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Detailed Description */}
            {proposal.detailed_description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line leading-relaxed">
                    {proposal.detailed_description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Table of Contents */}
            {proposal.table_of_contents && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Table of Contents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line leading-relaxed font-mono text-sm">
                    {proposal.table_of_contents}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Marketing Info */}
            {proposal.marketing_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Marketing Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line leading-relaxed">
                    {proposal.marketing_info}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Referees/Reviewers */}
            {proposal.referees_reviewers && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Referees / Reviewers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line leading-relaxed">
                    {proposal.referees_reviewers}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* File Uploads */}
            {proposal.file_uploads && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Uploaded Files
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {proposal.file_uploads.split(',').map((url, index) => {
                      const trimmedUrl = url.trim();
                      const fileName = trimmedUrl.split('/').pop() || `File ${index + 1}`;
                      return (
                        <a
                          key={index}
                          href={trimmedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                        >
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-foreground truncate flex-1">
                            {decodeURIComponent(fileName.replace(/_/g, ' ').replace(/\.docx$|\.pdf$|\.doc$/i, ''))}
                          </span>
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </a>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submission Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Submission Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">CV Submitted</span>
                    <span className={proposal.cv_submitted === 'Yes' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                      {proposal.cv_submitted || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sample Chapter</span>
                    <span className={proposal.sample_chapter_submitted === 'Yes' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                      {proposal.sample_chapter_submitted || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">TOC Submitted</span>
                    <span className={proposal.toc_submitted === 'Yes' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                      {proposal.toc_submitted || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Permissions Required</span>
                    <span className="text-foreground">
                      {proposal.permissions_required || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Permissions Docs</span>
                    <span className="text-foreground">
                      {proposal.permissions_docs_submitted || 'N/A'}
                    </span>
                  </div>
                  {proposal.figures_tables_count && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Figures/Tables Count</span>
                      <span className="text-foreground">{proposal.figures_tables_count}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Under Review Elsewhere */}
            {proposal.under_review_elsewhere && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Review Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">
                    {proposal.under_review_elsewhere}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Workflow History */}
            {logs && logs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <p className="text-foreground">{log.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Author info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Author Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Author</p>
                    <p className="text-sm font-medium text-foreground">
                      {proposal.author_name}
                    </p>
                    {proposal.job_title && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {proposal.job_title}
                      </p>
                    )}
                    {proposal.institution && (
                      <p className="text-xs text-muted-foreground">
                        {proposal.institution}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground break-all">
                      {proposal.author_email}
                    </p>
                    {proposal.secondary_email && (
                      <p className="text-xs text-muted-foreground break-all">
                        {proposal.secondary_email}
                      </p>
                    )}
                  </div>
                </div>

                {proposal.address && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm text-foreground">
                        {proposal.address}
                      </p>
                    </div>
                  </div>
                )}

                {proposal.biography && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Biography</p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {proposal.biography}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Book/Proposal Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Book Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proposal.sub_title && (
                  <div>
                    <p className="text-xs text-muted-foreground">Subtitle</p>
                    <p className="text-sm font-medium text-foreground">
                      {proposal.sub_title}
                    </p>
                  </div>
                )}

                {proposal.book_type && (
                  <div>
                    <p className="text-xs text-muted-foreground">Book Type</p>
                    <p className="text-sm font-medium text-foreground">
                      {proposal.book_type}
                    </p>
                  </div>
                )}

                {proposal.keywords && (
                  <div>
                    <p className="text-xs text-muted-foreground">Keywords</p>
                    <p className="text-sm text-foreground">
                      {proposal.keywords}
                    </p>
                  </div>
                )}

                {proposal.word_count && (
                  <div>
                    <p className="text-xs text-muted-foreground">Word Count</p>
                    <p className="text-sm font-medium text-foreground">
                      {proposal.word_count}
                    </p>
                  </div>
                )}

                {proposal.expected_completion_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Completion</p>
                    <p className="text-sm font-medium text-foreground">
                      {proposal.expected_completion_date}
                    </p>
                  </div>
                )}

                {proposal.co_authors_editors && (
                  <div>
                    <p className="text-xs text-muted-foreground">Co-Authors / Editors</p>
                    <p className="text-sm text-foreground">
                      {proposal.co_authors_editors}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Proposal Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proposal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proposal.ticket_number && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ticket Number</p>
                      <p className="text-sm font-medium font-mono text-foreground">
                        {proposal.ticket_number}
                      </p>
                    </div>
                  </div>
                )}

                {proposal.current_revision && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Revision</p>
                      <p className="text-sm font-medium text-foreground">
                        {proposal.current_revision}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                <div>
                    <p className="text-xs text-muted-foreground">Contract Status</p>
                    <p className="text-sm font-medium text-foreground">
                      {proposal.contract_sent ? (
                        <span className="text-primary">
                          Sent {proposal.contract_sent_at && `on ${format(new Date(proposal.contract_sent_at), 'MMM d, yyyy')}`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not sent</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(proposal.created_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {proposal.updated_at && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(proposal.updated_at), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {proposal.finalised_at && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Finalized</p>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(proposal.finalised_at), 'MMMM d, yyyy')}
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
