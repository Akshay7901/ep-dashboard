// FULL REDESIGN WITH ALL CONTENT + OVERVIEW + RIGHT PANEL DROPDOWNS

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
    <span className="font-medium text-foreground break-words">{value || "N/A"}</span>
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <Button variant="ghost" onClick={() => navigate("/proposals")} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
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
        </div>

        {/* Sticky Actions */}
        <div className="sticky top-0 z-20 bg-background border-b py-3">
          <ReviewerActions
            proposal={proposal}
            isReviewer1={isReviewer1}
            isReviewer2={isReviewer2}
            onStatusChange={handleStatusChange}
            isPending={isUpdatingStatus}
            hasReviewer2Comments={comments.some((c) => c.review_form_data?.submittedForAuthorization)}
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* ---------------- Overview ---------------- */}
              <TabsContent value="overview">
                <Accordion type="multiple">
                  {proposal.short_description && (
                    <AccordionItem value="short">
                      <AccordionTrigger>Short Description</AccordionTrigger>
                      <AccordionContent>{proposal.short_description}</AccordionContent>
                    </AccordionItem>
                  )}

                  {proposal.detailed_description && (
                    <AccordionItem value="detailed">
                      <AccordionTrigger>Detailed Description</AccordionTrigger>
                      <AccordionContent>{proposal.detailed_description}</AccordionContent>
                    </AccordionItem>
                  )}

                  {proposal.table_of_contents && (
                    <AccordionItem value="toc">
                      <AccordionTrigger>Table of Contents</AccordionTrigger>
                      <AccordionContent>{proposal.table_of_contents}</AccordionContent>
                    </AccordionItem>
                  )}

                  {proposal.marketing_info && (
                    <AccordionItem value="marketing">
                      <AccordionTrigger>Marketing Information</AccordionTrigger>
                      <AccordionContent>{proposal.marketing_info}</AccordionContent>
                    </AccordionItem>
                  )}

                  {proposal.additional_info && (
                    <AccordionItem value="additional">
                      <AccordionTrigger>Additional Information</AccordionTrigger>
                      <AccordionContent>{proposal.additional_info}</AccordionContent>
                    </AccordionItem>
                  )}

                  {proposal.biography && (
                    <AccordionItem value="bio">
                      <AccordionTrigger>Author Biography</AccordionTrigger>
                      <AccordionContent>{proposal.biography}</AccordionContent>
                    </AccordionItem>
                  )}

                  {proposal.referees_reviewers && (
                    <AccordionItem value="ref">
                      <AccordionTrigger>Suggested Reviewers</AccordionTrigger>
                      <AccordionContent>{proposal.referees_reviewers}</AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </TabsContent>

              {/* ---------------- Documents ---------------- */}
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>Uploaded Files</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {files.map((url, i) => {
                      const name = url.split("/").pop() || "File";

                      const isPdf = url.toLowerCase().endsWith(".pdf");
                      const isWord = url.toLowerCase().endsWith(".doc") || url.toLowerCase().endsWith(".docx");

                      return (
                        <div key={i} className="flex justify-between items-center p-3 border-b">
                          <div className="flex gap-2 items-center">
                            <FileText className="h-4 w-4" />
                            {decodeURIComponent(name)}
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

              {/* ---------------- Reviews ---------------- */}
              <TabsContent value="reviews" className="space-y-6">
                <AssessmentForm proposal={proposal} isReviewer2={isReviewer2} />

                {isReviewer1 && comments.length > 0 && <ReviewCommentsDisplay comments={comments} isReviewer1 />}

                <Reviewer1CommentForm proposal={proposal} isReviewer1={isReviewer1} />

                <FinalReviewSummary proposal={proposal} comments={comments} logs={logs} isReviewer1={isReviewer1} />

                {proposal.ticket_number && <CommentsSection ticketNumber={proposal.ticket_number} />}
              </TabsContent>

              {/* ---------------- Activity ---------------- */}
              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow History</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {logs.map((log) => (
                      <div key={log.id} className="mb-3 text-sm">
                        <p>{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* ---------------- Right Panel (Dropdown) ---------------- */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>

              <CardContent>
                <Accordion type="multiple">
                  {/* Author */}
                  <AccordionItem value="author">
                    <AccordionTrigger>Author & Contact Info</AccordionTrigger>

                    <AccordionContent className="space-y-3">
                      <InfoRow label="Author" value={proposal.author_name} />
                      <InfoRow label="Email" value={proposal.author_email} />
                      <InfoRow label="Secondary Email" value={proposal.secondary_email} />
                      <InfoRow label="Job Title" value={proposal.job_title} />
                      <InfoRow label="Institution" value={proposal.institution} />
                      <InfoRow label="Address" value={proposal.address} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Book */}
                  <AccordionItem value="book">
                    <AccordionTrigger>Book Details</AccordionTrigger>

                    <AccordionContent className="space-y-3">
                      <InfoRow label="Subtitle" value={proposal.sub_title} />
                      <InfoRow label="Word Count" value={proposal.word_count} />
                      <InfoRow label="Book Type" value={proposal.book_type} />
                      <InfoRow label="Keywords" value={proposal.keywords} />
                      <InfoRow label="Figures/Tables" value={proposal.figures_tables_count} />
                      <InfoRow label="Expected Completion" value={proposal.expected_completion_date} />
                      <InfoRow label="Co-Authors" value={proposal.co_authors_editors} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Submission */}
                  <AccordionItem value="submission">
                    <AccordionTrigger>Submission Status</AccordionTrigger>

                    <AccordionContent className="space-y-3">
                      <InfoRow label="Status" value={proposal.status} />
                      <InfoRow label="Submitted" value={format(new Date(proposal.created_at), "MMM d, yyyy")} />
                      <InfoRow label="CV Submitted" value={proposal.cv_submitted} />
                      <InfoRow label="Sample Chapter" value={proposal.sample_chapter_submitted} />
                      <InfoRow label="TOC Submitted" value={proposal.toc_submitted} />
                      <InfoRow label="Permissions Required" value={proposal.permissions_required} />
                      <InfoRow label="Permissions Docs" value={proposal.permissions_docs_submitted} />
                      <InfoRow label="Under Review Elsewhere" value={proposal.under_review_elsewhere} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Preview */}
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
