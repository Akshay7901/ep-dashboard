import React, { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Clock, Loader2, Send, FileText, Upload, ClipboardList, Download } from "lucide-react";
import type { InfoRequest } from "@/lib/proposalsApi";
import type { Proposal } from "@/types";

// Document-type keys that need file upload instead of text input
const DOCUMENT_KEYS = new Set(["cv", "sample_chapter", "toc_doc", "permissions_docs"]);

// Proposal field mapping for pre-filling text fields
const PROPOSAL_FIELD_MAP: Record<string, keyof Proposal> = {
  biography: "biography",
  word_count: "word_count",
  short_description: "short_description",
  detailed_description: "detailed_description",
  keywords: "keywords",
  table_of_contents: "table_of_contents",
  co_authors_editors: "co_authors_editors",
  referees_reviewers: "referees_reviewers",
  under_review_elsewhere: "under_review_elsewhere",
  permissions_required: "permissions_required",
  marketing_info: "marketing_info",
};

// Reverse mapping: item key → category label
const CATEGORY_MAP: Record<string, string> = {
  biography: "AUTHOR INFO",
  word_count: "BOOK INFO",
  short_description: "BOOK INFO",
  detailed_description: "BOOK INFO",
  keywords: "BOOK INFO",
  table_of_contents: "BOOK INFO",
  co_authors_editors: "COLLABORATION",
  referees_reviewers: "COLLABORATION",
  under_review_elsewhere: "ADDITIONAL INFO",
  permissions_required: "ADDITIONAL INFO",
  marketing_info: "ADDITIONAL INFO",
  cv: "SUPPORTING DOCUMENTS",
  sample_chapter: "SUPPORTING DOCUMENTS",
  toc_doc: "SUPPORTING DOCUMENTS",
  permissions_docs: "SUPPORTING DOCUMENTS",
};

interface InfoRequestPanelProps {
  infoRequests: InfoRequest[];
  isLoading: boolean;
  viewAs: "author" | "reviewer";
  proposal?: Proposal;
  onRespond?: (requestId: number, responseNote: string, updatedFields: Record<string, string>, files?: Record<string, File>) => void;
  isResponding?: boolean;
  onSaveDraft?: (requestId: number, updatedFields: Record<string, string>) => void;
  isSavingDraft?: boolean;
  onAutoSave?: (requestId: number, updatedFields: Record<string, string>) => void;
  readOnly?: boolean;
}

