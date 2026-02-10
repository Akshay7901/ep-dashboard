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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">
            Peer Review Summary
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Please review your comments before submitting
          </p>
        </div>

        {/* Proposal title */}
        <div className="border-l-4 border-muted pl-4 py-2">
          <p className="font-semibold text-sm">{proposal.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            by {proposal.corresponding_author_name || proposal.author_name}
          </p>
        </div>

        {/* Review fields */}
        <div className="space-y-5">
          {REVIEW_FIELDS.map((field) => {
            const value = formData[field.key]?.trim();
            const isEmpty = !value;
            const isOptionalEmpty =
              (field.key === "otherComments" || field.key === "redFlags") && isEmpty;

            return (
              <div key={field.key} className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {field.label}
                </p>
                {isOptionalEmpty ? (
                  <p className="text-sm text-muted-foreground italic">
                    {field.key === "redFlags"
                      ? "None identified"
                      : "None provided"}
                  </p>
                ) : isEmpty ? (
                  <p className="text-sm text-destructive">Not completed</p>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {value}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Final Recommendation */}
        <div
          className={`border rounded-md p-4 space-y-1 ${
            formData.recommendation
              ? "border-border"
              : "border-primary/50 bg-primary/5"
          }`}
        >
          <p className="text-sm font-semibold text-foreground">
            Final Recommendation
          </p>
          {formData.recommendation ? (
            <p className="text-sm font-medium text-foreground">
              {RECOMMENDATION_LABELS[formData.recommendation] ||
                formData.recommendation}
            </p>
          ) : (
            <p className="text-sm text-destructive">Not selected</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 pt-4 pb-6">
          <Button
            variant="outline"
            onClick={onGoBack}
            disabled={isSubmitting}
          >
            Go Back
          </Button>
          <Button
            className="bg-[#9b2c2c] hover:bg-[#9b2c2c]/90 text-white"
            onClick={onConfirmSubmit}
            disabled={isSubmitting || !formData.recommendation}
          >
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PeerReviewSummary;
