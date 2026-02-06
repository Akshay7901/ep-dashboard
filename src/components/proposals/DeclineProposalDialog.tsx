import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DeclineProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const DeclineProposalDialog: React.FC<DeclineProposalDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline Proposal</DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to decline this proposal? This action will notify the author that their submission has been declined.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-[#9b2c2c] hover:bg-[#822727]"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Decline Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeclineProposalDialog;
