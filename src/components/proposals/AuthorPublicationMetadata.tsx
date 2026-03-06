import React, { useState, useEffect } from "react";
import { CheckCircle2, Plus, Trash2, Upload, ImageIcon, Loader2, Check, X, AlertCircle, FileImage } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { metadataApi, metadataQueriesApi, type MetadataQuery } from "@/lib/proposalsApi";
import type { Proposal } from "@/types";

interface AuthorPublicationMetadataProps {
  proposal: Proposal;
  contractSigned?: boolean;
  ticketNumber: string;
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
  ticketNumber,
}) => {
  const queryClient = useQueryClient();

  // Fetch metadata from API
  const { data: metadataResponse, isLoading: metadataLoading } = useQuery({
    queryKey: ["metadata", ticketNumber],
    queryFn: () => metadataApi.get(ticketNumber),
    enabled: !!ticketNumber,
  });

  // Fetch metadata queries
  const { data: metadataQueries = [] } = useQuery({
    queryKey: ["metadata-queries", ticketNumber],
    queryFn: () => metadataQueriesApi.list(ticketNumber),
    enabled: !!ticketNumber && !!metadataResponse,
  });

  const metadataStatus = metadataResponse?.metadata_status;
  const isApproved = metadataStatus === "approved";

  // Check if author has a pending (unanswered) query
  const hasPendingQuery = metadataQueries.some(
    (q) => q.type === 'query' && !metadataQueries.some((r) => r.type === 'response' && r.parent_query_id === q.id)
  );

  const apiMeta = metadataResponse?.metadata;
  const primaryAuthor = apiMeta?.authors?.[0];

  // Derive values from API, fallback to proposal
  const metaTitle = apiMeta?.title || proposal.name || "";
  const metaSubtitle = apiMeta?.subtitle || proposal.sub_title || "";
  const titleFull = apiMeta?.full_title || [metaTitle, metaSubtitle].filter(Boolean).join(": ");
  const category = apiMeta?.category || proposal.book_type || "Author";
  const displayNames = apiMeta?.display_names || proposal.corresponding_author_name || proposal.author_name || "";
  const displayBios = apiMeta?.display_bios || proposal.biography || "";
  const bookDescription = apiMeta?.book_description || proposal.short_description || "";
  const keywordsVal = apiMeta?.keywords || proposal.keywords || "";

  // Primary author fields from API
  const authorSalutation = primaryAuthor?.title || "";
  const authorFirstName = primaryAuthor?.first_name || "";
  const authorLastName = primaryAuthor?.last_name || "";
  const authorEmail = primaryAuthor?.email || proposal.author_email || "";
  const authorEmail2 = primaryAuthor?.email_2 || proposal.secondary_email || "";
  const authorInstitution = primaryAuthor?.institution || proposal.institution || "";
  const authorCountry = primaryAuthor?.country || proposal.country || "";

  // Additional authors from API (skip first)
  const additionalAuthors = (apiMeta?.authors || []).slice(1);

  const isAuthorType = category.toLowerCase().includes("author");

  // Cover image from API
  const { data: coverImageData, isLoading: coverImageLoading } = useQuery({
    queryKey: ["cover-image", ticketNumber],
    queryFn: () => metadataApi.getCoverImage(ticketNumber),
    enabled: !!ticketNumber && !!metadataResponse,
  });

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [coverImageSource, setCoverImageSource] = useState("");
  const [coverImagePermission, setCoverImagePermission] = useState(false);
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const [deletingCoverImage, setDeletingCoverImage] = useState(false);
  const [coverImageValidation, setCoverImageValidation] = useState<{
    fileName?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    errors: string[];
    isValid: boolean;
  } | null>(null);

  // Sync API cover image data to local preview
  useEffect(() => {
    if (coverImageData?.url && !coverImageFile) {
      setCoverImagePreview(coverImageData.url);
      if (coverImageData.source) setCoverImageSource(coverImageData.source);
    }
  }, [coverImageData, coverImageFile]);

  // Change request
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestField[]>([
    { field: "", newValue: "" },
  ]);

  const MIN_DIMENSION = 2360;
  const MAX_FILE_SIZE_MB = 10;

  const validateImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error("Could not read image file."));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const errors: string[] = [];
    const fileName = file.name;
    const fileSize = file.size;
    let width = 0;
    let height = 0;

    // File type check
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      errors.push(`Invalid file type "${file.type.split("/")[1]?.toUpperCase() || "unknown"}". Only JPEG and PNG are accepted.`);
    }

    // File size check
    if (fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
      errors.push(`File size ${(fileSize / (1024 * 1024)).toFixed(1)}MB exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
    }

    // Dimension check (only if file type is valid image)
    if (["image/jpeg", "image/png"].includes(file.type)) {
      try {
        const dims = await validateImageDimensions(file);
        width = dims.width;
        height = dims.height;
        if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
          errors.push(`Image dimensions ${width}×${height}px are below the minimum ${MIN_DIMENSION}×${MIN_DIMENSION}px (≈200mm × 200mm at 300 DPI).`);
        }
      } catch {
        errors.push("Could not read image dimensions. The file may be corrupted.");
      }
    }

    setCoverImageValidation({ fileName, fileSize, width, height, errors, isValid: errors.length === 0 });

    if (errors.length > 0) {
      // Still show a preview for context but don't set the file as uploadable
      setCoverImageFile(null);
      // Show local preview anyway so user sees what they picked
      const reader = new FileReader();
      reader.onload = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }

    setCoverImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadCoverImage = async () => {
    if (!coverImageFile) return;
    if (!coverImagePermission) {
      toast({ title: "Permission required", description: "Please confirm you hold the necessary rights for this image.", variant: "destructive" });
      return;
    }
    setUploadingCoverImage(true);
    try {
      await metadataApi.uploadCoverImage(ticketNumber, coverImageFile, coverImageSource || undefined);
      queryClient.invalidateQueries({ queryKey: ["cover-image", ticketNumber] });
      setCoverImageFile(null);
      toast({ title: "Cover image uploaded", description: "Your cover image has been saved." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Could not upload cover image.", variant: "destructive" });
    } finally {
      setUploadingCoverImage(false);
    }
  };

  const handleDeleteCoverImage = async () => {
    setDeletingCoverImage(true);
    try {
      await metadataApi.deleteCoverImage(ticketNumber);
      queryClient.invalidateQueries({ queryKey: ["cover-image", ticketNumber] });
      setCoverImageFile(null);
      setCoverImagePreview(null);
      setCoverImageSource("");
      setCoverImagePermission(false);
      setCoverImageValidation(null);
      toast({ title: "Cover image removed" });
    } catch (err: any) {
      toast({ title: "Failed to remove", description: err?.message || "Could not remove cover image.", variant: "destructive" });
    } finally {
      setDeletingCoverImage(false);
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

  const hasCoverImage = !!coverImageFile || !!coverImageData?.url;

  const sectionLabel = isAuthorType ? "Primary Author(s)" : "Primary Editor(s)";

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
  ];

  const handleSubmitChangeRequests = async () => {
    const validRequests = changeRequests.filter((r) => r.field && r.newValue.trim());
    if (validRequests.length === 0) {
      toast({ title: "No changes", description: "Please specify at least one field and its new value." });
      return;
    }
    setSubmittingQuery(true);
    try {
      const queryText = validRequests.map((r) => `**${r.field}**: ${r.newValue}`).join("\n");
      const fields = validRequests.map((r) => r.field.toLowerCase().replace(/[\s/()]+/g, "_"));
      await metadataQueriesApi.raise(ticketNumber, queryText, fields);
      queryClient.invalidateQueries({ queryKey: ["metadata-queries", ticketNumber] });
      toast({ title: "Request submitted", description: "Your change request has been sent to the reviewer." });
      setRequestingChanges(false);
      setChangeRequests([{ field: "", newValue: "" }]);
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message || "Could not submit change request.", variant: "destructive" });
    } finally {
      setSubmittingQuery(false);
    }
  };

  const [finalising, setFinalising] = useState(false);
  const [showFinaliseConfirm, setShowFinaliseConfirm] = useState(false);

  const handleFinalise = async () => {
    setFinalising(true);
    try {
      // Upload pending cover image before finalising
      if (coverImageFile && coverImagePermission) {
        await metadataApi.uploadCoverImage(ticketNumber, coverImageFile, coverImageSource || undefined);
        queryClient.invalidateQueries({ queryKey: ["cover-image", ticketNumber] });
        setCoverImageFile(null);
      }
      await metadataApi.approve(ticketNumber, {
        notes: hasCoverImage
          ? "Author approved metadata with cover image."
          : "Author approved metadata without cover image — publisher will use default cover.",
      });
      queryClient.invalidateQueries({ queryKey: ["metadata", ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      setShowFinaliseConfirm(false);
      toast({
        title: "Metadata finalised",
        description: hasCoverImage
          ? "Your metadata and cover image have been submitted and locked."
          : "Your metadata has been submitted and locked. No cover image was provided — the publisher will use a default cover.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to finalise",
        description: err?.response?.data?.message || err?.message || "Could not approve metadata.",
        variant: "destructive",
      });
    } finally {
      setFinalising(false);
    }
  };

  if (metadataLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading metadata...</span>
      </div>
    );
  }

  // If no metadata returned (404 = not yet sent by reviewer), show a message
  if (!metadataResponse) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Publication metadata is not available yet. The reviewer has not sent it for your approval.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isApproved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Metadata has been approved and locked. No further changes can be made.
        </div>
      )}


      <div className="space-y-0 border border-border rounded-lg overflow-hidden">
        {/* Publication Metadata — READ ONLY */}
        <SectionHeader title="Publication Metadata" />

        <ReadOnlyRow label="Title Full" value={titleFull} />
        <ReadOnlyRow label="Title" value={metaTitle} />
        <ReadOnlyRow label="Subtitle" value={metaSubtitle} />
        <ReadOnlyRow label="Category Auth/Ed" value={category} />

        {/* Cover Image */}
        <SectionHeader title="Cover Image" />

        <div className="p-4 space-y-4 border-b border-border">
          {/* Requirements list */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Upload a cover image for your publication. If you do not provide one, the publisher will use a default cover.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: "Format", value: "JPEG or PNG" },
                { label: "Min. dimensions", value: `${MIN_DIMENSION}×${MIN_DIMENSION}px` },
                { label: "Max. file size", value: `${MAX_FILE_SIZE_MB}MB` },
              ].map((req) => (
                <div key={req.label} className="flex items-center gap-1.5 rounded-md bg-muted/30 px-3 py-2 border border-border">
                  <FileImage className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium">{req.label}:</span> {req.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {coverImageLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading cover image...
            </div>
          ) : (
            <div className="flex items-start gap-4">
              {coverImagePreview ? (
                <div className={`relative w-32 h-44 rounded-md overflow-hidden border-2 ${coverImageValidation && !coverImageValidation.isValid ? 'border-destructive' : 'border-border'}`}>
                  <img src={coverImagePreview} alt="Cover preview" className="w-full h-full object-cover" />
                  {!isApproved && (
                    <button
                      onClick={() => {
                        if (coverImageData?.url) {
                          handleDeleteCoverImage();
                        } else {
                          setCoverImageFile(null);
                          setCoverImagePreview(null);
                          setCoverImageValidation(null);
                        }
                      }}
                      disabled={deletingCoverImage}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:opacity-80"
                      title="Remove cover image"
                    >
                      {deletingCoverImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-32 h-44 rounded-md border-2 border-dashed border-border bg-muted/20">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground mt-1">No image</span>
                </div>
              )}
              {!isApproved && (
                <div className="flex-1 space-y-3">
                  <div>
                    <Label htmlFor="cover-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <span>
                          <Upload className="h-3.5 w-3.5" />
                          {coverImageFile ? "Replace Image" : coverImageData?.url ? "Change Image" : "Upload Image"}
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

                  {/* Inline validation feedback */}
                  {coverImageValidation && (
                    <div className={`rounded-md p-3 text-xs space-y-1.5 border ${coverImageValidation.isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-destructive/5 border-destructive/30'}`}>
                      <div className="flex items-center gap-2 font-medium">
                        {coverImageValidation.isValid ? (
                          <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> <span className="text-emerald-800">Image meets all requirements</span></>
                        ) : (
                          <><AlertCircle className="h-3.5 w-3.5 text-destructive" /> <span className="text-destructive">Image does not meet requirements</span></>
                        )}
                      </div>
                      <div className="space-y-0.5 text-muted-foreground">
                        {coverImageValidation.fileName && (
                          <p>File: <span className="font-medium text-foreground">{coverImageValidation.fileName}</span></p>
                        )}
                        {coverImageValidation.fileSize != null && (
                          <p>Size: <span className={`font-medium ${coverImageValidation.fileSize > MAX_FILE_SIZE_MB * 1024 * 1024 ? 'text-destructive' : 'text-foreground'}`}>
                            {(coverImageValidation.fileSize / (1024 * 1024)).toFixed(2)}MB
                          </span> <span className="text-muted-foreground/60">(max {MAX_FILE_SIZE_MB}MB)</span></p>
                        )}
                        {(coverImageValidation.width > 0 || coverImageValidation.height > 0) && (
                          <p>Dimensions: <span className={`font-medium ${(coverImageValidation.width < MIN_DIMENSION || coverImageValidation.height < MIN_DIMENSION) ? 'text-destructive' : 'text-foreground'}`}>
                            {coverImageValidation.width}×{coverImageValidation.height}px
                          </span> <span className="text-muted-foreground/60">(min {MIN_DIMENSION}×{MIN_DIMENSION}px)</span></p>
                        )}
                      </div>
                      {coverImageValidation.errors.length > 0 && (
                        <ul className="list-disc list-inside text-destructive space-y-0.5 pt-1">
                          {coverImageValidation.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

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

                  {coverImageFile && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#2f4b40] hover:opacity-90 text-white"
                      onClick={handleUploadCoverImage}
                      disabled={uploadingCoverImage || !coverImagePermission}
                    >
                      {uploadingCoverImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Save Cover Image
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Author(s) — READ ONLY from API */}
        <SectionHeader title={sectionLabel} />

        <ReadOnlyRow label="Display Name(s)" value={displayNames} />
        <ReadOnlyRow label="Display bio(s)" value={displayBios} />
        <ReadOnlyRow label="Salutation" value={authorSalutation} />
        <ReadOnlyRow label="First name" value={authorFirstName} />
        <ReadOnlyRow label="Last name" value={authorLastName} />
        <ReadOnlyRow label="Email" value={authorEmail} />
        <ReadOnlyRow label="Email 2" value={authorEmail2} />
        <ReadOnlyRow label="Institution" value={authorInstitution} />
        <ReadOnlyRow label="Country" value={authorCountry} />

        {/* Additional authors from API */}
        {additionalAuthors.map((person, idx) => (
          <React.Fragment key={idx}>
            <div className="bg-muted/50 py-2 px-4 flex items-center justify-between border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Additional {isAuthorType ? "Author" : "Editor"} {idx + 1}
              </p>
            </div>
            <ReadOnlyRow label="Salutation" value={person.title} />
            <ReadOnlyRow label="First name" value={person.first_name} />
            <ReadOnlyRow label="Last name" value={person.last_name} />
            <ReadOnlyRow label="Email" value={person.email} />
          </React.Fragment>
        ))}

        {/* Book Information — READ ONLY */}
        <SectionHeader title="Book Information" />

        <ReadOnlyRow label="Book description" sublabel="(max 2000 characters)" value={bookDescription} />
        <ReadOnlyRow label="Keywords/Tags" value={keywordsVal} />

      </div>

      {/* Previous Queries Thread */}
      {metadataQueries.length > 0 && (
        <div className="space-y-3 border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold">Queries</h4>
          <div className="space-y-2">
            {metadataQueries.map((q) => (
              <div key={q.id} className={`rounded-md p-3 text-sm ${q.type === 'query' ? 'bg-muted/40 border border-border' : 'bg-emerald-50 border border-emerald-200 ml-4'}`}>
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
            ))}
          </div>
        </div>
      )}

      {/* Change Requests Section */}
      {!isApproved && (
        <>
          {requestingChanges ? (
            <div className="space-y-3 border border-amber-200 bg-amber-50/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-amber-900">Request Changes to Metadata</h4>
              {changeRequests.map((cr, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Select value={cr.field} onValueChange={(v) => updateChangeRequest(idx, "field", v)}>
                    <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Requested new value" value={cr.newValue} onChange={(e) => updateChangeRequest(idx, "newValue", e.target.value)} className="flex-1 text-sm" />
                  {changeRequests.length > 1 && <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeChangeRequest(idx)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1" onClick={addChangeRequestRow}><Plus className="h-3 w-3" /> Add Field</Button>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => { setRequestingChanges(false); setChangeRequests([{ field: "", newValue: "" }]); }}>
                  Cancel
                </Button>
                <Button size="sm" className="bg-[#2f4b40] hover:opacity-90 text-white" onClick={handleSubmitChangeRequests} disabled={submittingQuery}>
                  {submittingQuery && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Submit Change Request
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setRequestingChanges(true)} className="gap-1.5" disabled={hasPendingQuery}>
                Request Changes to Publication Metadata
              </Button>
              {hasPendingQuery && (
                <span className="text-xs text-amber-600">Awaiting response to your previous query</span>
              )}
            </div>
          )}

          {/* Finalise */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              className="bg-[#2f4b40] hover:opacity-90 text-white px-6"
              onClick={() => setShowFinaliseConfirm(true)}
              disabled={hasPendingQuery || finalising}
            >
              Finalise &amp; Lock Metadata
            </Button>
            {hasPendingQuery && (
              <span className="text-xs text-amber-600">Cannot finalise while a query is pending</span>
            )}
          </div>

          <AlertDialog open={showFinaliseConfirm} onOpenChange={setShowFinaliseConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finalise Metadata</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Please note that information cannot be amended once finalised. Make sure to check over the information thoroughly before proceeding.</p>
                {hasCoverImage ? (
                  <p>As you have provided a cover image, we will prepare your cover using this content. Images must be cleared of all copyrights and permissions and you must provide full information on source and ownership.</p>
                ) : (
                  <p>As you have not provided a cover image, we will prepare a cover in line with our house style. The cover will be a neutral/abstract design, with the title and author/editor name clearly displayed. Once complete, it will not be able to be amended.</p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  className="bg-[#8B0000] hover:bg-[#6B0000] text-white"
                  onClick={handleFinalise}
                  disabled={finalising}
                >
                  {finalising && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Finalise Proposal
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default AuthorPublicationMetadata;
