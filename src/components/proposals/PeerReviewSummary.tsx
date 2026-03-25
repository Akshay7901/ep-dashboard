import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { StickyNote } from "lucide-react";
import { Proposal } from "@/types";
import { getDefaultContractType, getContractMismatchWarning } from "@/lib/contractUtils";
import type { ContractSendFields } from "@/lib/contractUtils";
import FieldRevisionForm from "@/components/proposals/FieldRevisionForm";
import { emptyRevisionRow, CATEGORIES, type RevisionRow } from "@/lib/fieldRevisionCategories";
import type { InfoRequestItem } from "@/lib/proposalsApi";
import ContractFieldsForm, { getDefaultContractFields, areContractFieldsValid, type ContractFieldValues } from "@/components/proposals/ContractFieldsForm";

const REVIEW_FIELDS = [
  { key: "scope", label: "Scope" },
  { key: "purposeAndValue", label: "Purpose and Value" },
  { key: "title", label: "Title" },
  { key: "originality", label: "Originality and Points of Difference" },
  { key: "credibility", label: "Credibility" },
  { key: "structure", label: "Structure" },
  { key: "clarity", label: "Clarity, Structure and Quality of Writing" },
  { key: "otherComments", label: "Other Comments" },
  { key: "redFlags", label: "Red Flags" },
];

const RECOMMENDATION_LABELS: Record<string, string> = {
  proceed: "Proceed",
  minor_revision: "Minor Revision",
  major_revision: "Major Revision",
  reject: "Reject",
};

interface PeerReviewSummaryProps {
  proposal: Proposal;
  formData: Record<string, string>;
  onGoBack: () => void;
  onConfirmSubmit: (sendContract: boolean, contractType?: string, contractTitle?: string, contractSubtitle?: string, revisionItems?: InfoRequestItem[], contractFields?: ContractSendFields) => void;
  isSubmitting: boolean;
  showContractSection?: boolean;
  reviewerNote?: string;
  onReviewerNoteChange?: (note: string) => void;
  drNote?: string;
  onDrNoteChange?: (note: string) => void;
}

