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
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import { Loader2, UserPlus } from 'lucide-react';
  import { Badge } from '@/components/ui/badge';
  import { usePeerReviewers } from '@/hooks/usePeerReviewers';
interface AssignReviewersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (reviewerEmails: string[]) => void;
  isLoading: boolean;
}
 
 const AssignReviewersDialog: React.FC<AssignReviewersDialogProps> = ({
   open,
   onOpenChange,
   onAssign,
   isLoading,
 }) => {
   const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
   const { reviewers, isLoading: isLoadingReviewers } = usePeerReviewers();
 
   const handleToggle = (reviewerId: string) => {
     setSelectedReviewers((prev) =>
       prev.includes(reviewerId)
         ? prev.filter((id) => id !== reviewerId)
         : [...prev, reviewerId]
     );
   };
 
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert selected reviewer IDs to emails
    const selectedEmails = reviewers
      .filter((r) => selectedReviewers.includes(r.id))
      .map((r) => r.email);
    onAssign(selectedEmails);
  };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <UserPlus className="h-5 w-5" />
             Assign Peer Reviewers
           </DialogTitle>
           <DialogDescription>
             Select peer reviewers to assign to this proposal for review.
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
             <div className="space-y-3 max-h-64 overflow-y-auto">
               {reviewers.map((reviewer) => (
                 <div
                   key={reviewer.id}
                   className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50"
                 >
                   <Checkbox
                     id={reviewer.id}
                     checked={selectedReviewers.includes(reviewer.id)}
                     onCheckedChange={() => handleToggle(reviewer.id)}
                   />
                    <Label
                      htmlFor={reviewer.id}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{reviewer.name}</span>
                        <Badge variant="outline" className="text-xs font-normal">
                          {reviewer.assigned_proposals_count ?? 0} assigned
                        </Badge>
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {reviewer.email}
                      </span>
                    </Label>
                 </div>
               ))}
             </div>
           )}
 
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
               disabled={isLoading || selectedReviewers.length === 0}
             >
               {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
               Assign ({selectedReviewers.length})
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default AssignReviewersDialog;