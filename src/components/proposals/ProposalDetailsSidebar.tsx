import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Primitive = string | number | boolean | null | undefined;

function formatValue(value: Primitive) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function InfoRow({ label, value, className }: { label: string; value?: Primitive; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-words">{formatValue(value)}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
      {children}
    </h4>
  );
}

export default function ProposalDetailsSidebar({ proposal }: { proposal: any }) {
  return (
    <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto">
      <div className="space-y-4">
        {/* Proposal Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Proposal Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Ticket" value={proposal.ticket_number} />
            <InfoRow label="Revision" value={proposal.current_revision} />
            <InfoRow label="Status" value={proposal.status} />
            
            <Separator className="my-2" />
            <SectionTitle>Book Details</SectionTitle>
            <InfoRow label="Sub Title" value={proposal.sub_title} />
            <InfoRow label="Book Type" value={proposal.book_type} />
            <InfoRow label="Word Count" value={proposal.word_count} />
            <InfoRow label="Figures/Tables Count" value={proposal.figures_tables_count} />
            <InfoRow label="Keywords" value={proposal.keywords} />
            <InfoRow label="Expected Completion" value={proposal.expected_completion_date} />
            <InfoRow label="Co-Authors/Editors" value={proposal.co_authors_editors} />
          </CardContent>
        </Card>

        {/* Author Info */}
        <Card>
          <CardHeader>
            <CardTitle>Author Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Name" value={proposal.corresponding_author_name ?? proposal.author_name} />
            <InfoRow label="Email" value={proposal.author_email} />
            {proposal.secondary_email && proposal.secondary_email !== proposal.author_email && (
              <InfoRow label="Secondary Email" value={proposal.secondary_email} />
            )}
            <InfoRow label="Phone" value={proposal.author_phone} />
            <InfoRow label="Job Title" value={proposal.job_title} />
            <InfoRow label="Institution" value={proposal.institution} />
            <InfoRow label="Address" value={proposal.address} />
          </CardContent>
        </Card>

        {/* Submission Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Submission Info</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Submitted Date" value={proposal.submitted_date} />
            <InfoRow label="Submitted Time" value={proposal.submitted_time} />
            <InfoRow label="Created At" value={proposal.created_at ? new Date(proposal.created_at).toLocaleDateString() : null} />
            <InfoRow label="Updated At" value={proposal.updated_at ? new Date(proposal.updated_at).toLocaleDateString() : null} />
            <InfoRow label="Referrer URL" value={proposal.referrer_url} />
          </CardContent>
        </Card>

        {/* Submission Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Submission Checklist</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="CV Submitted" value={proposal.cv_submitted} />
            <InfoRow label="Sample Chapter Submitted" value={proposal.sample_chapter_submitted} />
            <InfoRow label="ToC Submitted" value={proposal.toc_submitted} />
            <InfoRow label="Permissions Required" value={proposal.permissions_required} />
            <InfoRow label="Permissions Docs Submitted" value={proposal.permissions_docs_submitted} />
            <InfoRow label="Under Review Elsewhere" value={proposal.under_review_elsewhere} />
          </CardContent>
        </Card>

        {/* Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contract & Finalization</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Value" value={proposal.value} />
            <InfoRow label="Contract Sent" value={proposal.contract_sent} />
            <InfoRow label="Contract Sent At" value={proposal.contract_sent_at ? new Date(proposal.contract_sent_at).toLocaleDateString() : null} />
            <InfoRow label="Finalised At" value={proposal.finalised_at ? new Date(proposal.finalised_at).toLocaleDateString() : null} />
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
