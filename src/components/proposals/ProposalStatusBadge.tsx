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
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
    icon: FileText,
  },
  under_review: {
    label: 'Under Review',
    variant: 'secondary',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    variant: 'secondary',
    className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200',
    icon: CheckCircle2,
  },
  finalised: {
    label: 'Finalised',
    variant: 'secondary',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200',
    icon: FileCheck,
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200',
    icon: XCircle,
  },
  locked: {
    label: 'Locked',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200',
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
