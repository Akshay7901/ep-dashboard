// PROPOSAL DETAILS — TWO-PANEL PEER REVIEW LAYOUT

import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { extractCountry } from "@/lib/extractCountry";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProposalStatusBadge from "@/components/proposals/ProposalStatusBadge";
import PeerReviewCommentsForm, { type PeerReviewCommentsFormHandle } from "@/components/proposals/PeerReviewCommentsForm";
import PeerReviewSummary from "@/components/proposals/PeerReviewSummary";
import DocumentPreviewDialog from "@/components/proposals/PdfPreviewDialog";
import AssignReviewersDialog from "@/components/proposals/AssignReviewersDialog";
import DeclineProposalDialog from "@/components/proposals/DeclineProposalDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Download, Eye, BookOpen, User, Folder, UserCircle, ClipboardList, MessageSquare, CheckCircle2, FileCheck, Send } from "lucide-react";
import { useProposal, useProposalComments, useWorkflowLogs, useUpdateProposalStatus, useAddComment } from "@/hooks/useProposals";
import { useQueryClient } from "@tanstack/react-query";
import { useProposalActions } from "@/hooks/useProposalActions";
import { useAuth } from "@/contexts/AuthContext";
import { usePeerReviewers } from "@/hooks/usePeerReviewers";
import { useDefaultReviewer } from "@/hooks/useDefaultReviewer";
import ReviewCommentsDisplay from "@/components/proposals/ReviewCommentsDisplay";
import PeerReviewReadOnly from "@/components/proposals/PeerReviewReadOnly";
// commentsApi import removed - useAddComment now handles serialization

/* ---------------- Helpers ---------------- */

const DetailRow = ({
  label,
  value
}: {
  label: string;
  value?: string | null;
}) => {
  if (!value) return null;
  return <div className="flex gap-4 py-2">
      <span className="text-sm text-muted-foreground w-40 shrink-0">{label}:</span>
      <span className="text-sm font-medium flex-1">{value}</span>
    </div>;
};
const ContentBlock = ({
  label,
  value
}: {
  label: string;
  value?: string | null;
}) => {
  if (!value) return null;
  return <div className="space-y-2">
      <p className="text-sm text-muted-foreground italic">{label}:</p>
      <div className="bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-line rounded-none">
        {value}
      </div>
    </div>;
};

// Peer review status badge (matches dashboard colors)
const PeerReviewStatusBadge: React.FC<{
  status: string;
}> = ({
  status
}) => {
  const config: Record<string, {
    label: string;
    className: string;
  }> = {
    submitted: {
      label: "Pending Review",
      className: "bg-[#c4940a] text-white hover:bg-[#c4940a] border-[#c4940a]"
    },
    under_review: {
      label: "In Progress",
      className: "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c] border-[#9b2c2c]"
    },
    approved: {
      label: "Completed",
      className: "bg-[#3d5a47] text-white hover:bg-[#3d5a47] border-[#3d5a47]"
    },
    finalised: {
      label: "Completed",
      className: "bg-[#3d5a47] text-white hover:bg-[#3d5a47] border-[#3d5a47]"
    },
    rejected: {
      label: "Declined",
      className: "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c] border-[#9b2c2c]"
    },
    locked: {
      label: "Locked",
      className: "bg-gray-600 text-white hover:bg-gray-600 border-gray-600"
    }
  };
  const c = config[status] || config.submitted;
  return <Badge className={`${c.className} rounded-full px-4 py-1 font-medium text-xs`}>
      {c.label}
    </Badge>;
};

/* ---------------- Main ---------------- */

