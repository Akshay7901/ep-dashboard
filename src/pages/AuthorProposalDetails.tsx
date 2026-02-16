import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { extractCountry } from "@/lib/extractCountry";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, BookOpen, User, Folder, ClipboardList, FileText, Download, Eye, MessageSquare, Send } from "lucide-react";
import { useProposal, useProposalComments, useAddComment } from "@/hooks/useProposals";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ProposalStatus } from "@/types";
import DocumentPreviewDialog from "@/components/proposals/PdfPreviewDialog";
import { commentsApi } from "@/lib/proposalsApi";
import { toast } from "@/hooks/use-toast";

const authorStatusConfig: Record<string, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-[#3d5a47] text-white hover:bg-[#3d5a47] border-[#3d5a47]" },
  under_review: { label: "Under Review", className: "bg-[#f2a627] text-white hover:bg-[#f2a627] border-[#f2a627]" },
  approved: { label: "Contract Sent", className: "bg-[#1d293d] text-white hover:bg-[#1d293d] border-[#1d293d]" },
  finalised: { label: "Accepted", className: "bg-[#276749] text-white hover:bg-[#276749] border-[#276749]" },
  rejected: { label: "Declined", className: "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c] border-[#9b2c2c]" },
  locked: { label: "Clarification Needed", className: "bg-gray-600 text-white hover:bg-gray-600 border-gray-600" },
};

const AuthorStatusBadge: React.FC<{ status: ProposalStatus }> = ({ status }) => {
  const config = authorStatusConfig[status] || authorStatusConfig.submitted;
  return <Badge className={cn(config.className, "rounded-full px-4 py-1 font-medium text-xs")}>{config.label}</Badge>;
};

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
      <div className="bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-line rounded-none">{value}</div>
    </div>
  );
};

const AuthorProposalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{ url: string; name: string; type: "pdf" | "word" } | null>(null);

  const { data: proposal, isLoading, error, refetch } = useProposal(id || "");
  const localId = proposal?.id || "";
  const { data: comments = [] } = useProposalComments(localId, proposal?.ticket_number || id);
  const addComment = useAddComment();

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

  const files = proposal.file_uploads ? proposal.file_uploads.split(",").map((f: string) => f.trim()) : [];

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setIsSendingComment(true);
    try {
      await commentsApi.add(proposal.ticket_number || id || "", {
        comment: commentText.trim(),
      });
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
    <DashboardLayout title="Proposal Details">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" className="gap-2 -ml-2" onClick={() => navigate("/author/proposals")}>
          <ArrowLeft className="h-4 w-4" />
          Back to My Proposals
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{proposal.name}</h2>
            {proposal.sub_title && (
              <p className="text-base text-muted-foreground mt-1 italic">{proposal.sub_title}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              {proposal.ticket_number && <span className="font-mono">#{proposal.ticket_number}</span>}
              <span>•</span>
              <span>Submitted {proposal.created_at ? format(new Date(proposal.created_at), "MMMM d, yyyy") : "—"}</span>
            </div>
          </div>
          <AuthorStatusBadge status={proposal.status} />
        </div>

        {/* Status Timeline Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Current Status</h3>
            <div className="flex items-center gap-4">
              <AuthorStatusBadge status={proposal.status} />
              <span className="text-sm text-muted-foreground">
                Last updated: {proposal.updated_at ? format(new Date(proposal.updated_at), "MMMM d, yyyy 'at' h:mm a") : "—"}
              </span>
            </div>
            {proposal.status === "approved" && (
              <p className="mt-3 text-sm text-[#1d293d] bg-[#1d293d]/10 p-3 rounded">
                A contract has been sent to your email. Please review and sign it to proceed.
              </p>
            )}
            {proposal.status === "locked" && (
              <p className="mt-3 text-sm text-gray-700 bg-gray-100 p-3 rounded">
                Additional clarification is needed. Please check the comments section below and respond.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="book">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="book" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Book Info</span>
            </TabsTrigger>
            <TabsTrigger value="author" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Author Info</span>
            </TabsTrigger>
            <TabsTrigger value="market" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Market</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm">
              <Folder className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Comments</span>
            </TabsTrigger>
          </TabsList>

          {/* Book Info */}
          <TabsContent value="book" className="space-y-4 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Overview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
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
              </div>
            </div>

            <Accordion type="multiple" defaultValue={["blurb"]} className="space-y-1">
              <AccordionItem value="blurb" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">Blurb</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line">{proposal.short_description || "No blurb available"}</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="toc" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">Table of Contents</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line">{proposal.table_of_contents || "No TOC available"}</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="description" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold">Detailed Description</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line">{proposal.detailed_description || "No detailed description available"}</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Author Info */}
          <TabsContent value="author" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-1">
                <DetailRow label="Name" value={proposal.corresponding_author_name || proposal.author_name} />
                <DetailRow label="Email" value={proposal.author_email} />
                <DetailRow label="Secondary Email" value={proposal.secondary_email} />
                <DetailRow label="Institution" value={proposal.institution} />
                <DetailRow label="Job Title" value={proposal.job_title} />
                <DetailRow label="Country" value={extractCountry(proposal.address)} />
                <ContentBlock label="Biography" value={proposal.biography} />
                <ContentBlock label="Co-Authors / Editors" value={proposal.co_authors_editors} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market */}
          <TabsContent value="market" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <ContentBlock label="Marketing Information" value={proposal.marketing_info} />
                <ContentBlock label="Keywords" value={proposal.keywords} />
                <ContentBlock label="Referees / Reviewers" value={proposal.referees_reviewers} />
                <DetailRow label="Under Review Elsewhere" value={proposal.under_review_elsewhere} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="p-6">
                {files.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No documents uploaded.</p>
                ) : (
                  <div className="space-y-3">
                    {files.map((file: string, index: number) => {
                      const fileName = file.split("/").pop() || file;
                      const isPdf = fileName.toLowerCase().endsWith(".pdf");
                      const isWord = fileName.toLowerCase().endsWith(".doc") || fileName.toLowerCase().endsWith(".docx");
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium">{fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(isPdf || isWord) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDocumentPreview({
                                    url: file,
                                    name: fileName,
                                    type: isPdf ? "pdf" : "word",
                                  })
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <a href={file} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments */}
          <TabsContent value="comments" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-semibold">Messages</h3>

                {/* Existing comments */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                  ) : (
                    comments.map((comment: any) => {
                      const isAuthorComment = comment.reviewer_id === user?.id || comment.reviewer_id === user?.email;
                      return (
                        <div
                          key={comment.id}
                          className={cn(
                            "p-4 rounded-lg text-sm",
                            isAuthorComment ? "bg-primary/10 ml-8" : "bg-muted/30 mr-8"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-xs text-muted-foreground">
                              {isAuthorComment ? "You" : "Reviewer"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {comment.created_at ? format(new Date(comment.created_at), "MMM d, yyyy h:mm a") : ""}
                            </span>
                          </div>
                          <p className="whitespace-pre-line">{comment.comment_text || "Review form submitted"}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* New comment input */}
                <div className="space-y-3 border-t pt-4">
                  <Textarea
                    placeholder="Type your message here..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSendComment}
                      disabled={!commentText.trim() || isSendingComment}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {isSendingComment ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Document preview dialog */}
      {documentPreview && (
        <DocumentPreviewDialog
          open={!!documentPreview}
          onOpenChange={(open) => { if (!open) setDocumentPreview(null); }}
          documentUrl={documentPreview.url}
          fileName={documentPreview.name}
          fileType={documentPreview.type}
        />
      )}
    </DashboardLayout>
  );
};

export default AuthorProposalDetails;
