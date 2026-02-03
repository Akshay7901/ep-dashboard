import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { MessageSquare, Star, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { ReviewerComment } from '@/types';

interface ReviewCommentsDisplayProps {
  comments: ReviewerComment[];
  isReviewer1: boolean;
}

const getRecommendationBadge = (recommendation: string) => {
  switch (recommendation) {
    case 'strongly_recommend':
      return <Badge className="bg-green-600">Strongly Recommend</Badge>;
    case 'recommend':
      return <Badge className="bg-green-500">Recommend</Badge>;
    case 'recommend_with_revisions':
      return <Badge className="bg-amber-500">Recommend with Revisions</Badge>;
    case 'do_not_recommend':
      return <Badge variant="destructive">Do Not Recommend</Badge>;
    default:
      return null;
  }
};

/**
 * Display component for review comments from Reviewer 2
 * Used by Reviewer 1 to review assessments in Screen 3
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
            Review Comments
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Review Comments
          </CardTitle>
          <Badge variant="outline">{comments.length} review(s)</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {comments.map((comment, index) => {
          const formData = comment.review_form_data || {};
          const isReviewer2Comment = formData.academicMerit !== undefined;
          
          return (
            <div key={comment.id} className="space-y-4">
              {index > 0 && <Separator />}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={isReviewer2Comment ? 'default' : 'secondary'}>
                    {isReviewer2Comment ? 'Reviewer 2 Assessment' : 'Reviewer 1 Comment'}
                  </Badge>
                  {formData.submittedForAuthorization && (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Submitted
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>

              {/* Reviewer 2 Assessment Details */}
              {isReviewer2Comment && (
                <>
                  {/* Scores */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Academic Merit</p>
                      <p className="text-lg font-bold flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        {formData.academicMerit || '-'}/10
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Market Potential</p>
                      <p className="text-lg font-bold flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        {formData.marketPotential || '-'}/10
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Originality</p>
                      <p className="text-lg font-bold flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        {formData.originalityScore || '-'}/10
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Writing Quality</p>
                      <p className="text-lg font-bold flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        {formData.writingQuality || '-'}/10
                      </p>
                    </div>
                  </div>

                  {/* Recommendation */}
                  {formData.recommendation && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Recommendation:</span>
                      {getRecommendationBadge(formData.recommendation)}
                    </div>
                  )}

                  {/* Detailed Comments */}
                  <div className="space-y-4">
                    {formData.strengthsComments && (
                      <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Strengths
                        </p>
                        <p className="text-sm text-foreground">{formData.strengthsComments}</p>
                      </div>
                    )}
                    {formData.weaknessesComments && (
                      <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Weaknesses
                        </p>
                        <p className="text-sm text-foreground">{formData.weaknessesComments}</p>
                      </div>
                    )}
                    {formData.suggestionsComments && (
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <p className="text-xs font-medium text-blue-700 mb-1">Suggestions</p>
                        <p className="text-sm text-foreground">{formData.suggestionsComments}</p>
                      </div>
                    )}
                  </div>

                  {/* Duplicate Warning */}
                  {formData.isDuplicate && (
                    <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Potential Duplicate
                      </p>
                      <p className="text-sm text-foreground">{formData.duplicateDetails}</p>
                    </div>
                  )}
                </>
              )}

              {/* General Comment Text */}
              {comment.comment_text && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-foreground whitespace-pre-line">
                    {comment.comment_text}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ReviewCommentsDisplay;