const InfoRequestPanel: React.FC<InfoRequestPanelProps> = ({
  infoRequests,
  isLoading,
  viewAs,
  proposal,
  onRespond,
  isResponding,
  onSaveDraft,
  isSavingDraft,
  onAutoSave,
  readOnly = false,
}) => {
  const [responseNote, setResponseNote] = useState("");
  const [updatedFields, setUpdatedFields] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [initialized, setInitialized] = useState(false);

  const pendingRequest = infoRequests.find((r) => r.status === "pending" || r.status === "open");
  const pastRequests = infoRequests.filter((r) => r.status !== "pending" && r.status !== "open");

  // Pre-fill fields: prioritize draft_data (saved via /save), then proposal data, then updated_fields
  React.useEffect(() => {
    if (pendingRequest && proposal && !initialized) {
      const prefilled: Record<string, string> = {};
      const draft = pendingRequest.draft_data;
      
      pendingRequest.items.forEach((item) => {
        if (!DOCUMENT_KEYS.has(item.key)) {
          // Only restore draft_data (saved via /save endpoint) — do NOT pre-fill from proposal
          if (draft && draft[item.key] !== undefined && draft[item.key] !== null) {
            prefilled[item.key] = draft[item.key];
          }
        }
      });
      
      setUpdatedFields(prefilled);
      lastSavedRef.current = JSON.stringify(prefilled);
      setInitialized(true);
    }
  }, [pendingRequest, proposal, initialized]);

  // Auto-save draft when fields change (debounced 2s)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const triggerAutoSave = useCallback(
    (fields: Record<string, string>) => {
      const saveFn = onAutoSave || onSaveDraft;
      if (!pendingRequest || !saveFn) return;
      // Skip if nothing meaningful to save
      if (Object.values(fields).every((v) => !v.trim())) return;
      // Skip if unchanged from last save
      const snapshot = JSON.stringify(fields);
      if (snapshot === lastSavedRef.current) return;

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        lastSavedRef.current = snapshot;
        saveFn(pendingRequest.id, fields);
      }, 2000);
    },
    [pendingRequest, onSaveDraft, onAutoSave]
  );

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  // Reset when pending request ID changes (but skip initial mount)
  const prevRequestId = useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (prevRequestId.current !== undefined && prevRequestId.current !== pendingRequest?.id) {
      setInitialized(false);
      setResponseNote("");
      setUpdatedFields({});
      setUploadedFiles({});
    }
    prevRequestId.current = pendingRequest?.id;
  }, [pendingRequest?.id]);

  const handleSubmitResponse = () => {
    if (!pendingRequest || !onRespond) return;
    onRespond(pendingRequest.id, responseNote.trim(), updatedFields, Object.keys(uploadedFiles).length > 0 ? uploadedFiles : undefined);
  };

  const handleFileSelect = (key: string, file: File | null) => {
    setUploadedFiles((prev) => {
      if (!file) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: file };
    });
  };

  if (isLoading) {
    return <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>;
  }

  if (infoRequests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Pending request - Author action form */}
      {pendingRequest && viewAs === "author" && !readOnly && (
        <>
          {/* Yellow banner */}
          <div className="bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#D97706] mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-sm text-foreground">Additional Information Requested</h3>
                {pendingRequest.requested_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requested on {format(new Date(pendingRequest.requested_at), "MMMM d, yyyy")}
                  </p>
                )}
                {pendingRequest.note && (
                  <p className="text-sm text-muted-foreground mt-2">{pendingRequest.note}</p>
                )}
              </div>
            </div>
          </div>

          {/* Item cards */}
          <div className="space-y-5">
            {pendingRequest.items.map((item) => {
              const isDocument = DOCUMENT_KEYS.has(item.key);
              const categoryLabel = CATEGORY_MAP[item.key] || "OTHER";

              return (
                <Card key={item.key} className="border rounded-lg shadow-none">
                  {/* Card header with category badge + field name */}
                  <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b">
                    <Badge className="bg-[#3d5a47] text-white hover:bg-[#3d5a47] text-[10px] font-semibold tracking-wider px-2.5 py-0.5 rounded">
                      {categoryLabel}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    {/* Why this is needed */}
                    {item.note && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">Why this is needed:</span>
                        </div>
                        <div className="bg-muted/50 border rounded-md p-3">
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.note}</p>
                        </div>
                      </div>
                    )}

                    {/* Your Response - text input */}
                    {!isDocument && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground">Your Response:</Label>
                        <Textarea
                          placeholder="Provide the requested information here..."
                          value={updatedFields[item.key] || ""}
                          onChange={(e) => {
                            const newFields = { ...updatedFields, [item.key]: e.target.value };
                            setUpdatedFields(newFields);
                            triggerAutoSave(newFields);
                          }}
                          className="min-h-[100px] resize-none"
                        />
                      </div>
                    )}

                    {/* File upload - only for document-type items */}
                    {isDocument && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Upload document:</Label>
                        {uploadedFiles[item.key] ? (
                          <div className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30">
                            <FileText className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{uploadedFiles[item.key].name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(uploadedFiles[item.key].size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive shrink-0"
                              onClick={() => handleFileSelect(item.key, null)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <label className="block border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground hover:border-muted-foreground/40 transition-colors cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    import("@/hooks/use-toast").then(({ toast }) => {
                                      toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 10MB." });
                                    });
                                    return;
                                  }
                                  handleFileSelect(item.key, file);
                                }
                                e.target.value = "";
                              }}
                            />
                            <Upload className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm">Click to upload or drag and drop</p>
                            <p className="text-xs mt-1">PDF, DOC, DOCX (max. 10MB)</p>
                          </label>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {/* Hide Save as Draft when all requested items are document uploads only */}
            {!pendingRequest.items.every((item) => DOCUMENT_KEYS.has(item.key)) && (
              <Button
                variant="outline"
                className="px-6"
                disabled={isSavingDraft || isResponding || (Object.values(updatedFields).every((v) => !v.trim()) && Object.keys(uploadedFiles).length === 0)}
                onClick={() => {
                  if (pendingRequest && onSaveDraft) {
                    onSaveDraft(pendingRequest.id, updatedFields);
                  }
                }}
              >
                {isSavingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save as Draft
              </Button>
            )}
            <Button
              className="bg-[#3d5a47] hover:bg-[#3d5a47]/90 px-6"
              onClick={handleSubmitResponse}
              disabled={
                isResponding ||
                isSavingDraft ||
                !pendingRequest?.items.every((item) => {
                  if (DOCUMENT_KEYS.has(item.key)) {
                    return !!uploadedFiles[item.key];
                  }
                  return !!(updatedFields[item.key]?.trim());
                })
              }
            >
              {isResponding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Submit Response
            </Button>
          </div>
        </>
      )}

      {/* Pending request - DR view (read-only) */}
      {pendingRequest && viewAs === "reviewer" && (
        <Card className="border-[#D97706]/30 bg-[#D97706]/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-[#D97706]" />
              Awaiting Author Response
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {pendingRequest.items.map((item) => (
                <div key={item.key} className="flex flex-col gap-0.5">
                  <Badge variant="secondary" className="text-xs py-1 w-fit">
                    {item.label}
                  </Badge>
                  {item.note && (
                    <p className="text-xs text-muted-foreground italic ml-1">{item.note}</p>
                  )}
                </div>
              ))}
            </div>
            {pendingRequest.note && (
              <div className="bg-background border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Your note:</p>
                <p className="text-sm">{pendingRequest.note}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Requested {format(new Date(pendingRequest.requested_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* History of requested info */}
      {pastRequests.length > 0 && (
        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem value="history" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Requested Info ({pastRequests.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              {[...pastRequests].reverse().map((req, idx) => (
                <div key={req.id} className="border rounded-lg overflow-hidden">
                  {/* Round header */}
                  <div className="bg-muted/40 px-4 py-3 flex items-center justify-between border-b">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Round {idx + 1}</span>
                      <Badge
                        variant={req.status === "responded" ? "default" : "secondary"}
                        className={
                          req.status === "responded"
                            ? "bg-[#3d5a47] text-white hover:bg-[#3d5a47] text-xs"
                            : "text-xs"
                        }
                      >
                        {req.status === "responded" ? "Responded" : "Superseded"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(req.requested_at), "MMM d, yyyy")}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* DR Requested Fields */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Send className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Requested by Reviewer</span>
                      </div>
                      <div className="space-y-2">
                        {req.items.map((item) => (
                          <div key={item.key} className="bg-muted/30 border rounded-md p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {CATEGORY_MAP[item.key] || "OTHER"}
                              </Badge>
                              <span className="text-sm font-medium">{item.label}</span>
                            </div>
                            {item.note && (
                              <p className="text-xs text-muted-foreground italic mt-1">Reason: {item.note}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      {req.note && (
                        <div className="bg-muted/20 border rounded-md p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">Request Note:</p>
                          <p className="text-sm">{req.note}</p>
                        </div>
                      )}
                    </div>

                    {/* Author Response */}
                    {req.status === "responded" && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#3d5a47]" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Author Response</span>
                            {req.responded_at && (
                              <span className="text-xs text-muted-foreground">
                                — {format(new Date(req.responded_at), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            )}
                          </div>
                          {req.response_note && (
                            <p className="text-sm text-muted-foreground">{req.response_note}</p>
                          )}
                          {/* Show per-field responses if data exists */}
                          {(() => {
                            const hasUpdatedFields = req.updated_fields && Object.keys(req.updated_fields).length > 0;
                            const hasDraftData = req.draft_data && Object.keys(req.draft_data).length > 0;

                            if (!hasUpdatedFields && !hasDraftData) {
                              // API doesn't return response content — show confirmation
                              return (
                                <div className="bg-[#3d5a47]/5 border border-[#3d5a47]/20 rounded-md p-3">
                                  <p className="text-sm text-foreground/80">
                                    The author has provided the requested information. The updated data has been applied to the proposal.
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                {req.items.map((item) => {
                                  const responseValue = req.updated_fields?.[item.key];
                                  const draftValue = req.draft_data?.[item.key];
                                  const isDoc = DOCUMENT_KEYS.has(item.key);
                                  const docUrl = isDoc && typeof draftValue === "string" && draftValue.startsWith("http") ? draftValue : null;

                                  return (
                                    <div key={item.key} className="bg-[#3d5a47]/5 border border-[#3d5a47]/20 rounded-md p-3">
                                      <p className="text-xs font-medium text-foreground mb-1">{item.label}</p>
                                      {docUrl ? (
                                        <div className="flex items-center gap-3">
                                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                          <span className="text-sm flex-1 truncate">
                                            {decodeURIComponent(docUrl.split("/").pop() || item.key).replace(/^[a-z_]+_\d{14}_/, "")}
                                          </span>
                                          <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View</a>
                                          <a href={docUrl} download className="text-xs text-primary hover:underline"><Download className="h-3.5 w-3.5" /></a>
                                        </div>
                                      ) : (responseValue || (!isDoc && draftValue)) ? (
                                        <p className="text-sm text-foreground/80">{responseValue || draftValue}</p>
                                      ) : (
                                        <p className="text-sm text-muted-foreground italic">Updated in proposal</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};

export default InfoRequestPanel;
