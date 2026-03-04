import React, { useState, useEffect } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { extractCountry } from "@/lib/extractCountry";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/types";

interface PublicationMetadataProps {
  proposal: Proposal;
  contractSigned?: boolean;
  authorChanges?: Record<string, { old: string; new: string }>;
}

interface EditableRowProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  type?: "text" | "email" | "textarea";
  authorChange?: { old: string; new: string } | null;
}

const EditableRow: React.FC<EditableRowProps> = ({
  label,
  sublabel,
  value,
  onChange,
  disabled,
  type = "text",
  authorChange,
}) => (
  <div className="grid grid-cols-[200px_1fr] border-b border-border">
    <div className="py-3 px-4 text-sm font-medium text-muted-foreground bg-muted/30">
      {label}
      {sublabel && (
        <span className="block text-xs font-normal text-muted-foreground/60">
          {sublabel}
        </span>
      )}
    </div>
    <div className="py-2 px-4 flex flex-col gap-1">
      {authorChange && (
        <div className="text-sm mb-1">
          <span className="line-through text-foreground">{authorChange.old}</span>{" "}
          <span className="text-destructive font-medium">{authorChange.new}</span>
        </div>
      )}
      {type === "textarea" ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={disabled ? "bg-muted/40 text-muted-foreground cursor-not-allowed resize-none" : "resize-none"}
          rows={3}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={disabled ? "bg-muted/40 text-muted-foreground cursor-not-allowed" : ""}
        />
      )}
    </div>
  </div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-[#3d5a47] text-white py-2.5 px-4">
    <p className="text-sm font-semibold uppercase tracking-wide">{title}</p>
  </div>
);

interface AdditionalPerson {
  id: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
}

