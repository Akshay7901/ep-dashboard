import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Send, Lock, AlertCircle } from 'lucide-react';
import { Proposal, ProposalStatus } from '@/types';

interface ReviewerActionsProps {
  proposal: Proposal;
  isReviewer1: boolean;
  isReviewer2: boolean;
  onStatusChange: (status: ProposalStatus) => void;
  isPending: boolean;
  hasReviewer2Comments: boolean;
}

/**
 * Screen 1: Reviewer 1 (Sarah) - Accept/Decline submitted proposals
 * Read-only view with accept/decline actions for new submissions
 */
export const Reviewer1SubmittedActions: React.FC<{
  proposal: Proposal;
  onStatusChange: (status: ProposalStatus) => void;
  isPending: boolean;
}> = ({ proposal, onStatusChange, isPending }) => {
  if (proposal.status !== 'submitted') return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Initial Review</CardTitle>
          <Badge variant="outline" className="text-xs">Step 1 of 4</Badge>
        </div>
        <CardDescription>
          Review this new submission and decide whether to accept it for full review or decline.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button 
          onClick={() => onStatusChange('under_review')}
          disabled={isPending}
          className="flex-1 sm:flex-none"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Accept for Review
        </Button>
        <Button 
          variant="destructive"
          onClick={() => onStatusChange('rejected')}
          disabled={isPending}
          className="flex-1 sm:flex-none"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Decline Submission
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Screen 2: Reviewer 2 (Amanda) - Assessment view indicator
 * Shows when proposal is under review and awaiting Reviewer 2's assessment
 */
export const Reviewer2AssessmentIndicator: React.FC<{
  proposal: Proposal;
  hasComments: boolean;
}> = ({ proposal, hasComments }) => {
  if (proposal.status !== 'under_review') return null;

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Assessment Required
          </CardTitle>
          <Badge variant="outline" className="text-xs">Step 2 of 4</Badge>
        </div>
        <CardDescription>
          {hasComments 
            ? 'Assessment submitted. Awaiting Reviewer 1 to review comments.'
            : 'Complete the assessment form below to evaluate this proposal.'}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

/**
 * Screen 3: Reviewer 1 (Sarah) - Review comments and send contract
 * After Reviewer 2 completes assessment, Reviewer 1 reviews and sends to author
 */
export const Reviewer1ApprovalActions: React.FC<{
  proposal: Proposal;
  onStatusChange: (status: ProposalStatus) => void;
  isPending: boolean;
  hasReviewer2Comments: boolean;
}> = ({ proposal, onStatusChange, isPending, hasReviewer2Comments }) => {
  if (proposal.status !== 'under_review' && proposal.status !== 'approved') return null;

  return (
    <Card className="border-green-500/20 bg-green-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Review & Approve</CardTitle>
          <Badge variant="outline" className="text-xs">Step 3 of 4</Badge>
        </div>
        <CardDescription>
          {proposal.status === 'under_review' 
            ? hasReviewer2Comments
              ? 'Reviewer 2 has submitted their assessment. Review comments below and approve if ready.'
              : 'Awaiting assessment from Reviewer 2. You can still add your own comments.'
            : 'Proposal approved. Send the contract to the author when ready.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {proposal.status === 'under_review' && (
          <Button 
            onClick={() => onStatusChange('approved')}
            disabled={isPending || !hasReviewer2Comments}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve Proposal
          </Button>
        )}
        {proposal.status === 'approved' && (
          <Button 
            onClick={() => onStatusChange('finalised')}
            disabled={isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Contract to Author
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Screen 4: Reviewer 1 (Sarah) - Final review and lock
 * After contract sent, final review of all changes before locking
 */
export const Reviewer1FinalActions: React.FC<{
  proposal: Proposal;
  onStatusChange: (status: ProposalStatus) => void;
  isPending: boolean;
}> = ({ proposal, onStatusChange, isPending }) => {
  if (proposal.status !== 'finalised') return null;

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            Final Review
          </CardTitle>
          <Badge variant="outline" className="text-xs">Step 4 of 4</Badge>
        </div>
        <CardDescription>
          Contract has been sent. Review all information one final time before locking this proposal.
          Once locked, no further changes can be made.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button 
          onClick={() => onStatusChange('locked')}
          disabled={isPending}
          variant="default"
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Lock className="h-4 w-4 mr-2" />
          Lock & Finalize Proposal
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Main ReviewerActions component that shows the appropriate actions
 * based on the user's role and proposal status
 */
const ReviewerActions: React.FC<ReviewerActionsProps> = ({
  proposal,
  isReviewer1,
  isReviewer2,
  onStatusChange,
  isPending,
  hasReviewer2Comments,
}) => {
  const isLocked = proposal.status === 'locked';

  if (isLocked) {
    return (
      <Card className="border-muted bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Proposal Locked
          </CardTitle>
          <CardDescription>
            This proposal has been finalized and locked. No further changes can be made.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Reviewer 1 (Sarah) actions
  if (isReviewer1) {
    return (
      <div className="space-y-4">
        <Reviewer1SubmittedActions 
          proposal={proposal} 
          onStatusChange={onStatusChange} 
          isPending={isPending} 
        />
        <Reviewer1ApprovalActions 
          proposal={proposal} 
          onStatusChange={onStatusChange} 
          isPending={isPending}
          hasReviewer2Comments={hasReviewer2Comments}
        />
        <Reviewer1FinalActions 
          proposal={proposal} 
          onStatusChange={onStatusChange} 
          isPending={isPending} 
        />
      </div>
    );
  }

  // Reviewer 2 (Amanda) indicator
  if (isReviewer2) {
    return (
      <Reviewer2AssessmentIndicator 
        proposal={proposal} 
        hasComments={hasReviewer2Comments} 
      />
    );
  }

  return null;
};

export default ReviewerActions;
