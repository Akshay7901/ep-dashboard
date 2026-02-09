// PROPOSAL DETAILS — PUBLISHER STYLE UI

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { extractCountry } from "@/lib/extractCountry";

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
import AssignReviewersDialog from "@/components/proposals/AssignReviewersDialog";
import DeclineProposalDialog from "@/components/proposals/DeclineProposalDialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

import { ArrowLeft, FileText, Download, Eye, BookOpen, User, BarChart, Folder, UserCircle } from "lucide-react";

import { useProposal, useProposalComments, useWorkflowLogs, useUpdateProposalStatus } from "@/hooks/useProposals";
import { useQueryClient } from "@tanstack/react-query";

import { useProposalActions } from "@/hooks/useProposalActions";
import { useAuth } from "@/contexts/AuthContext";
import { usePeerReviewers } from "@/hooks/usePeerReviewers";
import { useDefaultReviewer } from "@/hooks/useDefaultReviewer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ---------------- Helpers ---------------- */

const OverviewItem = ({ label, value }: { label: string; value?: string }) => (
  <div className="space-y-1">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{value || "N/A"}</p>
  </div>
);

/* ---------------- Main ---------------- */

const ProposalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { isReviewer1, isReviewer2 } = useAuth();
  const { reviewers } = usePeerReviewers();
  const { defaultEmail } = useDefaultReviewer();
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");

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
      if (found) {
        setSelectedReviewer(found.email);
      }
    }
  }, [defaultEmail, reviewers, selectedReviewer]);

  /* ---------------- Data ---------------- */

  const { data: proposal, isLoading, error, refetch } = useProposal(id || "");

  const localId = proposal?.id || "";

  const { data: comments = [] } = useProposalComments(localId);

  const { data: logs = [] } = useWorkflowLogs(localId);

  // Local workflow override (database) status update
  const workflowStatus = useUpdateProposalStatus();

  // Upstream API actions (external system)
  const {
    updateStatus: upstreamUpdateStatus,
    isUpdatingStatus: isUpdatingUpstream,
    assignReviewers,
    isAssigning,
    unassignReviewers,
    isUnassigning,
  } = useProposalActions(proposal?.ticket_number || id);

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

  const isBusy = workflowStatus.isPending || isUpdatingUpstream || isAssigning || isUnassigning;

  const revertToNew = async () => {
    const ticketNumber = proposal.ticket_number || id || "";

    // Step 1: Revert upstream status to 'new' (this is the primary action that clears assignments)
    upstreamUpdateStatus(
      { status: "new", notes: "Reverted to new status" },
      {
        onSuccess: async () => {
          // Step 2: Also try explicit unassign via DELETE (best-effort, don't block on failure)
          try {
            await unassignReviewers();
          } catch {
            console.log("DELETE unassign not supported, relying on status change");
          }

          // Step 3: Reset local workflow override back to submitted
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
                // Invalidate reviewer-assignments so Peer Reviewers page reflects the change
                queryClient.invalidateQueries({ queryKey: ["reviewer-assignments"] });
                queryClient.invalidateQueries({ queryKey: ["proposals"] });
              },
            },
          );
        },
      },
    );
  };

  /* ---------------- Render ---------------- */

  return (
    <DashboardLayout title="Proposal Details">
      <div className="max-w-8xl mx-auto space-y-8">
        {/* Back */}

        <Button variant="ghost" size="sm" className="text-[#3d5a47]" onClick={() => navigate("/proposals")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {/* Header */}

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">{proposal.name}</h1>

              <p className="text-lg text-muted-foreground italic mt-1">{proposal.sub_title}</p>

              {(() => {
                const acceptedLog = logs.find((l: any) => l.new_status === "under_review");
                if (acceptedLog) {
                  return (
                    <p className="text-sm text-muted-foreground mt-2">
                      Accepted for review {format(new Date(acceptedLog.created_at), "MMMM d, yyyy")}
                    </p>
                  );
                }
                return (
                  <p className="text-sm text-muted-foreground mt-2">
                    Submitted {proposal.created_at ? format(new Date(proposal.created_at), "MMMM d, yyyy") : ""}
                  </p>
                );
              })()}
            </div>

            {/* Status badge with date for non-submitted statuses */}
            {proposal.status !== "submitted" && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <ProposalStatusBadge status={proposal.status} showIcon={false} />
                {(() => {
                  const statusLog = logs.find((l: any) => l.new_status === proposal.status);
                  const statusDate = statusLog?.created_at || proposal.updated_at;
                  return statusDate ? (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(statusDate), "do MMMM yyyy")}
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Reviewer + Actions row */}
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
                  <span className="text-sm font-medium">
                    {(() => {
                      const assigned = reviewers.find((r) => r.email === selectedReviewer);
                      return assigned ? (assigned.name || assigned.email.split("@")[0]) : selectedReviewer || "N/A";
                    })()}
                  </span>
                )}
              </>
            )}

            {/* Action buttons for submitted proposals */}
            {proposal.status === "submitted" && (
              <>
                <Button
                  className="bg-[#3d5a47]"
                  onClick={() => {
                    if (!selectedReviewer) {
                      // No reviewer selected — open dialog as fallback
                      setPendingAction("accept");
                      setIsAssignDialogOpen(true);
                      return;
                    }
                    // Directly assign the selected reviewer
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

            {/* Revert action for Reviewer 1 when under review */}
            {isReviewer1 && proposal.status === "under_review" && (
              <Button variant="outline" onClick={() => setIsRevertDialogOpen(true)} disabled={isBusy}>
                Reassign
              </Button>
            )}
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

              <CardContent className="grid sm:grid-cols-5 gap-6">
                <OverviewItem label="Book Type" value={proposal.book_type} />

                <OverviewItem label="Word Count" value={proposal.word_count} />

                <OverviewItem label="Expected Completion" value={proposal.expected_completion_date} />

                <OverviewItem label="Country" value={extractCountry(proposal.address)} />

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <ProposalStatusBadge status={proposal.status} showIcon={false} />
                </div>
              </CardContent>
            </Card>

            {/* Sections */}

            <Accordion type="multiple" className="space-y-2">
              <AccordionItem value="blurb">
                <AccordionTrigger>Short Description</AccordionTrigger>
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

          <TabsContent value="author" className="space-y-8">
            {/* Author Name with Badge */}
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">
                {proposal.corresponding_author_name || proposal.author_name || "N/A"}
              </h2>
              <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-md uppercase tracking-wide">
                Author
              </span>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                <OverviewItem label="Email" value={proposal.author_email || proposal.email} />
                <OverviewItem label="Institution" value={proposal.institution} />
                <OverviewItem label="Job Title" value={proposal.job_title} />
                <OverviewItem label="Address" value={proposal.address} />
                <OverviewItem label="City" value={proposal.city} />
                <OverviewItem label="Province/State" value={proposal.province_state || proposal.state} />
                <OverviewItem label="Country" value={proposal.country} />
                {proposal.secondary_email && proposal.secondary_email !== proposal.author_email && (
                  <OverviewItem label="Secondary Email" value={proposal.secondary_email} />
                )}
              </div>
            </div>

            {/* Biography */}
            {proposal.biography && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Biography</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {proposal.biography}
                </p>
              </div>
            )}

            {/* CV Attachment */}
            {proposal.cv_file_url && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Curriculum Vitae</h3>
                <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{proposal.cv_file_name || "CV Document"}</p>
                      <p className="text-sm text-muted-foreground">PDF • {proposal.cv_file_size || "Unknown size"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDocumentPreview({
                          url: proposal.cv_file_url,
                          name: proposal.cv_file_name || "CV",
                          type: "pdf",
                        })
                      }
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={proposal.cv_file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ---------------- MARKET ---------------- */}

          <TabsContent value="market" className="space-y-8">
            {/* Keywords */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {proposal.keywords ? (
                  proposal.keywords.split(",").map((keyword: string, i: number) => (
                    <span key={i} className="bg-muted text-foreground text-sm px-3 py-1 rounded-md border">
                      {keyword.trim()}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No keywords specified</p>
                )}
              </div>
            </div>

            {/* Accordion sections */}
            <Accordion type="multiple" className="space-y-2">
              <AccordionItem value="similar-works" className="border-b">
                <AccordionTrigger className="text-base font-medium">Similar Works</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm whitespace-pre-line">
                    {proposal.similar_works || proposal.competing_books || "No similar works listed"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="societies" className="border-b">
                <AccordionTrigger className="text-base font-medium">Societies, Research Bodies</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm whitespace-pre-line">
                    {proposal.societies_research_bodies || proposal.professional_societies || "No societies listed"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="referees" className="border-b">
                <AccordionTrigger className="text-base font-medium">Referees & Reviewers</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm whitespace-pre-line">
                    {proposal.referees_reviewers || proposal.suggested_reviewers || "No referees specified"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="additional-info" className="border-b">
                <AccordionTrigger className="text-base font-medium">Additional info</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm whitespace-pre-line">
                    {proposal.additional_info || "No additional information"}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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

      {/* Assign Reviewers Dialog */}
      <AssignReviewersDialog
        open={isAssignDialogOpen}
        onOpenChange={(open) => {
          setIsAssignDialogOpen(open);
          if (!open) setPendingAction(null);
        }}
        onAssign={(reviewerIds) => {
          // First assign peer reviewers via external API
          assignReviewers(reviewerIds, {
            onSuccess: () => {
              // Then update status to under_review (local workflow)
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

      {/* Decline Confirmation Dialog */}
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

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={isRevertDialogOpen} onOpenChange={setIsRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert proposal to New?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the proposal back to <strong>New</strong> and remove any active peer reviewer assignments.
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
