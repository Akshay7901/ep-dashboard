import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ProposalStatus } from '@/types';
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
  status: ProposalStatus;
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<ProposalStatus, { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: React.ElementType;
}> = {
  submitted: {
    label: 'New',
    variant: 'secondary',
    className: 'bg-[#3d5a47] text-white hover:bg-[#3d5a47] border-[#3d5a47] rounded-full px-4',
    icon: FileText,
  },
  under_review: {
    label: 'In Review',
    variant: 'secondary',
    className: 'bg-[#4a7c6f] text-white hover:bg-[#4a7c6f] border-[#4a7c6f] rounded-full px-4',
    icon: Clock,
  },
  approved: {
    label: 'Contract Sent',
    variant: 'secondary',
    className: 'bg-[#2d3748] text-white hover:bg-[#2d3748] border-[#2d3748] rounded-full px-4',
    icon: CheckCircle2,
  },
  finalised: {
    label: 'Finalised',
    variant: 'secondary',
    className: 'bg-[#2d3748] text-white hover:bg-[#2d3748] border-[#2d3748] rounded-full px-4',
    icon: FileCheck,
  },
  rejected: {
    label: 'Declined',
    variant: 'destructive',
    className: 'bg-[#9b2c2c] text-white hover:bg-[#9b2c2c] border-[#9b2c2c] rounded-full px-4',
    icon: XCircle,
  },
  locked: {
    label: 'Locked',
    variant: 'secondary',
    className: 'bg-gray-600 text-white hover:bg-gray-600 border-gray-600 rounded-full px-4',
    icon: Lock,
  },
};

const ProposalStatusBadge: React.FC<ProposalStatusBadgeProps> = ({ 
  status, 
  showIcon = true,
  className 
}) => {
  const config = statusConfig[status] || statusConfig.submitted;
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, 'gap-1.5 font-medium', className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
};

export default ProposalStatusBadge;
