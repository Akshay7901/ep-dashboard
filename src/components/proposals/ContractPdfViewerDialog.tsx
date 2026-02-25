import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink, AlertCircle } from "lucide-react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

interface ContractPdfViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentDataUrl: string | null;
  isLoading: boolean;
  downloadUrl?: string;
  downloadFileName?: string;
}

const dataUrlToBytes = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const dataUrlToBlob = (dataUrl: string) => {
  const mimeMatch = dataUrl.match(/^data:(.*?);base64,/);
  const mimeType = mimeMatch?.[1] || "application/pdf";
  return new Blob([dataUrlToBytes(dataUrl)], { type: mimeType });
};

const ContractPdfViewerDialog: React.FC<ContractPdfViewerDialogProps> = ({
  open,
  onOpenChange,
  documentDataUrl,
  isLoading,
  downloadUrl,
  downloadFileName = "contract.pdf",
}) => {
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !documentDataUrl || !pagesContainerRef.current) return;

    let isCancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;

    const renderPdfPages = async () => {
      setIsRendering(true);
      setRenderError(null);

      const container = pagesContainerRef.current;
      if (!container) return;

      container.innerHTML = "";

      try {
        loadingTask = getDocument({ data: dataUrlToBytes(documentDataUrl) });
        const pdf = await loadingTask.promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (isCancelled) break;

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const targetWidth = Math.max(Math.min(container.clientWidth - 24, 980), 320);
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale: Number.isFinite(scale) ? scale : 1.2 });

          const pageWrapper = document.createElement("div");
          pageWrapper.className = "mb-4 rounded-md border bg-background overflow-hidden shadow-sm";

          const pageLabel = document.createElement("p");
          pageLabel.className = "px-3 py-2 text-xs text-muted-foreground border-b bg-muted/40";
          pageLabel.innerText = `Page ${pageNumber}`;

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "block w-full h-auto";

          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Unable to create PDF render context.");
          }

          await page.render({ canvasContext: context, viewport, canvas }).promise;

          if (isCancelled) break;

          pageWrapper.appendChild(pageLabel);
          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);
        }
      } catch (error) {
        if (!isCancelled) {
          setRenderError(
            error instanceof Error ? error.message : "Failed to render this PDF in the browser."
          );
        }
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    };

    renderPdfPages();

    return () => {
      isCancelled = true;
      loadingTask?.destroy();
    };
  }, [open, documentDataUrl]);

  const handleOpen = () => {
    if (documentDataUrl) {
      const blobUrl = URL.createObjectURL(dataUrlToBlob(documentDataUrl));
      const popup = window.open(blobUrl, "_blank", "noopener,noreferrer");

      if (!popup) {
        URL.revokeObjectURL(blobUrl);
        setRenderError("Unable to open a new tab. Please allow pop-ups for this site.");
        return;
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    }

    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    const href = documentDataUrl ? URL.createObjectURL(dataUrlToBlob(documentDataUrl)) : downloadUrl;
    if (!href) return;

    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = downloadFileName;
    anchor.click();

    if (documentDataUrl) {
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[94vw] h-[88vh] flex flex-col p-0 gap-0" aria-describedby={undefined}>
        <div className="flex items-center justify-between px-6 py-4 border-b gap-3">
          <div className="min-w-0">
            <DialogTitle className="text-lg font-semibold truncate">Contract Document</DialogTitle>
            <DialogDescription className="text-xs mt-1">Rendered with a browser-safe viewer.</DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpen} disabled={!documentDataUrl && !downloadUrl}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </Button>

            <Button size="sm" onClick={handleDownload} disabled={!documentDataUrl && !downloadUrl}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-muted/20">
          {isLoading || isRendering ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document…</p>
            </div>
          ) : renderError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{renderError}</p>
              <p className="text-xs text-muted-foreground">Try opening or downloading the document.</p>
            </div>
          ) : documentDataUrl ? (
            <div ref={pagesContainerRef} className="h-full overflow-auto p-4" />
          ) : (
            <div className="h-full flex items-center justify-center px-6">
              <p className="text-sm text-destructive">Failed to load contract document.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractPdfViewerDialog;
