import React, { useState, useMemo, useCallback, useImperativeHandle, forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Save } from "lucide-react";
import { Proposal } from "@/types";
import { useAddComment } from "@/hooks/useProposals";
import { commentsApi } from "@/lib/proposalsApi";

interface PeerReviewCommentsFormProps {
  proposal: Proposal;
  existingAssessment?: Record<string, any>;
  onSave?: () => void;
  onSubmitReview?: (formData: Record<string, string>) => void;
  onDraftSaved?: () => void;
}

export interface PeerReviewCommentsFormHandle {
  saveDraft: () => Promise<void>;
  submitReview: () => Promise<void>;
  confirmSubmit: () => Promise<void>;
  isSaving: boolean;
  canSubmit: boolean;
  progress: number;
  formData: Record<string, string>;
}

const REVIEW_FIELDS = [
  {
    key: "scope",
    label: "Scope",
    description: "Does this fit within the scope of EUP's publishing remit?",
    placeholder: "Enter your comments...",
  },
  {
    key: "purposeAndValue",
    label: "Purpose and Value",
    description:
      "What's going to be useful about this book? Will this book make any likely contribution to future research? Or to practice?",
    placeholder: "Enter your comments...",
  },
  {
    key: "title",
    label: "Title",
    description: "Is it descriptive of the content?",
    placeholder: "Enter your comments...",
  },
  {
    key: "originality",
    label: "Originality and Points of Difference",
    description:
      "What is new about the book? How does it differ from other titles in the field?",
    placeholder: "Enter your comments...",
  },
  {
    key: "credibility",
    label: "Credibility",
    description:
      "Does the author have credible qualifications/experience to present this material?",
    placeholder: "Enter your comments...",
  },
  {
    key: "structure",
    label: "Structure",
    description: "Does the chapter list look logical and comprehensive?",
    placeholder: "Enter your comments...",
  },
  {
    key: "clarity",
    label: "Clarity, Structure and Quality of Writing",
    description: null,
    placeholder: "Enter your comments...",
  },
  {
    key: "otherComments",
    label: "Other Comments",
    description: null,
    placeholder: "Enter any additional comments...",
  },
  {
    key: "redFlags",
    label: "Red Flags",
    description: null,
    placeholder: "Note any concerns or issues...",
  },
];

const RECOMMENDATION_OPTIONS = [
  {
    value: "proceed",
    label: "Proceed",
    description: "Proposal looks good",
    color: "border-[#3d5a47] text-[#3d5a47]",
    dotColor: "bg-[#3d5a47]",
  },
  {
    value: "minor_revision",
    label: "Minor Revision",
    description: "Accept but with some small changes",
    color: "border-[#c4940a] text-[#c4940a]",
    dotColor: "bg-[#c4940a]",
  },
  {
    value: "major_revision",
    label: "Major Revision",
    description: "This needs some work",
    color: "border-[#9b2c2c] text-[#9b2c2c]",
    dotColor: "bg-[#9b2c2c]",
  },
  {
    value: "reject",
    label: "Reject",
    description: "Proposal looks like it will not make a suitable book",
    color: "border-foreground text-foreground",
    dotColor: "bg-foreground",
  },
];

const PeerReviewCommentsForm = forwardRef<PeerReviewCommentsFormHandle, PeerReviewCommentsFormProps>(({
  proposal,
  existingAssessment,
  onSave,
  onSubmitReview,
  onDraftSaved,
}, ref) => {
  const addComment = useAddComment();

  const [formData, setFormData] = useState<Record<string, string>>(
    existingAssessment || {
      scope: "",
      purposeAndValue: "",
      title: "",
      originality: "",
      credibility: "",
      structure: "",
      clarity: "",
      otherComments: "",
      redFlags: "",
      recommendation: "",
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(
    !!existingAssessment?.submittedForAuthorization
  );

  // Calculate progress
  const progress = useMemo(() => {
    const totalFields = REVIEW_FIELDS.length + 1; // +1 for recommendation
    let filledFields = 0;
    for (const field of REVIEW_FIELDS) {
      if (formData[field.key]?.trim()) filledFields++;
    }
    if (formData.recommendation) filledFields++;
    return Math.round((filledFields / totalFields) * 100);
  }, [formData]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async (submitForAuthorization: boolean = false) => {
    setIsSaving(true);
    try {
      // Build the review payload
      const reviewPayload = {
        ...formData,
        submittedForAuthorization: submitForAuthorization,
        submittedAt: new Date().toISOString(),
      };

      // Save to local workflow (Supabase)
      await addComment.mutateAsync({
        proposalId: proposal.id,
        commentText: formData.otherComments || "",
        reviewFormData: reviewPayload,
        ticketNumber: proposal.ticket_number || undefined,
      });

      // Also post to external comments API if ticket_number is available
      if (proposal.ticket_number) {
        const commentSummary = submitForAuthorization
          ? `[Peer Review Submitted] Recommendation: ${formData.recommendation || 'N/A'}`
          : `[Draft Saved] Recommendation: ${formData.recommendation || 'Not yet selected'}`;
        try {
          await commentsApi.add(proposal.ticket_number, { comment: commentSummary });
        } catch (e) {
          console.warn("Failed to post to external comments API:", e);
        }
      }

      if (submitForAuthorization) {
        setIsSubmitted(true);
      } else {
        onDraftSaved?.();
      }
      onSave?.();
    } catch (error) {
      console.error("Failed to save assessment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    saveDraft: () => handleSave(false),
    submitReview: async () => {},
    confirmSubmit: () => handleSave(true),
    isSaving,
    canSubmit: true,
    progress,
    formData,
  }), [isSaving, formData, progress]);

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-[#3d5a47]" />
        <h2 className="text-xl font-semibold">Review Submitted</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Your peer review has been submitted and is now awaiting authorization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with progress */}
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

      {/* Form Fields */}
      {REVIEW_FIELDS.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label className="text-base font-semibold">{field.label}</Label>
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
          <Textarea
            value={formData[field.key] || ""}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="resize-none bg-background"
          />
        </div>
      ))}

      {/* Recommendation */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Recommendation <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={formData.recommendation}
          onValueChange={(value) => handleFieldChange("recommendation", value)}
          className="space-y-3"
        >
          {RECOMMENDATION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 cursor-pointer"
            >
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium text-sm">{option.label}</span>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
      </RadioGroup>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={() => {
            if (onSubmitReview) {
              onSubmitReview({ ...formData });
            } else {
              handleSave(true);
            }
          }}
          disabled={isSaving}
          className="flex-1 bg-[#2f4b40] hover:bg-[#2f4b40] hover:opacity-90 text-white"
        >
          Submit Review
        </Button>
      </div>

    </div>
  );
});

export default PeerReviewCommentsForm;
