import React, { useState } from "react";
import { CheckCircle2, Plus, Trash2, Upload, ImageIcon } from "lucide-react";
import { extractCountry } from "@/lib/extractCountry";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Proposal } from "@/types";

interface AuthorPublicationMetadataProps {
  proposal: Proposal;
  contractSigned?: boolean;
}

/* ---- Read-only row ---- */
const ReadOnlyRow: React.FC<{ label: string; sublabel?: string; value?: string | null }> = ({
  label,
  sublabel,
  value,
}) => (
  <div className="grid grid-cols-[200px_1fr] border-b border-border">
    <div className="py-3 px-4 text-sm font-medium text-muted-foreground bg-muted/30">
      {label}
      {sublabel && (
        <span className="block text-xs font-normal text-muted-foreground/60">{sublabel}</span>
      )}
    </div>
    <div className="py-3 px-4 text-sm text-foreground bg-muted/20 whitespace-pre-line">
      {value || "—"}
    </div>
  </div>
);

/* ---- Editable row ---- */
interface EditableRowProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: "text" | "email" | "textarea";
  helpText?: string;
}

const EditableRow: React.FC<EditableRowProps> = ({
  label,
  sublabel,
  value,
  onChange,
  disabled,
  type = "text",
  helpText,
}) => (
  <div className="grid grid-cols-[200px_1fr] border-b border-border">
    <div className="py-3 px-4 text-sm font-medium text-muted-foreground bg-muted/30">
      {label}
      {sublabel && (
        <span className="block text-xs font-normal text-muted-foreground/60">{sublabel}</span>
      )}
    </div>
    <div className="py-2 px-4 flex flex-col gap-1">
      {type === "textarea" ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`resize-none ${disabled ? "bg-muted/40 text-muted-foreground cursor-not-allowed" : ""}`}
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
      {helpText && <p className="text-xs text-muted-foreground/70 italic">{helpText}</p>}
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

interface ChangeRequestField {
  field: string;
  newValue: string;
}

const AuthorPublicationMetadata: React.FC<AuthorPublicationMetadataProps> = ({
  proposal,
  contractSigned,
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
  const titleFull = [proposal.name, proposal.sub_title].filter(Boolean).join(": ") || proposal.name;

  // Editable fields (author section)
  const [displayName, setDisplayName] = useState(fullName);
  const [displayBio, setDisplayBio] = useState(proposal.biography || "");
  const [salutation, setSalutation] = useState(detectedTitle || "");
  const [firstName, setFirstName] = useState(detectedFirst);
  const [lastName, setLastName] = useState(detectedLast);
  const [email, setEmail] = useState(proposal.author_email || "");
  const [email2, setEmail2] = useState(proposal.secondary_email || "");
  const [institution, setInstitution] = useState(proposal.institution || "");
  const [countryVal, setCountryVal] = useState(country);
  const [pubDate, setPubDate] = useState(proposal.expected_completion_date || "");

  // Cover image
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [coverImageSource, setCoverImageSource] = useState("");
  const [coverImagePermission, setCoverImagePermission] = useState(false);

  // Additional authors/editors
  const [additionalPeople, setAdditionalPeople] = useState<AdditionalPerson[]>([]);

  // Change request comments
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestField[]>([
    { field: "", newValue: "" },
  ]);

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

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addChangeRequestRow = () => {
    setChangeRequests((prev) => [...prev, { field: "", newValue: "" }]);
  };

  const updateChangeRequest = (idx: number, key: keyof ChangeRequestField, value: string) => {
    setChangeRequests((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    );
  };

  const removeChangeRequest = (idx: number) => {
    setChangeRequests((prev) => prev.filter((_, i) => i !== idx));
  };

  const hasCoverImage = !!coverImageFile;

  const sectionLabel = isAuthorType ? "Primary Author(s)" : "Primary Editor(s)";
  const addButtonLabel = isAuthorType ? "Add Another Author" : "Add Another Editor";

  const FIELD_OPTIONS = [
    "Title",
    "Subtitle",
    "Category Auth/Ed",
    "Display Name(s)",
    "Display bio(s)",
    "Salutation",
    "First name",
    "Last name",
    "Email",
    "Email 2",
    "Institution",
    "Country",
    "Book description",
    "Keywords/Tags",
    "Website Classification",
    "BIC",
    "Publication date",
    "Word Count",
    "Figures/Tables",
    "Under Review Elsewhere",
    "Co-Authors / Editors",
  ];

  const handleSubmitChangeRequests = () => {
    const validRequests = changeRequests.filter((r) => r.field && r.newValue.trim());
    if (validRequests.length === 0) {
      toast({ title: "No changes", description: "Please specify at least one field and its new value." });
      return;
    }
    toast({ title: "Request submitted", description: "Your change request has been sent to the reviewer." });
    setRequestingChanges(false);
    setChangeRequests([{ field: "", newValue: "" }]);
  };

  const handleFinalise = () => {
    if (hasCoverImage) {
      toast({
        title: "Metadata finalised",
        description: "Your metadata and cover image have been submitted and locked.",
      });
    } else {
      toast({
        title: "Metadata finalised",
        description: "Your metadata has been submitted and locked. No cover image was provided — the publisher will use a default cover.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {contractSigned && (
        <Badge className="bg-emerald-600 text-white gap-1.5 px-3 py-1 text-xs rounded-full hover:bg-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Contract Signed
        </Badge>
      )}

      <div className="space-y-0 border border-border rounded-lg overflow-hidden">
        {/* Publication Metadata — READ ONLY */}
        <SectionHeader title="Publication Metadata" />

        <ReadOnlyRow label="Title Full" value={titleFull} />
        <ReadOnlyRow label="Title" value={proposal.name} />
        <ReadOnlyRow label="Subtitle" value={proposal.sub_title} />
        <ReadOnlyRow label="Category Auth/Ed" value={proposal.book_type || "Author"} />

        {/* Cover Image */}
        <SectionHeader title="Cover Image" />

        <div className="p-4 space-y-4 border-b border-border">
          <p className="text-sm text-muted-foreground">
            Upload a cover image for your publication. If you do not provide one, the publisher will use a default cover.
            The image should be high resolution (minimum 300 DPI) and in JPEG or PNG format. Recommended dimensions are
            6" × 9" (1800 × 2700 pixels).
          </p>

          <div className="flex items-start gap-4">
            {coverImagePreview ? (
              <div className="relative w-32 h-44 rounded-md overflow-hidden border border-border">
                <img src={coverImagePreview} alt="Cover preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-32 h-44 rounded-md border-2 border-dashed border-border bg-muted/20">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground mt-1">No image</span>
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="cover-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <span>
                      <Upload className="h-3.5 w-3.5" />
                      {coverImageFile ? "Replace Image" : "Upload Image"}
                    </span>
                  </Button>
                </Label>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleCoverImageChange}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cover-source" className="text-xs text-muted-foreground">
                  Image Source / Credit
                </Label>
                <Input
                  id="cover-source"
                  placeholder="e.g. Shutterstock, original artwork, author photo..."
                  value={coverImageSource}
                  onChange={(e) => setCoverImageSource(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="cover-permission"
                  checked={coverImagePermission}
                  onCheckedChange={(checked) => setCoverImagePermission(checked === true)}
                />
                <Label htmlFor="cover-permission" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                  I confirm that I hold the necessary rights and permissions to use this image for publication purposes.
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Author(s) / Primary Editor(s) — EDITABLE */}
        <SectionHeader title={sectionLabel} />

        <EditableRow
          label="Display Name(s)"
          value={displayName}
          onChange={setDisplayName}
          helpText="This is the name that will appear on the publication."
        />
        <EditableRow label="Display bio(s)" value={displayBio} onChange={setDisplayBio} type="textarea" />
        <EditableRow label="Salutation" value={salutation} onChange={setSalutation} />
        <EditableRow label="First name" value={firstName} onChange={setFirstName} />
        <EditableRow label="Last name" value={lastName} onChange={setLastName} />
        <EditableRow label="Email" value={email} onChange={setEmail} type="email" />
        <EditableRow label="Email 2" value={email2} onChange={setEmail2} type="email" />
        <EditableRow
          label="Institution"
          value={institution}
          onChange={setInstitution}
          helpText="Your current affiliated institution or organisation."
        />
        <EditableRow
          label="Country"
          value={countryVal}
          onChange={setCountryVal}
          helpText="Country of primary residence or institutional affiliation."
        />

        {/* Additional authors/editors */}
        {additionalPeople.map((person, idx) => (
          <React.Fragment key={person.id}>
            <div className="bg-muted/50 py-2 px-4 flex items-center justify-between border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Additional {isAuthorType ? "Author" : "Editor"} {idx + 1}
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
            <EditableRow
              label="Salutation"
              value={person.salutation}
              onChange={(v) => updatePerson(person.id, "salutation", v)}
            />
            <EditableRow
              label="First name"
              value={person.firstName}
              onChange={(v) => updatePerson(person.id, "firstName", v)}
            />
            <EditableRow
              label="Last name"
              value={person.lastName}
              onChange={(v) => updatePerson(person.id, "lastName", v)}
            />
            <EditableRow
              label="Email"
              value={person.email}
              onChange={(v) => updatePerson(person.id, "email", v)}
              type="email"
            />
          </React.Fragment>
        ))}

        <div className="px-4 py-3 border-b border-border">
          <Button variant="outline" size="sm" onClick={addPerson} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {addButtonLabel}
          </Button>
        </div>

        {/* Book Information — READ ONLY */}
        <SectionHeader title="Book Information" />

        <ReadOnlyRow label="Book description" sublabel="(max 2000 characters)" value={proposal.short_description} />
        <ReadOnlyRow label="Keywords/Tags" value={proposal.keywords} />
        <ReadOnlyRow label="Website Classification" value={(proposal as any).website_classification} />
        <ReadOnlyRow label="BIC" value={(proposal as any).bic} />

      </div>

      {/* Change Requests Section */}
      {requestingChanges ? (
        <div className="space-y-4 border border-border rounded-lg p-4">
          <div>
            <h4 className="text-sm font-semibold mb-1">Request Changes</h4>
            <p className="text-xs text-muted-foreground">
              Select the field you want to change and provide the new content. You can request changes to multiple fields.
            </p>
          </div>

          <div className="space-y-3">
            {changeRequests.map((req, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-48 shrink-0">
                  <Select value={req.field} onValueChange={(v) => updateChangeRequest(idx, "field", v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Textarea
                    placeholder="Enter the new content for this field..."
                    value={req.newValue}
                    onChange={(e) => updateChangeRequest(idx, "newValue", e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
                {changeRequests.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive shrink-0"
                    onClick={() => removeChangeRequest(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addChangeRequestRow} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Another Change
          </Button>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="px-8"
              onClick={() => {
                setRequestingChanges(false);
                setChangeRequests([{ field: "", newValue: "" }]);
              }}
            >
              Back
            </Button>
            <Button
              className="bg-[#2f4b40] hover:opacity-90 text-white px-6"
              onClick={handleSubmitChangeRequests}
            >
              Submit request
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" className="px-8" onClick={() => setRequestingChanges(true)}>
            Request changes
          </Button>
          <Button
            className="bg-[#2f4b40] hover:opacity-90 text-white px-6"
            onClick={handleFinalise}
          >
            Finalise &amp; Lock Metadata
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuthorPublicationMetadata;
