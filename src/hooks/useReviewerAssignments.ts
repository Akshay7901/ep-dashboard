import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface ReviewerAssignment {
  ticket_number: string;
  title: string;
  author: string;
  assigned_at: string;
}

interface ReviewerWithAssignments {
  reviewerId: string;
  reviewerEmail: string;
  assignments: ReviewerAssignment[];
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Fetch all proposals and extract assigned reviewers
export const useReviewerAssignments = () => {
  return useQuery({
    queryKey: ['reviewer-assignments'],
    queryFn: async (): Promise<Map<string, ReviewerAssignment[]>> => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Fetch all proposals directly from API
      const { data } = await api.get('/api/proposals?limit=500&offset=0');
      const proposals = data.proposals || [];

      // Build a map of reviewer email -> assigned proposals
      const assignmentMap = new Map<string, ReviewerAssignment[]>();

      for (const proposal of proposals) {
        // Skip proposals that have been reverted to new/submitted — they are no longer actively assigned
        const status = (proposal.status || '').toLowerCase();
        if (status === 'new' || status === 'submitted') continue;

        // Check if proposal has assigned_reviewers or similar field
        const reviewers = proposal.assigned_reviewers || proposal.reviewers || proposal.assigned_reviewer_emails || [];
        if (!Array.isArray(reviewers) || reviewers.length === 0) continue;
        
        for (const reviewer of reviewers) {
          const email = reviewer.email || reviewer;
          if (!email) continue;

          const existing = assignmentMap.get(email) || [];
          existing.push({
            ticket_number: proposal.ticket_number,
            title: proposal.title,
            author: proposal.corresponding_author || proposal.author,
            assigned_at: reviewer.assigned_at || proposal.submitted_at,
          });
          assignmentMap.set(email, existing);
        }
      }

      return assignmentMap;
    },
    staleTime: 10000, // 10 seconds — keep fresh for responsive assignment updates
  });
};
