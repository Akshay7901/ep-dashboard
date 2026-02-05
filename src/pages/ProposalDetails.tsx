// FULL REDESIGN WITH ALL ORIGINAL CONTENT PRESERVED
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

import {
  ArrowLeft,
  FileText,
  Loader2,
  Download,
  Eye,
  Calendar,
  User,
  Mail,
  MapPin,
  Link,
  Hash,
  RefreshCw,
  FileCheck,
  Lock,
  Info,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";

import { useProposal, useProposalComments, useWorkflowLogs, useUpdateProposalStatus } from "@/hooks/useProposals";

import { useProposalActions } from "@/hooks/useProposalActions";
import { useAuth } from "@/contexts/AuthContext";

/* ---------------- Helper ---------------- */
const InfoRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground truncate max-w-[60%]">{value || "N/A"}</span>
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

  useProposalActions(proposal?.ticket_number || id);

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
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
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
        <div className="sticky top-0 z-20 bg-background border-b py-3">
          <ReviewerActions
            proposal={proposal}
            isReviewer1={isReviewer1}
            isReviewer2={isReviewer2}
            onStatusChange={handleStatusChange}
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
              <TabsContent value="overview" className="space-y-6">
                {/* Short */}
                {proposal.short_description && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Short Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{proposal.short_description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Detailed */}
                {proposal.detailed_description && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{proposal.detailed_description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* TOC */}
                {proposal.table_of_contents && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Table of Contents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap">{proposal.table_of_contents}</pre>
                    </CardContent>
                  </Card>
                )}

                {/* Marketing */}
                {proposal.marketing_info && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Marketing Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{proposal.marketing_info}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Additional */}
                {proposal.additional_info && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{proposal.additional_info}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ---------------- Documents ---------------- */}
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>Uploaded Files</CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="divide-y border rounded-lg">
                      {files.length === 0 && <p className="text-sm text-muted-foreground p-4">No files uploaded</p>}

                      {files.map((url, i) => {
                        const name = url.split("/").pop() || "File";
                        const isPdf = url.toLowerCase().endsWith(".pdf");
                        const isWord = url.toLowerCase().endsWith(".doc") || url.toLowerCase().endsWith(".docx");

                        return (
                          <div key={i} className="flex items-center justify-between p-3 hover:bg-muted">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm truncate">{decodeURIComponent(name)}</span>
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
                    </div>
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

                  <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                    {logs.length === 0 && <p className="text-sm text-muted-foreground">No activity yet</p>}

                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />

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

          {/* ---------------- Right ---------------- */}
          <div className="space-y-6">
            {/* Author */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Author & Book Info</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <InfoRow label="Author" value={proposal.author_name} />
                <InfoRow label="Email" value={proposal.author_email} />
                <InfoRow label="Institution" value={proposal.institution} />
                <InfoRow label="Word Count" value={proposal.word_count} />
                <InfoRow label="Book Type" value={proposal.book_type} />
                <InfoRow label="Keywords" value={proposal.keywords} />
                <InfoRow label="Status" value={proposal.status} />

                <InfoRow label="Submitted" value={format(new Date(proposal.created_at), "MMM d, yyyy")} />

                {proposal.updated_at && (
                  <InfoRow label="Updated" value={format(new Date(proposal.updated_at), "MMM d, yyyy")} />
                )}

                {proposal.finalised_at && (
                  <InfoRow label="Finalised" value={format(new Date(proposal.finalised_at), "MMM d, yyyy")} />
                )}
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Checklist</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 text-sm">
                <InfoRow label="CV" value={proposal.cv_submitted} />
                <InfoRow label="Sample Chapter" value={proposal.sample_chapter_submitted} />
                <InfoRow label="TOC" value={proposal.toc_submitted} />
                <InfoRow label="Permissions" value={proposal.permissions_required} />
                <InfoRow label="Docs" value={proposal.permissions_docs_submitted} />
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
