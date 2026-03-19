import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Info } from "lucide-react";
import type { InfoRequestItem } from "@/lib/proposalsApi";

// Predefined categories and their fields
const CATEGORIES: Record<string, { label: string; fields: { key: string; label: string }[] }> = {
  author_details: {
    label: "Author Details",
    fields: [
      { key: "biography", label: "Biography" },
      { key: "institution", label: "Institution" },
      { key: "job_title", label: "Job Title" },
      { key: "address", label: "Address" },
      { key: "secondary_email", label: "Secondary Email" },
    ],
  },
  book_details: {
    label: "Book Details",
    fields: [
      { key: "short_description", label: "Blurb / Short Description" },
      { key: "detailed_description", label: "Detailed Description" },
      { key: "table_of_contents", label: "Table of Contents" },
      { key: "word_count", label: "Word Count" },
      { key: "expected_completion_date", label: "Expected Completion Date" },
      { key: "figures_tables_count", label: "Figures / Tables Count" },
    ],
  },
  supporting_documents: {
    label: "Supporting Documents",
    fields: [
      { key: "cv", label: "CV" },
      { key: "sample_chapter", label: "Sample Chapter" },
      { key: "toc_document", label: "Table of Contents Document" },
      { key: "permissions_docs", label: "Permissions Documents" },
    ],
  },
  market_info: {
    label: "Market & Keywords",
    fields: [
      { key: "keywords", label: "Keywords" },
      { key: "marketing_info", label: "Marketing Information" },
      { key: "co_authors_editors", label: "Co-Authors / Editors" },
      { key: "referees_reviewers", label: "Referees / Reviewers" },
    ],
  },
  other: {
    label: "Other",
    fields: [
      { key: "other", label: "Other Information" },
    ],
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (items: InfoRequestItem[], note: string) => void;
  isSubmitting: boolean;
}

const RequestMoreInfoDialog: React.FC<Props> = ({ open, onOpenChange, onSubmit, isSubmitting }) => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [items, setItems] = useState<InfoRequestItem[]>([]);
  const [note, setNote] = useState("");

  const categoryFields = selectedCategory ? CATEGORIES[selectedCategory]?.fields || [] : [];

  const addItem = () => {
    if (!selectedCategory || !selectedField) return;
    const field = categoryFields.find((f) => f.key === selectedField);
    if (!field) return;
    const key = `${selectedCategory}.${field.key}`;
    if (items.some((i) => i.key === key)) return; // prevent duplicates
    setItems([...items, { key, label: `${CATEGORIES[selectedCategory].label} › ${field.label}` }]);
    setSelectedField("");
  };

  const removeItem = (key: string) => {
    setItems(items.filter((i) => i.key !== key));
  };

  const handleSubmit = () => {
    if (items.length === 0) return;
    onSubmit(items, note.trim());
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setItems([]);
      setNote("");
      setSelectedCategory("");
      setSelectedField("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Request More Information
          </DialogTitle>
          <DialogDescription>
            Select the information you need from the author. They will be notified via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category + Field selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Category</Label>
              <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedField(""); }}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Field</Label>
              <Select value={selectedField} onValueChange={setSelectedField} disabled={!selectedCategory}>
                <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                <SelectContent>
                  {categoryFields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={addItem}
            disabled={!selectedField}
          >
            <Plus className="h-3.5 w-3.5" /> Add Item
          </Button>

          {/* Selected items */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Requested Items</Label>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <Badge key={item.key} variant="secondary" className="gap-1.5 py-1.5 px-3 text-xs">
                    {item.label}
                    <button onClick={() => removeItem(item.key)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Reason for Request <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="E.g., We need an updated CV to proceed with the review."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button
            className="bg-[#3d5a47] hover:bg-[#3d5a47]/90"
            onClick={handleSubmit}
            disabled={items.length === 0 || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestMoreInfoDialog;
