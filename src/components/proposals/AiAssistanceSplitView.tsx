import React from "react";
import { useQuery } from "@tanstack/react-query";
import { metadataApi, type MetadataResponse } from "@/lib/proposalsApi";
import { Loader2, Sparkles, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Proposal } from "@/types";

interface AiAssistanceSplitViewProps {
  proposal: Proposal;
  ticketNumber: string;
}

interface FieldDef {
  label: string;
  left: string | null | undefined;
  right: string | null | undefined;
}

const FieldRow: React.FC<{ field: FieldDef; index: number }> = ({ field, index }) => {
  const hasLeft = !!field.left;
  const hasRight = !!field.right;
  if (!hasLeft && !hasRight) return null;

  return (
    <div className={`py-5 ${index > 0 ? "border-t border-border" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3d5a47]" />
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
          {field.label}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Original */}
        <div className="rounded-lg border border-border bg-muted/20 p-4 relative">
          {hasLeft ? (
            <p className="text-sm leading-relaxed whitespace-pre-line break-words text-foreground">
              {field.left}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">Not available in proposal</p>
          )}
        </div>
        {/* AI Generated */}
        <div className="rounded-lg border border-[#3d5a47]/20 bg-[#3d5a47]/[0.03] p-4 relative">
          {hasRight ? (
            <p className="text-sm leading-relaxed whitespace-pre-line break-words text-foreground">
              {field.right}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">Not yet generated</p>
          )}
        </div>
      </div>
    </div>
  );
};

const AiAssistanceSplitView: React.FC<AiAssistanceSplitViewProps> = ({ proposal, ticketNumber }) => {
  const { data: metadata, isLoading, error } = useQuery<MetadataResponse | null>({
    queryKey: ["ai-assistance-metadata", ticketNumber],
    queryFn: () => metadataApi.get(ticketNumber),
    enabled: !!ticketNumber,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="h-10 w-10 rounded-full bg-[#3d5a47]/10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#3d5a47]" />
        </div>
        <p className="text-sm text-muted-foreground">Loading AI metadata…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-sm text-destructive font-medium">Failed to load metadata</p>
        <p className="text-xs text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  const md = metadata?.metadata;
  const mdAny = md as Record<string, any> | undefined;

  const fields: FieldDef[] = [
    { label: "Display Bios", left: proposal.biography, right: md?.display_bios },
    { label: "Book Description", left: proposal.short_description, right: md?.book_description },
    { label: "Short Description", left: proposal.short_description, right: mdAny?.short_description },
    { label: "Keywords", left: proposal.keywords, right: md?.keywords },
    { label: "Website Classification", left: null, right: md?.website_classification },
    { label: "BIC", left: null, right: md?.bic },
    { label: "BISAC", left: null, right: mdAny?.bisac },
    { label: "Thema", left: null, right: mdAny?.thema },
  ];

  const visibleFields = fields.filter((f) => !!f.left || !!f.right);

  return (
    <div className="space-y-0">

      {/* Column Headers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-5 pb-2 sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Original Proposal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#3d5a47]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5a47]">
            AI-Generated
          </p>
        </div>
      </div>

      {/* Field Rows */}
      {visibleFields.length > 0 ? (
        <div>
          {visibleFields.map((field, i) => (
            <FieldRow key={field.label} field={field} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-muted-foreground">No metadata available for comparison yet.</p>
        </div>
      )}
    </div>
  );
};

export default AiAssistanceSplitView;
