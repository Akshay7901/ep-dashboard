// PROPOSAL DETAILS — TWO-PANEL PEER REVIEW LAYOUT

import React, { useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { extractCountry } from "@/lib/extractCountry";
import { statusIs } from "@/lib/statusUtils";
import { proposalApi, contractApi } from "@/lib/proposalsApi";
import ContractQueryThread from "@/components/proposals/ContractQueryThread";
import { useContractQueries } from "@/hooks/useContractQueries";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProposalStatusBadge from "@/components/proposals/ProposalStatusBadge";
import PeerReviewCommentsForm, { type PeerReviewCommentsFormHandle } from "@/components/proposals/PeerReviewCommentsForm";
import PeerReviewSummary from "@/components/proposals/PeerReviewSummary";
import DocumentPreviewDialog from "@/components/proposals/PdfPreviewDialog";
import ContractPdfViewerDialog from "@/components/proposals/ContractPdfViewerDialog";
import AssignReviewersDialog from "@/components/proposals/AssignReviewersDialog";
import DeclineProposalDialog from "@/components/proposals/DeclineProposalDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Download, Eye, BookOpen, User, Folder, UserCircle, ClipboardList, MessageSquare, CheckCircle2, FileCheck, Send, Loader2, History, GitCompareArrows } from "lucide-react";
import { useProposal, useWorkflowLogs, useProposalEvents } from "@/hooks/useProposals";
import { useReview } from "@/hooks/useReview";
import { useQueryClient } from "@tanstack/react-query";
import { useProposalActions } from "@/hooks/useProposalActions";
import { useAuth } from "@/contexts/AuthContext";
import { usePeerReviewers } from "@/hooks/usePeerReviewers";
import { useDefaultReviewer } from "@/hooks/useDefaultReviewer";
import ReviewCommentsDisplay from "@/components/proposals/ReviewCommentsDisplay";
import PeerReviewReadOnly from "@/components/proposals/PeerReviewReadOnly";
import DiffCheckerDialog from "@/components/proposals/DiffCheckerDialog";
import { useContract } from "@/hooks/useContract";

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
  const [contractViewOpen, setContractViewOpen] = useState(false);
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null);
  const [contractPdfLoading, setContractPdfLoading] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"accept" | "decline" | null>(null);
  const [showingSummary, setShowingSummary] = useState(false);
  const [summaryFormData, setSummaryFormData] = useState<Record<string, string>>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const [startedFresh, setStartedFresh] = useState(false);
  const [eventsSheetOpen, setEventsSheetOpen] = useState(false);
  const [decisionReviewerSubmitted, setDecisionReviewerSubmitted] = useState(false);
  const [drActiveTab, setDrActiveTab] = useState<string>((false) ? "feedback" : "book");
  const [drFeedbackAccordion, setDrFeedbackAccordion] = useState<string | undefined>(undefined);
  const [diffCheckerOpen, setDiffCheckerOpen] = useState(false);

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
  // Fetch peer review data from review API
  const ticketNum = proposal?.ticket_number || id || "";
  const { review: reviewData, refetchReview, saveDraft: saveReviewDraft, submitReview: submitReviewApi, isSubmitting: isReviewSubmitting } = useReview(ticketNum);
  const { latestContract, isLoading: contractLoading } = useContract(ticketNum);
  const { queries: contractQueries, isLoading: queriesLoading, raiseQuery, respondToQuery } = useContractQueries(ticketNum);
  const {
    data: logs = []
  } = useWorkflowLogs(localId);
  const { data: proposalEvents = [], isLoading: eventsLoading } = useProposalEvents(ticketNum);
  const {
    assignReviewers,
    isAssigning,
    unassignReviewers,
    isUnassigning,
  } = useProposalActions(proposal?.ticket_number || id);

  // Extract peer review form data (used for pre-loading peer reviewer's comments)
  const reviewFormData = React.useMemo(() => {
    if (!reviewData) return {};
    const reviews = reviewData.reviews || (reviewData.review ? [reviewData.review] : []);
    // For form pre-loading, always use the peer reviewer's review
    const peerReview = reviews.find((r: any) => r.reviewer_role === 'peer_reviewer') || reviews[0];
    const reviewObj = peerReview || reviewData;
    const candidate = reviewObj.review_data || reviewObj.data || reviewObj;
    if (candidate && typeof candidate === 'object' && (candidate.scope !== undefined || candidate.recommendation !== undefined)) {
      return candidate;
    }
    return {};
  }, [reviewData]);

  // Extract decision reviewer's OWN saved draft (if any) from the API response
  const decisionReviewerDraft = React.useMemo(() => {
    if (!reviewData) return null;
    const reviews = reviewData.reviews || (reviewData.review ? [reviewData.review] : []);
    const drReview = reviews.find((r: any) => r.reviewer_role === 'decision_reviewer');
    if (!drReview) return null;
    const candidate = drReview.review_data || drReview.data || drReview;
    if (candidate && typeof candidate === 'object' && (candidate.scope !== undefined || candidate.recommendation !== undefined)) {
      return candidate;
    }
    return null;
  }, [reviewData]);

  // Peer review metadata (for reviewer name display, etc.)
  const reviewMeta = React.useMemo(() => {
    if (!reviewData) return {};
    const reviews = reviewData.reviews || (reviewData.review ? [reviewData.review] : []);
    return reviews.find((r: any) => r.reviewer_role === 'peer_reviewer') || reviews[0] || reviewData.review || reviewData || {};
  }, [reviewData]);

  // Set initial DR tab to "feedback" when review is submitted
  const drShouldShowFeedback = decisionReviewerSubmitted || (proposal && (
    statusIs(proposal.status, "contract_issued", "approved", "locked") ||
    (reviewData?.reviews || []).some((r: any) => r.reviewer_role === 'decision_reviewer' && r.is_submitted)
  ));
  React.useEffect(() => {
    if (drShouldShowFeedback) setDrActiveTab("feedback");
  }, [drShouldShowFeedback]);

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
  const isBusy = isAssigning || isUnassigning;
  const showReviewForm = isReviewer2;

  // Check if peer reviewer already submitted their review
  const reviewStatus = reviewMeta?.is_submitted ? 'submitted' : (reviewMeta?.status || reviewMeta?.review_status || '');
  const peerReviewAlreadySubmitted = isReviewer2 && (
    reviewMeta?.is_submitted === true
    || statusIs(proposal.status, "review_returned", "contract_issued", "approved", "locked")
  );

  // Check if there's a SUBMITTED peer review available (for decision reviewer split layout)
  // Show split screen ONLY when the peer reviewer has actually submitted (not just saved a draft)
  const peerReviewEntry = (() => {
    if (!reviewData) return null;
    const reviews = reviewData.reviews || (reviewData.review ? [reviewData.review] : []);
    return reviews.find((r: any) => r.reviewer_role === 'peer_reviewer') || reviews[0] || null;
  })();
  
  const hasSubmittedReview = isReviewer1 && peerReviewEntry != null && peerReviewEntry.is_submitted === true && Object.keys(reviewFormData).length > 0;
  const submittedReview = hasSubmittedReview ? reviewFormData : null;

  // Check if the decision reviewer has already submitted their own review
  // Either status indicates it, or the API reviews array contains a decision_reviewer entry
  const allReviews = reviewData?.reviews || (reviewData?.review ? [reviewData.review] : []);
  const hasDecisionReviewInApi = allReviews.some((r: any) => r.reviewer_role === 'decision_reviewer' && r.is_submitted);
  const decisionReviewerAlreadySubmitted = isReviewer1 && (
    statusIs(proposal.status, "contract_issued", "approved", "locked") || hasDecisionReviewInApi
  );


  const revertToNew = async () => {
    try {
      await unassignReviewers();
    } catch {
      console.log("DELETE unassign not supported, relying on status change");
    }
    setIsRevertDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["reviewer-assignments"] });
    queryClient.invalidateQueries({ queryKey: ["proposals"] });
    queryClient.invalidateQueries({ queryKey: ["proposal", proposal.ticket_number || id] });
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
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <ProposalStatusBadge status={proposal.status} showIcon={false} />
            {isPostSubmission && proposal.contract_sent_at && (
              <span className="text-sm text-muted-foreground">
                {format(new Date(proposal.contract_sent_at), "do MMMM yyyy")}
              </span>
            )}
            {isReviewer1 && (
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEventsSheetOpen(true)} title="View Audit Trail">
                <History className="h-4 w-4" />
              </Button>
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
      {isReviewer1 && !hasSubmittedReview && !statusIs(proposal.status, "declined", "rejected") && (statusIs(proposal.status, "new", "submitted") || statusIs(proposal.status, "in_review", "under_review")) && <div className="flex items-center gap-3 flex-wrap">
          {reviewers.length > 0 && <>
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
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
              </Select>
            </>}

          {statusIs(proposal.status, "new", "submitted") && <>
              <Button className="bg-[#3d5a47]" onClick={() => {
          if (!selectedReviewer) {
            setPendingAction("accept");
            setIsAssignDialogOpen(true);
            return;
          }
          assignReviewers(selectedReviewer);
        }} disabled={isAssigning}>
                Submit for review
              </Button>
              <Button variant="outline" onClick={() => setIsDeclineDialogOpen(true)} disabled={isBusy}>
                Decline
              </Button>
            </>}

          {statusIs(proposal.status, "in_review", "under_review") && (() => {
            const assignedEmails = (proposal as any)?.assigned_reviewer_emails
              || proposal?.assigned_reviewers?.map((r: any) => r.email || r.reviewer_email)
              || [];
            const currentAssigned = assignedEmails.filter(Boolean)[0] || "";
            const isSameReviewer = selectedReviewer && selectedReviewer === currentAssigned;
            return <Button
              className="bg-[#3d5a47]"
              onClick={() => assignReviewers(selectedReviewer)}
              disabled={isAssigning || !selectedReviewer || !!isSameReviewer}
              title={isSameReviewer ? "Select a different reviewer to reassign" : ""}
            >
              Reassign
            </Button>;
          })()}
        </div>}

      {/* ============ TABS — ROLE-SPECIFIC ============ */}
      {isReviewer1 ? (/* ---------- DECISION REVIEWER TABS ---------- */
    <Tabs value={drActiveTab} onValueChange={(v) => { setDrActiveTab(v); setDrFeedbackAccordion(undefined); }}>
          <TabsList className={`grid w-full ${(decisionReviewerSubmitted || decisionReviewerAlreadySubmitted) ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
            {(decisionReviewerSubmitted || decisionReviewerAlreadySubmitted) && (
              <TabsTrigger value="feedback" className="gap-1.5 text-xs sm:text-sm">
                <FileCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Feedback & Contract</span>
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
              <Badge className="bg-[#3d5a47] text-white text-xs rounded-md uppercase tracking-wide hover:bg-[#3d5a47]">
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

          {/* Events Sheet moved to slide-out panel */}

          {/* ---- FEEDBACK & CONTRACT (Decision Reviewer) ---- */}
          <TabsContent value="feedback" className="mt-4 space-y-4">
            {(() => {
              const allReviews = reviewData?.reviews || (reviewData?.review ? [reviewData.review] : []);
              const peerReview = allReviews.find((r: any) => r.reviewer_role === 'peer_reviewer');
              const decisionReview = allReviews.find((r: any) => r.reviewer_role === 'decision_reviewer');

              const reviewFields = [
                { label: "Scope", key: "scope" },
                { label: "Purpose and Value", key: "purposeAndValue" },
                { label: "Title", key: "title" },
                { label: "Originality and Points of Difference", key: "originality" },
                { label: "Credibility", key: "credibility" },
                { label: "Structure", key: "structure" },
                { label: "Clarity, Structure and Quality of Writing", key: "clarity" },
                { label: "Other Comments", key: "otherComments" },
                { label: "Red Flags", key: "redFlags" },
              ];

              const renderReviewFields = (data: Record<string, any>) => (
                <div className="space-y-4">
                  {reviewFields.map(({ label, key }) => {
                    const value = data[key];
                    if (!value) return null;
                    return (
                      <div key={key} className="space-y-1">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{value}</p>
                        <Separator />
                      </div>
                    );
                  })}
                  {data.recommendation && (
                    <div className="border border-muted rounded-lg p-4 mt-2">
                      <p className="text-sm font-semibold">Final Recommendation</p>
                      <p className="text-sm font-medium mt-1 capitalize">
                        {data.recommendation.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}
                </div>
              );

              return (
                <Accordion type="single" collapsible value={drFeedbackAccordion} onValueChange={setDrFeedbackAccordion} className="space-y-2">
                  {/* Original Peer Review Feedback */}
                  <AccordionItem value="peer-review" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="text-left">
                        <p className="text-base font-semibold">Original Peer Review Feedback</p>
                        {peerReview && (
                          <p className="text-sm text-muted-foreground font-normal mt-0.5">
                            {peerReview.reviewer_name || peerReview.reviewer_email || "Peer Reviewer"}
                            {peerReview.review_data?.recommendation && ` • ${peerReview.review_data.recommendation.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}`}
                          </p>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      {peerReview?.review_data ? renderReviewFields(peerReview.review_data) : (
                        <p className="text-sm text-muted-foreground">No peer review feedback available yet.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Final Review Feedback (Decision Reviewer) */}
                  <AccordionItem value="final-review" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="text-left">
                        <p className="text-base font-semibold">Final Review Feedback</p>
                        {decisionReview && (
                          <p className="text-sm text-muted-foreground font-normal mt-0.5">
                            {decisionReview.reviewer_name || decisionReview.reviewer_email || "Decision Reviewer"}
                            {decisionReview.review_data?.recommendation && ` • ${decisionReview.review_data.recommendation.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}`}
                          </p>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      {decisionReview?.review_data ? (
                        <div className="space-y-4">
                          {renderReviewFields(decisionReview.review_data)}
                          {decisionReview.review_data.contractType && (
                            <>
                              <Separator />
                              <div className="border border-muted rounded-lg p-4">
                                <p className="text-sm font-semibold">Contract Type Issued</p>
                                <p className="text-sm font-medium mt-1 capitalize">
                                  {decisionReview.review_data.contractType === "editor" ? "Editor Contract" : "Author Contract"}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No final review feedback available yet.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Publishing Contract */}
                  <AccordionItem value="contract" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="text-left">
                        <p className="text-base font-semibold">Publishing Contract</p>
                        {contractLoading && <p className="text-sm text-muted-foreground font-normal mt-0.5">Loading…</p>}
                        {latestContract && (
                          <p className="text-sm text-muted-foreground font-normal mt-0.5">
                            Status: <span className="capitalize">{(latestContract.status || latestContract.docusign_status || 'unknown').replace(/_/g, ' ')}</span>
                            {latestContract.contract_type && ` • ${latestContract.contract_type === 'editor' ? 'Editor' : 'Author'} Contract`}
                          </p>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      {contractLoading ? (
                        <div className="flex items-center gap-2 py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading contract details…</span>
                        </div>
                      ) : !latestContract ? (
                        <p className="text-sm text-muted-foreground">No contract found for this proposal.</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Contract info grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Status</p>
                              <p className="text-sm font-medium capitalize">{(latestContract.status || latestContract.docusign_status || '—').replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Contract Type</p>
                              <p className="text-sm font-medium capitalize">{(latestContract.contract_type || '—').replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Version</p>
                              <p className="text-sm font-medium">{latestContract.contract_version || 1}</p>
                            </div>
                            {latestContract.recipient_name && (
                              <div>
                                <p className="text-xs text-muted-foreground">Recipient</p>
                                <p className="text-sm font-medium">{latestContract.recipient_name}</p>
                              </div>
                            )}
                            {latestContract.recipient_email && (
                              <div>
                                <p className="text-xs text-muted-foreground">Recipient Email</p>
                                <p className="text-sm font-medium">{latestContract.recipient_email}</p>
                              </div>
                            )}
                            {latestContract.docusign_sent_at && (
                              <div>
                                <p className="text-xs text-muted-foreground">Sent</p>
                                <p className="text-sm font-medium">{format(new Date(latestContract.docusign_sent_at), "MMM d, yyyy 'at' h:mm a")}</p>
                              </div>
                            )}
                            {latestContract.docusign_completed_at && (
                              <div>
                                <p className="text-xs text-muted-foreground">Completed</p>
                                <p className="text-sm font-medium">{format(new Date(latestContract.docusign_completed_at), "MMM d, yyyy 'at' h:mm a")}</p>
                              </div>
                            )}
                            {latestContract.docusign_declined_at && (
                              <div>
                                <p className="text-xs text-muted-foreground">Declined</p>
                                <p className="text-sm font-medium">{format(new Date(latestContract.docusign_declined_at), "MMM d, yyyy 'at' h:mm a")}</p>
                              </div>
                            )}
                          </div>

                          {latestContract.docusign_decline_reason && (
                            <div className="border border-destructive/30 bg-destructive/5 rounded-md p-4">
                              <p className="text-sm font-semibold text-destructive">Decline Reason</p>
                              <p className="text-sm text-foreground/80 mt-1">{latestContract.docusign_decline_reason}</p>
                            </div>
                          )}

                          {/* View document button */}
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={async () => {
                              setContractViewOpen(true);
                              setContractPdfLoading(true);
                              try {
                                const url = await contractApi.getDocumentBlob(proposal.ticket_number || id || '');
                                setContractPdfUrl(url);
                              } catch { setContractPdfUrl(null); }
                              finally { setContractPdfLoading(false); }
                            }}
                          >
                            <Eye className="h-4 w-4" /> View Contract Document
                          </Button>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Contract Queries */}
                  <AccordionItem value="queries" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="text-left">
                        <p className="text-base font-semibold">
                          Queries
                          {contractQueries.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">({contractQueries.length})</span>
                          )}
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <ContractQueryThread
                        queries={contractQueries}
                        isLoading={queriesLoading}
                        viewAs="reviewer"
                        proposalStatus={proposal.status}
                        onSend={async (text, _category, queryId) => { await respondToQuery.mutateAsync({ queryId: queryId!, responseText: text }); }}
                        isSending={respondToQuery.isPending}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })()}
          </TabsContent>
        </Tabs>) : (/* ---------- PEER REVIEWER TABS ---------- */
    <Tabs defaultValue="book">
          <TabsList className="grid grid-cols-3 w-full">
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
              <Badge className="bg-[#3d5a47] text-white text-xs rounded-md uppercase tracking-wide hover:bg-[#3d5a47]">
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


        </Tabs>)}
      {/* Events Audit Trail Sheet */}
      {isReviewer1 && (
        <Sheet open={eventsSheetOpen} onOpenChange={setEventsSheetOpen}>
          <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit Trail
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {eventsLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading events…</span>
                </div>
              ) : proposalEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              ) : (
                <div className="space-y-5">
                  {proposalEvents.map((evt, index) => (
                    <div key={evt.id} className="relative flex items-start gap-3">
                      {/* Timeline line */}
                      {index < proposalEvents.length - 1 && (
                        <div className="absolute left-[5px] top-5 bottom-0 w-px bg-border" style={{ height: 'calc(100% + 12px)' }} />
                      )}
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 z-10 ${
                        evt.event_type === 'status_change' ? 'bg-[#2563eb]' :
                        evt.event_type === 'assignment' ? 'bg-[#3d5a47]' :
                        'bg-muted-foreground'
                      }`} />
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-sm font-medium">{evt.description}</p>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
                          <span>{format(new Date(evt.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                          {evt.changed_by && (
                            <>
                              <span>•</span>
                              <span>{evt.changed_by}</span>
                            </>
                          )}
                          {evt.changed_by_role && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{evt.changed_by_role.replace(/_/g, ' ')}</span>
                            </>
                          )}
                        </div>
                        {(evt.old_status || evt.new_status) && (
                          <div className="flex items-center gap-2 mt-1.5">
                            {evt.old_status && (
                              <Badge variant="outline" className="text-xs capitalize">{evt.old_status.replace(/_/g, ' ')}</Badge>
                            )}
                            {evt.old_status && evt.new_status && (
                              <span className="text-xs text-muted-foreground">→</span>
                            )}
                            {evt.new_status && (
                              <Badge className="text-xs capitalize bg-[#3d5a47] hover:bg-[#3d5a47]">{evt.new_status.replace(/_/g, ' ')}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
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
        peerReviewAlreadySubmitted ? (
          <div className="grid grid-cols-2 gap-0 items-start" style={{ height: 'calc(100vh - 140px)' }}>
            <div className="pr-6 overflow-y-auto h-full scrollbar-thin">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-[#3d5a47]" />
                  <h2 className="text-2xl font-bold text-foreground">Review Submitted</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your peer review has been submitted and is now awaiting authorization. Below is a read-only copy of your submission.
                </p>
                <Separator />
                {/* Read-only review fields */}
                {(() => {
                  const reviewFields = [
                    { label: "Scope", key: "scope" },
                    { label: "Purpose and Value", key: "purposeAndValue" },
                    { label: "Title", key: "title" },
                    { label: "Originality and Points of Difference", key: "originality" },
                    { label: "Credibility", key: "credibility" },
                    { label: "Structure", key: "structure" },
                    { label: "Clarity, Structure and Quality of Writing", key: "clarity" },
                    { label: "Other Comments", key: "otherComments" },
                    { label: "Red Flags", key: "redFlags" },
                  ];
                  return (
                    <div className="space-y-5">
                      {reviewFields.map(({ label, key }) => {
                        const value = reviewFormData[key];
                        if (!value) return null;
                        return (
                          <div key={key} className="space-y-1.5">
                            <p className="text-sm font-semibold">{label}</p>
                            <div className="bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-line rounded-md border">
                              {value}
                            </div>
                          </div>
                        );
                      })}
                      {reviewFormData.recommendation && (
                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold">Final Recommendation</p>
                          <Badge className={`rounded-full px-4 py-1 text-sm ${
                            reviewFormData.recommendation === 'proceed' ? 'bg-[#3d5a47] text-white hover:bg-[#3d5a47]' :
                            reviewFormData.recommendation === 'reject' ? 'bg-foreground text-background hover:bg-foreground' :
                            reviewFormData.recommendation === 'minor_revision' ? 'bg-[#c4940a] text-white hover:bg-[#c4940a]' :
                            'bg-[#9b2c2c] text-white hover:bg-[#9b2c2c]'
                          }`}>
                            {reviewFormData.recommendation.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="pl-6 overflow-y-auto h-full scrollbar-thin">
              <h2 className="text-2xl font-bold text-foreground mb-6">Proposal Details</h2>
              {rightPanel}
            </div>
          </div>
        ) : showingSummary ? (
          <PeerReviewSummary
            proposal={proposal}
            formData={summaryFormData}
            onGoBack={() => setShowingSummary(false)}
            onConfirmSubmit={async () => {
              if (!summaryFormData.recommendation) {
                toast({ variant: 'destructive', title: 'Recommendation Required', description: 'Please select a Final Recommendation before submitting.' });
                return;
              }
              setIsConfirming(true);
              try {
                await submitReviewApi({
                  ...summaryFormData,
                });

                queryClient.invalidateQueries({ queryKey: ["proposals"] });
                queryClient.invalidateQueries({ queryKey: ["review", ticketNum] });
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
            <PeerReviewCommentsForm ref={reviewFormRef} proposal={proposal} existingAssessment={reviewFormData as Record<string, any> | undefined} onSave={() => refetch()} onSubmitReview={(data) => { setSummaryFormData(data); setShowingSummary(true); }} onDraftSaved={() => {
                if (statusIs(proposal.status, "pending", "new", "submitted")) {
                  // Status transitions managed by backend
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
            showContractSection
            onConfirmSubmit={async (sendContract, contractType) => {
              if (!summaryFormData.recommendation) {
                toast({ variant: 'destructive', title: 'Recommendation Required', description: 'Please select a Final Recommendation before submitting.' });
                return;
              }
              setIsConfirming(true);
              try {
                const formToApiMap: Record<string, string> = {
                  scope: 'scope',
                  purposeAndValue: 'purpose_value',
                  title: 'title',
                  originality: 'originality',
                  credibility: 'credibility',
                  structure: 'structure',
                  clarity: 'clarity_quality',
                  otherComments: 'other_comments',
                  redFlags: 'red_flags',
                  recommendation: 'recommendation',
                };
                const apiPayload: Record<string, any> = {};
                for (const [formKey, apiKey] of Object.entries(formToApiMap)) {
                  if (summaryFormData[formKey] !== undefined && summaryFormData[formKey] !== '') {
                    apiPayload[apiKey] = summaryFormData[formKey];
                  }
                }
                if (sendContract) {
                  apiPayload.send_contract = true;
                  apiPayload.contract_type = contractType || 'author';
                } else {
                  apiPayload.send_contract = false;
                }
                await submitReviewApi(apiPayload);

                queryClient.invalidateQueries({ queryKey: ["proposals"] });
                queryClient.invalidateQueries({ queryKey: ["review", ticketNum] });
                queryClient.invalidateQueries({ queryKey: ["proposal", ticketNum] });
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

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="text-[#2563eb] border-[#2563eb] hover:bg-[#2563eb]/10"
                  onClick={() => setDiffCheckerOpen(true)}
                >
                  <GitCompareArrows className="h-4 w-4 mr-2" />
                  Diff Checker
                </Button>
              </div>
              <div className="border border-[#c4940a]/40 bg-[#c4940a]/5 rounded-lg p-4 flex gap-3">
                <div className="shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#c4940a]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm">{reviewMeta?.reviewer_name || "Peer Reviewer"}'s Comments Pre-loaded</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    The form below contains {reviewMeta?.reviewer_name || "Peer Reviewer"}'s comments in <span className="text-destructive font-medium">red text</span>.
                    You can edit any field directly.
                  </p>
                </div>
              </div>
            </div>

            <PeerReviewCommentsForm
              ref={reviewFormRef}
              proposal={proposal}
              existingAssessment={decisionReviewerDraft || reviewFormData || {}}
              forceEditable
              hideHeader
              preloadedStyle={!decisionReviewerDraft}
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

      <ContractPdfViewerDialog
        open={contractViewOpen}
        onOpenChange={(open) => {
          setContractViewOpen(open);
          if (!open) setContractPdfUrl(null);
        }}
        documentDataUrl={contractPdfUrl}
        isLoading={contractPdfLoading}
        downloadUrl={contractPdfUrl || undefined}
        downloadFileName={`${ticketNum || "contract"}.pdf`}
      />

      <AssignReviewersDialog open={isAssignDialogOpen} onOpenChange={open => {
      setIsAssignDialogOpen(open);
      if (!open) setPendingAction(null);
    }} onAssign={reviewerIds => {
      assignReviewers(reviewerIds[0], {
        onSuccess: () => {
          setIsAssignDialogOpen(false);
          setPendingAction(null);
        }
      });
    }} isLoading={isAssigning} />

      <DeclineProposalDialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen} onConfirm={async () => {
      try {
        const ticketNum = proposal.ticket_number || id;
        await proposalApi.decline(ticketNum!);
        queryClient.invalidateQueries({ queryKey: ["proposals"] });
        queryClient.invalidateQueries({ queryKey: ["proposal", ticketNum] });
        toast({ title: "Proposal Declined", description: "The proposal has been declined and the author has been notified." });
        setIsDeclineDialogOpen(false);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to Decline", description: error?.message || "An error occurred while declining the proposal." });
      }
    }} isLoading={isBusy} />

      <DiffCheckerDialog
        open={diffCheckerOpen}
        onOpenChange={setDiffCheckerOpen}
        peerReviewData={reviewFormData || {}}
        decisionReviewData={reviewFormRef.current?.formData || {}}
        peerReviewerName={reviewMeta?.reviewer_name || "Peer Reviewer"}
      />

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