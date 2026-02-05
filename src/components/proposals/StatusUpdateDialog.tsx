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
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { Loader2 } from 'lucide-react';
 
 interface StatusUpdateDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   currentStatus: string;
   onUpdate: (data: { status: string; notes?: string }) => void;
   isLoading: boolean;
 }
 
 const statusOptions = [
   { value: 'new', label: 'New' },
   { value: 'under_review', label: 'Under Review' },
   { value: 'approved', label: 'Approved' },
   { value: 'rejected', label: 'Rejected' },
   { value: 'revision_requested', label: 'Revision Requested' },
   { value: 'contract_sent', label: 'Contract Sent' },
   { value: 'finalised', label: 'Finalised' },
 ];
 
 const StatusUpdateDialog: React.FC<StatusUpdateDialogProps> = ({
   open,
   onOpenChange,
   currentStatus,
   onUpdate,
   isLoading,
 }) => {
   const [status, setStatus] = useState(currentStatus);
   const [notes, setNotes] = useState('');
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     onUpdate({ status, notes: notes.trim() || undefined });
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>Update Proposal Status</DialogTitle>
           <DialogDescription>
             Change the status of this proposal and optionally add notes.
           </DialogDescription>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="status">New Status</Label>
             <Select value={status} onValueChange={setStatus}>
               <SelectTrigger>
                 <SelectValue placeholder="Select status" />
               </SelectTrigger>
               <SelectContent>
                 {statusOptions.map((option) => (
                   <SelectItem key={option.value} value={option.value}>
                     {option.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="notes">Notes (optional)</Label>
             <Textarea
               id="notes"
               placeholder="Add any notes about this status change..."
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               rows={3}
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
             <Button type="submit" disabled={isLoading || status === currentStatus}>
               {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
               Update Status
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default StatusUpdateDialog;