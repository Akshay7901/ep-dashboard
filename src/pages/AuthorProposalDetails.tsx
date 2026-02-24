import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { extractCountry } from "@/lib/extractCountry";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Download, Eye, Send, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { useProposal, useProposalComments, useAddComment } from "@/hooks/useProposals";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { statusIs, normalizeStatus } from "@/lib/statusUtils";
import DocumentPreviewDialog from "@/components/proposals/PdfPreviewDialog";
import { commentsApi, proposalApi } from "@/lib/proposalsApi";
import { useReview } from "@/hooks/useReview";
import { toast } from "@/hooks/use-toast";
import brandLogo from "@/assets/brand-logo.webp";

/* ---- Timeline helpers ---- */

interface TimelineStage {
  stage_name: string;
  display_name: string;
  completed_at?: string | null;
  started_at?: string | null;
  is_current: boolean;
  is_completed: boolean;
}

const getTimelineProgressFromApi = (timeline: TimelineStage[]): number => {
  if (!timeline?.length) return 0;
  const completedCount = timeline.filter((s) => s.is_completed).length;
  return Math.round(completedCount / timeline.length * 100);
};

/* ---- Action banner config ---- */

const getActionBanner = (status: string) => {
  if (statusIs(status, "feedback_&_agreement_pending", "approved", "review_returned", "contract_issued")) {
    return {
      show: true,
      icon: AlertCircle,
      iconColor: "text-[#c05621]",
      bgColor: "bg-[#c05621]/5 border-[#c05621]/20",
      title: "Peer review complete – action required",
      description: "Please review the feedback and contract, then respond.",
      buttonLabel: "View & Respond",
      buttonTab: "review"
    };
  }
  if (statusIs(status, "final_review_&_confirmation", "locked", "awaiting_author_approval")) {
    return {
      show: true,
      icon: AlertCircle,
      iconColor: "text-[#2563eb]",
      bgColor: "bg-[#2563eb]/5 border-[#2563eb]/20",
      title: "Clarification needed – action required",
      description: "Additional information has been requested. Please respond.",
      buttonLabel: "View & Respond",
      buttonTab: "review"
    };
  }
  return { show: false } as any;
};

/* ---- Detail helpers ---- */

const DetailField = ({ label, value }: {label: string;value?: string | null;}) => {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>);

};

/* ---- Review feedback fields (matching PeerReviewReadOnly) ---- */

const REVIEW_FEEDBACK_FIELDS = [
{ key: "scope", label: "Scope" },
{ key: "purposeAndValue", label: "Purpose and Value" },
{ key: "title", label: "Title" },
{ key: "originality", label: "Originality and Points of Difference" },
{ key: "credibility", label: "Credibility" },
{ key: "structure", label: "Structure and Quality" },
{ key: "clarity", label: "Clarity, Structure and Quality of Writing" },
{ key: "otherComments", label: "Other Comments" },
{ key: "recommendation", label: "Recommendations" }];


const ReviewFeedbackCard: React.FC<{review: any;title: string;}> = ({ review, title }) => {
  const formData = review?.review_data;
  if (!formData) return null;

  const completedDate = review.submitted_at ?
  format(new Date(review.submitted_at), "MMM d, yyyy") :
  review.updated_at ?
  format(new Date(review.updated_at), "MMM d, yyyy") :
  null;

  const hasContent = REVIEW_FEEDBACK_FIELDS.some((f) => formData[f.key]?.trim?.());
  if (!hasContent) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        {completedDate && <span className="text-sm text-muted-foreground">Completed on {completedDate}</span>}
      </div>
      {review.reviewer_name

      }
      {REVIEW_FEEDBACK_FIELDS.map((field) => {
        const value = formData[field.key];
        if (!value?.trim?.()) return null;
        return (
          <div key={field.key}>
            <Separator className="mb-6" />
            <h4 className="text-base font-semibold text-foreground mb-2">{field.label}</h4>
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{value}</p>
          </div>);

      })}
    </div>);

};

/* ---- Main ---- */

