import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Clock, Loader2, Send, FileText, Upload } from "lucide-react";
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

interface InfoRequestPanelProps {
  infoRequests: InfoRequest[];
  isLoading: boolean;
  viewAs: "author" | "reviewer";
  proposal?: Proposal;
  onRespond?: (requestId: number, responseNote: string, updatedFields: Record<string, string>) => void;
  isResponding?: boolean;
}

const InfoRequestPanel: React.FC<InfoRequestPanelProps> = ({
  infoRequests,
  isLoading,
  viewAs,
  proposal,
  onRespond,
  isResponding,
}) => {
  const [responseNote, setResponseNote] = useState("");
  const [updatedFields, setUpdatedFields] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const pendingRequest = infoRequests.find((r) => r.status === "pending");
  const pastRequests = infoRequests.filter((r) => r.status !== "pending");

  // Pre-fill fields from proposal data on first render
  React.useEffect(() => {
    if (pendingRequest && proposal && !initialized) {
      const prefilled: Record<string, string> = {};
      pendingRequest.items.forEach((item) => {
        if (!DOCUMENT_KEYS.has(item.key)) {
          const proposalKey = PROPOSAL_FIELD_MAP[item.key];
          if (proposalKey && proposal[proposalKey]) {
            prefilled[item.key] = String(proposal[proposalKey]);
          }
        }
      });
      setUpdatedFields(prefilled);
      setInitialized(true);
    }
  }, [pendingRequest, proposal, initialized]);

  // Reset when pending request changes
  React.useEffect(() => {
    setInitialized(false);
    setResponseNote("");
    setUpdatedFields({});
  }, [pendingRequest?.id]);

  const handleSubmitResponse = () => {
    if (!pendingRequest || !onRespond) return;
    onRespond(pendingRequest.id, responseNote.trim(), updatedFields);
  };

  if (isLoading) {
    return <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>;
  }

  if (infoRequests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Pending request - Author action form */}
      {pendingRequest && viewAs === "author" && (
        <Card className="border-[#D97706]/30 bg-[#D97706]/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-[#D97706]" />
              The editorial team has requested additional information
            </CardTitle>
            {pendingRequest.requested_at && (
              <p className="text-xs text-muted-foreground">
                Requested on {format(new Date(pendingRequest.requested_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {/* DR note callout */}
            {pendingRequest.note && (
              <div className="bg-[#D97706]/10 border border-[#D97706]/30 rounded-md p-4">
                <p className="text-xs font-medium text-[#D97706] mb-1">Editor's Note</p>
                <p className="text-sm">{pendingRequest.note}</p>
              </div>
            )}

            {/* Editable fields for each requested item */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Requested Items</Label>
              {pendingRequest.items.map((item) => {
                const isDocument = DOCUMENT_KEYS.has(item.key);
                return (
                  <div key={item.key} className="border rounded-md p-4 bg-background space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                       {isDocument ? <Upload className="h-3.5 w-3.5 text-muted-foreground" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                       {item.label}
                    </Label>
                    {item.note && (
                      <p className="text-xs text-muted-foreground italic">{item.note}</p>
                    )}
                    {isDocument ? (
                      <div className="space-y-2">
                        <div className="border-2 border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
                          <Upload className="h-5 w-5 mx-auto mb-1" />
                          <p>File upload for documents will be available soon.</p>
                          <p className="text-xs mt-1">In the meantime, please provide a link or description below.</p>
                        </div>
                        <Textarea
                          placeholder={`Provide a link or description for ${item.label.toLowerCase()}...`}
                          value={updatedFields[item.key] || ""}
                          onChange={(e) =>
                            setUpdatedFields((prev) => ({ ...prev, [item.key]: e.target.value }))
                          }
                          className="min-h-[50px] resize-none"
                        />
                      </div>
                    ) : (
                      <Textarea
                        placeholder={`Provide updated ${item.label.toLowerCase()}...`}
                        value={updatedFields[item.key] || ""}
                        onChange={(e) =>
                          setUpdatedFields((prev) => ({ ...prev, [item.key]: e.target.value }))
                        }
                        className="min-h-[80px] resize-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Response note */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Describe what you've updated <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="E.g., I've updated my biography and provided a new sample chapter link."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                className="min-h-[60px] resize-none"
              />
            </div>

            <Button
              className="bg-[#3d5a47] hover:bg-[#3d5a47]/90 gap-2"
              onClick={handleSubmitResponse}
              disabled={
                isResponding ||
                Object.values(updatedFields).every((v) => !v.trim())
              }
            >
              {isResponding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Response
            </Button>
          </CardContent>
        </Card>
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
            <div className="flex flex-wrap gap-2">
              {pendingRequest.items.map((item) => (
                <Badge key={item.key} variant="secondary" className="text-xs py-1">
                  {item.label}
                </Badge>
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

      {/* History of previous rounds */}
      {pastRequests.length > 0 && (
        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem value="history" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Previous Rounds ({pastRequests.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              {pastRequests.map((req) => (
                <div key={req.id} className="border rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(req.requested_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {req.items.map((item) => (
                      <Badge key={item.key} variant="outline" className="text-xs">
                        {item.label}
                      </Badge>
                    ))}
                  </div>

                  {req.note && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Request Note:</p>
                      <p className="text-sm">{req.note}</p>
                    </div>
                  )}

                  {req.status === "responded" && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#3d5a47]" />
                          <span className="text-sm font-medium">Author Response</span>
                          {req.responded_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(req.responded_at), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                        {req.response_note && (
                          <p className="text-sm text-muted-foreground">{req.response_note}</p>
                        )}
                        {req.updated_fields && Object.keys(req.updated_fields).length > 0 && (
                          <div className="space-y-2">
                            {Object.entries(req.updated_fields).map(([key, value]) => (
                              <div key={key} className="bg-muted/30 rounded p-2">
                                <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                                <p className="text-sm">{value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
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
