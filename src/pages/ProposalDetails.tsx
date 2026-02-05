// FULL UPDATED DESIGN WITH BOOK INFO + AUTHOR INFO TABS

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

import DashboardLayout from "@/components/layout/DashboardLayout";
import ProposalStatusBadge from "@/components/proposals/ProposalStatusBadge";
import ReviewerActions from "@/components/proposals/ReviewerActions";
import AssessmentForm from "@/components/proposals/AssessmentForm";
import Reviewer1CommentForm from "@/components/proposals/Reviewer1CommentForm";
import ReviewCommentsDisplay from "@/components/proposals/ReviewCommentsDisplay";
import FinalReviewSummary from "@/components/proposals/FinalReviewSummary";
import CommentsSection from "@/components/proposals/CommentsSection";
import DocumentPreviewDialog from "@/components/proposals/PdfPreviewDialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { ArrowLeft, FileText, Loader2, Download, Eye } from "lucide-react";

import { useProposal, useProposalComments, useWorkflowLogs, useUpdateProposalStatus } from "@/hooks/useProposals";

import { useProposalActions } from "@/hooks/useProposalActions";
import { useAuth } from "@/contexts/AuthContext";

/* ---------------- Helper ---------------- */

const InfoRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex flex-col gap-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium break-words">{value || "N/A"}</span>
  </div>
);

/* ---------------- Main ---------------- */

const ProposalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { isReviewer1, isReviewer2 } = useAuth();

  const [documentPreview, setDocumentPreview] = useState<{
    url: string;
    name: string;
    type: "pdf" | "word";
  } | null>(null);

  /* ---------------- Data ---------------- */

  const { data: proposal, isLoading, error, refetch } = useProposal(id || "");

  const localId = proposal?.id || "";

  const { data: comments = [] } = useProposalComments(localId);

  const { data: logs = [] } = useWorkflowLogs(localId);

  const updateStatus = useUpdateProposalStatus();

  const { isUpdatingStatus } = useProposalActions(proposal?.ticket_number || id);

  /* ---------------- Handlers ---------------- */

  const handleStatusChange = (status: any) => {
    if (!proposal) return;

    updateStatus.mutate({
      id: proposal.id,
      status,
      previousStatus: proposal.status,
    });
  };

  /* ---------------- Loading ---------------- */

  if (isLoading) {
    return (
      <DashboardLayout title="Proposal Details">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!proposal || error) {
    return (
      <DashboardLayout title="Proposal Details">
        <div className="text-center py-16 space-y-4">
          <p className="text-destructive">Failed to load proposal</p>

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>

            <Button variant="outline" onClick={() => navigate("/proposals")}>
              Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ---------------- Files ---------------- */

  const files = proposal.file_uploads ? proposal.file_uploads.split(",").map((f) => f.trim()) : [];

  /* ---------------- Render ---------------- */

  return (
    <DashboardLayout title="Proposal Details">
      <div className="space-y-6">
        {/* Back */}
        <Button variant="ghost" onClick={() => navigate("/proposals")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {proposal.ticket_number} • Rev {proposal.current_revision}
            </p>

            <h1 className="text-2xl font-semibold mt-1">{proposal.name}</h1>

            <div className="mt-2">
              <ProposalStatusBadge status={proposal.status} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">Assign</Button>
            <Button>Update Status</Button>
          </div>
        </div>

        {/* Sticky Actions */}
        <div className="sticky top-0 bg-background z-20 border-b py-3">
          <ReviewerActions
            proposal={proposal}
            isReviewer1={isReviewer1}
            isReviewer2={isReviewer2}
            onStatusChange={handleStatusChange}
            isPending={isUpdatingStatus}
            hasReviewer2Comments={comments.some((c) => c.review_form_data?.submittedForAuthorization)}
          />
        </div>

        {/* Main */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="book">
              <TabsList>
                <TabsTrigger value="book">Book Info</TabsTrigger>

                <TabsTrigger value="author">Author Info</TabsTrigger>

                <TabsTrigger value="documents">Documents</TabsTrigger>

                <TabsTrigger value="reviews">Reviews</TabsTrigger>

                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* ---------------- BOOK INFO ---------------- */}

              <TabsContent value="book">
                <Accordion type="multiple">
                  <AccordionItem value="short">
                    <AccordionTrigger>Short Description</AccordionTrigger>
                    <AccordionContent>{proposal.short_description}</AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="detailed">
                    <AccordionTrigger>Detailed Description</AccordionTrigger>
                    <AccordionContent>{proposal.detailed_description}</AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="toc">
                    <AccordionTrigger>Table of Contents</AccordionTrigger>
                    <AccordionContent>
                      <pre className="whitespace-pre-wrap text-sm">{proposal.table_of_contents}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="marketing">
                    <AccordionTrigger>Marketing Info</AccordionTrigger>
                    <AccordionContent>{proposal.marketing_info}</AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="additional">
                    <AccordionTrigger>Additional Info</AccordionTrigger>
                    <AccordionContent>{proposal.additional_info}</AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="referees">
                    <AccordionTrigger>Referees / Reviewers</AccordionTrigger>
                    <AccordionContent>{proposal.referees_reviewers}</AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* ---------------- AUTHOR INFO ---------------- */}

              <TabsContent value="author">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Author Details</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <InfoRow label="Name" value={proposal.corresponding_author_name} />

                      <InfoRow label="Email" value={proposal.author_email} />

                      <InfoRow label="Secondary Email" value={proposal.secondary_email} />

                      <InfoRow label="Job Title" value={proposal.job_title} />

                      <InfoRow label="Institution" value={proposal.institution} />

                      <InfoRow label="Address" value={proposal.address} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Author Biography</CardTitle>
                    </CardHeader>

                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{proposal.biography}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ---------------- DOCUMENTS ---------------- */}

              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>Uploaded Files</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {files.length === 0 && <p className="text-sm text-muted-foreground">No files uploaded</p>}

                    {files.map((url, i) => {
                      const name = url.split("/").pop() || "File";

                      const isPdf = url.endsWith(".pdf");

                      const isWord = url.endsWith(".doc") || url.endsWith(".docx");

                      return (
                        <div key={i} className="flex justify-between border-b py-2">
                          <div className="flex gap-2">
                            <FileText className="h-4 w-4" />

                            {name}
                          </div>

                          <div className="flex gap-2">
                            {(isPdf || isWord) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setDocumentPreview({
                                    url,
                                    name,
                                    type: isPdf ? "pdf" : "word",
                                  })
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}

                            <Button size="sm" variant="ghost" asChild>
                              <a href={url} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------- REVIEWS ---------------- */}

              <TabsContent value="reviews">
                <AssessmentForm proposal={proposal} isReviewer2={isReviewer2} />

                {isReviewer1 && <ReviewCommentsDisplay comments={comments} isReviewer1 />}

                <Reviewer1CommentForm proposal={proposal} isReviewer1={isReviewer1} />

                <FinalReviewSummary proposal={proposal} comments={comments} logs={logs} isReviewer1={isReviewer1} />

                {proposal.ticket_number && <CommentsSection ticketNumber={proposal.ticket_number} />}
              </TabsContent>

              {/* ---------------- ACTIVITY ---------------- */}

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow History</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {logs.length === 0 && <p className="text-sm text-muted-foreground">No activity yet</p>}

                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm py-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2" />

                        <div>
                          <p>{log.action}</p>

                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}

      <DocumentPreviewDialog
        open={!!documentPreview}
        onOpenChange={(o) => !o && setDocumentPreview(null)}
        documentUrl={documentPreview?.url || ""}
        fileName={documentPreview?.name || ""}
        fileType={documentPreview?.type || "pdf"}
      />
    </DashboardLayout>
  );
};

export default ProposalDetails;
