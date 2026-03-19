import React, { useState } from "react";
import { ArrowRight, Check, Loader2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MetadataQuery } from "@/lib/proposalsApi";

interface FieldDiff {
  fieldKey: string;
  label: string;
  currentValue: string;
  requestedValue: string;
}

interface MetadataQueryDiffPanelProps {
  query: MetadataQuery;
  fieldMap: Record<string, { label: string; currentValue: string }>;
  onApplyField: (fieldKey: string, value: string) => void;
  onRespond: (queryId: number, text: string) => Promise<void>;
  respondingLoading: boolean;
  hasResponse: boolean;
}

/**
 * Parses the author's query text (format: **Field**: value per line)
 * and maps to field diffs using the current metadata values.
 */
function parseQueryDiffs(
  queryText: string,
  fields: string[] | undefined,
  fieldMap: Record<string, { label: string; currentValue: string }>
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  // Parse lines like "**Display Name(s)**: new value"
  const lines = queryText.split("\n").filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
    if (match) {
      const rawLabel = match[1].trim();
      const requestedValue = match[2].trim();
      // Try to find matching field key
      const fieldKey = rawLabel.toLowerCase().replace(/[\s/()]+/g, "_");
      const mapped = fieldMap[fieldKey];
      if (mapped) {
        diffs.push({
          fieldKey,
          label: mapped.label,
          currentValue: mapped.currentValue,
          requestedValue,
        });
      } else {
        // Fallback: show with raw label
        diffs.push({
          fieldKey,
          label: rawLabel,
          currentValue: "—",
          requestedValue,
        });
      }
    }
  }

  // If parsing found nothing, try using the fields array
  if (diffs.length === 0 && fields) {
    for (const f of fields) {
      const mapped = fieldMap[f];
      if (mapped) {
        diffs.push({
          fieldKey: f,
          label: mapped.label,
          currentValue: mapped.currentValue,
          requestedValue: queryText, // can't parse per-field
        });
      }
    }
  }

  return diffs;
}

/** Simple word-level diff highlighting */
function DiffHighlight({ current, requested }: { current: string; requested: string }) {
  if (current === requested) {
    return <span className="text-sm text-muted-foreground italic">No change</span>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5 w-16 shrink-0">Current</span>
        <span className="text-sm bg-destructive/10 text-destructive line-through px-1.5 py-0.5 rounded">
          {current || <em className="text-muted-foreground">empty</em>}
        </span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5 w-16 shrink-0">Requested</span>
        <span className="text-sm bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
          {requested}
        </span>
      </div>
    </div>
  );
}

const MetadataQueryDiffPanel: React.FC<MetadataQueryDiffPanelProps> = ({
  query,
  fieldMap,
  onApplyField,
  onRespond,
  respondingLoading,
  hasResponse,
}) => {
  const [responseText, setResponseText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());

  const diffs = parseQueryDiffs(query.text || "", query.fields, fieldMap);
  const hasDiffs = diffs.length > 0;

  const handleApply = (fieldKey: string, value: string) => {
    onApplyField(fieldKey, value);
    setAppliedFields((prev) => new Set(prev).add(fieldKey));
  };

  const handleApplyAll = () => {
    for (const d of diffs) {
      onApplyField(d.fieldKey, d.requestedValue);
    }
    setAppliedFields(new Set(diffs.map((d) => d.fieldKey)));
  };

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-100/60 border-b border-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-amber-700" />
          <span className="text-sm font-semibold text-amber-900">
            Change Request from {query.raised_by_name || query.raised_by}
          </span>
          <span className="text-xs text-amber-600">
            {new Date(query.created_at).toLocaleString()}
          </span>
        </div>
        {hasDiffs && diffs.length > 1 && !hasResponse && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={handleApplyAll}
          >
            <Check className="h-3 w-3" /> Apply All Changes
          </Button>
        )}
      </div>

      {/* Diff table */}
      {hasDiffs ? (
        <div className="divide-y divide-amber-200">
          {diffs.map((d) => (
            <div key={d.fieldKey} className="px-4 py-3 flex items-start gap-4">
              <div className="w-36 shrink-0">
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {d.label}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <DiffHighlight current={d.currentValue} requested={d.requestedValue} />
              </div>
              {!hasResponse && (
                <div className="shrink-0">
                  {appliedFields.has(d.fieldKey) ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Applied
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1 text-amber-800 hover:bg-amber-100"
                      onClick={() => handleApply(d.fieldKey, d.requestedValue)}
                    >
                      <ArrowRight className="h-3 w-3" /> Apply
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-3">
          <p className="text-sm whitespace-pre-line" dangerouslySetInnerHTML={{ __html: (query.text || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
          {query.fields && query.fields.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {query.fields.map((f) => (
                <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Respond section */}
      {!hasResponse && (
        <div className="px-4 py-3 border-t border-amber-200 bg-amber-50/30">
          {showReply ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Respond to the author's query..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={2}
                className="resize-none text-sm bg-white"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowReply(false); setResponseText(""); }}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-[#2f4b40] hover:opacity-90 text-white"
                  disabled={respondingLoading || !responseText.trim()}
                  onClick={async () => {
                    await onRespond(query.id, responseText);
                    setResponseText("");
                    setShowReply(false);
                  }}
                >
                  {respondingLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Send Response
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setShowReply(true)}>
              <MessageSquare className="h-3 w-3" /> Respond to Query
            </Button>
          )}
        </div>
      )}

      {/* Already responded indicator */}
      {hasResponse && (
        <div className="px-4 py-2 border-t border-emerald-200 bg-emerald-50/50 text-xs text-emerald-700 flex items-center gap-1.5">
          <Check className="h-3 w-3" /> Responded
        </div>
      )}
    </div>
  );
};

export default MetadataQueryDiffPanel;
