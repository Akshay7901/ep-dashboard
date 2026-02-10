import React from "react";
import { Button } from "@/components/ui/button";
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
  onConfirmSubmit: () => void;
  isSubmitting: boolean;
}

const PeerReviewSummary: React.FC<PeerReviewSummaryProps> = ({
  proposal,
  formData,
  onGoBack,
  onConfirmSubmit,
  isSubmitting,
}) => {
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

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-10">
        <Button variant="outline" onClick={onGoBack} disabled={isSubmitting}>
          Go Back
        </Button>
        <Button
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          onClick={onConfirmSubmit}
          disabled={isSubmitting || !formData.recommendation}
        >
          {isSubmitting ? "Submitting..." : "Confirm & Submit"}
        </Button>
      </div>
    </div>
  );
};

export default PeerReviewSummary;
