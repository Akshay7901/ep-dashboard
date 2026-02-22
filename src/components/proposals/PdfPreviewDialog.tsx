import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
  fileName: string;
  fileType: 'pdf' | 'word';
}
const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
  open,
  onOpenChange,
  documentUrl,
  fileName,
  fileType
}) => {
  const [isLoading, setIsLoading] = useState(true);

  // For Word docs, use Google Docs Viewer; for PDFs, embed directly
  const getPreviewUrl = () => {
    if (fileType === 'word') {
      return `https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`;
    }
    return `${documentUrl}#toolbar=1&navpanes=0`;
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
         <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
           <div className="flex items-center justify-between">
             <DialogTitle className="text-lg font-semibold truncate pr-4">
               {fileName}
             </DialogTitle>
             <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" asChild>
                
               </Button>
               <Button variant="default" size="sm" className="bg-[#3d5a47] hover:bg-[#3d5a47]/90 text-white" asChild>
                <a href={documentUrl} download={fileName}>
                   <Download className="h-4 w-4 mr-2" />
                   Download
                 </a>
               </Button>
             </div>
           </div>
         </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted relative">
          {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>}
           <iframe src={getPreviewUrl()} className={`w-full h-full border-0 ${isLoading ? 'invisible' : 'visible'}`} title={`Preview of ${fileName}`} onLoad={() => setIsLoading(false)} />
         </div>
       </DialogContent>
     </Dialog>;
};
export default DocumentPreviewDialog;