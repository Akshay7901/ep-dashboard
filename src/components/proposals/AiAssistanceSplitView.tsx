import React from "react";
import { useQuery } from "@tanstack/react-query";
import { metadataApi, type MetadataResponse } from "@/lib/proposalsApi";
import { Loader2 } from "lucide-react";
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

const FieldRow: React.FC<{ field: FieldDef }> = ({ field }) => {
  const hasLeft = !!field.left;
  const hasRight = !!field.right;
  if (!hasLeft && !hasRight) return null;

  return (
    <div className="border-b border-border last:border-b-0 py-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {field.label}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-muted/30 rounded-md p-3 min-h-[40px]">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Original</p>
          <p className="text-sm leading-relaxed whitespace-pre-line break-words">
            {hasLeft ? field.left : <span className="text-muted-foreground italic">—</span>}
          </p>
        </div>
        <div className="bg-primary/5 rounded-md p-3 min-h-[40px]">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">AI Generated</p>
          <p className="text-sm leading-relaxed whitespace-pre-line break-words">
            {hasRight ? field.right : <span className="text-muted-foreground italic">—</span>}
          </p>
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading metadata...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive text-center py-8">Failed to load metadata</p>;
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">AI Assistance — Comparison</h3>
        {metadata && (
          <Badge variant="outline" className="text-xs capitalize">
            {metadata.metadata_status || "draft"}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
        <p className="text-sm font-semibold text-foreground">Original Proposal</p>
        <p className="text-sm font-semibold text-foreground">AI-Generated Metadata</p>
      </div>
      <div>
        {fields.map((field) => (
          <FieldRow key={field.label} field={field} />
        ))}
      </div>
    </div>
  );
};

export default AiAssistanceSplitView;
