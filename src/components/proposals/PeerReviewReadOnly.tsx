import React from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle } from "lucide-react";

const REVIEW_FIELDS = [
  {
    key: "scope",
    label: "Scope",
    description: "Does this fit within the scope of EUP's publishing remit?",
  },
  {
    key: "purposeAndValue",
    label: "Purpose and Value",
    description:
      "What's going to be useful about this book? Will this book make any likely contribution to future research? Or to practice?",
  },
  {
    key: "title",
    label: "Title",
    description: "Is it descriptive of the content?",
  },
  {
    key: "originality",
    label: "Originality and Points of Difference",
    description:
      "What is new about the book? How does it differ from other titles in the field?",
  },
  {
    key: "credibility",
    label: "Credibility",
    description:
      "Does the author have credible qualifications/experience to present this material?",
  },
  {
    key: "structure",
    label: "Structure",
    description: "Does the chapter list look logical and comprehensive?",
  },
  {
    key: "clarity",
    label: "Clarity, Structure and Quality of Writing",
    description: null,
  },
  {
    key: "otherComments",
    label: "Other Comments",
    description: null,
  },
  {
    key: "redFlags",
    label: "Red Flags",
    description: null,
  },
];

const RECOMMENDATION_MAP: Record<string, { label: string; className: string }> = {
  proceed: {
    label: "Proceed",
    className: "bg-[#3d5a47] text-white hover:bg-[#3d5a47]",
  },
  minor_revision: {
    label: "Minor Revision",
    className: "bg-[#c4940a] text-white hover:bg-[#c4940a]",
  },
  major_revision: {
    label: "Major Revision",
    className: "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c]",
  },
  reject: {
    label: "Reject",
    className: "bg-foreground text-background hover:bg-foreground",
  },
};

interface PeerReviewReadOnlyProps {
  formData: Record<string, any>;
  reviewerName?: string;
}

const PeerReviewReadOnly: React.FC<PeerReviewReadOnlyProps> = ({
  formData,
  reviewerName,
}) => {
  // Calculate progress (same logic as form)
  const totalFields = REVIEW_FIELDS.length + 1;
  let filledFields = 0;
  for (const field of REVIEW_FIELDS) {
    if (formData[field.key]?.trim()) filledFields++;
  }
  if (formData.recommendation) filledFields++;
  const progress = Math.round((filledFields / totalFields) * 100);

  const recommendation = RECOMMENDATION_MAP[formData.recommendation];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            Peer review comments
          </h2>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {progress}% Complete
          </span>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
      </div>

      {/* Submitted indicator */}
      {formData.submittedForAuthorization && (
        <div className="flex items-center gap-2 p-3 bg-[#3d5a47]/10 border border-[#3d5a47]/20 rounded-lg">
          <CheckCircle className="h-4 w-4 text-[#3d5a47]" />
          <span className="text-sm font-medium text-[#3d5a47]">
            Review submitted
            {reviewerName ? ` by ${reviewerName}` : ""}
          </span>
        </div>
      )}

      {/* Reviewer 1's Comments Pre-loaded alert */}
      <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Reviewer 1's Comments Pre-loaded
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            The form below contains Reviewer 1's comments in{" "}
            <span className="text-destructive font-medium">red text</span>.
            You can edit any field directly, or click "Start Fresh" above to clear all fields.
          </p>
        </div>
      </div>

      {/* Review Fields (read-only) */}
      {REVIEW_FIELDS.map((field) => {
        const value = formData[field.key];
        if (!value?.trim()) return null;

        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-base font-semibold">{field.label}</Label>
            {field.description && (
              <p className="text-sm text-muted-foreground italic">
                {field.description}
              </p>
            )}
            <div className="bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-line rounded-lg border">
              {value}
            </div>
          </div>
        );
      })}

      {/* Recommendation */}
      {formData.recommendation && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Recommendation</Label>
          <div className="flex items-center gap-2">
            {recommendation ? (
              <Badge className={`${recommendation.className} rounded-full px-4 py-1 text-sm`}>
                {recommendation.label}
              </Badge>
            ) : (
              <Badge variant="outline">{formData.recommendation}</Badge>
            )}
          </div>
        </div>
      )}

      {/* Red flags warning */}
      {formData.redFlags?.trim() && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div>
            <span className="text-sm font-medium text-destructive">Red Flags Noted</span>
            <p className="text-sm text-foreground mt-1">{formData.redFlags}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeerReviewReadOnly;