const ProposalDetails: React.FC = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    isReviewer1,
    isReviewer2,
    isAnyReviewer
  } = useAuth();
  const {
    reviewers
  } = usePeerReviewers();
  const {
    defaultEmail
  } = useDefaultReviewer();
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");
  const reviewFormRef = useRef<PeerReviewCommentsFormHandle>(null);
  const [documentPreview, setDocumentPreview] = useState<{
    url: string;
    name: string;
    type: "pdf" | "word";
  } | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"accept" | "decline" | null>(null);
  const [showingSummary, setShowingSummary] = useState(false);
  const [summaryFormData, setSummaryFormData] = useState<Record<string, string>>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const [startedFresh, setStartedFresh] = useState(false);
  const [decisionReviewerSubmitted, setDecisionReviewerSubmitted] = useState(false);
  const addComment = useAddComment();

  /* ---------------- Data ---------------- */

  const {
    data: proposal,
    isLoading,
    error,
    refetch
  } = useProposal(id || "");
  const localId = proposal?.id || "";

  // Set reviewer: prefer already-assigned reviewer, then default, then empty
  // Re-derive whenever proposal assignment data changes
  const assignedEmailsKey = JSON.stringify(
    (proposal as any)?.assigned_reviewer_emails
    || proposal?.assigned_reviewers?.map((r: any) => r.email)
    || []
  );
  React.useEffect(() => {
    if (reviewers.length === 0) return;
    const assignedEmails = (proposal as any)?.assigned_reviewer_emails
      || proposal?.assigned_reviewers?.map((r: any) => r.email)
      || [];
    const assignedMatch = assignedEmails.length > 0
      ? reviewers.find(r => assignedEmails.includes(r.email))
      : null;

    if (assignedMatch) {
      setSelectedReviewer(assignedMatch.email);
    } else if (!selectedReviewer && defaultEmail) {
      const found = reviewers.find(r => r.email === defaultEmail);
      if (found) setSelectedReviewer(found.email);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultEmail, reviewers, assignedEmailsKey]);
  const {
    data: comments = []
  } = useProposalComments(localId, proposal?.ticket_number || id);
  const {
    data: logs = []
  } = useWorkflowLogs(localId);
  const workflowStatus = useUpdateProposalStatus();
  const {
    updateStatus: upstreamUpdateStatus,
    isUpdatingStatus: isUpdatingUpstream,
    assignReviewers,
    isAssigning,
    unassignReviewers,
    isUnassigning
  } = useProposalActions(proposal?.ticket_number || id);


  /* ---------------- Loading / Error ---------------- */

  if (isLoading) {
    return <DashboardLayout title="Proposal Details">
        <div className="py-20 text-center text-muted-foreground">Loading...</div>
      </DashboardLayout>;
  }
  if (!proposal || error) {
    return <DashboardLayout title="Proposal Details">
        <div className="py-20 text-center space-y-4">
          <p className="text-destructive">Failed to load proposal</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </DashboardLayout>;
  }

  /* ---------------- Derived values ---------------- */

  const files = proposal.file_uploads ? proposal.file_uploads.split(",").map((f: string) => f.trim()) : [];
  const isBusy = workflowStatus.isPending || isUpdatingUpstream || isAssigning || isUnassigning;
  const showReviewForm = isReviewer2;

  // Check if peer reviewer already submitted their review
  // Detect via: new marker, old-style text prefix, or proposal status beyond under_review
  const peerReviewAlreadySubmitted = isReviewer2 && (
    comments.some(
      (c: any) => c.review_form_data?.submittedForAuthorization
        || c.submitted_for_authorization
        || (typeof c.comment_text === 'string' && c.comment_text.startsWith('[Peer Review Submitted]'))
    )
    || ['approved', 'finalised', 'locked'].includes(proposal.status)
  );

  // Check if there's a submitted peer review (for decision reviewer split layout)
  const submittedReview = comments.find(
    (c: any) => c.review_form_data?.submittedForAuthorization
      || c.submitted_for_authorization
      || (typeof c.comment_text === 'string' && c.comment_text.startsWith('[Peer Review Submitted]'))
  );
  const hasSubmittedReview = isReviewer1 && !!submittedReview;

  // Check if the decision reviewer has already submitted their own review
  // (i.e., there are 2+ comments with submittedForAuthorization, or proposal is approved/finalised)
  const submittedReviewComments = comments.filter(
    (c: any) => c.review_form_data?.submittedForAuthorization
      || c.submitted_for_authorization
      || (typeof c.comment_text === 'string' && c.comment_text.startsWith('[Peer Review Submitted]'))
  );
  const decisionReviewerAlreadySubmitted = isReviewer1 && (
    submittedReviewComments.length >= 2
    || ['approved', 'finalised', 'locked'].includes(proposal.status)
  );

  const revertToNew = async () => {
    const ticketNumber = proposal.ticket_number || id || "";
    upstreamUpdateStatus({
      status: "new",
      notes: "Reverted to new status"
    }, {
      onSuccess: async () => {
        try {
          await unassignReviewers();
        } catch {
          console.log("DELETE unassign not supported, relying on status change");
        }
        workflowStatus.mutate({
          id: localId || id || "",
          status: "submitted",
          previousStatus: proposal.status,
          ticketNumber,
          proposalData: {
            id: localId || undefined,
            name: proposal.name,
            author_name: proposal.author_name,
            author_email: proposal.author_email,
            ticket_number: ticketNumber
          },
          assignedReviewerEmails: [],
        }, {
          onSuccess: () => {
            setIsRevertDialogOpen(false);
            queryClient.invalidateQueries({
              queryKey: ["reviewer-assignments"]
            });
            queryClient.invalidateQueries({
              queryKey: ["proposals"]
            });
          }
        });
      }
    });
  };

  /* ======================== RIGHT PANEL CONTENT ======================== */

  const isPostSubmission = decisionReviewerSubmitted || decisionReviewerAlreadySubmitted;

  const rightPanel = <div className="space-y-6">
      {/* Proposal Header */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{proposal.name}</h2>
            {proposal.sub_title && <p className="text-base text-muted-foreground mt-1 italic">
                {proposal.sub_title}
              </p>}
            {/* Submitted date - shown in post-submission state */}
            {isPostSubmission && proposal.created_at && (
              <p className="text-sm text-muted-foreground mt-1">
                Submitted {format(new Date(proposal.created_at), "MMMM d, yyyy")}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
            <ProposalStatusBadge status={proposal.status} showIcon={false} />
            {/* Date next to badge in post-submission */}
            {isPostSubmission && (
              <span className="text-sm text-muted-foreground">
                {format(new Date(), "do MMMM yyyy")}
              </span>
            )}
          </div>
        </div>
        {/* Author & reviewer info */}
        {isPostSubmission ? (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-2 border rounded-full px-3 py-1.5 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {proposal.corresponding_author_name || proposal.author_name}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
            <span className="font-medium text-foreground">
              {proposal.corresponding_author_name || proposal.author_name}
            </span>
            {proposal.institution && <>
                <span>•</span>
                <span>{proposal.institution}</span>
              </>}
            {proposal.word_count && <>
                <span>•</span>
                <span>{proposal.word_count} words</span>
              </>}
          </div>
        )}
      </div>

      {/* Reviewer + Actions row (for reviewer_1 only, hide once review is returned) */}
      {isReviewer1 && !hasSubmittedReview && proposal.status !== "rejected" && (proposal.status === "submitted" || proposal.status === "under_review") && <div className="flex items-center gap-3 flex-wrap">
          {reviewers.length > 0 && <>
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              {proposal.status === "submitted" ? <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                  <SelectTrigger className="w-56 bg-background">
                    <SelectValue placeholder="Select a reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {reviewers.map(reviewer => <SelectItem key={reviewer.id} value={reviewer.email}>
                        {reviewer.name || reviewer.email.split("@")[0]}
                        {reviewer.email === defaultEmail && " (Default)"}
                        {" "}({reviewer.assigned_proposals_count ?? 0})
                      </SelectItem>)}
                  </SelectContent>
                </Select> : <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background text-sm font-medium">
                  {(() => {
            const assignedEmails = (proposal as any)?.assigned_reviewer_emails
              || proposal?.assigned_reviewers?.map((r: any) => r.email)
              || [];
            const assignedEmail = assignedEmails[0] || selectedReviewer;
            const assigned = reviewers.find(r => r.email === assignedEmail);
            return assigned ? assigned.name || assigned.email.split("@")[0] : assignedEmail || "N/A";
          })()}
                </div>}
            </>}

          {proposal.status === "submitted" && <>
              <Button className="bg-[#3d5a47]" onClick={() => {
          if (!selectedReviewer) {
            setPendingAction("accept");
            setIsAssignDialogOpen(true);
            return;
          }
          assignReviewers([selectedReviewer], {
            onSuccess: () => {
              workflowStatus.mutate({
                id: localId || id || "",
                status: "under_review",
                previousStatus: proposal.status,
                ticketNumber: proposal.ticket_number || id,
                proposalData: {
                  id: localId || undefined,
                  name: proposal.name,
                  author_name: proposal.author_name,
                  author_email: proposal.author_email,
                  ticket_number: proposal.ticket_number || id
                },
                assignedReviewerEmails: [selectedReviewer],
              });
            }
          });
        }} disabled={workflowStatus.isPending || isAssigning}>
                Submit for review
              </Button>
              <Button variant="outline" onClick={() => setIsDeclineDialogOpen(true)} disabled={workflowStatus.isPending}>
                Decline
              </Button>
            </>}

          {proposal.status === "under_review" && <Button variant="outline" onClick={() => revertToNew()} disabled={isBusy}>
              Reassign
            </Button>}
        </div>}

      {/* ============ TABS — ROLE-SPECIFIC ============ */}
      {isReviewer1 ? (/* ---------- DECISION REVIEWER TABS ---------- */
    <Tabs defaultValue={(decisionReviewerSubmitted || decisionReviewerAlreadySubmitted) ? "feedback" : "book"}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="book" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Book info</span>
            </TabsTrigger>
            <TabsTrigger value="author" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Author Info</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm">
              <Folder className="h-4 w-4" />
              <span className="hidden sm:inline">Supporting Documents</span>
            </TabsTrigger>
            {(decisionReviewerSubmitted || decisionReviewerAlreadySubmitted) ? (
              <TabsTrigger value="feedback" className="gap-1.5 text-xs sm:text-sm">
                <FileCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Feedback & Contract</span>
              </TabsTrigger>
            ) : (
              <TabsTrigger value="log" className="gap-1.5 text-xs sm:text-sm">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Log</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* ---- BOOK INFO (Decision Reviewer) ---- */}
          <TabsContent value="book" className="space-y-4 mt-4">
            {/* Overview Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Overview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Book Type</p>
                  <p className="text-sm font-medium">{proposal.book_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Word Count</p>
                  <p className="text-sm font-medium">{proposal.word_count || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expected Completion</p>
                  <p className="text-sm font-medium">{proposal.expected_completion_date || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Country</p>
                  <p className="text-sm font-medium">{extractCountry(proposal.address) || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <ProposalStatusBadge status={proposal.status} showIcon={false} />
                </div>
              </div>
            </div>

            {/* Collapsible sections */}
            <Accordion type="multiple" defaultValue={["blurb"]} className="space-y-1">
              <AccordionItem value="blurb" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">Blurb</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {proposal.short_description || "No blurb available"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="toc" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">TOC</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {proposal.table_of_contents || "No table of contents available"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="detail" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">
                  Detail: Figures, Tables, Photos
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {proposal.figures_tables_count || proposal.detailed_description || "No details available"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="permissions" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">
                  Permissions Required
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {proposal.permissions_required || "No permissions required"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              {proposal.additional_info && <AccordionItem value="additional" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-base font-semibold">
                    Additional Information
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {proposal.additional_info}
                    </p>
                  </AccordionContent>
                </AccordionItem>}
            </Accordion>
          </TabsContent>

          {/* ---- AUTHOR INFO (Decision Reviewer) ---- */}
          <TabsContent value="author" className="space-y-6 mt-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">
                {proposal.corresponding_author_name || proposal.author_name || "N/A"}
              </h3>
              <Badge className="bg-primary text-primary-foreground text-xs rounded-md uppercase tracking-wide">
                Author
              </Badge>
            </div>
            <div className="space-y-4">
              <h4 className="text-base font-medium">Contact Information</h4>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
                <DetailRow label="Email" value={proposal.author_email || (proposal as any).email} />
                <DetailRow label="Institution" value={proposal.institution} />
                <DetailRow label="Job Title" value={proposal.job_title} />
                <DetailRow label="Country" value={extractCountry(proposal.address)} />
                {proposal.secondary_email && proposal.secondary_email !== proposal.author_email && <DetailRow label="Secondary Email" value={proposal.secondary_email} />}
              </div>
            </div>
            {proposal.biography && <div className="space-y-3">
                <h4 className="text-base font-medium">Biography</h4>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {proposal.biography}
                </p>
              </div>}
          </TabsContent>

          

          {/* ---- SUPPORTING DOCUMENTS (Decision Reviewer) ---- */}
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Supporting Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {files.length === 0 && <p className="text-sm text-muted-foreground">No files uploaded</p>}
                <div className="space-y-3">
                  {files.map((url: string, i: number) => {
                const name = url.split("/").pop() || "File";
                const isPdf = url.endsWith(".pdf");
                const isWord = url.endsWith(".doc") || url.endsWith(".docx");
                return <div key={i} className="flex justify-between items-center border rounded-md px-3 py-2">
                        <div className="flex gap-2 items-center">
                          <FileText className="h-4 w-4" />
                          {name}
                        </div>
                        <div className="flex gap-2">
                          {(isPdf || isWord) && <Button size="icon" variant="ghost" onClick={() => setDocumentPreview({
                      url,
                      name,
                      type: isPdf ? "pdf" : "word"
                    })}>
                              <Eye className="h-4 w-4" />
                            </Button>}
                          <Button size="icon" variant="ghost" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>;
              })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- FEEDBACK & CONTRACT (Decision Reviewer) ---- */}
          <TabsContent value="feedback" className="mt-4 space-y-6">
            {/* Show submitted peer review feedback */}
            {submittedReview ? (() => {
              const formData = (submittedReview as any).review_form_data || {};
              const reviewFields = [
                { label: "Scope", key: "scope" },
                { label: "Purpose and Value", key: "purposeAndValue" },
                { label: "Title", key: "title" },
                { label: "Originality and Points of Difference", key: "originalityAndDifference" },
                { label: "Credibility", key: "credibility" },
                { label: "Structure", key: "structure" },
                { label: "Clarity, Structure and Quality of Writing", key: "clarityAndQuality" },
                { label: "Other Comments", key: "otherComments" },
                { label: "Red Flags", key: "redFlags" },
              ];
              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Peer Review Feedback</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        Completed on {format(new Date((submittedReview as any).created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {reviewFields.map(({ label, key }) => {
                      const value = formData[key];
                      if (!value) return null;
                      return (
                        <div key={key} className="space-y-1">
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{value}</p>
                          <Separator />
                        </div>
                      );
                    })}
                    {formData.recommendation && (
                      <div className="border border-muted rounded-lg p-4 mt-2">
                        <p className="text-sm font-semibold">Final Recommendation</p>
                        <p className="text-sm font-medium mt-1 capitalize">{formData.recommendation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })() : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">No peer review feedback available yet.</p>
                </CardContent>
              </Card>
            )}

            {/* Send Contract Button - only show when review is submitted but contract not yet sent */}
            {isPostSubmission && proposal.status !== 'approved' && proposal.status !== 'finalised' && proposal.status !== 'locked' && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Ready to send contract?</p>
                    <p className="text-xs text-muted-foreground">Review the feedback above, then send the contract to the author.</p>
                  </div>
                  <Button
                    onClick={() => {
                      upstreamUpdateStatus({
                        status: "approved",
                        notes: "Decision reviewer sent contract to author",
                      });
                      workflowStatus.mutate({
                        id: localId || id || "",
                        status: "approved",
                        previousStatus: proposal.status,
                        ticketNumber: proposal.ticket_number || id,
                        proposalData: {
                          id: localId || undefined,
                          name: proposal.name,
                          author_name: proposal.author_name,
                          author_email: proposal.author_email,
                          ticket_number: proposal.ticket_number || id,
                        },
                      });
                      queryClient.invalidateQueries({ queryKey: ["proposals"] });
                    }}
                    disabled={isBusy}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Contract to Author
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>) : (/* ---------- PEER REVIEWER TABS ---------- */
    <Tabs defaultValue="book">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="book" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Book Info</span>
            </TabsTrigger>
            <TabsTrigger value="author" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Author Info</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm">
              <Folder className="h-4 w-4" />
              <span className="hidden sm:inline">Supporting Documents</span>
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Log</span>
            </TabsTrigger>
          </TabsList>

          {/* ---- BOOK INFO (Peer Reviewer) ---- */}
          <TabsContent value="book" className="space-y-2 mt-4">
            <Accordion type="multiple" defaultValue={["overview"]} className="space-y-1">
              <AccordionItem value="overview" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">
                  Proposal Overview
                </AccordionTrigger>
                <AccordionContent className="space-y-1 pb-4">
                  <DetailRow label="Type of Book" value={proposal.book_type} />
                  <DetailRow label="Main Title" value={proposal.name} />
                  <DetailRow label="Subtitle" value={proposal.sub_title} />
                  <DetailRow label="Completion Date" value={proposal.expected_completion_date} />
                  <DetailRow label="Word Count" value={proposal.word_count} />
                  <DetailRow label="Keywords" value={proposal.keywords} />
                  <ContentBlock label="Blurb" value={proposal.short_description} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="toc" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">
                  Table of Contents
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line">
                    {proposal.table_of_contents || "No table of contents available"}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="market" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">
                  Market Position
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  <ContentBlock label="Similar Works" value={(proposal as any).similar_works || (proposal as any).competing_books} />
                  <ContentBlock label="Previous Reviews" value={(proposal as any).previous_reviews || proposal.marketing_info} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="manuscript" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">
                  Manuscript Details
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  <DetailRow label="Co-Authors/Editors" value={proposal.co_authors_editors || "None"} />
                  <ContentBlock label="Figures & Tables" value={proposal.figures_tables_count || proposal.detailed_description} />
                  <ContentBlock label="Permissions" value={proposal.permissions_required} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="additional" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">
                  Additional Information
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  <ContentBlock label="Societies & Bodies" value={(proposal as any).societies_research_bodies || (proposal as any).professional_societies} />
                  <ContentBlock label="Suggested Referees" value={proposal.referees_reviewers} />
                  <ContentBlock label="Additional Notes" value={proposal.additional_info} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* ---- AUTHOR INFO (Peer Reviewer) ---- */}
          <TabsContent value="author" className="space-y-6 mt-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">
                {proposal.corresponding_author_name || proposal.author_name || "N/A"}
              </h3>
              <Badge className="bg-primary text-primary-foreground text-xs rounded-md uppercase tracking-wide">
                Author
              </Badge>
            </div>
            <div className="space-y-4">
              <h4 className="text-base font-medium">Contact Information</h4>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
                <DetailRow label="Email" value={proposal.author_email || (proposal as any).email} />
                <DetailRow label="Institution" value={proposal.institution} />
                <DetailRow label="Job Title" value={proposal.job_title} />
                <DetailRow label="Country" value={extractCountry(proposal.address)} />
                {proposal.secondary_email && proposal.secondary_email !== proposal.author_email && <DetailRow label="Secondary Email" value={proposal.secondary_email} />}
              </div>
            </div>
            {proposal.biography && <div className="space-y-3">
                <h4 className="text-base font-medium">Biography</h4>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {proposal.biography}
                </p>
              </div>}
          </TabsContent>

          {/* ---- SUPPORTING DOCUMENTS (Peer Reviewer) ---- */}
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Supporting Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {files.length === 0 && <p className="text-sm text-muted-foreground">No files uploaded</p>}
                <div className="space-y-3">
                  {files.map((url: string, i: number) => {
                const name = url.split("/").pop() || "File";
                const isPdf = url.endsWith(".pdf");
                const isWord = url.endsWith(".doc") || url.endsWith(".docx");
                return <div key={i} className="flex justify-between items-center border rounded-md px-3 py-2">
                        <div className="flex gap-2 items-center">
                          <FileText className="h-4 w-4" />
                          {name}
                        </div>
                        <div className="flex gap-2">
                          {(isPdf || isWord) && <Button size="icon" variant="ghost" onClick={() => setDocumentPreview({
                      url,
                      name,
                      type: isPdf ? "pdf" : "word"
                    })}>
                              <Eye className="h-4 w-4" />
                            </Button>}
                          <Button size="icon" variant="ghost" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>;
              })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- LOG (Peer Reviewer) ---- */}
          <TabsContent value="log" className="mt-4 space-y-6">
            <Accordion type="multiple" defaultValue={["status", "timeline"]} className="space-y-1">
              {/* Current Status */}
              <AccordionItem value="status" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">Current Status</AccordionTrigger>
                <AccordionContent className="pb-4 space-y-3">
                  <div className="flex gap-4 py-1">
                    <span className="text-sm text-muted-foreground w-28 shrink-0">Submitted:</span>
                    <span className="text-sm font-medium">
                      {proposal.submitted_at ? format(new Date(proposal.submitted_at), "MMM d, yyyy") : proposal.created_at ? format(new Date(proposal.created_at), "MMM d, yyyy") : "—"}
                    </span>
                  </div>
                  {(() => {
                    const assignedDate = proposal.assigned_at || (logs as any[]).find((l: any) => l.new_status === 'under_review' || l.action?.toLowerCase().includes('assign'))?.created_at;
                    if (assignedDate) {
                      return (
                        <div className="flex gap-4 py-1">
                          <span className="text-sm text-muted-foreground w-28 shrink-0">Assigned On:</span>
                          <span className="text-sm font-medium">{format(new Date(assignedDate), "MMM d, yyyy")}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="pt-1">
                    <PeerReviewStatusBadge status={proposal.status} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Activity Timeline */}
              <AccordionItem value="timeline" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">Activity Timeline</AccordionTrigger>
                <AccordionContent className="pb-4">
                  {(() => {
                    // Build timeline events in chronological order (oldest first)
                    const timelineEvents: { title: string; date: string; actor: string; color: string; sortDate: Date }[] = [];

                    const submittedDate = proposal.submitted_at || proposal.created_at;
                    const assignedDate = proposal.assigned_at
                      || (logs as any[]).find((l: any) => l.new_status === 'under_review' || l.action?.toLowerCase().includes('assign'))?.created_at;

                    // 1. Initial Screening Passed — when decision reviewer accepted (inferred from assignment)
                    if (proposal.status !== "submitted" && proposal.status !== "rejected") {
                      // Use a date between submitted and assigned, or fallback to assigned date
                      const screeningDateRaw = assignedDate || proposal.updated_at;
                      if (screeningDateRaw) {
                        timelineEvents.push({
                          title: "Initial Screening Passed",
                          date: format(new Date(screeningDateRaw), "MMM d, yyyy"),
                          actor: "Commissioning Editor",
                          color: "bg-muted-foreground",
                          sortDate: new Date(screeningDateRaw),
                        });
                      }
                    }

                    // 2. Proposal Submitted — author's original submission
                    if (submittedDate) {
                      timelineEvents.push({
                        title: "Proposal Submitted",
                        date: format(new Date(submittedDate), "MMM d, yyyy"),
                        actor: proposal.corresponding_author_name || proposal.author_name || "Author",
                        color: "bg-[#3d5a47]",
                        sortDate: new Date(submittedDate),
                      });
                    }

                    // 3. Assigned to Peer Reviewer — when reviewer was assigned
                    if (assignedDate && proposal.status !== "submitted") {
                      timelineEvents.push({
                        title: "Assigned to Peer Reviewer",
                        date: format(new Date(assignedDate), "MMM d, yyyy"),
                        actor: "System",
                        color: "bg-[#2563eb]",
                        sortDate: new Date(assignedDate),
                      });
                    }

                    if (timelineEvents.length === 0) {
                      return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
                    }

                    // Display newest first (matches Figma: Assigned → Submitted → Screening)
                    const sorted = [...timelineEvents].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

                    return (
                      <div className="space-y-4">
                        {sorted.map((evt, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${evt.color}`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{evt.title}</p>
                              <p className="text-xs text-muted-foreground">{evt.date} • {evt.actor}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        </Tabs>)}
    </div>;

  /* ======================== RENDER ======================== */

  return <DashboardLayout title="Proposal Details">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/proposals")} className="inline-flex items-center gap-1 text-sm text-[#3d5a47] hover:text-[#2d4a37] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          {isReviewer1 ? "Back to Home" : "Back to Dashboard"}
        </button>

        {(showReviewForm || hasSubmittedReview) && !showingSummary && !peerReviewAlreadySubmitted && !decisionReviewerSubmitted && !decisionReviewerAlreadySubmitted && <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => reviewFormRef.current?.saveDraft()} disabled={reviewFormRef.current?.isSaving}>
              Save Draft
            </Button>
            {showReviewForm ? (
              <Button className="bg-[#2f4b40] hover:bg-[#2f4b40] hover:opacity-90 text-white" onClick={() => {
                const ref = reviewFormRef.current;
                if (ref) {
                  setSummaryFormData({ ...ref.formData });
                  setShowingSummary(true);
                }
              }} disabled={reviewFormRef.current?.isSaving}>
                Submit Review
              </Button>
            ) : (
              <Button className="bg-[#2f4b40] hover:bg-[#2f4b40] hover:opacity-90 text-white" onClick={() => {
                const ref = reviewFormRef.current;
                if (ref) {
                  setSummaryFormData({ ...ref.formData });
                  setShowingSummary(true);
                }
              }} disabled={reviewFormRef.current?.isSaving}>
                Submit Review
              </Button>
            )}
          </div>}
      </div>

      {/* Two-Panel, Summary, or Single-Panel Layout */}
      {showReviewForm ? (
        showingSummary ? (
          <PeerReviewSummary
            proposal={proposal}
            formData={summaryFormData}
            onGoBack={() => setShowingSummary(false)}
            onConfirmSubmit={async () => {
              setIsConfirming(true);
              try {
                await addComment.mutateAsync({
                  proposalId: proposal.id,
                  commentText: summaryFormData.otherComments || '',
                  reviewFormData: {
                    ...summaryFormData,
                    submittedForAuthorization: true,
                    submittedAt: new Date().toISOString(),
                  },
                  ticketNumber: proposal.ticket_number || id,
                });

                // Update local status to 'approved' so peer reviewer dashboard shows "Completed"
                workflowStatus.mutate({
                  id: localId || id || "",
                  status: "approved",
                  previousStatus: proposal.status,
                  ticketNumber: proposal.ticket_number || id,
                  proposalData: {
                    id: localId || undefined,
                    name: proposal.name,
                    author_name: proposal.author_name,
                    author_email: proposal.author_email,
                    ticket_number: proposal.ticket_number || id,
                  },
                });

                queryClient.invalidateQueries({ queryKey: ["proposals"] });
                queryClient.invalidateQueries({ queryKey: ["proposal-comments"] });
                navigate('/proposals');
              } catch (err) {
                console.error('Submit failed:', err);
              } finally {
                setIsConfirming(false);
              }
            }}
            isSubmitting={isConfirming}
          />
        ) : (
          <div className="grid grid-cols-2 gap-0 items-start" style={{ height: 'calc(100vh - 140px)' }}>
            <div className="pr-6 overflow-y-auto h-full scrollbar-thin">
              <PeerReviewCommentsForm ref={reviewFormRef} proposal={proposal} existingAssessment={comments?.[0]?.review_form_data as Record<string, any> | undefined} onSave={() => refetch()} onSubmitReview={(data) => { setSummaryFormData(data); setShowingSummary(true); }} onDraftSaved={() => {
                if (proposal.status === 'submitted') {
                  workflowStatus.mutate({
                    id: localId || id || "",
                    status: "under_review",
                    previousStatus: proposal.status,
                    ticketNumber: proposal.ticket_number || id,
                    proposalData: {
                      id: localId || undefined,
                      name: proposal.name,
                      author_name: proposal.author_name,
                      author_email: proposal.author_email,
                      ticket_number: proposal.ticket_number || id,
                    },
                  });
                }
              }} />
            </div>
            <div className="pl-6 overflow-y-auto h-full scrollbar-thin">
              <h2 className="text-2xl font-bold text-foreground mb-6">Proposal Details</h2>
              {rightPanel}
            </div>
          </div>
        )
      ) : hasSubmittedReview ? (
        (decisionReviewerSubmitted || decisionReviewerAlreadySubmitted) ? (
          <div>{rightPanel}</div>
        ) : showingSummary ? (
          <PeerReviewSummary
            proposal={proposal}
            formData={summaryFormData}
            onGoBack={() => setShowingSummary(false)}
            onConfirmSubmit={async () => {
              setIsConfirming(true);
              try {
                await addComment.mutateAsync({
                  proposalId: proposal.id,
                  commentText: summaryFormData.otherComments || '',
                  reviewFormData: {
                    ...summaryFormData,
                    submittedForAuthorization: true,
                    submittedAt: new Date().toISOString(),
                  },
                  ticketNumber: proposal.ticket_number || id,
                });

                queryClient.invalidateQueries({ queryKey: ["proposals"] });
                queryClient.invalidateQueries({ queryKey: ["proposal-comments"] });
                setDecisionReviewerSubmitted(true);
                setShowingSummary(false);
              } catch (err) {
                console.error('Submit failed:', err);
              } finally {
                setIsConfirming(false);
              }
            }}
            isSubmitting={isConfirming}
          />
        ) : (
        <div className="grid grid-cols-2 gap-0 items-start" style={{ height: 'calc(100vh - 140px)' }}>
           <div className="pr-6 overflow-y-auto h-full scrollbar-thin">
            {/* Start Fresh button + info banner for decision reviewer */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Peer review comments</h2>
                </div>
              </div>

              {!startedFresh ? (
                <>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      className="text-[#c4940a] border-[#c4940a] hover:bg-[#c4940a]/10"
                      onClick={() => setStartedFresh(true)}
                    >
                      Start Fresh
                    </Button>
                  </div>
                  <div className="border border-[#c4940a]/40 bg-[#c4940a]/5 rounded-lg p-4 flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#c4940a]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Reviewer 1's Comments Pre-loaded</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        The form below contains Reviewer 1's comments in <span className="text-destructive font-medium">red text</span>.
                        You can edit any field directly, or click "Start Fresh" above to clear all fields.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="border border-muted bg-muted/30 rounded-lg p-4 flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Reviewer 1's Comments Cleared</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      To reload reviewer 1's comments press here{" "}
                      <button
                        className="text-primary underline font-medium hover:opacity-80"
                        onClick={() => setStartedFresh(false)}
                      >
                        reload
                      </button>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <PeerReviewCommentsForm
              ref={reviewFormRef}
              proposal={proposal}
              existingAssessment={startedFresh ? {} : (submittedReview as any).review_form_data || {}}
              forceEditable
              hideHeader
              preloadedStyle={!startedFresh}
              onSave={() => refetch()}
              onSubmitReview={(data) => { setSummaryFormData(data); setShowingSummary(true); }}
              onDraftSaved={() => {}}
            />
          </div>
          <div className="pl-6 overflow-y-auto h-full scrollbar-thin">
            <h2 className="text-2xl font-bold text-foreground mb-6">Proposal Details</h2>
            {rightPanel}
          </div>
        </div>
        )
      ) : <div>{rightPanel}</div>}

      {/* Dialogs */}
      <DocumentPreviewDialog open={!!documentPreview} onOpenChange={o => !o && setDocumentPreview(null)} documentUrl={documentPreview?.url || ""} fileName={documentPreview?.name || ""} fileType={documentPreview?.type || "pdf"} />

      <AssignReviewersDialog open={isAssignDialogOpen} onOpenChange={open => {
      setIsAssignDialogOpen(open);
      if (!open) setPendingAction(null);
    }} onAssign={reviewerIds => {
      assignReviewers(reviewerIds, {
        onSuccess: () => {
          workflowStatus.mutate({
            id: localId || id || "",
            status: "under_review",
            previousStatus: proposal.status,
            ticketNumber: proposal.ticket_number || id,
            proposalData: {
              id: localId || undefined,
              name: proposal.name,
              author_name: proposal.author_name,
              author_email: proposal.author_email,
              ticket_number: proposal.ticket_number || id
            }
          }, {
            onSuccess: () => {
              setIsAssignDialogOpen(false);
              setPendingAction(null);
            }
          });
        }
      });
    }} isLoading={workflowStatus.isPending || isAssigning} />

      <DeclineProposalDialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen} onConfirm={() => {
      upstreamUpdateStatus({
        status: "rejected",
        notes: "Proposal declined",
      });
      workflowStatus.mutate({
        id: localId || id || "",
        status: "rejected",
        previousStatus: proposal.status,
        ticketNumber: proposal.ticket_number || id,
        proposalData: {
          id: localId || undefined,
          name: proposal.name,
          author_name: proposal.author_name,
          author_email: proposal.author_email,
          ticket_number: proposal.ticket_number || id
        }
      }, {
        onSuccess: () => {
          setIsDeclineDialogOpen(false);
        }
      });
    }} isLoading={workflowStatus.isPending || isUpdatingUpstream} />

      <AlertDialog open={isRevertDialogOpen} onOpenChange={setIsRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert proposal to New?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the proposal back to <strong>New</strong> and remove any active peer
              reviewer assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revertToNew} disabled={isBusy}>
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>;
};
export default ProposalDetails;