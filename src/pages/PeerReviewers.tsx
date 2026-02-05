import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronLeft, Plus, Loader2 } from 'lucide-react';
import { usePeerReviewers } from '@/hooks/usePeerReviewers';

const PeerReviewers: React.FC = () => {
  const navigate = useNavigate();
  const { reviewers, isLoading, createReviewer, isCreating, deleteReviewer, isDeleting } = usePeerReviewers();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<{ id: string; name: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    expertise: '',
  });

  const handleAddReviewer = () => {
    if (!formData.name || !formData.email) return;
    
    createReviewer(
      { name: formData.name, email: formData.email },
      {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          setFormData({ name: '', email: '', expertise: '' });
        },
      }
    );
  };

  const handleDeleteClick = (reviewer: { id: string; name: string }) => {
    setSelectedReviewer(reviewer);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedReviewer) return;
    
    deleteReviewer(selectedReviewer.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedReviewer(null);
      },
    });
  };

  return (
    <DashboardLayout title="Peer Reviewers">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back Link */}
        <button
          onClick={() => navigate('/proposals')}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Home
        </button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Peer Reviewers</h1>
        </div>

        <Separator />

        {/* Description */}
        <p className="text-muted-foreground">
          Manage your pool of peer reviewers. Add, edit, or remove reviewers to keep your list up to date.
        </p>

        {/* Add New Reviewer Button */}
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="w-full bg-[#3d5a47] hover:bg-[#2e4536] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Reviewer
        </Button>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && reviewers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No peer reviewers found. Add your first reviewer above.</p>
            </CardContent>
          </Card>
        )}

        {/* Reviewers List */}
        {!isLoading && reviewers.length > 0 && (
          <div className="space-y-3">
            {reviewers.map((reviewer) => (
              <Card key={reviewer.id} className="border">
                <CardContent className="flex items-center justify-between py-4 px-6">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{reviewer.name || reviewer.email.split('@')[0]}</p>
                    <p className="text-sm text-muted-foreground">{reviewer.email}</p>
                    {(reviewer as any).expertise && (
                      <p className="text-sm text-muted-foreground">{(reviewer as any).expertise}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteClick({ id: reviewer.id, name: reviewer.name })}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Reviewer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Reviewer</DialogTitle>
            <DialogDescription>
              Enter the details of the new peer reviewer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Dr. Michael Zhang"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., m.zhang@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expertise">Area of Expertise (optional)</Label>
              <Input
                id="expertise"
                placeholder="e.g., Climate Science & Environmental Studies"
                value={formData.expertise}
                onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddReviewer}
              disabled={isCreating || !formData.name || !formData.email}
              className="bg-[#3d5a47] hover:bg-[#2e4536]"
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Reviewer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reviewer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedReviewer?.name}</strong> from the peer reviewers list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default PeerReviewers;
