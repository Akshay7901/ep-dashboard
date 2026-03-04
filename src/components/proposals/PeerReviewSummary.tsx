import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Proposal } from "@/types";

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
  onConfirmSubmit: (sendContract: boolean, contractType?: string, contractTitle?: string, contractSubtitle?: string) => void;
  isSubmitting: boolean;
  /** Show contract selection for decision reviewer */
  showContractSection?: boolean;
}

const PeerReviewSummary: React.FC<PeerReviewSummaryProps> = ({
  proposal,
  formData,
  onGoBack,
  onConfirmSubmit,
  isSubmitting,
  showContractSection = false,
}) => {
  const recommendation = formData.recommendation;
  const isReject = recommendation === "reject";
  // For proceed/minor/major revision, contract is mandatory; for reject, no contract
  const contractRequired = showContractSection && !isReject;
  const [selectedContract, setSelectedContract] = useState("author");
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [contractTitle, setContractTitle] = useState(proposal?.name || "");
  const [contractSubtitle, setContractSubtitle] = useState(proposal?.sub_title || "");

  return (
    <div className="max-w-2xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold mb-1">Peer Review Summary</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Please review your comments before submitting
      </p>

      {/* Proposal title */}
      <div className="bg-muted/40 rounded-md p-4 mb-8">
        <p className="font-semibold text-sm">{proposal.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          by {proposal.corresponding_author_name || proposal.author_name}
        </p>
      </div>

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

      {/* Contract option - only for decision reviewer */}
      {showContractSection && (
        <div className="mt-8 space-y-4">
          {isReject ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-sm font-medium text-destructive">
                No contract will be sent as the recommendation is "Reject".
              </p>
            </div>
          ) : (
            <>
              <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
                <p className="text-sm font-medium text-primary">
                  A contract will be sent with this submission.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Select Contract Type</p>
                <Select value={selectedContract} onValueChange={setSelectedContract}>
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
            if (contractRequired) {
              // Open dialog to confirm title/subtitle before sending contract
              setContractTitle(proposal?.name || "");
              setContractSubtitle(proposal?.sub_title || "");
              setShowContractDialog(true);
            } else {
              onConfirmSubmit(false);
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

      {/* Contract Title/Subtitle Dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
            <DialogDescription>
              Confirm the title and subtitle for the contract before sending.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="contract-title">Title</Label>
              <Input
                id="contract-title"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                placeholder="Enter title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-subtitle">Subtitle</Label>
              <Input
                id="contract-subtitle"
                value={contractSubtitle}
                onChange={(e) => setContractSubtitle(e.target.value)}
                placeholder="Enter subtitle (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-[#2f4b40] hover:bg-[#2f4b40] hover:opacity-90 text-white"
              onClick={() => {
                setShowContractDialog(false);
                onConfirmSubmit(true, selectedContract, contractTitle, contractSubtitle);
              }}
              disabled={isSubmitting || !contractTitle.trim()}
            >
              {isSubmitting ? "Submitting..." : "Send Contract & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PeerReviewSummary;
