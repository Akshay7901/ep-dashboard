import React from "react";
import { useQuery } from "@tanstack/react-query";
import { metadataApi, type MetadataResponse } from "@/lib/proposalsApi";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Proposal } from "@/types";
import { extractCountry } from "@/lib/extractCountry";

interface AiAssistanceSplitViewProps {
  proposal: Proposal;
  ticketNumber: string;
}

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1.5 min-w-0">
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}:</span>
      <span className="text-xs font-medium flex-1 min-w-0 break-words">{value}</span>
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Original Proposal Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Original Proposal</h3>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Book Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <DetailRow label="Title" value={proposal.name} />
            <DetailRow label="Subtitle" value={proposal.sub_title} />
            <DetailRow label="Book Type" value={proposal.book_type} />
            <DetailRow label="Word Count" value={proposal.word_count} />
            <DetailRow label="Expected Completion" value={proposal.expected_completion_date} />
            <DetailRow label="Keywords" value={proposal.keywords} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Author Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <DetailRow label="Author" value={proposal.corresponding_author_name || proposal.author_name} />
            <DetailRow label="Email" value={proposal.author_email} />
            <DetailRow label="Institution" value={proposal.institution} />
            <DetailRow label="Job Title" value={proposal.job_title} />
            <DetailRow label="Country" value={extractCountry(proposal.address)} />
          </CardContent>
        </Card>

        {proposal.short_description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Blurb</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {proposal.short_description}
              </p>
            </CardContent>
          </Card>
        )}

        {proposal.table_of_contents && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Table of Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {proposal.table_of_contents}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* RIGHT: Metadata from API */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">AI-Generated Metadata</h3>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading metadata...</span>
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-destructive">Failed to load metadata</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && !metadata && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No metadata available for this proposal yet.</p>
            </CardContent>
          </Card>
        )}

        {metadata && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">AI-Generated Data</CardTitle>
                  <Badge variant="outline" className="text-xs capitalize">
                    {metadata.metadata_status || "draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {metadata.metadata?.display_bios && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Display Bios</p>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{metadata.metadata.display_bios}</p>
                  </div>
                )}
                {metadata.metadata?.book_description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Book Description</p>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{metadata.metadata.book_description}</p>
                  </div>
                )}
                <DetailRow label="Short Description" value={(metadata.metadata as any)?.short_description} />
                <DetailRow label="Keywords" value={metadata.metadata?.keywords} />
                <DetailRow label="Website Classification" value={metadata.metadata?.website_classification} />
                <DetailRow label="BIC" value={metadata.metadata?.bic} />
                <DetailRow label="BISAC" value={(metadata.metadata as any)?.bisac} />
                <DetailRow label="Thema" value={(metadata.metadata as any)?.thema} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AiAssistanceSplitView;
