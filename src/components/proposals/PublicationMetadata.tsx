import React from "react";
import { extractCountry } from "@/lib/extractCountry";
import type { Proposal } from "@/types";

interface PublicationMetadataProps {
  proposal: Proposal;
}

const MetadataRow: React.FC<{ label: string; sublabel?: string; value?: string | null }> = ({ label, sublabel, value }) => (
  <div className="grid grid-cols-[200px_1fr] border-b border-border">
    <div className="py-3 px-4 text-sm font-medium text-muted-foreground bg-muted/30">
      {label}
      {sublabel && <span className="block text-xs font-normal text-muted-foreground/60">{sublabel}</span>}
    </div>
    <div className="py-3 px-4 text-sm text-foreground whitespace-pre-line">
      {value || "—"}
    </div>
  </div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-[#3d5a47] text-white py-2.5 px-4">
    <p className="text-sm font-semibold uppercase tracking-wide">{title}</p>
  </div>
);

const PublicationMetadata: React.FC<PublicationMetadataProps> = ({ proposal }) => {
  const country = extractCountry(proposal.address) || proposal.country || "";

  // Try to split author name into first/last
  const fullName = proposal.corresponding_author_name || proposal.author_name || "";
  const nameParts = fullName.trim().split(/\s+/);
  // Detect title prefix (Dr., Prof., Mr., Mrs., Ms.)
  const titlePrefixes = ["dr.", "prof.", "mr.", "mrs.", "ms.", "dr", "prof"];
  let titlePrefix = "";
  let firstNameParts = [...nameParts];
  if (nameParts.length > 1 && titlePrefixes.includes(nameParts[0].toLowerCase())) {
    titlePrefix = nameParts[0];
    firstNameParts = nameParts.slice(1);
  }
  const lastName = firstNameParts.length > 1 ? firstNameParts.pop() || "" : "";
  const firstName = firstNameParts.join(" ");

  return (
    <div className="space-y-0 border border-border rounded-lg overflow-hidden">
      {/* Publication Metadata header */}
      <SectionHeader title="Publication Metadata" />

      <MetadataRow label="DB Number" value={proposal.ticket_number} />
      <MetadataRow
        label="Title Full"
        value={
          [proposal.name, proposal.sub_title].filter(Boolean).join(": ") || proposal.name
        }
      />
      <MetadataRow label="Title" value={proposal.name} />
      <MetadataRow label="Subtitle" value={proposal.sub_title} />
      <MetadataRow label="Category Auth/Ed" value={proposal.book_type || "Author"} />

      {/* Primary Author/Editor */}
      <SectionHeader title="Primary Author/Editor" />

      <MetadataRow label="Display Name(s)" value={fullName} />
      <MetadataRow label="Display bio(s)" value={proposal.biography} />
      <MetadataRow label="Title" value={titlePrefix || "—"} />
      <MetadataRow label="First name" value={firstName} />
      <MetadataRow label="Last name" value={lastName} />
      <MetadataRow label="Email" value={proposal.author_email} />
      <MetadataRow label="Email 2" value={proposal.secondary_email} />
      <MetadataRow label="Institution" value={proposal.institution} />
      <MetadataRow label="Country" value={country} />

      {/* Book Information */}
      <SectionHeader title="Book Information" />

      <MetadataRow label="Book description" sublabel="(max 2000 characters)" value={proposal.short_description} />
      <MetadataRow label="Keywords/Tags" value={proposal.keywords} />
      <MetadataRow label="Website Classification" value={(proposal as any).website_classification} />
      <MetadataRow label="BIC" value={(proposal as any).bic} />

      {/* Publication Timeline */}
      <SectionHeader title="Publication Timeline" />

      <MetadataRow label="Submission date" value={proposal.submitted_date || (proposal.created_at ? new Date(proposal.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null)} />
      <MetadataRow label="Publication date" value={proposal.expected_completion_date} />
      <MetadataRow label="Word Count" value={proposal.word_count} />
      <MetadataRow label="Figures/Tables" value={proposal.figures_tables_count} />
      <MetadataRow label="Under Review Elsewhere" value={proposal.under_review_elsewhere} />
      <MetadataRow label="Co-Authors / Editors" value={proposal.co_authors_editors} />
    </div>
  );
};

export default PublicationMetadata;
