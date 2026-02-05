// PROPOSAL DETAILS — PUBLISHER STYLE UI

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
import ProposalDetailsSidebar from "@/components/proposals/ProposalDetailsSidebar";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { ArrowLeft, FileText, Download, Eye, BookOpen, User, BarChart, Folder } from "lucide-react";

import { useProposal, useProposalComments, useWorkflowLogs, useUpdateProposalStatus } from "@/hooks/useProposals";

import { useProposalActions } from "@/hooks/useProposalActions";
import { useAuth } from "@/contexts/AuthContext";

/* ---------------- Helpers ---------------- */

const OverviewItem = ({ label, value }: { label: string; value?: string }) => (
  <div className="space-y-1">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{value || "N/A"}</p>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex justify-between border-b py-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium max-w-[60%] text-right break-words">{value || "N/A"}</span>
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

  /* ---------------- Loading ---------------- */

  if (isLoading) {
    return (
      <DashboardLayout title="Proposal Details">
        <div className="py-20 text-center">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!proposal || error) {
    return (
      <DashboardLayout title="Proposal Details">
        <div className="py-20 text-center space-y-4">
          <p className="text-destructive">Failed to load proposal</p>

          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  /* ---------------- Files ---------------- */

  const files = proposal.file_uploads ? proposal.file_uploads.split(",").map((f) => f.trim()) : [];

  /* ---------------- Render ---------------- */

  return (
    <DashboardLayout title="Proposal Details">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back */}

        <Button variant="ghost" size="sm" onClick={() => navigate("/proposals")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-semibold">{proposal.name}</h1>

            <p className="text-lg text-muted-foreground italic mt-1">{proposal.sub_title}</p>

            <p className="text-sm text-muted-foreground mt-2">
              Submitted {proposal.created_at ? format(new Date(proposal.created_at), "MMMM d, yyyy") : ""}
            </p>
          </div>

          <div className="flex gap-3">
            <Button className="bg-emerald-600 hover:bg-emerald-700">Accept for Review</Button>

            <Button variant="outline">Decline</Button>
          </div>
        </div>

        {/* Tabs */}

        <Tabs defaultValue="book">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="book">
              <BookOpen className="h-4 w-4 mr-2" />
              Book Info
            </TabsTrigger>

            <TabsTrigger value="author">
              <User className="h-4 w-4 mr-2" />
              Author Info
            </TabsTrigger>

            <TabsTrigger value="market">
              <BarChart className="h-4 w-4 mr-2" />
              Market
            </TabsTrigger>

            <TabsTrigger value="documents">
              <Folder className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* ---------------- BOOK INFO ---------------- */}

          <TabsContent value="book" className="space-y-8">
            {/* Overview */}

            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>

              <CardContent className="grid sm:grid-cols-4 gap-6">
                <OverviewItem label="Book Type" value={proposal.book_type} />

                <OverviewItem label="Word Count" value={proposal.word_count} />

                <OverviewItem label="Expected Completion" value={proposal.expected_completion_date} />

                <OverviewItem label="Status" value={proposal.status} />
              </CardContent>
            </Card>

            {/* Sections */}

            <Accordion type="multiple" className="space-y-2">
              <AccordionItem value="blurb">
                <AccordionTrigger>Blurb</AccordionTrigger>
                <AccordionContent>{proposal.short_description}</AccordionContent>
              </AccordionItem>

              <AccordionItem value="toc">
                <AccordionTrigger>TOC</AccordionTrigger>
                <AccordionContent>
                  <pre className="whitespace-pre-wrap text-sm">{proposal.table_of_contents}</pre>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="details">
                <AccordionTrigger>Detail: Figures, Tables, Photos</AccordionTrigger>
                <AccordionContent>{proposal.detailed_description}</AccordionContent>
              </AccordionItem>

              <AccordionItem value="permissions">
                <AccordionTrigger>Permissions Required</AccordionTrigger>
                <AccordionContent>{proposal.permissions_required}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* ---------------- AUTHOR INFO ---------------- */}

          <TabsContent value="author">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Author Details</CardTitle>
                </CardHeader>

                <CardContent className="space-y-2">
                  <InfoRow label="Name" value={proposal.corresponding_author_name} />

                  <InfoRow label="Email" value={proposal.email} />

                  <InfoRow label="Secondary Email" value={proposal.secondary_email} />

                  <InfoRow label="Job Title" value={proposal.job_title} />

                  <InfoRow label="Institution" value={proposal.institution} />

                  <InfoRow label="Address" value={proposal.address} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Biography</CardTitle>
                </CardHeader>

                <CardContent className="text-sm whitespace-pre-line">{proposal.biography}</CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---------------- DOCUMENTS ---------------- */}

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Supporting Documents</CardTitle>
              </CardHeader>

              <CardContent>
                {files.length === 0 && <p className="text-sm text-muted-foreground">No files uploaded</p>}

                <div className="space-y-3">
                  {files.map((url, i) => {
                    const name = url.split("/").pop() || "File";

                    const isPdf = url.endsWith(".pdf");

                    const isWord = url.endsWith(".doc") || url.endsWith(".docx");

                    return (
                      <div key={i} className="flex justify-between items-center border rounded-md px-3 py-2">
                        <div className="flex gap-2 items-center">
                          <FileText className="h-4 w-4" />
                          {name}
                        </div>

                        <div className="flex gap-2">
                          {(isPdf || isWord) && (
                            <Button
                              size="icon"
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

                          <Button size="icon" variant="ghost" asChild>
                            <a href={url} target="_blank">
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
        </Tabs>
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
