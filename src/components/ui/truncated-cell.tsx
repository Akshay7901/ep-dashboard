import React, { useRef, useState, useEffect, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TruncatedCellProps {
  text: string;
  maxLines?: number;
  className?: string;
}

const TruncatedCell: React.FC<TruncatedCellProps> = ({ text, maxLines = 2, className = "" }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // For single-line (truncate): scrollWidth > clientWidth
    // For multi-line (line-clamp): scrollHeight > clientHeight
    setIsTruncated(el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
  }, []);

  useEffect(() => {
    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [text, checkTruncation]);

  const clampClass = maxLines === 1 ? "truncate" : `line-clamp-${maxLines}`;
  const span = (
    <span ref={ref} className={`${clampClass} block ${className}`}>
      {text}
    </span>
  );

  if (!isTruncated) return span;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span ref={ref} className={`${clampClass} cursor-pointer block ${className}`}>
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm text-sm">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TruncatedCell;
