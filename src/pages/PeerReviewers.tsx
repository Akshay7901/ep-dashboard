// SAME IMPORTS (unchanged)
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { ChevronLeft, Plus, Loader2, ChevronDown, ChevronRight, FileText, ArrowRightLeft } from "lucide-react";
import { usePeerReviewers } from "@/hooks/usePeerReviewers";
import { useDefaultReviewer } from "@/hooks/useDefaultReviewer";
import { useReviewerAssignments } from "@/hooks/useReviewerAssignments";
import { assignmentsApi } from "@/lib/proposalsApi";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const PeerReviewers: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { reviewers, isLoading, createReviewer, isCreating, deleteReviewer, isDeleting } = usePeerReviewers();
  const { isDefault, setDefault } = useDefaultReviewer();
  const { data: assignmentMap } = useReviewerAssignments();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<{ id: string; name: string } | null>(null);
  const [expandedReviewers, setExpandedReviewers] = useState<Set<string>>(new Set());
  const [reassigningTicket, setReassigningTicket] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Record<string, string>>({});

  // Inline form state
  const [formData, setFormData] = useState({ name: "", email: "" });

  const toggleExpanded = (reviewerId: string) => {
    setExpandedReviewers((prev) => {
      const next = new Set(prev);
      next.has(reviewerId) ? next.delete(reviewerId) : next.add(reviewerId);
      return next;
    });
  };

  const getAssignmentsForReviewer = (email: string) => assignmentMap?.get(email) || [];

  const handleAddReviewer = () => {
    if (!formData.name || !formData.email) {
      toast({
        title: "Required fields missing",
        description: "Name and Email are required.",
        variant: "destructive",
      });
      return;
    }

    createReviewer(
      { name: formData.name, email: formData.email },
      {
        onSuccess: () => setFormData({ name: "", email: "" }),
      },
    );
  };

  const handleDeleteClick = (reviewer: { id: string; name: string }) => {
    setSelectedReviewer(reviewer);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedReviewer) return;
    deleteReviewer(selectedReviewer.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedReviewer(null);
      },
    });
  };

  const handleReassign = async (ticketNumber: string) => {
    const targetEmail = reassignTarget[ticketNumber];
    if (!targetEmail) return;

    setReassigningTicket(ticketNumber);
    try {
      await assignmentsApi.assign(ticketNumber, { reviewer_emails: [targetEmail] });
      queryClient.invalidateQueries({ queryKey: ["reviewer-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Re-assigned successfully" });
    } finally {
      setReassigningTicket(null);
    }
  };

  return (
    <DashboardLayout title="Peer Reviewers">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Back Link */}
        <button
          onClick={() => navigate("/proposals")}
          className="inline-flex items-center gap-1 text-sm text-[#3d5a47] hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Home
        </button>

        <h1 className="text-3xl font-bold">Peer Reviewers</h1>
        <Separator />

        {/* INLINE ADD REVIEWER FORM (MATCH FIGMA) */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Add New Reviewer</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Dr. John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label>
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="john@university.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleAddReviewer} disabled={isCreating} className="bg-[#3d5a47]">
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Reviewer
              </Button>
              <Button variant="outline" onClick={() => setFormData({ name: "", email: "" })}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* REVIEWERS LIST */}
        {!isLoading && reviewers.length > 0 && (
          <div className="space-y-3">
            {reviewers.map((reviewer) => {
              const assignments = getAssignmentsForReviewer(reviewer.email);
              const isExpanded = expandedReviewers.has(reviewer.id);

              return (
                <Card key={reviewer.id}>
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{reviewer.name}</p>
                        <p className="text-sm text-muted-foreground">{reviewer.email}</p>
                      </div>

                      <div className="flex gap-2">
                        {isDefault(reviewer.email) ? (
                          <Button size="sm" className="bg-[#45556c]">
                            Default
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setDefault(reviewer.email)}>
                            Set as default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600"
                          onClick={() => handleDeleteClick({ id: reviewer.id, name: reviewer.name })}
                        >
                          Delete
                        </Button>
                        {assignments.length > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => toggleExpanded(reviewer.id)}>
                            {isExpanded ? <ChevronDown /> : <ChevronRight />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* ASSIGNED PROPOSALS */}
                    {isExpanded &&
                      assignments.map((a) => (
                        <div key={a.ticket_number} className="bg-muted p-2 rounded flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-xs">{a.ticket_number}</p>
                          </div>

                          <div className="flex gap-2">
                            <Select
                              value={reassignTarget[a.ticket_number] || ""}
                              onValueChange={(v) => setReassignTarget({ ...reassignTarget, [a.ticket_number]: v })}
                            >
                              <SelectTrigger className="w-40 h-8 text-xs">
                                <SelectValue placeholder="Re-assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                {reviewers
                                  .filter((r) => r.email !== reviewer.email)
                                  .map((r) => (
                                    <SelectItem key={r.id} value={r.email}>
                                      {r.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>

                            <Button
                              size="sm"
                              onClick={() => handleReassign(a.ticket_number)}
                              disabled={reassigningTicket === a.ticket_number}
                            >
                              Re-assign
                            </Button>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* DELETE MODAL (UNCHANGED) */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reviewer</AlertDialogTitle>
            <AlertDialogDescription>Remove {selectedReviewer?.name}? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default PeerReviewers;
