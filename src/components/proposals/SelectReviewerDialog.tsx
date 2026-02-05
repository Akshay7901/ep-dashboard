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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { usePeerReviewers } from '@/hooks/usePeerReviewers';

interface SelectReviewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reviewerId: string) => void;
  isLoading?: boolean;
}

const SelectReviewerDialog: React.FC<SelectReviewerDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const { reviewers, isLoading: isLoadingReviewers } = usePeerReviewers();

  const handleConfirm = () => {
    if (selectedReviewer) {
      onConfirm(selectedReviewer);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReviewer('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Reviewer</DialogTitle>
          <DialogDescription>
            Choose a reviewer from the dropdown below to notify them about this proposal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reviewer">Select Reviewer</Label>
            {isLoadingReviewers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : reviewers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No reviewers available. Please add peer reviewers first.
              </p>
            ) : (
              <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Choose a reviewer..." />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {reviewers.map((reviewer) => (
                    <SelectItem key={reviewer.id} value={reviewer.id}>
                      {reviewer.name || reviewer.email.split('@')[0]} - {reviewer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !selectedReviewer || reviewers.length === 0}
            className="bg-[#3d5a47] hover:bg-[#2e4536]"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectReviewerDialog;
