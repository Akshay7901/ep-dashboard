import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, MessageSquarePlus } from 'lucide-react';
import { Proposal } from '@/types';
import { useAddComment } from '@/hooks/useProposals';

interface Reviewer1CommentFormProps {
  proposal: Proposal;
  isReviewer1: boolean;
}

/**
 * Screen 3: Reviewer 1 (Sarah) Additional Input Form
 * After reviewing Reviewer 2's comments, can add additional input
 */
const Reviewer1CommentForm: React.FC<Reviewer1CommentFormProps> = ({
  proposal,
  isReviewer1,
}) => {
  const addComment = useAddComment();
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Only show for Reviewer 1 when proposal is under review or approved
  if (!isReviewer1 || (proposal.status !== 'under_review' && proposal.status !== 'approved')) {
    return null;
  }

  const handleSave = async () => {
    if (!comment.trim()) return;
    
    setIsSaving(true);
    try {
      await addComment.mutateAsync({
        proposalId: proposal.id,
        commentText: comment,
        reviewFormData: {
          type: 'reviewer_1_comment',
          addedAt: new Date().toISOString(),
        },
      });
      setComment('');
    } catch (error) {
      console.error('Failed to save comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Add Comments
          </CardTitle>
          <Badge variant="secondary">Reviewer 1</Badge>
        </div>
        <CardDescription>
          Add any additional comments or notes about this proposal. These will be visible in the review history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="reviewer1Comment">Your Comments</Label>
          <Textarea
            id="reviewer1Comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comments or notes..."
            rows={4}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || !comment.trim()}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Comment
        </Button>
      </CardContent>
    </Card>
  );
};

export default Reviewer1CommentForm;