const PublicationMetadata: React.FC<PublicationMetadataProps> = ({
  proposal,
  contractSigned,
  authorChanges = {},
}) => {
  const country = extractCountry(proposal.address) || proposal.country || "";
  const fullName = proposal.corresponding_author_name || proposal.author_name || "";
  const nameParts = fullName.trim().split(/\s+/);
  const titlePrefixes = ["dr.", "prof.", "mr.", "mrs.", "ms.", "dr", "prof"];
  let detectedTitle = "";
  let firstNameParts = [...nameParts];
  if (nameParts.length > 1 && titlePrefixes.includes(nameParts[0].toLowerCase())) {
    detectedTitle = nameParts[0];
    firstNameParts = nameParts.slice(1);
  }
  const detectedLast = firstNameParts.length > 1 ? firstNameParts.pop() || "" : "";
  const detectedFirst = firstNameParts.join(" ");

  const isAuthorType = (proposal.book_type || "Author").toLowerCase().includes("author");

  // Editable form state
  const [title, setTitle] = useState(proposal.name || "");
  const [subtitle, setSubtitle] = useState(proposal.sub_title || "");
  const [categoryAuthEd, setCategoryAuthEd] = useState(proposal.book_type || "Author");
  const [displayName, setDisplayName] = useState(fullName);
  const [displayBio, setDisplayBio] = useState(proposal.biography || "");
  const [salutation, setSalutation] = useState(detectedTitle || "");
  const [firstName, setFirstName] = useState(detectedFirst);
  const [lastName, setLastName] = useState(detectedLast);
  const [email, setEmail] = useState(proposal.author_email || "");
  const [email2, setEmail2] = useState(proposal.secondary_email || "");
  const [institution, setInstitution] = useState(proposal.institution || "");
  const [countryVal, setCountryVal] = useState(country);
  const [bookDesc, setBookDesc] = useState(proposal.short_description || "");
  const [keywords, setKeywords] = useState(proposal.keywords || "");
  const [webClassification, setWebClassification] = useState((proposal as any).website_classification || "");
  const [bic, setBic] = useState((proposal as any).bic || "");
  const [submissionDate, setSubmissionDate] = useState(
    proposal.submitted_date ||
      (proposal.created_at
        ? new Date(proposal.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "")
  );
  const [pubDate, setPubDate] = useState(proposal.expected_completion_date || "");
  const [wordCount, setWordCount] = useState(proposal.word_count || "");
  const [figuresTables, setFiguresTables] = useState(proposal.figures_tables_count || "");
  const [underReview, setUnderReview] = useState(proposal.under_review_elsewhere || "");
  const [coAuthors, setCoAuthors] = useState(proposal.co_authors_editors || "");

  // Additional authors/editors
  const [additionalPeople, setAdditionalPeople] = useState<AdditionalPerson[]>([]);

  const addPerson = () => {
    setAdditionalPeople((prev) => [
      ...prev,
      { id: crypto.randomUUID(), salutation: "", firstName: "", lastName: "", email: "" },
    ]);
  };

  const removePerson = (id: string) => {
    setAdditionalPeople((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePerson = (id: string, field: keyof AdditionalPerson, value: string) => {
    setAdditionalPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Title Full auto-computed
  const titleFull = [title, subtitle].filter(Boolean).join(": ");

  const sectionLabel = "Primary Author(s)";
  const addButtonLabel = "Add an author or editor";

  return (
    <div className="space-y-4">
      {contractSigned && (
        <Badge className="bg-emerald-600 text-white gap-1.5 px-3 py-1 text-xs rounded-full hover:bg-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Contract Signed
        </Badge>
      )}

      <div className="space-y-0 border border-border rounded-lg overflow-hidden">
        {/* Publication Metadata header */}
        <SectionHeader title="Publication Metadata" />

        {/* Title Full - non-editable, greyed out */}
        <EditableRow label="Title Full" value={titleFull} onChange={() => {}} disabled authorChange={authorChanges["title_full"] || null} />

        <EditableRow label="Title" value={title} onChange={setTitle} authorChange={authorChanges["title"] || null} />
        <EditableRow label="Subtitle" value={subtitle} onChange={setSubtitle} authorChange={authorChanges["subtitle"] || null} />
        <EditableRow label="Category Auth/Ed" value={categoryAuthEd} onChange={setCategoryAuthEd} authorChange={authorChanges["category"] || null} />

        {/* Primary Author(s) / Primary Editor(s) */}
        <SectionHeader title={sectionLabel} />

        <EditableRow label="Display Name(s)" value={displayName} onChange={setDisplayName} authorChange={authorChanges["display_name"] || null} />
        <EditableRow label="Display bio(s)" value={displayBio} onChange={setDisplayBio} type="textarea" authorChange={authorChanges["display_bio"] || null} />
        <EditableRow label="Salutation" value={salutation} onChange={setSalutation} authorChange={authorChanges["salutation"] || null} />
        <EditableRow label="First name" value={firstName} onChange={setFirstName} authorChange={authorChanges["first_name"] || null} />
        <EditableRow label="Last name" value={lastName} onChange={setLastName} authorChange={authorChanges["last_name"] || null} />
        <EditableRow label="Email" value={email} onChange={setEmail} type="email" authorChange={authorChanges["email"] || null} />
        <EditableRow label="Email 2" value={email2} onChange={setEmail2} type="email" authorChange={authorChanges["email_2"] || null} />
        <EditableRow label="Institution" value={institution} onChange={setInstitution} authorChange={authorChanges["institution"] || null} />
        <EditableRow label="Country" value={countryVal} onChange={setCountryVal} authorChange={authorChanges["country"] || null} />

        {/* Additional authors/editors */}
        {additionalPeople.map((person, idx) => (
          <React.Fragment key={person.id}>
            <div className="bg-muted/50 py-2 px-4 flex items-center justify-between border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Additional Author {idx + 1}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removePerson(person.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <EditableRow label="Salutation" value={person.salutation} onChange={(v) => updatePerson(person.id, "salutation", v)} />
            <EditableRow label="First name" value={person.firstName} onChange={(v) => updatePerson(person.id, "firstName", v)} />
            <EditableRow label="Last name" value={person.lastName} onChange={(v) => updatePerson(person.id, "lastName", v)} />
            <EditableRow label="Email" value={person.email} onChange={(v) => updatePerson(person.id, "email", v)} type="email" />
          </React.Fragment>
        ))}

        <div className="px-4 py-3 border-b border-border">
          <Button variant="outline" size="sm" onClick={addPerson} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {addButtonLabel}
          </Button>
        </div>

        {/* Book Information */}
        <SectionHeader title="Book Information" />

        <EditableRow label="Book description" sublabel="(max 2000 characters)" value={bookDesc} onChange={setBookDesc} type="textarea" authorChange={authorChanges["book_description"] || null} />
        <EditableRow label="Keywords/Tags" value={keywords} onChange={setKeywords} authorChange={authorChanges["keywords"] || null} />
        <EditableRow label="Website Classification" value={webClassification} onChange={setWebClassification} authorChange={authorChanges["website_classification"] || null} />
        <EditableRow label="BIC" value={bic} onChange={setBic} authorChange={authorChanges["bic"] || null} />

        {/* Publication Timeline */}
        <SectionHeader title="Publication Timeline" />

        <EditableRow label="Submission date" value={submissionDate} onChange={setSubmissionDate} authorChange={authorChanges["submission_date"] || null} />
        <EditableRow label="Publication date" value={pubDate} onChange={setPubDate} authorChange={authorChanges["publication_date"] || null} />
        <EditableRow label="Word Count" value={wordCount} onChange={setWordCount} authorChange={authorChanges["word_count"] || null} />
        <EditableRow label="Figures/Tables" value={figuresTables} onChange={setFiguresTables} authorChange={authorChanges["figures_tables"] || null} />
        <EditableRow label="Under Review Elsewhere" value={underReview} onChange={setUnderReview} authorChange={authorChanges["under_review"] || null} />
        <EditableRow label="Co-Authors / Editors" value={coAuthors} onChange={setCoAuthors} authorChange={authorChanges["co_authors"] || null} />
      </div>
    </div>
  );
};

export default PublicationMetadata;
