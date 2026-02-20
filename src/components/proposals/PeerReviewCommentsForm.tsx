import React, { useState, useMemo, useCallback, useImperativeHandle, forwardRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Save } from "lucide-react";
import { Proposal } from "@/types";
import { useReview } from "@/hooks/useReview";

interface PeerReviewCommentsFormProps {
  proposal: Proposal;
  existingAssessment?: Record<string, any>;
  onSave?: () => void;
  onSubmitReview?: (formData: Record<string, string>) => void;
  onDraftSaved?: () => void;
  /** When true, ignore the submittedForAuthorization flag and always show the editable form */
  forceEditable?: boolean;
  /** When true, hide the built-in header (progress bar + title) */
  hideHeader?: boolean;
  /** When true, show pre-loaded text in red/destructive color */
  preloadedStyle?: boolean;
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
    description: "Does this fit within the scope of EIPs publishing remit?",
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
    description: "What is new about the book? How does it differ from other titles in the field?",
    placeholder: "Enter your comments...",
  },
  {
    key: "credibility",
    label: "Credibility",
    description: "Does the author have credible qualifications/experience to present this material?",
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

const PeerReviewCommentsForm = forwardRef<PeerReviewCommentsFormHandle, PeerReviewCommentsFormProps>(
  ({ proposal, existingAssessment, onSave, onSubmitReview, onDraftSaved, forceEditable, hideHeader, preloadedStyle }, ref) => {
    const { saveDraft, submitReview: submitReviewApi, isSavingDraft, isSubmitting: isSubmittingApi } = useReview(proposal.ticket_number || proposal.id);

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
      },
    );

    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(!forceEditable && !!(existingAssessment?.submittedForAuthorization || existingAssessment?.submitted_for_authorization));

    // Reset form data when existingAssessment prop changes (e.g. Start Fresh / Reload)
    useEffect(() => {
      const defaultData = {
        scope: "", purposeAndValue: "", title: "", originality: "",
        credibility: "", structure: "", clarity: "", otherComments: "",
        redFlags: "", recommendation: "",
      };
      console.log('[PeerReviewForm] existingAssessment changed:', JSON.stringify(existingAssessment)?.substring(0, 200));
      if (existingAssessment && Object.keys(existingAssessment).length > 0) {
        // Map API field names to form field names (handle snake_case from API)
        const mapped: Record<string, string> = { ...defaultData };
        const fieldMap: Record<string, string> = {
          scope: 'scope',
          purpose_value: 'purposeAndValue',
          purpose_and_value: 'purposeAndValue',
          purposeAndValue: 'purposeAndValue',
          title: 'title',
          originality: 'originality',
          credibility: 'credibility',
          structure: 'structure',
          clarity_quality: 'clarity',
          clarity: 'clarity',
          other_comments: 'otherComments',
          otherComments: 'otherComments',
          red_flags: 'redFlags',
          redFlags: 'redFlags',
          recommendation: 'recommendation',
        };
        for (const [apiKey, formKey] of Object.entries(fieldMap)) {
          if (existingAssessment[apiKey]) {
            mapped[formKey] = existingAssessment[apiKey];
          }
        }
        setFormData(mapped);
      } else {
        setFormData(defaultData);
      }
    }, [existingAssessment]);

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

    // Mark proposal as started for peer reviewer status tracking
    const markAsStarted = useCallback(() => {
      if (!proposal?.ticket_number) return;
      try {
        const key = 'peer_review_started';
        const stored = localStorage.getItem(key);
        const started: string[] = stored ? JSON.parse(stored) : [];
        if (!started.includes(proposal.ticket_number)) {
          started.push(proposal.ticket_number);
          localStorage.setItem(key, JSON.stringify(started));
        }
      } catch { /* ignore */ }
    }, [proposal?.ticket_number]);

    const handleFieldChange = useCallback((field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      markAsStarted();
    }, [markAsStarted]);

    const handleSave = async (submitForAuthorization: boolean = false) => {
      if (submitForAuthorization && !formData.recommendation?.trim()) {
        const { toast } = await import('@/hooks/use-toast');
        toast({
          variant: 'destructive',
          title: 'Recommendation Required',
          description: 'Please select a recommendation before submitting your review.',
        });
        return;
      }
      markAsStarted();
      setIsSaving(true);
      try {
        // Build the review payload converting camelCase form keys to snake_case API keys
        const formToApiMap: Record<string, string> = {
          scope: 'scope',
          purposeAndValue: 'purpose_value',
          title: 'title',
          originality: 'originality',
          credibility: 'credibility',
          structure: 'structure',
          clarity: 'clarity_quality',
          otherComments: 'other_comments',
          redFlags: 'red_flags',
          recommendation: 'recommendation',
        };
        const reviewPayload: Record<string, string> = {};
        for (const [formKey, apiKey] of Object.entries(formToApiMap)) {
          if (formData[formKey] !== undefined && formData[formKey] !== '') {
            reviewPayload[apiKey] = formData[formKey];
          }
        }

        console.log('[PeerReviewForm] Sending payload:', JSON.stringify(reviewPayload));

        if (submitForAuthorization) {
          // Use review/submit endpoint
          await submitReviewApi(reviewPayload);
          setIsSubmitted(true);
        } else {
          // Use review/save endpoint for drafts
          await saveDraft(reviewPayload);
          onDraftSaved?.();
        }
        onSave?.();
      } catch (error: any) {
        console.error("Failed to save assessment:", JSON.stringify({ message: error?.message, status: error?.status }));
      } finally {
        setIsSaving(false);
      }
    };

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        saveDraft: () => handleSave(false),
        submitReview: async () => {
          // Use the same flow as the bottom button: open summary screen
          if (onSubmitReview) {
            onSubmitReview({ ...formData });
          }
        },
        confirmSubmit: () => handleSave(true),
        isSaving,
        canSubmit: true,
        progress,
        formData,
      }),
      [isSaving, formData, progress, onSubmitReview],
    );

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
        {!hideHeader && (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Peer review comments</h2>
              <span className="text-sm text-muted-foreground whitespace-nowrap">{progress}% Complete</span>
            </div>
            <Progress value={progress} className="mt-3 h-2" />
          </div>
        )}

        {/* Form Fields */}
        {REVIEW_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label className="text-base font-semibold">{field.label}</Label>
            {field.description && <p className="text-sm text-muted-foreground">{field.description}</p>}
            <Textarea
              value={formData[field.key] || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className={`resize-none bg-background ${preloadedStyle && formData[field.key]?.trim() ? "text-destructive" : ""}`}
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
              <label key={option.value} className="flex items-start gap-3 cursor-pointer">
                <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                <div>
                  <span className="font-medium text-sm">{option.label}</span>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => {
              if (!formData.recommendation?.trim()) {
                import('@/hooks/use-toast').then(({ toast }) => {
                  toast({
                    variant: 'destructive',
                    title: 'Recommendation Required',
                    description: 'Please select a recommendation before submitting your review.',
                  });
                });
                return;
              }
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
  },
);

export default PeerReviewCommentsForm;
