import React, { useState, useEffect } from "react";
import { CheckCircle2, Plus, Trash2, Loader2 } from "lucide-react";
import { extractCountry } from "@/lib/extractCountry";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { metadataApi, metadataQueriesApi, type ProposalMetadata, type MetadataAuthor, type MetadataQuery } from "@/lib/proposalsApi";
import type { Proposal } from "@/types";

interface PublicationMetadataProps {
  proposal: Proposal;
  contractSigned?: boolean;
  authorChanges?: Record<string, { old: string; new: string }>;
  ticketNumber: string;
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
  ticketNumber,
}) => {
  const queryClient = useQueryClient();

  // Fetch metadata from API
  const { data: metadataResponse, isLoading } = useQuery({
    queryKey: ["metadata", ticketNumber],
    queryFn: () => metadataApi.get(ticketNumber),
    enabled: !!ticketNumber,
  });

  // Fetch metadata queries
  const { data: metadataQueries = [] } = useQuery({
    queryKey: ["metadata-queries", ticketNumber],
    queryFn: () => metadataQueriesApi.list(ticketNumber),
    enabled: !!ticketNumber,
  });

  const apiMeta = metadataResponse?.metadata;
  const metadataStatus = metadataResponse?.metadata_status;
  const isSentToAuthor = metadataStatus === "sent_to_author";
  // Fallback values from proposal
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

  const primaryAuthor = apiMeta?.authors?.[0];

  // Editable form state - prefer API data, fallback to proposal
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [categoryAuthEd, setCategoryAuthEd] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayBio, setDisplayBio] = useState("");
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");
  const [institution, setInstitution] = useState("");
  const [countryVal, setCountryVal] = useState("");
  const [bookDesc, setBookDesc] = useState("");
  const [keywords, setKeywords] = useState("");

  // Additional authors/editors
  const [additionalPeople, setAdditionalPeople] = useState<AdditionalPerson[]>([]);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [respondingLoading, setRespondingLoading] = useState(false);

  // Populate form when API data loads
  useEffect(() => {
    if (apiMeta) {
      setTitle(apiMeta.title || proposal.name || "");
      setSubtitle(apiMeta.subtitle || proposal.sub_title || "");
      setCategoryAuthEd(apiMeta.category || proposal.book_type || "Author");
      setDisplayName(apiMeta.display_names || fullName);
      setDisplayBio(apiMeta.display_bios || proposal.biography || "");
      setSalutation(primaryAuthor?.title || detectedTitle || "");
      setFirstName(primaryAuthor?.first_name || detectedFirst);
      setLastName(primaryAuthor?.last_name || detectedLast);
      setEmail(primaryAuthor?.email || proposal.author_email || "");
      setEmail2(primaryAuthor?.email_2 || proposal.secondary_email || "");
      setInstitution(primaryAuthor?.institution || proposal.institution || "");
      setCountryVal(primaryAuthor?.country || country);
      setBookDesc(apiMeta.book_description || proposal.short_description || "");
      setKeywords(apiMeta.keywords || proposal.keywords || "");

      // Load additional authors (skip first which is primary)
      if (apiMeta.authors && apiMeta.authors.length > 1) {
        setAdditionalPeople(
          apiMeta.authors.slice(1).map((a) => ({
            id: crypto.randomUUID(),
            salutation: a.title || "",
            firstName: a.first_name || "",
            lastName: a.last_name || "",
            email: a.email || "",
          }))
        );
      }
    } else if (!isLoading) {
      // No API data yet, use proposal fallbacks
      setTitle(proposal.name || "");
      setSubtitle(proposal.sub_title || "");
      setCategoryAuthEd(proposal.book_type || "Author");
      setDisplayName(fullName);
      setDisplayBio(proposal.biography || "");
      setSalutation(detectedTitle || "");
      setFirstName(detectedFirst);
      setLastName(detectedLast);
      setEmail(proposal.author_email || "");
      setEmail2(proposal.secondary_email || "");
      setInstitution(proposal.institution || "");
      setCountryVal(country);
      setBookDesc(proposal.short_description || "");
      setKeywords(proposal.keywords || "");
    }
  }, [apiMeta, isLoading]);

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

  // Build payload for API
  const buildPayload = (): Partial<ProposalMetadata> => {
    const authors: MetadataAuthor[] = [
      {
        title: salutation,
        first_name: firstName,
        last_name: lastName,
        email,
        email_2: email2,
        institution,
        country: countryVal,
      },
      ...additionalPeople.map((p) => ({
        title: p.salutation,
        first_name: p.firstName,
        last_name: p.lastName,
        email: p.email,
      })),
    ];

    return {
      title,
      subtitle,
      full_title: titleFull,
      category: categoryAuthEd,
      display_names: displayName,
      display_bios: displayBio,
      authors,
      book_description: bookDesc,
      keywords,
    };
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await metadataApi.update(ticketNumber, { ...buildPayload(), notes: "Draft saved" });
      queryClient.invalidateQueries({ queryKey: ["metadata", ticketNumber] });
      toast({ title: "Metadata saved", description: "Your changes have been saved." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || "Could not save metadata.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToAuthor = async () => {
    setSubmitting(true);
    try {
      // First save the current draft
      await metadataApi.update(ticketNumber, { ...buildPayload(), notes: "Submitted to author for finalization" });
      // Then send to author via the dedicated endpoint
      await metadataApi.send(ticketNumber);
      queryClient.invalidateQueries({ queryKey: ["metadata", ticketNumber] });
      toast({ title: "Sent to Author", description: "Metadata has been sent to the author for approval." });
    } catch (err: any) {
      toast({ title: "Submit failed", description: err?.message || "Could not send metadata to author.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading metadata...</span>
      </div>
    );
  }

  const sectionLabel = "Primary Author(s)";
  const addButtonLabel = "Add an author or editor";

   return (
    <div className="space-y-4">

      {isSentToAuthor && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
          Metadata has been sent to the author for approval. Editing is disabled until the author responds or you need to make changes.
        </div>
      )}

      <div className="space-y-0 border border-border rounded-lg overflow-hidden">
        {/* Publication Metadata header */}
        <SectionHeader title="Publication Metadata" />

        {/* Title Full - non-editable, greyed out */}
        <EditableRow label="Title Full" value={titleFull} onChange={() => {}} disabled authorChange={authorChanges["title_full"] || null} />

        <EditableRow label="Title" value={title} onChange={setTitle} disabled={isSentToAuthor} authorChange={authorChanges["title"] || null} />
        <EditableRow label="Subtitle" value={subtitle} onChange={setSubtitle} disabled={isSentToAuthor} authorChange={authorChanges["subtitle"] || null} />
        <EditableRow label="Category Auth/Ed" value={categoryAuthEd} onChange={setCategoryAuthEd} disabled={isSentToAuthor} authorChange={authorChanges["category"] || null} />

        {/* Primary Author(s) */}
        <SectionHeader title={sectionLabel} />

        <EditableRow label="Display Name(s)" value={displayName} onChange={setDisplayName} disabled={isSentToAuthor} authorChange={authorChanges["display_name"] || null} />
        <EditableRow label="Display bio(s)" value={displayBio} onChange={setDisplayBio} type="textarea" disabled={isSentToAuthor} authorChange={authorChanges["display_bio"] || null} />
        <EditableRow label="Salutation" value={salutation} onChange={setSalutation} disabled={isSentToAuthor} authorChange={authorChanges["salutation"] || null} />
        <EditableRow label="First name" value={firstName} onChange={setFirstName} disabled={isSentToAuthor} authorChange={authorChanges["first_name"] || null} />
        <EditableRow label="Last name" value={lastName} onChange={setLastName} disabled={isSentToAuthor} authorChange={authorChanges["last_name"] || null} />
        <EditableRow label="Email" value={email} onChange={setEmail} type="email" disabled={isSentToAuthor} authorChange={authorChanges["email"] || null} />
        <EditableRow label="Email 2" value={email2} onChange={setEmail2} type="email" disabled={isSentToAuthor} authorChange={authorChanges["email_2"] || null} />
        <EditableRow label="Institution" value={institution} onChange={setInstitution} disabled={isSentToAuthor} authorChange={authorChanges["institution"] || null} />
        <EditableRow label="Country" value={countryVal} onChange={setCountryVal} disabled={isSentToAuthor} authorChange={authorChanges["country"] || null} />

        {/* Additional authors/editors */}
        {additionalPeople.map((person, idx) => (
          <React.Fragment key={person.id}>
            <div className="bg-muted/50 py-2 px-4 flex items-center justify-between border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Additional Author {idx + 1}
              </p>
              {!isSentToAuthor && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removePerson(person.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <EditableRow label="Salutation" value={person.salutation} onChange={(v) => updatePerson(person.id, "salutation", v)} disabled={isSentToAuthor} />
            <EditableRow label="First name" value={person.firstName} onChange={(v) => updatePerson(person.id, "firstName", v)} disabled={isSentToAuthor} />
            <EditableRow label="Last name" value={person.lastName} onChange={(v) => updatePerson(person.id, "lastName", v)} disabled={isSentToAuthor} />
            <EditableRow label="Email" value={person.email} onChange={(v) => updatePerson(person.id, "email", v)} type="email" disabled={isSentToAuthor} />
          </React.Fragment>
        ))}

        {!isSentToAuthor && (
          <div className="px-4 py-3 border-b border-border">
            <Button variant="outline" size="sm" onClick={addPerson} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {addButtonLabel}
            </Button>
          </div>
        )}

        {/* Book Information */}
        <SectionHeader title="Book Information" />

        <EditableRow label="Book description" sublabel="(max 2000 characters)" value={bookDesc} onChange={setBookDesc} type="textarea" disabled={isSentToAuthor} authorChange={authorChanges["book_description"] || null} />
        <EditableRow label="Keywords/Tags" value={keywords} onChange={setKeywords} disabled={isSentToAuthor} authorChange={authorChanges["keywords"] || null} />

      </div>

      {/* Metadata Queries */}
      {metadataQueries.length > 0 && (
        <div className="space-y-3 border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold">Queries from Author</h4>
          <div className="space-y-2">
            {metadataQueries.map((q) => (
              <div key={q.id}>
                <div className={`rounded-md p-3 text-sm ${q.type === 'query' ? 'bg-muted/40 border border-border' : 'bg-emerald-50 border border-emerald-200 ml-4'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {q.raised_by_name || q.raised_by} ({q.raised_by_role})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-line">{q.text}</p>
                  {q.fields && q.fields.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {q.fields.map((f) => (
                        <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                {/* Respond button for queries (not responses) */}
                {q.type === 'query' && (
                  respondingTo === q.id ? (
                    <div className="ml-4 mt-2 space-y-2">
                      <Textarea
                        placeholder="Type your response..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={2}
                        className="resize-none text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setRespondingTo(null); setResponseText(""); }}>Cancel</Button>
                        <Button size="sm" className="bg-[#2f4b40] hover:opacity-90 text-white" disabled={respondingLoading || !responseText.trim()} onClick={async () => {
                          setRespondingLoading(true);
                          try {
                            await metadataQueriesApi.respond(ticketNumber, q.id, responseText);
                            queryClient.invalidateQueries({ queryKey: ["metadata-queries", ticketNumber] });
                            setRespondingTo(null);
                            setResponseText("");
                            toast({ title: "Response sent" });
                          } catch (err: any) {
                            toast({ title: "Failed", description: err?.message || "Could not send response.", variant: "destructive" });
                          } finally {
                            setRespondingLoading(false);
                          }
                        }}>
                          {respondingLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                          Send Response
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-4 mt-1">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setRespondingTo(q.id)}>Reply</Button>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isSentToAuthor && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            className="px-8"
            disabled={saving}
            onClick={handleSaveDraft}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Draft
          </Button>
          <Button
            className="bg-[#2f4b40] hover:opacity-90 text-white px-6"
            disabled={submitting}
            onClick={handleSubmitToAuthor}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit to Author for Finalization
          </Button>
        </div>
      )}
    </div>
  );
};

export default PublicationMetadata;