const AuthorProposalDetails: React.FC = () => {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("proposal");
  const [commentText, setCommentText] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showQuestionsForm, setShowQuestionsForm] = useState(false);
  const [questionType, setQuestionType] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [isSendingQuestions, setIsSendingQuestions] = useState(false);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{url: string;name: string;type: "pdf" | "word";} | null>(
    null
  );

  const { data: proposal, isLoading, error, refetch } = useProposal(id || "");
  const localId = proposal?.id || "";
  const ticketNum = proposal?.ticket_number || id || "";
  const { data: comments = [] } = useProposalComments(localId, ticketNum);
  const { review: reviewData, isLoading: isReviewLoading } = useReview(ticketNum);
  const addComment = useAddComment();

  // Extract reviews array from API response
  const reviews = reviewData?.reviews || (reviewData?.review ? [reviewData.review] : []);
  const peerReview = reviews.find((r: any) => r.reviewer_role === 'peer_reviewer');
  const decisionReview = reviews.find((r: any) => r.reviewer_role === 'decision_reviewer');

  if (isLoading) {
    return (
      <DashboardLayout title="Proposal Review">
        <div className="py-20 text-center text-muted-foreground">Loading...</div>
      </DashboardLayout>);

  }

  if (!proposal || error) {
    return (
      <DashboardLayout title="Proposal Review">
        <div className="py-20 text-center space-y-4">
          <p className="text-destructive">Failed to load proposal</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </DashboardLayout>);

  }

  const files = proposal.file_uploads ? proposal.file_uploads.split(",").map((f: string) => f.trim()) : [];
  const actionBanner = getActionBanner(proposal.status);
  const apiTimeline: TimelineStage[] = proposal.timeline || [];
  const progress = getTimelineProgressFromApi(apiTimeline);

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setIsSendingComment(true);
    try {
      await commentsApi.add(proposal.ticket_number || id || "", { comment: commentText.trim() });
      setCommentText("");
      toast({ title: "Comment sent", description: "Your message has been sent successfully." });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send comment", variant: "destructive" });
    } finally {
      setIsSendingComment(false);
    }
  };

  return (
    <DashboardLayout title="Proposal Review">
      <div className="space-y-6 max-w-8xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" className="gap-2 -ml-2" onClick={() => navigate("/author/proposals")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold text-foreground">Proposal Review</h1>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            {proposal.ticket_number &&
            <p>
                Proposal ID: <span className="font-medium text-foreground">{proposal.ticket_number}</span>
              </p>
            }
            <p>Submitted: {proposal.created_at ? format(new Date(proposal.created_at), "MMM d, yyyy") : "—"}</p>
          </div>
        </div>

        {/* Action Banner */}
        {actionBanner.show &&
        <div className={cn("flex items-center justify-between p-4 border rounded-lg", actionBanner.bgColor)}>
            <div className="flex items-center gap-3">
              <actionBanner.icon className={cn("h-5 w-5 shrink-0", actionBanner.iconColor)} />
              <div>
                <p className="text-sm font-semibold text-foreground">{actionBanner.title}</p>
                <p className="text-xs text-muted-foreground">{actionBanner.description}</p>
              </div>
            </div>
            <Button
            size="sm"
            className="bg-[#3d5a47] hover:opacity-90 text-white shrink-0"
            onClick={() => setActiveTab("review")}>

              {actionBanner.buttonLabel}
            </Button>
          </div>
        }

        {/* Title & Subtitle */}
        <div>
          <h2 className="text-xl font-bold text-foreground">{proposal.name}</h2>
          {proposal.sub_title && <p className="text-base text-muted-foreground mt-1">{proposal.sub_title}</p>}
        </div>

        {/* Publication Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Publication Timeline</h3>
            <span className="text-sm text-muted-foreground">{progress}% Complete</span>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="h-1.5 bg-muted rounded-full">
              <div
                className="h-1.5 bg-[#2563eb] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} />

            </div>
          </div>

          {/* Timeline steps */}
          <div className={cn("grid gap-2", `grid-cols-${apiTimeline.length || 6}`)} style={{ gridTemplateColumns: `repeat(${apiTimeline.length || 6}, minmax(0, 1fr))` }}>
            {apiTimeline.map((step) => {
              const dateStr = step.completed_at || step.started_at;
              return (
                <div key={step.stage_name} className="flex flex-col items-center text-center gap-1.5">
                  {step.is_completed ?
                  <CheckCircle2 className={cn("h-6 w-6", step.is_current ? "text-[#2563eb]" : "text-[#3d5a47]")} /> :
                  step.is_current ?
                  <CheckCircle2 className="h-6 w-6 text-[#2563eb]" /> :

                  <Circle className="h-6 w-6 text-muted-foreground/40" />
                  }
                  <span
                    className={cn(
                      "text-[10px] leading-tight",
                      step.is_completed || step.is_current ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>

                    {step.display_name}
                  </span>
                  {dateStr &&
                  <span className="text-[9px] text-muted-foreground">
                      {format(new Date(dateStr), "MMM d, yyyy")}
                    </span>
                  }
                </div>);

            })}
          </div>
        </div>

        {/* Tabs: Proposal Information / Peer Review & Contract */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-auto bg-transparent border-b rounded-none p-0 h-auto">
            <TabsTrigger
              value="proposal"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3d5a47] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm">

              Proposal Information
            </TabsTrigger>
            <TabsTrigger
              value="review"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#3d5a47] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm">

              Peer Review & Contract
              {actionBanner.show &&
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#c05621]" />
              }
            </TabsTrigger>
          </TabsList>

          {/* ---- PROPOSAL INFORMATION TAB ---- */}
          <TabsContent value="proposal" className="mt-6 space-y-6">
            <p className="text-sm text-muted-foreground italic">
              Below is a summary of your submitted proposal. This information is read-only and cannot be edited at this
              stage.
            </p>

            {/* Author Details */}
            <Accordion type="multiple" defaultValue={["author", "book"]} className="space-y-3">
              <AccordionItem value="author" className="border rounded-lg px-5">
                <AccordionTrigger className="text-base font-semibold gap-2">
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}>

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />

                    </svg>
                    Author Details
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailField label="Name" value={proposal.corresponding_author_name || proposal.author_name} />
                    <DetailField label="Email" value={proposal.author_email} />
                    <DetailField label="Institution" value={proposal.institution} />
                    <DetailField label="Job Title" value={proposal.job_title} />
                    <DetailField label="Secondary Email" value={proposal.secondary_email} />
                    <DetailField label="Country" value={extractCountry(proposal.address)} />
                  </div>
                  {proposal.biography &&
                  <div className="space-y-1 pt-2">
                      <p className="text-xs text-muted-foreground">Biography</p>
                      <p className="text-sm leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded">
                        {proposal.biography}
                      </p>
                    </div>
                  }
                </AccordionContent>
              </AccordionItem>

              {/* Book Details */}
              <AccordionItem value="book" className="border rounded-lg px-5">
                <AccordionTrigger className="text-base font-semibold gap-2">
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}>

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />

                    </svg>
                    Book Details
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <DetailField label="Book Type" value={proposal.book_type} />
                    <DetailField label="Word Count" value={proposal.word_count} />
                    <DetailField label="Expected Completion" value={proposal.expected_completion_date} />
                    <DetailField label="Figures/Tables" value={proposal.figures_tables_count} />
                  </div>
                  {proposal.short_description &&
                  <div className="space-y-1 pt-2">
                      <p className="text-xs text-muted-foreground">Blurb</p>
                      <p className="text-sm leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded">
                        {proposal.short_description}
                      </p>
                    </div>
                  }
                  {proposal.table_of_contents &&
                  <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Table of Contents</p>
                      <p className="text-sm leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded">
                        {proposal.table_of_contents}
                      </p>
                    </div>
                  }
                  {proposal.detailed_description &&
                  <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Detailed Description</p>
                      <p className="text-sm leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded">
                        {proposal.detailed_description}
                      </p>
                    </div>
                  }
                </AccordionContent>
              </AccordionItem>

              {/* Market & Keywords */}
              <AccordionItem value="market" className="border rounded-lg px-5">
                <AccordionTrigger className="text-base font-semibold gap-2">
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}>

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />

                    </svg>
                    Market & Keywords
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-4">
                  {proposal.keywords && <DetailField label="Keywords" value={proposal.keywords} />}
                  {proposal.marketing_info &&
                  <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Marketing Information</p>
                      <p className="text-sm leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded">
                        {proposal.marketing_info}
                      </p>
                    </div>
                  }
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailField label="Co-Authors / Editors" value={proposal.co_authors_editors} />
                    <DetailField label="Referees / Reviewers" value={proposal.referees_reviewers} />
                    <DetailField label="Under Review Elsewhere" value={proposal.under_review_elsewhere} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Supporting Documents */}
              <AccordionItem value="documents" className="border rounded-lg px-5">
                <AccordionTrigger className="text-base font-semibold gap-2">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Supporting Documents
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  {files.length === 0 ?
                  <p className="text-sm text-muted-foreground">No documents uploaded.</p> :

                  <div className="space-y-2">
                      {files.map((file: string, index: number) => {
                      const fileName = file.split("/").pop() || file;
                      const isPdf = fileName.toLowerCase().endsWith(".pdf");
                      const isWord =
                      fileName.toLowerCase().endsWith(".doc") || fileName.toLowerCase().endsWith(".docx");
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">

                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{fileName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {(isPdf || isWord) &&
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                              setDocumentPreview({ url: file, name: fileName, type: isPdf ? "pdf" : "word" })
                              }>

                                  <Eye className="h-4 w-4" />
                                </Button>
                            }
                              <Button variant="ghost" size="sm" asChild>
                                <a href={file} download target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>);

                    })}
                    </div>
                  }
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* ---- PEER REVIEW & CONTRACT TAB ---- */}
          <TabsContent value="review" className="mt-6 space-y-6">
            {/* Info banner */}
            <div className="bg-muted/40 border rounded-lg p-4 text-sm text-muted-foreground">
              The feedback below forms part of the publishing decision. Our reviewers have carefully evaluated your
              proposal and provided the following assessment. Please review both the feedback and the contract terms before
              responding.
            </div>

            {isReviewLoading ?
            <div className="py-10 text-center text-muted-foreground">Loading reviews...</div> :
            !peerReview && !decisionReview ?
            <div className="py-10 text-center text-muted-foreground">No review feedback available yet.</div> :

            <div className="border rounded-md p-6 space-y-6">
                {peerReview && <ReviewFeedbackCard review={peerReview} title="Peer Review Feedback" />}
                {decisionReview &&
              <div className="space-y-6">
                    {/* Peer Review Feedback */}
                    <ReviewFeedbackCard review={decisionReview} title="Peer Review Feedback" />

                    {/* Publishing Contract - inline */}
                    {decisionReview.is_submitted &&
                <>
                        <Separator />

                        <h3 className="text-xl font-bold text-foreground">Publishing Contract</h3>

                        {/* Agreement notice */}
                        <div className="bg-muted/50 border rounded-md p-5 space-y-2">
                          <p className="text-sm font-bold text-foreground">
                            By signing this agreement, you confirm acceptance of the peer review feedback.
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Please review the contract terms carefully. If you have any questions, please use the "I have questions before signing" option below.
                          </p>
                        </div>

                        {/* Contract document */}
                        <div className="border rounded-md overflow-hidden">
                          <div className="bg-muted/40 border-b px-5 py-3">
                            <span className="text-sm font-semibold text-foreground">
                              {decisionReview.review_data?.contractType === "edited_volume" ?
                        "Edited Volume Publishing Agreement" :
                        decisionReview.review_data?.contractType === "custom" ?
                        "Custom Publishing Agreement" :
                        "Standard Academic Publishing Agreement"}
                            </span>
                          </div>
                          <div className="p-6 space-y-6 text-sm leading-relaxed">
                            <div className="text-center space-y-1">
                              <h4 className="text-lg font-bold tracking-wide">PUBLISHING AGREEMENT</h4>
                              <p className="text-muted-foreground">Between Author and Publisher</p>
                            </div>
                            <div className="space-y-5">
                              <div>
                                <p className="font-bold">1. PARTIES</p>
                                <p className="mt-1">
                                  This Agreement is made between <span className="font-bold">{proposal.corresponding_author_name || proposal.author_name}</span> ("the Author") and Edinburgh International Press ("the Publisher").
                                </p>
                              </div>
                              <div>
                                <p className="font-bold">2. THE WORK</p>
                                <p className="mt-1">The Author agrees to deliver to the Publisher a completed manuscript of the work currently entitled:</p>
                                <p className="mt-2 pl-6 italic font-medium">"{proposal.name}"</p>
                                <p className="mt-2">("the Work"), consisting of approximately {proposal.word_count || "N/A"} words, by {proposal.expected_completion_date || "the agreed date"}.</p>
                              </div>
                              <div>
                                <p className="font-bold">3. GRANT OF RIGHTS</p>
                                <p className="mt-1">The Author grants to the Publisher the exclusive right to publish and sell the Work in all formats (print, digital, and audio) throughout the world for the legal term of copyright and any renewals or extensions thereof.</p>
                              </div>
                              <div>
                                <p className="font-bold">4. ROYALTIES</p>
                                <p className="mt-1">The Publisher shall pay the Author the following royalties:</p>
                                <ul className="mt-2 pl-10 space-y-1 list-none">
                                  <li>10% of net receipts on hardcover sales</li>
                                  <li>7.5% of net receipts on paperback sales</li>
                                  <li>25% of net receipts on e-book sales</li>
                                </ul>
                              </div>
                              <div>
                                <p className="font-bold">5. AUTHOR'S WARRANTIES</p>
                                <p className="mt-1">The Author warrants that the Work is original, has not been previously published, does not infringe any existing copyright, and contains nothing defamatory or unlawful.</p>
                              </div>
                              <div>
                                <p className="font-bold">6. TERMINATION</p>
                                <p className="mt-1">Either party may terminate this Agreement if the other party commits a material breach and fails to remedy such breach within 30 days of written notice.</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="space-y-3">
                          <Button
                      className="w-full bg-[#2f4b40] hover:opacity-90 text-white py-6 text-base"
                      onClick={async () => {
                        setIsAccepting(true);
                        try {
                          await proposalApi.acceptContract(ticketNum);
                          toast({ title: "Contract accepted", description: "You have successfully accepted the publishing agreement." });
                          refetch();
                        } catch (err: any) {
                          toast({ title: "Error", description: err.message || "Failed to accept contract", variant: "destructive" });
                        } finally {
                          setIsAccepting(false);
                        }
                      }}
                      disabled={isAccepting}>

                            {isAccepting ? "Accepting..." : "Accept feedback & sign contract"}
                          </Button>
                          <Button
                      variant="outline"
                      className="w-full py-6 text-base"
                      onClick={() => setShowQuestionsForm(true)}>

                            I have questions before signing
                          </Button>
                        </div>
                      </>
                }
                  </div>
              }

                {/* Question form - separate card */}
                {decisionReview?.is_submitted && showQuestionsForm && (
              questionSubmitted ?
              <Card className="border">
                      <CardContent className="p-8 text-center space-y-4">
                        <div className="mx-auto w-14 h-14 rounded-full bg-[#2f4b40]/10 flex items-center justify-center">
                          <CheckCircle2 className="h-7 w-7 text-[#2f4b40]" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground">Question Submitted</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your question has been submitted successfully. Our editorial team will review and respond within 2 business days.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 max-w-sm mx-auto pt-2">
                          <Button
                      variant="outline"
                      onClick={() => {
                        setQuestionSubmitted(false);
                        setQuestionsText("");
                        setQuestionType("");
                      }}>

                            Submit Another Question
                          </Button>
                          <Button
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => {
                        setShowQuestionsForm(false);
                        setQuestionSubmitted(false);
                        setQuestionsText("");
                        setQuestionType("");
                      }}>

                            Back to Contract
                          </Button>
                        </div>
                      </CardContent>
                    </Card> :

              <Card className="border">
                      <CardContent className="p-6 space-y-5">
                        <div>
                          <h4 className="text-base font-bold text-foreground">Submit a Question</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Please select the nature of your question and provide details. Our editorial team will review and respond within 2 business days.
                          </p>
                        </div>

                        {/* Question Type */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Question Type <span className="text-destructive">*</span>
                          </label>
                          <Select value={questionType} onValueChange={setQuestionType}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a question type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contract_terms">Contract Terms</SelectItem>
                              <SelectItem value="royalties">Royalties & Payments</SelectItem>
                              <SelectItem value="rights">Rights & Permissions</SelectItem>
                              <SelectItem value="timeline">Timeline & Deadlines</SelectItem>
                              <SelectItem value="review_feedback">Review Feedback</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Question Text */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Your Question <span className="text-destructive">*</span>{" "}
                            <span className="text-muted-foreground font-normal">(max 500 characters)</span>
                          </label>
                          <Textarea
                      placeholder="Please provide details about your question..."
                      value={questionsText}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) setQuestionsText(e.target.value);
                      }}
                      rows={5} />

                          <p className="text-xs text-muted-foreground text-right">
                            {questionsText.length}/500 characters
                          </p>
                        </div>

                        {/* Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                      className="bg-[#2f4b40] hover:bg-[#2f4b40]/90 text-white py-5"
                      onClick={async () => {
                        if (!questionsText.trim() || !questionType) return;
                        setIsSendingQuestions(true);
                        try {
                          await proposalApi.raiseQuestions(ticketNum, questionsText.trim());
                          setQuestionSubmitted(true);
                          refetch();
                        } catch (err: any) {
                          toast({ title: "Error", description: err.message || "Failed to submit question", variant: "destructive" });
                        } finally {
                          setIsSendingQuestions(false);
                        }
                      }}
                      disabled={isSendingQuestions || !questionsText.trim() || !questionType}>

                            {isSendingQuestions ? "Submitting..." : "Submit Question"}
                          </Button>
                          <Button
                      variant="outline"
                      className="py-5"
                      onClick={() => {
                        setShowQuestionsForm(false);
                        setQuestionsText("");
                        setQuestionType("");
                      }}>

                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>)

              }
              </div>
            }
          </TabsContent>
        </Tabs>
      </div>

      {/* Document preview dialog */}
      {documentPreview &&
      <DocumentPreviewDialog
        open={!!documentPreview}
        onOpenChange={(open) => {
          if (!open) setDocumentPreview(null);
        }}
        documentUrl={documentPreview.url}
        fileName={documentPreview.name}
        fileType={documentPreview.type} />

      }
    </DashboardLayout>);

};

export default AuthorProposalDetails;