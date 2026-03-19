import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { CATEGORIES, getFieldsForCategory, emptyRevisionRow, type RevisionRow } from "@/lib/fieldRevisionCategories";

interface FieldRevisionFormProps {
  rows: RevisionRow[];
  onChange: (rows: RevisionRow[]) => void;
}

const FieldRevisionForm: React.FC<FieldRevisionFormProps> = ({ rows, onChange }) => {
  const updateRow = (id: string, patch: Partial<RevisionRow>) => {
    onChange(
      rows.map((r) => {
        if (r.id !== id) return r;
        if (patch.category && patch.category !== r.category) {
          return { ...r, ...patch, field: "" };
        }
        return { ...r, ...patch };
      })
    );
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((r) => r.id !== id));
  };

  const addRow = () => onChange([...rows, emptyRevisionRow()]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Request Specific Field Revisions</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select specific fields from the proposal that need to be revised or require additional information from the author.
        </p>
      </div>

      {rows.map((row, index) => (
        <Card key={row.id}>
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Revision Request #{index + 1}</p>
              {rows.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(row.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Category</Label>
                <Select value={row.category} onValueChange={(v) => updateRow(row.id, { category: v })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.key} value={cat.key}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Field</Label>
                <Select
                  value={row.field}
                  onValueChange={(v) => updateRow(row.id, { field: v })}
                  disabled={!row.category}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={row.category ? "Select field" : "Select a category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getFieldsForCategory(row.category).map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Comment to Author</Label>
              <Textarea
                placeholder="Explain what needs to be revised or improved in this field..."
                value={row.reason}
                onChange={(e) => updateRow(row.id, { reason: e.target.value })}
                className="min-h-[100px] resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <button
        onClick={addRow}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
      >
        <Plus className="h-4 w-4" />
        Add Another Field
      </button>
    </div>
  );
};

export default FieldRevisionForm;
