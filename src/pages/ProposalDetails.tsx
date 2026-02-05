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

  const [documentPreview, setDocumentPreview] = useState<any>(null);

  /* ---------------- Data ---------------- */

  const { data: proposal, isLoading, error, refetch } = useProposal(id || "");

  const localId = proposal?.id || "";

  const { data: comments = [] } = useProposalComments(localId);

  const { data: logs = [] } = useWorkflowLogs(localId);

  const updateStatus = useUpdateProposalStatus();

  const { isUpdatingStatus } = useProposalActions(proposal?.ticket_number || id);

  /* ---------------- Loading ---------------- */

  if (isLoading) {
    return (
      <DashboardLayout title="Proposal Details">
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!proposal || error) {
    return (
      <DashboardLayout title="Proposal Details">
        <div className="text-center py-20">
          <p className="text-red-500">Failed to load proposal</p>

          <div className="mt-4 flex justify-center gap-3">
            <Button onClick={() => refetch()}>Retry</Button>

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
      <div className="max-w-7xl mx-auto space-y-6 px-4">
        {/* Back */}
        <Button variant="ghost" onClick={() => navigate("/proposals")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {proposal.ticket_number} • Rev {proposal.current_revision}
              </p>

              <h1 className="text-2xl font-bold mt-1">{proposal.name}</h1>

              <div className="mt-2">
                <ProposalStatusBadge status={proposal.status} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">Assign</Button>
              <Button>Update Status</Button>
            </div>
          </CardContent>
        </Card>

        {/* Reviewer Actions */}
        <ReviewerActions
          proposal={proposal}
          isReviewer1={isReviewer1}
          isReviewer2={isReviewer2}
          isPending={isUpdatingStatus}
          hasReviewer2Comments={comments.some((c) => c.review_form_data?.submittedForAuthorization)}
        />

        {/* Tabs */}
        <Tabs defaultValue="book">
          <TabsList className="bg-muted">
            <TabsTrigger value="book">Book Info</TabsTrigger>

            <TabsTrigger value="author">Author Info</TabsTrigger>

            <TabsTrigger value="documents">Documents</TabsTrigger>

            <TabsTrigger value="reviews">Reviews</TabsTrigger>

            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* ---------------- BOOK INFO ---------------- */}

          <TabsContent value="book">
            <div className="grid md:grid-cols-2 gap-6">
              <InfoCard title="Short Description" value={proposal.short_description} />

              <InfoCard title="Detailed Description" value={proposal.detailed_description} />

              <InfoCard title="Table of Contents" value={proposal.table_of_contents} pre />

              <InfoCard title="Marketing Info" value={proposal.marketing_info} />

              <InfoCard title="Additional Info" value={proposal.additional_info} />

              <InfoCard title="Referees / Reviewers" value={proposal.referees_reviewers} />
            </div>
          </TabsContent>

          {/* ---------------- AUTHOR INFO ---------------- */}

          <TabsContent value="author">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Details</CardTitle>
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
                  <p className="whitespace-pre-line text-sm">{proposal.biography}</p>
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
                {files.map((url, i) => {
                  const name = url.split("/").pop();

                  return (
                    <div key={i} className="flex justify-between items-center border-b py-3">
                      <div className="flex gap-2">
                        <FileText size={16} />
                        {name}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDocumentPreview({
                              url,
                              name,
                            })
                          }
                        >
                          <Eye size={16} />
                        </Button>

                        <Button size="sm" variant="ghost" asChild>
                          <a href={url} target="_blank">
                            <Download size={16} />
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

            <ReviewCommentsDisplay comments={comments} isReviewer1={isReviewer1} />

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
                {logs.map((log) => (
                  <div key={log.id} className="border-b py-2 text-sm">
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

      {/* Preview */}
      <DocumentPreviewDialog
        open={!!documentPreview}
        onOpenChange={(o) => !o && setDocumentPreview(null)}
        documentUrl={documentPreview?.url}
        fileName={documentPreview?.name}
        fileType="pdf"
      />
    </DashboardLayout>
  );
};

/* ---------------- Reusable Info Card ---------------- */

const InfoCard = ({ title, value, pre }: { title: string; value?: string; pre?: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>

    <CardContent>
      {pre ? (
        <pre className="whitespace-pre-wrap text-sm">{value || "N/A"}</pre>
      ) : (
        <p className="whitespace-pre-line text-sm">{value || "N/A"}</p>
      )}
    </CardContent>
  </Card>
);

export default ProposalDetails;
