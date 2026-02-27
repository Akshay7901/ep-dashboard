import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { GitCompareArrows, Equal, PenLine, Plus, Minus, Save } from "lucide-react";

interface DiffCheckerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerReviewData: Record<string, any>;
  decisionReviewData: Record<string, any>;
  peerReviewerName?: string;
  onDecisionFieldChange?: (field: string, value: string) => void;
  onSaveDraft?: (localData: Record<string, string>) => Promise<void>;
}

const REVIEW_FIELDS = [
  { label: "Scope", key: "scope" },
  { label: "Purpose and Value", key: "purposeAndValue" },
  { label: "Title", key: "title" },
  { label: "Originality and Points of Difference", key: "originality" },
  { label: "Credibility", key: "credibility" },
  { label: "Structure", key: "structure" },
  { label: "Clarity, Structure and Quality of Writing", key: "clarity" },
  { label: "Other Comments", key: "otherComments" },
  { label: "Red Flags", key: "redFlags" },
];

const getRecommendationStyle = (rec: string) => {
  switch (rec) {
    case "proceed":
      return "bg-[#3d5a47] text-white hover:bg-[#3d5a47]";
    case "minor_revision":
      return "bg-[#c4940a] text-white hover:bg-[#c4940a]";
    case "major_revision":
      return "bg-[#9b2c2c] text-white hover:bg-[#9b2c2c]";
    case "reject":
      return "bg-foreground text-background hover:bg-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const formatRecommendation = (rec: string) =>
  rec?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—";

/* ---- Word-level diff (LCS-based) ---- */

type DiffSegment = { text: string; type: "same" | "added" | "removed" };

function tokenize(str: string): string[] {
  return str.split(/(\s+)/).filter(Boolean);
}

function computeWordDiff(oldStr: string, newStr: string): { left: DiffSegment[]; right: DiffSegment[] } {
  const oldTokens = tokenize(oldStr);
  const newTokens = tokenize(newStr);
  const m = oldTokens.length;
  const n = newTokens.length;

  if (m * n > 500000) {
    return {
      left: [{ text: oldStr, type: oldStr === newStr ? "same" : "removed" }],
      right: [{ text: newStr, type: oldStr === newStr ? "same" : "added" }],
    };
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m, j = n;
  const leftStack: DiffSegment[] = [];
  const rightStack: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      leftStack.push({ text: oldTokens[i - 1], type: "same" });
      rightStack.push({ text: newTokens[j - 1], type: "same" });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rightStack.push({ text: newTokens[j - 1], type: "added" });
      j--;
    } else {
      leftStack.push({ text: oldTokens[i - 1], type: "removed" });
      i--;
    }
  }

  leftStack.reverse();
  rightStack.reverse();

  const merge = (segments: DiffSegment[]): DiffSegment[] => {
    const merged: DiffSegment[] = [];
    for (const seg of segments) {
      if (merged.length > 0 && merged[merged.length - 1].type === seg.type) {
        merged[merged.length - 1].text += seg.text;
      } else {
        merged.push({ ...seg });
      }
    }
    return merged;
  };

  return { left: merge(leftStack), right: merge(rightStack) };
}

const DiffText: React.FC<{ segments: DiffSegment[]; side: "left" | "right" }> = ({ segments, side }) => (
  <>
    {segments.map((seg, i) => {
      if (seg.type === "same") return <span key={i}>{seg.text}</span>;
      if (side === "left" && seg.type === "removed") {
        return (
          <span key={i} className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 line-through decoration-red-400/60 rounded-sm px-0.5">
            {seg.text}
          </span>
        );
      }
      if (side === "right" && seg.type === "added") {
        return (
          <span key={i} className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-sm px-0.5 font-medium">
            {seg.text}
          </span>
        );
      }
      return <span key={i}>{seg.text}</span>;
    })}
  </>
);

/* ---- Component ---- */

const DiffCheckerDialog: React.FC<DiffCheckerDialogProps> = ({
  open,
  onOpenChange,
  peerReviewData,
  decisionReviewData,
  peerReviewerName = "Peer Reviewer",
  onDecisionFieldChange,
  onSaveDraft,
}) => {
  // Local editable state for DR side, initialized from decisionReviewData
  const [localDrData, setLocalDrData] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Sync local state when dialog opens or decisionReviewData changes
  useEffect(() => {
    if (open) {
      setLocalDrData({ ...decisionReviewData });
      setEditingField(null);
    }
  }, [open, decisionReviewData]);

  const handleDrFieldChange = useCallback((key: string, value: string) => {
    setLocalDrData(prev => ({ ...prev, [key]: value }));
  }, []);

  const diffs = useMemo(() => {
    const result: Record<string, { left: DiffSegment[]; right: DiffSegment[] }> = {};
    for (const { key } of REVIEW_FIELDS) {
      const peerVal = (peerReviewData[key] || "").trim();
      const drVal = (localDrData[key] || "").trim();
      if (peerVal !== drVal && peerVal && drVal) {
        result[key] = computeWordDiff(peerVal, drVal);
      }
    }
    return result;
  }, [peerReviewData, localDrData]);

  // Summary stats
  const stats = useMemo(() => {
    let modified = 0, added = 0, removed = 0, unchanged = 0;
    for (const { key } of REVIEW_FIELDS) {
      const peerVal = (peerReviewData[key] || "").trim();
      const drVal = (localDrData[key] || "").trim();
      if (!peerVal && !drVal) continue;
      if (peerVal === drVal) unchanged++;
      else if (!peerVal && drVal) added++;
      else if (peerVal && !drVal) removed++;
      else modified++;
    }
    return { modified, added, removed, unchanged };
  }, [peerReviewData, localDrData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-0 space-y-4">
          <DialogHeader className="flex flex-row items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <GitCompareArrows className="h-5 w-5" />
              Review Comparison
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              disabled={isSavingDraft}
              onClick={async () => {
                if (!onSaveDraft) return;
                setIsSavingDraft(true);
                try {
                  // Push all local edits to the main form first
                  Object.entries(localDrData).forEach(([field, value]) => {
                    onDecisionFieldChange?.(field, value);
                  });
                  await onSaveDraft(localDrData);
                } finally {
                  setIsSavingDraft(false);
                }
              }}
              className="gap-2 mr-6"
            >
              <Save className="h-4 w-4" />
              {isSavingDraft ? "Saving…" : "Save Draft"}
            </Button>
          </DialogHeader>

          {/* Stats bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {stats.modified > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <PenLine className="h-3 w-3" />
                {stats.modified} modified
              </div>
            )}
            {stats.added > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Plus className="h-3 w-3" />
                {stats.added} added
              </div>
            )}
            {stats.removed > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                <Minus className="h-3 w-3" />
                {stats.removed} removed
              </div>
            )}
            {stats.unchanged > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border">
                <Equal className="h-3 w-3" />
                {stats.unchanged} unchanged
              </div>
            )}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#c4940a] shrink-0" />
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-200 truncate">
                {peerReviewerName}'s Review
              </span>
            </div>
            <div className="flex items-center gap-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#2563eb] shrink-0" />
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Your Review (Decision Reviewer)
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Scrollable comparison */}
        <div className="overflow-y-auto flex-1 px-6 pb-6">
          <div className="space-y-5 pt-2">
             {REVIEW_FIELDS.map(({ label, key }) => {
              const peerVal = (peerReviewData[key] || "").trim();
              const drVal = (localDrData[key] || "").trim();
              const isChanged = peerVal !== drVal;
              const bothEmpty = !peerVal && !drVal;
              const diff = diffs[key];
              const isEditing = editingField === key;

              if (bothEmpty) return null;

              const isModified = isChanged && peerVal && drVal;
              const isAdded = !peerVal && drVal;
              const isRemoved = peerVal && !drVal;

              return (
                <div
                  key={key}
                  className={`rounded-lg border transition-colors ${
                    isModified
                      ? "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10"
                      : isAdded
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10"
                      : isRemoved
                      ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10"
                      : "border-muted bg-muted/10"
                  }`}
                >
                  {/* Field header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-inherit">
                    <p className="text-sm font-semibold">{label}</p>
                    {isModified && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50">
                        <PenLine className="h-2.5 w-2.5 mr-0.5" />
                        Modified
                      </Badge>
                    )}
                    {isAdded && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50">
                        <Plus className="h-2.5 w-2.5 mr-0.5" />
                        Added
                      </Badge>
                    )}
                    {isRemoved && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50">
                        <Minus className="h-2.5 w-2.5 mr-0.5" />
                        Removed
                      </Badge>
                    )}
                    {!isChanged && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                        <Equal className="h-2.5 w-2.5 mr-0.5" />
                        Unchanged
                      </Badge>
                    )}
                  </div>

                  {/* Content columns */}
                  <div className="grid grid-cols-2 gap-0 divide-x divide-inherit">
                    <div className="p-3 text-sm whitespace-pre-line leading-relaxed min-h-[44px]">
                      {diff ? (
                        <DiffText segments={diff.left} side="left" />
                      ) : peerVal ? (
                        <span className={isRemoved ? "text-red-600 dark:text-red-400 line-through decoration-red-400/40" : ""}>{peerVal}</span>
                      ) : (
                        <span className="text-muted-foreground/50 italic text-xs">— empty —</span>
                      )}
                    </div>
                    {/* DR side - editable */}
                    <div className="p-3 text-sm min-h-[44px]">
                      {isEditing ? (
                        <Textarea
                          autoFocus
                          value={localDrData[key] || ""}
                          onChange={(e) => handleDrFieldChange(key, e.target.value)}
                          onBlur={() => setEditingField(null)}
                          className="resize-none text-sm min-h-[60px] bg-background border-blue-300 dark:border-blue-700 focus-visible:ring-blue-400"
                          rows={3}
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField(key)}
                          className="cursor-pointer rounded-md px-2 py-1.5 -mx-2 -my-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors group whitespace-pre-line leading-relaxed"
                          title="Click to edit"
                        >
                          {diff ? (
                            <DiffText segments={diff.right} side="right" />
                          ) : drVal ? (
                            <span className={isAdded ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>{drVal}</span>
                          ) : (
                            <span className="text-muted-foreground/50 italic text-xs">— click to add —</span>
                          )}
                          <PenLine className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity inline-block ml-1.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Recommendation comparison */}
            <div className={`rounded-lg border transition-colors ${
              peerReviewData.recommendation !== localDrData.recommendation
                ? "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10"
                : "border-muted bg-muted/10"
            }`}>
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-inherit">
                <p className="text-sm font-semibold">Final Recommendation</p>
                {peerReviewData.recommendation !== localDrData.recommendation && peerReviewData.recommendation && localDrData.recommendation && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50">
                    <PenLine className="h-2.5 w-2.5 mr-0.5" />
                    Changed
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-0 divide-x divide-inherit">
                <div className="p-3">
                  {peerReviewData.recommendation ? (
                    <Badge className={`rounded-full px-3 py-1 text-xs ${getRecommendationStyle(peerReviewData.recommendation)}`}>
                      {formatRecommendation(peerReviewData.recommendation)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground/50 italic text-xs">— none —</span>
                  )}
                </div>
                <div className="p-3">
                  {localDrData.recommendation ? (
                    <Badge className={`rounded-full px-3 py-1 text-xs ${getRecommendationStyle(localDrData.recommendation)}`}>
                      {formatRecommendation(localDrData.recommendation)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground/50 italic text-xs">— none yet —</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>



      </DialogContent>
    </Dialog>
  );
};

export default DiffCheckerDialog;
