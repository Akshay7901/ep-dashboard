import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { usePeerReviewers } from '@/hooks/usePeerReviewers';

interface AssignReviewersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (reviewerEmails: string[], note?: string) => void;
  isLoading: boolean;
  currentAssignedEmail?: string;
}

const AssignReviewersDialog: React.FC<AssignReviewersDialogProps> = ({
  open,
  onOpenChange,
  onAssign,
  isLoading,
  currentAssignedEmail,
}) => {
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const { reviewers, isLoading: isLoadingReviewers } = usePeerReviewers();

  const selectedReviewerObj = reviewers.find((r) => String(r.id) === selectedReviewer);
  const isSameReviewer = !!(currentAssignedEmail && selectedReviewerObj?.email === currentAssignedEmail);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReviewerObj && !isSameReviewer) {
      onAssign([selectedReviewerObj.email], note.trim() || undefined);
    }
  };
 
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {currentAssignedEmail ? 'Reassign Peer Reviewer' : 'Assign Peer Reviewers'}
          </DialogTitle>
          <DialogDescription>
            {currentAssignedEmail
              ? 'Select a different peer reviewer to reassign this proposal.'
              : 'Select peer reviewers to assign to this proposal for review.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLoadingReviewers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviewers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No peer reviewers available. Create one first.
            </p>
          ) : (
            <RadioGroup value={selectedReviewer} onValueChange={setSelectedReviewer} className="space-y-3 max-h-64 overflow-y-auto">
              {reviewers.map((reviewer) => {
                const isCurrentlyAssigned = currentAssignedEmail === reviewer.email;
                return (
                  <div
                    key={reviewer.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 ${isCurrentlyAssigned ? 'border-primary/30 bg-muted/30' : ''}`}
                  >
                    <RadioGroupItem
                      value={String(reviewer.id)}
                      id={String(reviewer.id)}
                    />
                    <Label
                      htmlFor={String(reviewer.id)}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{reviewer.name}</span>
                        {isCurrentlyAssigned && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            Currently assigned
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs font-normal">
                          {reviewer.assigned_proposals_count ?? 0} assigned
                        </Badge>
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {reviewer.email}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          )}

          <div className="space-y-2">
            <Label htmlFor="reviewer-note" className="text-sm font-medium">
              Note for Reviewer <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="reviewer-note"
              placeholder="E.g., Please pay particular attention to the methodology section."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !selectedReviewer || isSameReviewer}
              title={isSameReviewer ? 'Select a different reviewer to reassign' : ''}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {currentAssignedEmail ? 'Reassign Reviewer' : 'Assign Reviewer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignReviewersDialog;
