// PROPOSAL DETAILS — TWO-PANEL PEER REVIEW LAYOUT

import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { extractCountry } from "@/lib/extractCountry";

import DashboardLayout from "@/components/layout/DashboardLayout";
import ProposalStatusBadge from "@/components/proposals/ProposalStatusBadge";
import PeerReviewCommentsForm, { type PeerReviewCommentsFormHandle } from "@/components/proposals/PeerReviewCommentsForm";
import DocumentPreviewDialog from "@/components/proposals/PdfPreviewDialog";
import AssignReviewersDialog from "@/components/proposals/AssignReviewersDialog";
import DeclineProposalDialog from "@/components/proposals/DeclineProposalDialog";

import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  BookOpen,
  User,
  Folder,
  UserCircle,
  ClipboardList,
} from "lucide-react";

import { useProposal, useProposalComments, useWorkflowLogs, useUpdateProposalStatus } from "@/hooks/useProposals";
import { useQueryClient } from "@tanstack/react-query";
import { useProposalActions } from "@/hooks/useProposalActions";
import { useAuth } from "@/contexts/AuthContext";
import { usePeerReviewers } from "@/hooks/usePeerReviewers";
import { useDefaultReviewer } from "@/hooks/useDefaultReviewer";

/* ---------------- Helpers ---------------- */

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-2">
      <span className="text-sm text-muted-foreground w-40 shrink-0">{label}:</span>
      <span className="text-sm font-medium flex-1">{value}</span>
    </div>
  );
};

const ContentBlock = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground italic">{label}:</p>
      <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line border-l-4 border-primary/30">
        {value}
      </div>
    </div>
  );
};

// Peer review status badge (matches dashboard colors)
const PeerReviewStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { label: string; className: string }> = {
    submitted: {
      label: "Pending Review",
      className: "bg-[#c4940a] text-white hover:bg-[#c4940a] border-[#c4940a]",
    },
    under_review: {
      label: "In Progress",
      className: "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c] border-[#9b2c2c]",
    },
    approved: {
      label: "Completed",
      className: "bg-[#3d5a47] text-white hover:bg-[#3d5a47] border-[#3d5a47]",
    },
    finalised: {
      label: "Completed",
      className: "bg-[#3d5a47] text-white hover:bg-[#3d5a47] border-[#3d5a47]",
    },
    rejected: {
      label: "Declined",
      className: "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c] border-[#9b2c2c]",
    },
    locked: {
      label: "Locked",
      className: "bg-gray-600 text-white hover:bg-gray-600 border-gray-600",
    },
  };
  const c = config[status] || config.submitted;
  return (
    <Badge className={`${c.className} rounded-full px-4 py-1 font-medium text-xs`}>
      {c.label}
    </Badge>
  );
};

/* ---------------- Main ---------------- */

const ProposalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isReviewer1, isReviewer2, isAnyReviewer } = useAuth();
  const { reviewers } = usePeerReviewers();
  const { defaultEmail } = useDefaultReviewer();
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

  // Set default reviewer when data loads
  React.useEffect(() => {
    if (defaultEmail && reviewers.length > 0 && !selectedReviewer) {
      const found = reviewers.find((r) => r.email === defaultEmail);
      if (found) setSelectedReviewer(found.email);
    }
  }, [defaultEmail, reviewers, selectedReviewer]);

  /* ---------------- Data ---------------- */

  const { data: proposal, isLoading, error, refetch } = useProposal(id || "");
  const localId = proposal?.id || "";
  const { data: comments = [] } = useProposalComments(localId);
  const { data: logs = [] } = useWorkflowLogs(localId);
  const workflowStatus = useUpdateProposalStatus();

  const {
    updateStatus: upstreamUpdateStatus,
    isUpdatingStatus: isUpdatingUpstream,
    assignReviewers,
    isAssigning,
    unassignReviewers,
    isUnassigning,
  } = useProposalActions(proposal?.ticket_number || id);

  /* ---------------- Loading / Error ---------------- */

  if (isLoading) {
    return (
      <DashboardLayout title="Proposal Details">
        <div className="py-20 text-center text-muted-foreground">Loading...</div>
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

  /* ---------------- Derived values ---------------- */

  const files = proposal.file_uploads
    ? proposal.file_uploads.split(",").map((f: string) => f.trim())
    : [];

  const isBusy = workflowStatus.isPending || isUpdatingUpstream || isAssigning || isUnassigning;

  const showReviewForm = isReviewer2;

  const revertToNew = async () => {
    const ticketNumber = proposal.ticket_number || id || "";
    upstreamUpdateStatus(
      { status: "new", notes: "Reverted to new status" },
      {
        onSuccess: async () => {
          try {
            await unassignReviewers();
          } catch {
            console.log("DELETE unassign not supported, relying on status change");
          }
          workflowStatus.mutate(
            {
              id: localId || id || "",
              status: "submitted",
              previousStatus: proposal.status,
              ticketNumber,
              proposalData: {
                id: localId || undefined,
                name: proposal.name,
                author_name: proposal.author_name,
                author_email: proposal.author_email,
                ticket_number: ticketNumber,
              },
            },
            {
              onSuccess: () => {
                setIsRevertDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["reviewer-assignments"] });
                queryClient.invalidateQueries({ queryKey: ["proposals"] });
              },
            },
          );
        },
      },
    );
  };

  /* ======================== RIGHT PANEL CONTENT ======================== */

  const rightPanel = (
    <div className="space-y-6">
      {/* Proposal Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{proposal.name}</h2>
            {proposal.sub_title && (
              <p className="text-base text-muted-foreground mt-1">
                {proposal.sub_title}
              </p>
            )}
          </div>
          <PeerReviewStatusBadge status={proposal.status} />
        </div>

        {/* Author summary line */}
        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {proposal.corresponding_author_name || proposal.author_name}
          </span>
          {proposal.institution && (
            <>
              <span>•</span>
              <span>{proposal.institution}</span>
            </>
          )}
          {proposal.word_count && (
            <>
              <span>•</span>
              <span>{proposal.word_count} words</span>
            </>
          )}
        </div>
      </div>

      {/* Reviewer + Actions row (for reviewer_1 / submitted) */}
      {isReviewer1 && (
        <div className="flex items-center gap-3 flex-wrap">
          {reviewers.length > 0 && (
            <>
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              {proposal.status === "submitted" ? (
                <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                  <SelectTrigger className="w-56 bg-background">
                    <SelectValue placeholder="Select a reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {reviewers.map((reviewer) => (
                      <SelectItem key={reviewer.id} value={reviewer.email}>
                        {reviewer.name || reviewer.email.split("@")[0]}
                        {reviewer.email === defaultEmail && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background text-sm font-medium">
                  {(() => {
                    const assigned = reviewers.find((r) => r.email === selectedReviewer);
                    return assigned ? assigned.name || assigned.email.split("@")[0] : selectedReviewer || "N/A";
                  })()}
                </div>
              )}
            </>
          )}

          {proposal.status === "submitted" && (
            <>
              <Button
                className="bg-[#3d5a47]"
                onClick={() => {
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
                          ticket_number: proposal.ticket_number || id,
                        },
                      });
                    },
                  });
                }}
                disabled={workflowStatus.isPending || isAssigning}
              >
                Submit for review
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDeclineDialogOpen(true)}
                disabled={workflowStatus.isPending}
              >
                Decline
              </Button>
            </>
          )}

          {proposal.status === "under_review" && (
            <Button variant="outline" onClick={() => revertToNew()} disabled={isBusy}>
              Reassign
            </Button>
          )}
        </div>
      )}

      {/* Tabs */}
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

        {/* ---- BOOK INFO ---- */}
        <TabsContent value="book" className="space-y-2 mt-4">
          <Accordion type="multiple" defaultValue={["overview"]} className="space-y-1">
            {/* Proposal Overview */}
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
                <DetailRow
                  label="Keywords"
                  value={proposal.keywords}
                />
                <ContentBlock label="Blurb" value={proposal.short_description} />
              </AccordionContent>
            </AccordionItem>

            {/* Table of Contents */}
            <AccordionItem value="toc" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                Table of Contents
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line border-l-4 border-primary/30">
                  {proposal.table_of_contents || "No table of contents available"}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Market Position */}
            <AccordionItem value="market" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                Market Position
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <ContentBlock
                  label="Similar Works"
                  value={(proposal as any).similar_works || (proposal as any).competing_books}
                />
                <ContentBlock
                  label="Previous Reviews"
                  value={(proposal as any).previous_reviews || proposal.marketing_info}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Manuscript Details */}
            <AccordionItem value="manuscript" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                Manuscript Details
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <DetailRow label="Co-Authors/Editors" value={proposal.co_authors_editors || "None"} />
                <ContentBlock
                  label="Figures & Tables"
                  value={proposal.figures_tables_count || proposal.detailed_description}
                />
                <ContentBlock
                  label="Permissions"
                  value={proposal.permissions_required}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Additional Information */}
            <AccordionItem value="additional" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                Additional Information
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <ContentBlock
                  label="Societies & Bodies"
                  value={(proposal as any).societies_research_bodies || (proposal as any).professional_societies}
                />
                <ContentBlock
                  label="Suggested Referees"
                  value={proposal.referees_reviewers}
                />
                <ContentBlock
                  label="Additional Notes"
                  value={proposal.additional_info}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* ---- AUTHOR INFO ---- */}
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
              <DetailRow label="Address" value={proposal.address} />
              <DetailRow label="Country" value={extractCountry(proposal.address)} />
              {proposal.secondary_email &&
                proposal.secondary_email !== proposal.author_email && (
                  <DetailRow label="Secondary Email" value={proposal.secondary_email} />
                )}
            </div>
          </div>

          {proposal.biography && (
            <div className="space-y-3">
              <h4 className="text-base font-medium">Biography</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {proposal.biography}
              </p>
            </div>
          )}
        </TabsContent>

        {/* ---- SUPPORTING DOCUMENTS ---- */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Supporting Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 && (
                <p className="text-sm text-muted-foreground">No files uploaded</p>
              )}
              <div className="space-y-3">
                {files.map((url: string, i: number) => {
                  const name = url.split("/").pop() || "File";
                  const isPdf = url.endsWith(".pdf");
                  const isWord = url.endsWith(".doc") || url.endsWith(".docx");
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-center border rounded-md px-3 py-2"
                    >
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
                          <a href={url} target="_blank" rel="noopener noreferrer">
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

        {/* ---- LOG ---- */}
        <TabsContent value="log" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Log</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No workflow events yet.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm border-b pb-3 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{log.action}</p>
                        {log.new_status && (
                          <p className="text-muted-foreground text-xs">
                            Status → {log.new_status}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  /* ======================== RENDER ======================== */

  return (
    <DashboardLayout title="Proposal Details">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/proposals")}
          className="inline-flex items-center gap-1 text-sm text-[#3d5a47] hover:text-[#2d4a37] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {showReviewForm && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => reviewFormRef.current?.saveDraft()}
              disabled={reviewFormRef.current?.isSaving}
            >
              Save Draft
            </Button>
            <Button
              className="bg-[#2d3748] hover:bg-[#2d3748]/90 text-white"
              onClick={() => reviewFormRef.current?.submitReview()}
              disabled={reviewFormRef.current?.isSaving || !reviewFormRef.current?.canSubmit}
            >
              Submit Review
            </Button>
          </div>
        )}
      </div>

      {/* Two-Panel or Single-Panel Layout */}
      {showReviewForm ? (
        <div className="grid grid-cols-2 gap-0 items-start">
          {/* Left Panel — Review Form */}
          <div className="pr-6">
            <PeerReviewCommentsForm ref={reviewFormRef} proposal={proposal} onSave={() => refetch()} />
          </div>

          {/* Right Panel — Proposal Details */}
          <div className="pl-6 border-l">
            <h2 className="text-2xl font-bold text-foreground mb-6">Proposal Details</h2>
            {rightPanel}
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">{rightPanel}</div>
      )}

      {/* Dialogs */}
      <DocumentPreviewDialog
        open={!!documentPreview}
        onOpenChange={(o) => !o && setDocumentPreview(null)}
        documentUrl={documentPreview?.url || ""}
        fileName={documentPreview?.name || ""}
        fileType={documentPreview?.type || "pdf"}
      />

      <AssignReviewersDialog
        open={isAssignDialogOpen}
        onOpenChange={(open) => {
          setIsAssignDialogOpen(open);
          if (!open) setPendingAction(null);
        }}
        onAssign={(reviewerIds) => {
          assignReviewers(reviewerIds, {
            onSuccess: () => {
              workflowStatus.mutate(
                {
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
                },
                {
                  onSuccess: () => {
                    setIsAssignDialogOpen(false);
                    setPendingAction(null);
                  },
                },
              );
            },
          });
        }}
        isLoading={workflowStatus.isPending || isAssigning}
      />

      <DeclineProposalDialog
        open={isDeclineDialogOpen}
        onOpenChange={setIsDeclineDialogOpen}
        onConfirm={() => {
          workflowStatus.mutate(
            {
              id: localId || id || "",
              status: "rejected",
              previousStatus: proposal.status,
              ticketNumber: proposal.ticket_number || id,
              proposalData: {
                id: localId || undefined,
                name: proposal.name,
                author_name: proposal.author_name,
                author_email: proposal.author_email,
                ticket_number: proposal.ticket_number || id,
              },
            },
            {
              onSuccess: () => {
                setIsDeclineDialogOpen(false);
              },
            },
          );
        }}
        isLoading={workflowStatus.isPending}
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
    </DashboardLayout>
  );
};

export default ProposalDetails;
