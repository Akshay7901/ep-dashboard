import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ProposalDetailsSidebar({ proposal }: { proposal: any }) {
  return (
    <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>At a Glance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Ticket" value={proposal.ticket_number} />
            <InfoRow label="Revision" value={proposal.current_revision} />
            <InfoRow label="Status" value={proposal.status} />
            <InfoRow label="Value" value={proposal.value} />
            <InfoRow label="Expected Completion" value={proposal.expected_completion_date} />
            <InfoRow label="Figures/Tables" value={proposal.figures_tables_count} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Author</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Name" value={proposal.corresponding_author_name ?? proposal.author_name} />
            <InfoRow label="Email" value={proposal.author_email} />
            <InfoRow label="Secondary Email" value={proposal.secondary_email} />
            <InfoRow label="Phone" value={proposal.author_phone} />
            <InfoRow label="Institution" value={proposal.institution} />
            <InfoRow label="Job Title" value={proposal.job_title} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission Checklist</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="CV Submitted" value={proposal.cv_submitted} />
            <InfoRow label="Sample Chapter" value={proposal.sample_chapter_submitted} />
            <InfoRow label="ToC Submitted" value={proposal.toc_submitted} />
            <InfoRow label="Permissions Required" value={proposal.permissions_required} />
            <InfoRow label="Permissions Docs" value={proposal.permissions_docs_submitted} />
            <InfoRow label="Under Review Elsewhere" value={proposal.under_review_elsewhere} />
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
