import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TruncatedCellProps {
  text: string;
  maxLines?: number;
  className?: string;
}

const TruncatedCell: React.FC<TruncatedCellProps> = ({ text, maxLines = 2, className = "" }) => {
  const clampClass = maxLines === 1 ? "truncate" : `line-clamp-${maxLines}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${clampClass} cursor-pointer block ${className}`}>{text}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm text-sm">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TruncatedCell;
