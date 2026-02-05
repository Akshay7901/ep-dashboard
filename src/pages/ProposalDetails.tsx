// FULL REDESIGN WITH ALL CONTENT + OVERVIEW DROPDOWN SECTIONS
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  ArrowLeft,
  FileText,
  Loader2,
  Download,
  Eye,
} from "lucide-react";

import {
  useProposal,
  useProposalComments,
  useWorkflowLogs,
  useUpdateProposalStatus,
} from "@/hooks/useProposals";

import { useProposalActions } from "@/hooks/useProposalActions";
import { useAuth } from "@/contexts/AuthContext";

/* ---------------- Helper ---------------- */
const InfoRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground truncate max-w-[60%]">
      {value || "N/A"}
    </span>
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

  const {
    data: proposal,
    isLoading,
    error,
    refetch,
  } = useProposal(id || "");

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

            <Button
              variant="outline"
              onClick={() => navigate("/proposals")}
            >
              Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ---------------- Files ---------------- */

  const files = proposal.file_uploads
    ? proposal.file_uploads.split(",").map((f) => f.trim())
    : [];

  /* ---------------- Render ---------------- */

  return (
    <DashboardLayout title="Proposal Details">
      <div className="space-y-6">
          <div className="sticky top-24 space-y-4">

            {/* Author Info */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Author & Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Author" value={proposal.author_name} />
                <InfoRow label="Email" value={proposal.author_email} />
                <InfoRow label="Secondary Email" value={proposal.secondary_email} />
                <InfoRow label="Job Title" value={proposal.job_title} />
                <InfoRow label="Institution" value={proposal.institution} />
                <InfoRow label="Address" value={proposal.address} />
              </CardContent>
            </Card>

            {/* Book Info */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Book Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Subtitle" value={proposal.sub_title} />
                <InfoRow label="Word Count" value={proposal.word_count} />
                <InfoRow label="Book Type" value={proposal.book_type} />
                <InfoRow label="Keywords" value={proposal.keywords} />
                <InfoRow label="Figures/Tables" value={proposal.figures_tables_count} />
                <InfoRow label="Expected Completion" value={proposal.expected_completion_date} />
                <InfoRow label="Co-Authors" value={proposal.co_authors_editors} />
              </CardContent>
            </Card>

            {/* Submission Info */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Status" value={proposal.status} />
                <InfoRow
                  label="Submitted"
                  value={format(new Date(proposal.created_at), "MMM d, yyyy")}
                />
                <InfoRow label="CV Submitted" value={proposal.cv_submitted} />
                <InfoRow label="Sample Chapter" value={proposal.sample_chapter_submitted} />
                <InfoRow label="TOC Submitted" value={proposal.toc_submitted} />
                <InfoRow label="Permissions Required" value={proposal.permissions_required} />
                <InfoRow label="Permissions Docs" value={proposal.permissions_docs_submitted} />
                <InfoRow label="Under Review Elsewhere" value={proposal.under_review_elsewhere} />
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
