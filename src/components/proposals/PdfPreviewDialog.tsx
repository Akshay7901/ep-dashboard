 import React from 'react';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Download, ExternalLink, X } from 'lucide-react';
 
 interface PdfPreviewDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   pdfUrl: string;
   fileName: string;
 }
 
 const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({
   open,
   onOpenChange,
   pdfUrl,
   fileName,
 }) => {
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
         <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
           <div className="flex items-center justify-between">
             <DialogTitle className="text-lg font-semibold truncate pr-4">
               {fileName}
             </DialogTitle>
             <div className="flex items-center gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 asChild
               >
                 <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                   <ExternalLink className="h-4 w-4 mr-2" />
                   Open in New Tab
                 </a>
               </Button>
               <Button
                 variant="default"
                 size="sm"
                 asChild
               >
                 <a href={pdfUrl} download={fileName}>
                   <Download className="h-4 w-4 mr-2" />
                   Download
                 </a>
               </Button>
             </div>
           </div>
         </DialogHeader>
         <div className="flex-1 overflow-hidden bg-muted">
           <iframe
             src={`${pdfUrl}#toolbar=1&navpanes=0`}
             className="w-full h-full border-0"
             title={`Preview of ${fileName}`}
           />
         </div>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default PdfPreviewDialog;