import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  FileCheck 
} from 'lucide-react';

interface ProposalStatusBadgeProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

// Color mapping keyed by normalized status (lowercase, underscored)
const statusColorMap: Record<string, { 
  className: string;
  icon: React.ElementType;
}> = {
  // Editor/Decision dashboard statuses
  new: { className: 'bg-[#3B82F6] text-white hover:bg-[#3B82F6] border-[#3B82F6]', icon: FileText },
  submitted: { className: 'bg-[#3B82F6] text-white hover:bg-[#3B82F6] border-[#3B82F6]', icon: FileText },
  in_review: { className: 'bg-[#7C3AED] text-white hover:bg-[#7C3AED] border-[#7C3AED]', icon: Clock },
  editorial_review: { className: 'bg-[#7C3AED] text-white hover:bg-[#7C3AED] border-[#7C3AED]', icon: Clock },
  peer_review: { className: 'bg-[#7C3AED] text-white hover:bg-[#7C3AED] border-[#7C3AED]', icon: Clock },
  review_returned: { className: 'bg-[#F59E0B] text-white hover:bg-[#F59E0B] border-[#F59E0B]', icon: FileCheck },
  contract_issued: { className: 'bg-[#0D9488] text-white hover:bg-[#0D9488] border-[#0D9488]', icon: FileCheck },
  contract_sent: { className: 'bg-[#0D9488] text-white hover:bg-[#0D9488] border-[#0D9488]', icon: FileCheck },
  queries_raised: { className: 'bg-[#EA580C] text-white hover:bg-[#EA580C] border-[#EA580C]', icon: Clock },
  awaiting_more_info: { className: 'bg-[#D97706] text-white hover:bg-[#D97706] border-[#D97706]', icon: Clock },
  additional_info_required: { className: 'bg-[#D97706] text-white hover:bg-[#D97706] border-[#D97706]', icon: Clock },
  additional_information_required: { className: 'bg-[#D97706] text-white hover:bg-[#D97706] border-[#D97706]', icon: Clock },
  clarification: { className: 'bg-[#EA580C] text-white hover:bg-[#EA580C] border-[#EA580C]', icon: Clock },
  awaiting_author_approval: { className: 'bg-[#BE185D] text-white hover:bg-[#BE185D] border-[#BE185D]', icon: Clock },
  awaiting_approval: { className: 'bg-[#BE185D] text-white hover:bg-[#BE185D] border-[#BE185D]', icon: Clock },
  // Author dashboard statuses
  'final_review_&_confirmation': { className: 'bg-[#F59E0B] text-white hover:bg-[#F59E0B] border-[#F59E0B]', icon: Clock },
  'feedback_&_agreement_pending': { className: 'bg-[#BE185D] text-white hover:bg-[#BE185D] border-[#BE185D]', icon: FileCheck },
  'feedback_&_contract_issued': { className: 'bg-[#BE185D] text-white hover:bg-[#BE185D] border-[#BE185D]', icon: FileCheck },
  author_approved: { className: 'bg-[#16A34A] text-white hover:bg-[#16A34A] border-[#16A34A]', icon: CheckCircle2 },
  accepted: { className: 'bg-[#16A34A] text-white hover:bg-[#16A34A] border-[#16A34A]', icon: CheckCircle2 },
  'confirmed_&_finalised': { className: 'bg-[#16A34A] text-white hover:bg-[#16A34A] border-[#16A34A]', icon: CheckCircle2 },
  approved: { className: 'bg-[#16A34A] text-white hover:bg-[#16A34A] border-[#16A34A]', icon: CheckCircle2 },
  declined: { className: 'bg-[#DC2626] text-white hover:bg-[#DC2626] border-[#DC2626]', icon: XCircle },
  rejected: { className: 'bg-[#DC2626] text-white hover:bg-[#DC2626] border-[#DC2626]', icon: XCircle },
  locked: { className: 'bg-[#94A3B8] text-white hover:bg-[#94A3B8] border-[#94A3B8]', icon: Lock },
  // Peer reviewer statuses
  pending: { className: 'bg-[#EA580C] text-white hover:bg-[#EA580C] border-[#EA580C]', icon: Clock },
  in_progress: { className: 'bg-[#F59E0B] text-white hover:bg-[#F59E0B] border-[#F59E0B]', icon: Clock },
  completed: { className: 'bg-[#16A34A] text-white hover:bg-[#16A34A] border-[#16A34A]', icon: CheckCircle2 },
  not_assigned: { className: 'bg-gray-400 text-white hover:bg-gray-400 border-gray-400', icon: FileText },
};

const defaultStyle = { className: 'bg-gray-500 text-white hover:bg-gray-500 border-gray-500', icon: FileText };

const ProposalStatusBadge: React.FC<ProposalStatusBadgeProps> = ({ 
  status, 
  showIcon = true,
  className 
}) => {
  // Normalize for color lookup: "In Review" -> "in_review"
  const normalized = status.trim().toLowerCase().replace(/\s+/g, '_');
  const config = statusColorMap[normalized] || defaultStyle;
  const Icon = config.icon;

  return (
    <Badge 
      variant="secondary"
      className={cn(config.className, 'gap-1.5 font-medium rounded-full px-4', className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {status}
    </Badge>
  );
};

export default ProposalStatusBadge;
