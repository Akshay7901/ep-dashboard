import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Clock, Loader2, Send, FileText } from "lucide-react";
import type { InfoRequest } from "@/lib/proposalsApi";

interface InfoRequestPanelProps {
  infoRequests: InfoRequest[];
  isLoading: boolean;
  viewAs: "author" | "reviewer";
  onRespond?: (requestId: number, responseNote: string, updatedFields: Record<string, string>) => void;
  isResponding?: boolean;
}

const InfoRequestPanel: React.FC<InfoRequestPanelProps> = ({
  infoRequests,
  isLoading,
  viewAs,
  onRespond,
  isResponding,
}) => {
  const [responseNote, setResponseNote] = useState("");
  const [updatedFields, setUpdatedFields] = useState<Record<string, string>>({});

  const pendingRequest = infoRequests.find((r) => r.status === "pending");
  const pastRequests = infoRequests.filter((r) => r.status !== "pending");

  const handleSubmitResponse = () => {
    if (!pendingRequest || !onRespond) return;
    onRespond(pendingRequest.id, responseNote.trim(), updatedFields);
    setResponseNote("");
    setUpdatedFields({});
  };

  if (isLoading) {
    return <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>;
  }

  if (infoRequests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Pending request - Action Required */}
      {pendingRequest && viewAs === "author" && (
        <Card className="border-[#c05621]/30 bg-[#c05621]/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-[#c05621]" />
              Additional Information Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The editorial team has requested the following information. Please provide the details below.
            </p>

            {pendingRequest.note && (
              <div className="bg-background border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Editor's Note:</p>
                <p className="text-sm">{pendingRequest.note}</p>
              </div>
            )}

            {/* Requested items with input fields */}
            <div className="space-y-3">
              {pendingRequest.items.map((item) => (
                <div key={item.key} className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {item.label}
                  </Label>
                  <Textarea
                    placeholder={`Provide ${item.label.toLowerCase()}...`}
                    value={updatedFields[item.key] || ""}
                    onChange={(e) =>
                      setUpdatedFields((prev) => ({ ...prev, [item.key]: e.target.value }))
                    }
                    className="min-h-[60px] resize-none bg-background"
                  />
                </div>
              ))}
            </div>

            {/* Response note */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Response Note <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="Any additional context for the editorial team..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                className="min-h-[60px] resize-none bg-background"
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
        <Card className="border-[#c4940a]/30 bg-[#c4940a]/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-[#c4940a]" />
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
              <p className="text-sm text-muted-foreground">{pendingRequest.note}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Requested {format(new Date(pendingRequest.requested_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {pastRequests.length > 0 && (
        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem value="history" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Information Request History ({pastRequests.length})
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

                  {/* Requested items */}
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

                  {/* Response */}
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
                                <p className="text-xs text-muted-foreground">{key}</p>
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