const PeerReviewSummary: React.FC<PeerReviewSummaryProps> = ({
  proposal,
  formData,
  onGoBack,
  onConfirmSubmit,
  isSubmitting,
  showContractSection = false,
  reviewerNote = "",
  onReviewerNoteChange,
  drNote = "",
  onDrNoteChange,
}) => {
  const recommendation = formData.recommendation;
  const isReject = recommendation === "reject";
  const isMajorRevision = recommendation === "major_revision";
  const contractRequired = showContractSection && !isReject && !isMajorRevision;
  const [includeContractForMajor, setIncludeContractForMajor] = useState(false);
  const [revisionRows, setRevisionRows] = useState<RevisionRow[]>([emptyRevisionRow()]);
  const contractWillBeSent = contractRequired || (showContractSection && isMajorRevision && includeContractForMajor);

  const defaultContract = getDefaultContractType(proposal.book_type);
  const [selectedContract, setSelectedContract] = useState(defaultContract);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [contractFieldValues, setContractFieldValues] = useState<ContractFieldValues>(
    getDefaultContractFields(defaultContract, proposal?.name, proposal?.sub_title)
  );
  const [showMismatchWarning, setShowMismatchWarning] = useState(false);
  const [pendingContractType, setPendingContractType] = useState<string | null>(null);

  useEffect(() => {
    const ct = getDefaultContractType(proposal.book_type);
    setSelectedContract(ct);
  }, [proposal.book_type]);

  const handleContractTypeChange = (value: string) => {
    const warning = getContractMismatchWarning(proposal.book_type, value);
    if (warning) {
      setPendingContractType(value);
      setShowMismatchWarning(true);
    } else {
      setSelectedContract(value as "author" | "editor");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold mb-1">Peer Review Summary</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Please review your comments before submitting
      </p>

      {/* Fields summary */}
      <div className="divide-y">
        {REVIEW_FIELDS.map((field) => {
          const value = formData[field.key]?.trim();
          return (
            <div key={field.key} className="py-4">
              <p className="text-sm font-semibold">{field.label}</p>
              {value ? (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                  {value}
                </p>
              ) : (
                <p className="text-sm text-destructive mt-1">
                  {field.key === "otherComments"
                    ? "None provided"
                    : field.key === "redFlags"
                    ? "None identified"
                    : "Not completed"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      <div className="mt-2 border-2 border-primary/20 rounded-md p-4">
        <p className="text-sm font-semibold">Final Recommendation</p>
        {formData.recommendation ? (
          <p className="text-sm font-medium mt-1">
            {RECOMMENDATION_LABELS[formData.recommendation] || formData.recommendation}
          </p>
        ) : (
          <p className="text-sm text-destructive mt-1">Not selected</p>
        )}
      </div>

      {/* Note for Author (decision reviewer only) - right after recommendation */}
      {onDrNoteChange && (
        <div className="mt-6 border rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Note for Author</p>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          <Textarea
            placeholder="Add any comments or feedback you'd like to share with the author..."
            value={drNote}
            onChange={(e) => onDrNoteChange(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This note will be visible to the author on their dashboard and included in the notification email.
          </p>
        </div>
      )}

      {/* Note for Decision Reviewer (peer reviewer only) */}
      {onReviewerNoteChange && (
        <div className="mt-6 border rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Note for Decision Reviewer</p>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          <Textarea
            placeholder="Add any notes or observations you'd like to share with the decision reviewer..."
            value={reviewerNote}
            onChange={(e) => onReviewerNoteChange(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This note will be visible to the decision reviewer alongside your review.
          </p>
        </div>
      )}

      {/* Contract option - only for decision reviewer */}
      {showContractSection && (
        <div className="mt-8 space-y-4">
          {isReject ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-sm font-medium text-destructive">
                No contract will be sent as the recommendation is "Reject".
              </p>
            </div>
          ) : isMajorRevision ? (
            <div className="space-y-4">
              <div className="bg-[#9b2c2c]/10 border border-[#9b2c2c]/20 rounded-md p-4 space-y-3">
                <p className="text-sm font-medium text-[#9b2c2c]">
                  Major Revision — Would you like to send a contract with this submission?
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeContractForMajor}
                      onChange={(e) => setIncludeContractForMajor(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-[#2f4b40]"
                    />
                    <span className="text-sm font-medium">Include contract</span>
                  </label>
                </div>
              </div>
              {includeContractForMajor ? (
                <div>
                  <p className="text-sm font-medium mb-1">Select Contract Type</p>
                  {proposal.book_type && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Auto-selected based on book type: <span className="font-medium">{proposal.book_type}</span>
                    </p>
                  )}
                  <Select value={selectedContract} onValueChange={handleContractTypeChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a contract" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="author">Author Contract</SelectItem>
                      <SelectItem value="editor">Editor Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <FieldRevisionForm rows={revisionRows} onChange={setRevisionRows} />
              )}
            </div>
          ) : (
            <>
              <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
                <p className="text-sm font-medium text-primary">
                  A contract will be sent with this submission.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Select Contract Type</p>
                {proposal.book_type && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Auto-selected based on book type: <span className="font-medium">{proposal.book_type}</span>
                  </p>
                )}
                <Select value={selectedContract} onValueChange={handleContractTypeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a contract" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="author">Author Contract</SelectItem>
                    <SelectItem value="editor">Editor Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-10">
        <Button variant="outline" onClick={onGoBack} disabled={isSubmitting}>
          Go Back
        </Button>
        <Button
          className="bg-[#2f4b40] hover:bg-[#2f4b40] hover:opacity-90 text-white"
          onClick={() => {
            const buildRevisionItems = (): InfoRequestItem[] => {
              if (!showContractSection || !isMajorRevision || includeContractForMajor) return [];
              return revisionRows
                .filter((r) => r.category && r.field)
                .map((r) => {
                  const cat = CATEGORIES.find((c) => c.key === r.category);
                  const field = cat?.fields.find((f) => f.key === r.field);
                  return {
                    key: r.field,
                    label: field?.label || r.field,
                    ...(r.reason.trim() ? { note: r.reason.trim() } : {}),
                  };
                });
            };

            if (contractWillBeSent) {
              setContractFieldValues(
                getDefaultContractFields(selectedContract, proposal?.name, proposal?.sub_title)
              );
              setShowContractDialog(true);
            } else {
              onConfirmSubmit(false, undefined, undefined, undefined, buildRevisionItems());
            }
          }}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Submitting..."
            : showContractSection
            ? "Confirm & Submit to Author"
            : "Confirm & Submit"}
        </Button>
      </div>

      {/* Contract Details Dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
            <DialogDescription>
              Confirm the contract details before sending.
            </DialogDescription>
          </DialogHeader>
          <ContractFieldsForm
            values={contractFieldValues}
            onChange={setContractFieldValues}
            contractType={selectedContract}
            idPrefix="summary-cf"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-[#2f4b40] hover:bg-[#2f4b40] hover:opacity-90 text-white"
              onClick={() => {
                setShowContractDialog(false);
                onConfirmSubmit(true, selectedContract, contractFieldValues.title, contractFieldValues.subtitle, undefined, {
                  contractType: selectedContract,
                  title: contractFieldValues.title,
                  subtitle: contractFieldValues.subtitle,
                  language: contractFieldValues.language,
                  authorCopies: contractFieldValues.authorCopies,
                  ifTwoAuthorCopies: contractFieldValues.ifTwoAuthorCopies,
                  ifThreeOrFourAuthorCopies: contractFieldValues.ifThreeOrFourAuthorCopies,
                  copiesSoldRevenue: contractFieldValues.copiesSoldRevenue,
                  secondaryRightsRevenue: contractFieldValues.secondaryRightsRevenue,
                  publishingAgreement: contractFieldValues.publishingAgreement,
                });
              }}
              disabled={isSubmitting || !areContractFieldsValid(contractFieldValues)}
            >
              {isSubmitting ? "Submitting..." : "Send Contract & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mismatch Warning Dialog */}
      <AlertDialog open={showMismatchWarning} onOpenChange={setShowMismatchWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contract Type Mismatch</AlertDialogTitle>
            <AlertDialogDescription>
              {getContractMismatchWarning(proposal.book_type, pendingContractType || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingContractType(null);
              setShowMismatchWarning(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#2f4b40] hover:bg-[#2f4b40] hover:opacity-90 text-white"
              onClick={() => {
                if (pendingContractType) {
                  setSelectedContract(pendingContractType as "author" | "editor");
                }
                setPendingContractType(null);
                setShowMismatchWarning(false);
              }}
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PeerReviewSummary;
