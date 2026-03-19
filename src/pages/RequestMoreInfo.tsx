import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Info, Plus, Trash2, Loader2 } from "lucide-react";
import { useProposal } from "@/hooks/useProposals";
import { useRequestInfo } from "@/hooks/useRequestInfo";
import { format } from "date-fns";
import type { InfoRequestItem } from "@/lib/proposalsApi";
import { CATEGORIES, getFieldsForCategory, type RevisionRow } from "@/lib/fieldRevisionCategories";

const emptyRow = (): RevisionRow => ({
  id: crypto.randomUUID(),
  category: "",
  field: "",
  reason: "",
});

/* ---- Page ---- */

const RequestMoreInfo: React.FC = () => {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const navigate = useNavigate();
  const { data: proposal, isLoading: proposalLoading } = useProposal(ticketNumber || "");
  const { sendRequest } = useRequestInfo(ticketNumber || "");

  const [rows, setRows] = useState<RevisionRow[]>([emptyRow()]);

  const updateRow = (id: string, patch: Partial<RevisionRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (patch.category && patch.category !== r.category) {
          return { ...r, ...patch, field: "" };
        }
        return { ...r, ...patch };
      })
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const fieldsForCategory = (categoryKey: string) => {
    return getFieldsForCategory(categoryKey);
  };

  const canSubmit = rows.some((r) => r.category && r.field);

  const handleSubmit = () => {
    const items: InfoRequestItem[] = rows
      .filter((r) => r.category && r.field)
      .map((r) => {
        const cat = CATEGORIES.find((c) => c.key === r.category);
        const field = cat?.fields.find((f) => f.key === r.field);
        return {
          key: r.field,
          label: field?.label || r.field,
          ...(r.reason.trim() ? { note: r.reason.trim() } : {}),
        };
      });

    if (items.length === 0) return;

    sendRequest.mutate(
      { items },
      {
        onSuccess: () => navigate(-1),
      }
    );
  };

  if (proposalLoading) {
    return (
      <DashboardLayout title="Request More Info">
        <div className="py-20 text-center text-muted-foreground">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Request More Info">
      <div className="space-y-6">
        {/* Back */}
        <Button
          variant="ghost"
          className="gap-2 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Proposal
        </Button>

        {/* Title block */}
        {proposal && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">{proposal.name}</h1>
            {proposal.sub_title && (
              <p className="text-base text-muted-foreground mt-1 italic">{proposal.sub_title}</p>
            )}
            {proposal.created_at && (
              <p className="text-sm text-muted-foreground mt-1">
                Submitted {format(new Date(proposal.created_at), "MMMM d, yyyy")}
              </p>
            )}
          </div>
        )}

        {/* Info banner */}
        <div className="bg-muted/40 border rounded-lg p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Request Additional Information</p>
            <p className="text-sm text-muted-foreground">
              Select specific fields from the proposal that require clarification or additional information from the author. Provide a clear explanation for each request.
            </p>
          </div>
        </div>

        {/* Requests section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Information Requests</h2>

          {rows.map((row, index) => (
            <Card key={row.id} className="relative">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Request #{index + 1}</p>
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

                {/* Category + Field dropdowns */}
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

                {/* Reason */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Reason for Request</Label>
                  <Textarea
                    placeholder="Explain why this information is needed..."
                    value={row.reason}
                    onChange={(e) => updateRow(row.id, { reason: e.target.value })}
                    className="min-h-[100px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add another */}
          <button
            onClick={addRow}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#3d5a47] hover:opacity-80 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Add Another Request
          </button>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            className="bg-[#3d5a47] hover:bg-[#3d5a47] hover:opacity-90"
            onClick={handleSubmit}
            disabled={!canSubmit || sendRequest.isPending}
          >
            {sendRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RequestMoreInfo;
