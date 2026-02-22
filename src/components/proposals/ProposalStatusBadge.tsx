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
  new: { className: 'bg-[#3d5a47] text-white hover:bg-[#345040] border-[#3d5a47] hover:border-[#345040]', icon: FileText },
  submitted: { className: 'bg-[#6b7280] text-white hover:bg-[#5b6370] border-[#6b7280] hover:border-[#5b6370]', icon: FileText },
  in_review: { className: 'bg-[#45556c] text-white hover:bg-[#3a495e] border-[#45556c] hover:border-[#3a495e]', icon: Clock },
  editorial_review: { className: 'bg-[#3d5a47] text-white hover:bg-[#345040] border-[#3d5a47] hover:border-[#345040]', icon: Clock },
  peer_review: { className: 'bg-[#3d5a47] text-white hover:bg-[#345040] border-[#3d5a47] hover:border-[#345040]', icon: Clock },
  review_returned: { className: 'bg-[#c05621] text-white hover:bg-[#a84b1d] border-[#c05621] hover:border-[#a84b1d]', icon: FileCheck },
  contract_issued: { className: 'bg-[#1d293d] text-white hover:bg-[#162233] border-[#1d293d] hover:border-[#162233]', icon: FileCheck },
  contract_sent: { className: 'bg-[#1d293d] text-white hover:bg-[#162233] border-[#1d293d] hover:border-[#162233]', icon: FileCheck },
  queries_raised: { className: 'bg-gray-600 text-white hover:bg-gray-700 border-gray-600 hover:border-gray-700', icon: Clock },
  clarification: { className: 'bg-gray-600 text-white hover:bg-gray-700 border-gray-600 hover:border-gray-700', icon: Clock },
  awaiting_author_approval: { className: 'bg-[#45556c] text-white hover:bg-[#3a495e] border-[#45556c] hover:border-[#3a495e]', icon: Clock },
  awaiting_approval: { className: 'bg-[#45556c] text-white hover:bg-[#3a495e] border-[#45556c] hover:border-[#3a495e]', icon: Clock },
  'final_review_&_confirmation': { className: 'bg-[#45556c] text-white hover:bg-[#3a495e] border-[#45556c] hover:border-[#3a495e]', icon: Clock },
  author_approved: { className: 'bg-[#276749] text-white hover:bg-[#1f5a3e] border-[#276749] hover:border-[#1f5a3e]', icon: CheckCircle2 },
  accepted: { className: 'bg-[#276749] text-white hover:bg-[#1f5a3e] border-[#276749] hover:border-[#1f5a3e]', icon: CheckCircle2 },
  'confirmed_&_finalised': { className: 'bg-[#276749] text-white hover:bg-[#1f5a3e] border-[#276749] hover:border-[#1f5a3e]', icon: CheckCircle2 },
  approved: { className: 'bg-[#1d293d] text-white hover:bg-[#162233] border-[#1d293d] hover:border-[#162233]', icon: CheckCircle2 },
  'feedback_&_agreement_pending': { className: 'bg-[#c05621] text-white hover:bg-[#a84b1d] border-[#c05621] hover:border-[#a84b1d]', icon: FileCheck },
  declined: { className: 'bg-[#9b2c2c] text-white hover:bg-[#872525] border-[#9b2c2c] hover:border-[#872525]', icon: XCircle },
  rejected: { className: 'bg-[#9b2c2c] text-white hover:bg-[#872525] border-[#9b2c2c] hover:border-[#872525]', icon: XCircle },
  locked: { className: 'bg-gray-600 text-white hover:bg-gray-700 border-gray-600 hover:border-gray-700', icon: Lock },
  pending: { className: 'bg-[#7a2626] text-white hover:bg-[#6a2020] border-[#7a2626] hover:border-[#6a2020]', icon: Clock },
  in_progress: { className: 'bg-[#f2a627] text-white hover:bg-[#d99420] border-[#f2a627] hover:border-[#d99420]', icon: Clock },
  completed: { className: 'bg-[#93a316] text-white hover:bg-[#7f8e13] border-[#93a316] hover:border-[#7f8e13]', icon: CheckCircle2 },
  not_assigned: { className: 'bg-gray-400 text-white hover:bg-gray-500 border-gray-400 hover:border-gray-500', icon: FileText },
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
      className={cn(config.className, 'gap-1.5 font-medium rounded-full px-4 transition-colors duration-200 cursor-default', className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {status}
    </Badge>
  );
};

export default ProposalStatusBadge;
