import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Send,
  ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import { Proposal, ReviewerComment, WorkflowLog } from '@/types';

interface FinalReviewSummaryProps {
  proposal: Proposal;
  comments: ReviewerComment[];
  logs: WorkflowLog[];
  isReviewer1: boolean;
}

/**
 * Screen 4: Final Review Summary
 * Shows all changes and information before locking
 */
const FinalReviewSummary: React.FC<FinalReviewSummaryProps> = ({
  proposal,
  comments,
  logs,
  isReviewer1,
}) => {
  // Only show for Reviewer 1 when proposal is finalised
  if (!isReviewer1 || proposal.status !== 'finalised') {
    return null;
  }

  const reviewer2Assessment = comments.find(c => c.review_form_data?.academicMerit);
  const formData = reviewer2Assessment?.review_form_data || {};

  return (
    <Card className="border-2 border-amber-500/30">
      <CardHeader className="bg-amber-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            Final Review Summary
          </CardTitle>
          <Badge className="bg-amber-600">Pre-Lock Review</Badge>
        </div>
        <CardDescription>
          Review all information before locking this proposal. Once locked, no changes can be made.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Proposal Overview */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            Proposal Overview
          </h4>
          <div className="grid gap-3 text-sm bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title</span>
              <span className="font-medium text-right">{proposal.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Number</span>
              <span className="font-mono">{proposal.ticket_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Book Type</span>
              <span>{proposal.book_type || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Word Count</span>
              <span>{proposal.word_count || 'N/A'}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Author Information */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            Author Information
          </h4>
          <div className="grid gap-3 text-sm bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{proposal.author_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="break-all">{proposal.author_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Institution</span>
              <span>{proposal.institution || 'N/A'}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Assessment Summary */}
        {reviewer2Assessment && (
          <>
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Reviewer 2 Assessment
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Academic</p>
                  <p className="text-lg font-bold">{formData.academicMerit || '-'}/10</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Market</p>
                  <p className="text-lg font-bold">{formData.marketPotential || '-'}/10</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Originality</p>
                  <p className="text-lg font-bold">{formData.originalityScore || '-'}/10</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Writing</p>
                  <p className="text-lg font-bold">{formData.writingQuality || '-'}/10</p>
                </div>
              </div>
              {formData.isDuplicate && (
                <div className="flex items-center gap-2 text-amber-600 text-sm p-2 bg-amber-500/10 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Potential duplicate flagged</span>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Contract Status */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <Send className="h-4 w-4" />
            Contract Status
          </h4>
          <div className="flex items-center gap-2 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">Contract Sent to Author</p>
              <p className="text-xs text-muted-foreground">
                {proposal.contract_sent_at 
                  ? `Sent on ${format(new Date(proposal.contract_sent_at), 'MMMM d, yyyy')}`
                  : 'Contract has been sent'}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Review Timeline
          </h4>
          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lock Warning */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700">Ready to Lock</p>
            <p className="text-sm text-muted-foreground">
              Locking this proposal will prevent any further changes. Make sure all information 
              is correct before proceeding.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalReviewSummary;
