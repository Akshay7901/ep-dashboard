import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { InfoRequestItem } from "@/lib/proposalsApi";

const REQUESTABLE_ITEMS: { key: string; label: string }[] = [
  { key: "biography", label: "Biography" },
  { key: "word_count", label: "Word Count" },
  { key: "short_description", label: "Short Description" },
  { key: "detailed_description", label: "Detailed Description" },
  { key: "keywords", label: "Keywords" },
  { key: "table_of_contents", label: "Table of Contents" },
  { key: "co_authors_editors", label: "Co-authors / Editors" },
  { key: "referees_reviewers", label: "Referees / Reviewers" },
  { key: "under_review_elsewhere", label: "Under Review Elsewhere" },
  { key: "permissions_required", label: "Permissions Required" },
  { key: "marketing_info", label: "Marketing Information" },
  { key: "cv", label: "CV (document)" },
  { key: "sample_chapter", label: "Sample Chapter (document)" },
  { key: "toc_doc", label: "Table of Contents Document" },
  { key: "permissions_docs", label: "Permission Documents" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (items: InfoRequestItem[], note: string) => void;
  isSubmitting: boolean;
}

const RequestMoreInfoDialog: React.FC<Props> = ({ open, onOpenChange, onSubmit, isSubmitting }) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const toggleItem = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Clear item note when deselected
        setItemNotes((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedKeys.size === 0) return;
    const items: InfoRequestItem[] = REQUESTABLE_ITEMS
      .filter((i) => selectedKeys.has(i.key))
      .map((i) => ({
        key: i.key,
        label: i.label,
        ...(itemNotes[i.key]?.trim() ? { note: itemNotes[i.key].trim() } : {}),
      }));
    onSubmit(items, note.trim());
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedKeys(new Set());
      setItemNotes({});
      setNote("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Request More Information
          </DialogTitle>
          <DialogDescription>
            Select the information you need from the author. They will be notified via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Checklist */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Select items to request</Label>
            <div className="border rounded-md divide-y max-h-[320px] overflow-y-auto">
              {REQUESTABLE_ITEMS.map((item) => {
                const isSelected = selectedKeys.has(item.key);
                return (
                  <div key={item.key}>
                    <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(item.key)}
                      />
                      <span className="text-sm flex-1">{item.label}</span>
                    </label>
                    {isSelected && (
                      <div className="px-4 pb-3 pl-11">
                        <Textarea
                          placeholder={`Reason for requesting ${item.label.toLowerCase()}... (optional)`}
                          value={itemNotes[item.key] || ""}
                          onChange={(e) =>
                            setItemNotes((prev) => ({ ...prev, [item.key]: e.target.value }))
                          }
                          className="min-h-[50px] resize-none text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedKeys.size > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedKeys.size} item{selectedKeys.size !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Overall Note */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Note to author <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="E.g., Please update your biography and upload a new CV."
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
            disabled={selectedKeys.size === 0 || isSubmitting}
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
