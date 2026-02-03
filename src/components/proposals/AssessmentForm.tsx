import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Save, Send, CheckCircle } from 'lucide-react';
import { Proposal } from '@/types';
import { useAddComment } from '@/hooks/useProposals';

interface AssessmentFormProps {
  proposal: Proposal;
  isReviewer2: boolean;
  existingAssessment?: Record<string, any>;
  onSave?: () => void;
}

/**
 * Screen 2: Reviewer 2 (Amanda) Assessment Form
 * Editable fields for evaluating the proposal
 */
const AssessmentForm: React.FC<AssessmentFormProps> = ({
  proposal,
  isReviewer2,
  existingAssessment,
  onSave,
}) => {
  const addComment = useAddComment();
  const [formData, setFormData] = useState<Record<string, any>>(existingAssessment || {
    academicMerit: '',
    marketPotential: '',
    originalityScore: '',
    writingQuality: '',
    recommendation: '',
    strengthsComments: '',
    weaknessesComments: '',
    suggestionsComments: '',
    isDuplicate: false,
    duplicateDetails: '',
    overallComments: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(!!existingAssessment);

  // Only show for Reviewer 2 when proposal is under review
  if (!isReviewer2 || proposal.status !== 'under_review') {
    return null;
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (submitForAuthorization: boolean = false) => {
    setIsSaving(true);
    try {
      await addComment.mutateAsync({
        proposalId: proposal.id,
        commentText: formData.overallComments,
        reviewFormData: {
          ...formData,
          submittedForAuthorization: submitForAuthorization,
          submittedAt: new Date().toISOString(),
        },
      });
      if (submitForAuthorization) {
        setIsSubmitted(true);
      }
      onSave?.();
    } catch (error) {
      console.error('Failed to save assessment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Assessment Submitted
          </CardTitle>
          <CardDescription>
            Your assessment has been submitted and is now awaiting review by Reviewer 1.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Proposal Assessment</CardTitle>
          <Badge variant="secondary">Reviewer 2</Badge>
        </div>
        <CardDescription>
          Complete the assessment form to evaluate this proposal. All fields are editable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scoring Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="academicMerit">Academic Merit (1-10)</Label>
            <Input
              id="academicMerit"
              type="number"
              min="1"
              max="10"
              value={formData.academicMerit}
              onChange={(e) => handleFieldChange('academicMerit', e.target.value)}
              placeholder="Score out of 10"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="marketPotential">Market Potential (1-10)</Label>
            <Input
              id="marketPotential"
              type="number"
              min="1"
              max="10"
              value={formData.marketPotential}
              onChange={(e) => handleFieldChange('marketPotential', e.target.value)}
              placeholder="Score out of 10"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="originalityScore">Originality (1-10)</Label>
            <Input
              id="originalityScore"
              type="number"
              min="1"
              max="10"
              value={formData.originalityScore}
              onChange={(e) => handleFieldChange('originalityScore', e.target.value)}
              placeholder="Score out of 10"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="writingQuality">Writing Quality (1-10)</Label>
            <Input
              id="writingQuality"
              type="number"
              min="1"
              max="10"
              value={formData.writingQuality}
              onChange={(e) => handleFieldChange('writingQuality', e.target.value)}
              placeholder="Score out of 10"
            />
          </div>
        </div>

        {/* Recommendation */}
        <div className="space-y-3">
          <Label>Recommendation</Label>
          <RadioGroup
            value={formData.recommendation}
            onValueChange={(value) => handleFieldChange('recommendation', value)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="strongly_recommend" id="strongly_recommend" />
              <Label htmlFor="strongly_recommend" className="font-normal cursor-pointer">
                Strongly Recommend
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recommend" id="recommend" />
              <Label htmlFor="recommend" className="font-normal cursor-pointer">
                Recommend
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recommend_with_revisions" id="recommend_with_revisions" />
              <Label htmlFor="recommend_with_revisions" className="font-normal cursor-pointer">
                Recommend with Revisions
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="do_not_recommend" id="do_not_recommend" />
              <Label htmlFor="do_not_recommend" className="font-normal cursor-pointer">
                Do Not Recommend
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Comments Sections */}
        <div className="space-y-3">
          <Label htmlFor="strengthsComments">Strengths</Label>
          <Textarea
            id="strengthsComments"
            value={formData.strengthsComments}
            onChange={(e) => handleFieldChange('strengthsComments', e.target.value)}
            placeholder="Describe the proposal's strengths..."
            rows={3}
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="weaknessesComments">Weaknesses</Label>
          <Textarea
            id="weaknessesComments"
            value={formData.weaknessesComments}
            onChange={(e) => handleFieldChange('weaknessesComments', e.target.value)}
            placeholder="Describe any weaknesses or concerns..."
            rows={3}
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="suggestionsComments">Suggestions for Improvement</Label>
          <Textarea
            id="suggestionsComments"
            value={formData.suggestionsComments}
            onChange={(e) => handleFieldChange('suggestionsComments', e.target.value)}
            placeholder="Any suggestions for the author..."
            rows={3}
          />
        </div>

        {/* Duplicate Check */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDuplicate"
              checked={formData.isDuplicate}
              onCheckedChange={(checked) => handleFieldChange('isDuplicate', checked)}
            />
            <Label htmlFor="isDuplicate" className="font-normal cursor-pointer">
              This proposal appears to be a duplicate or similar to another submission
            </Label>
          </div>
          {formData.isDuplicate && (
            <Textarea
              value={formData.duplicateDetails}
              onChange={(e) => handleFieldChange('duplicateDetails', e.target.value)}
              placeholder="Provide details about the duplicate..."
              rows={2}
            />
          )}
        </div>

        {/* Overall Comments */}
        <div className="space-y-3">
          <Label htmlFor="overallComments">Overall Comments</Label>
          <Textarea
            id="overallComments"
            value={formData.overallComments}
            onChange={(e) => handleFieldChange('overallComments', e.target.value)}
            placeholder="Any additional comments for the review..."
            rows={4}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit for Authorization
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentForm;
