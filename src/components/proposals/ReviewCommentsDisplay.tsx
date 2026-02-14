import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { MessageSquare, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ReviewerComment } from '@/types';

interface ReviewCommentsDisplayProps {
  comments: ReviewerComment[];
  isReviewer1: boolean;
}

const REVIEW_FIELD_LABELS: Record<string, { label: string; description: string | null }> = {
  scope: {
    label: 'Scope',
    description: "Does this fit within the scope of EUP's publishing remit?",
  },
  purposeAndValue: {
    label: 'Purpose and Value',
    description: "What's going to be useful about this book? Will this book make any likely contribution to future research? Or to practice?",
  },
  title: {
    label: 'Title',
    description: 'Is it descriptive of the content?',
  },
  originality: {
    label: 'Originality and Points of Difference',
    description: 'What is new about the book? How does it differ from other titles in the field?',
  },
  credibility: {
    label: 'Credibility',
    description: 'Does the author have credible qualifications/experience to present this material?',
  },
  structure: {
    label: 'Structure',
    description: 'Does the chapter list look logical and comprehensive?',
  },
  clarity: {
    label: 'Clarity, Structure and Quality of Writing',
    description: null,
  },
  otherComments: {
    label: 'Other Comments',
    description: null,
  },
  redFlags: {
    label: 'Red Flags',
    description: null,
  },
};

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  proceed: { label: 'Proceed', color: 'bg-[#3d5a47] text-white' },
  minor_revision: { label: 'Minor Revision', color: 'bg-[#c4940a] text-white' },
  major_revision: { label: 'Major Revision', color: 'bg-[#9b2c2c] text-white' },
  reject: { label: 'Reject', color: 'bg-foreground text-background' },
};

const FIELD_ORDER = [
  'scope', 'purposeAndValue', 'title', 'originality', 'credibility',
  'structure', 'clarity', 'otherComments', 'redFlags',
];

/**
 * Display component for peer review comments
 * Used by Decision Reviewer (Reviewer 1) to view submitted assessments
 */
const ReviewCommentsDisplay: React.FC<ReviewCommentsDisplayProps> = ({
  comments,
  isReviewer1,
}) => {
  if (!comments || comments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Peer Review Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No review comments have been submitted yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment, index) => {
        const formData = comment.review_form_data || {};
        const hasPeerReviewFields = FIELD_ORDER.some(key => formData[key]);
        const isSubmitted = formData.submittedForAuthorization;

        return (
          <Card key={comment.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Peer Review Comments
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isSubmitted && (
                    <Badge className="bg-[#3d5a47] text-white rounded-full px-3">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Submitted
                    </Badge>
                  )}
                  {!isSubmitted && hasPeerReviewFields && (
                    <Badge variant="outline" className="rounded-full px-3 text-[#c4940a] border-[#c4940a]">
                      Draft
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recommendation */}
              {formData.recommendation && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Recommendation:</span>
                  <Badge className={`${RECOMMENDATION_LABELS[formData.recommendation]?.color || 'bg-muted'} rounded-full px-4 py-1`}>
                    {RECOMMENDATION_LABELS[formData.recommendation]?.label || formData.recommendation}
                  </Badge>
                </div>
              )}

              {hasPeerReviewFields && <Separator />}

              {/* Peer Review Fields */}
              {hasPeerReviewFields && (
                <div className="space-y-5">
                  {FIELD_ORDER.map(key => {
                    const value = formData[key];
                    if (!value) return null;
                    const fieldMeta = REVIEW_FIELD_LABELS[key];
                    if (!fieldMeta) return null;

                    return (
                      <div key={key} className="space-y-1.5">
                        <h4 className="text-sm font-semibold text-foreground">{fieldMeta.label}</h4>
                        {fieldMeta.description && (
                          <p className="text-xs text-muted-foreground italic">{fieldMeta.description}</p>
                        )}
                        <div className="bg-muted/40 border border-border/50 rounded-lg p-3">
                          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                            {value}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Plain comment text (API comments without form data) */}
              {!hasPeerReviewFields && comment.comment_text && (
                <div className="bg-muted/40 border border-border/50 rounded-lg p-3">
                  <p className="text-sm text-foreground whitespace-pre-line">
                    {comment.comment_text}
                  </p>
                </div>
              )}

              {/* Reviewer info */}
              {(comment as any).author_email && (
                <p className="text-xs text-muted-foreground">
                  By: {(comment as any).author || (comment as any).author_email}
                  {(comment as any).role && ` (${(comment as any).role})`}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ReviewCommentsDisplay;
