import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GitCompareArrows } from "lucide-react";

interface DiffCheckerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerReviewData: Record<string, any>;
  decisionReviewData: Record<string, any>;
  peerReviewerName?: string;
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
  // Split into words while preserving whitespace/newlines as separate tokens
  return str.split(/(\s+)/).filter(Boolean);
}

function computeWordDiff(oldStr: string, newStr: string): { left: DiffSegment[]; right: DiffSegment[] } {
  const oldTokens = tokenize(oldStr);
  const newTokens = tokenize(newStr);

  // LCS table
  const m = oldTokens.length;
  const n = newTokens.length;

  // For very long texts, fall back to simple display
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

  // Backtrack to get diff
  const leftSegments: DiffSegment[] = [];
  const rightSegments: DiffSegment[] = [];
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

  // Merge consecutive segments of the same type
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
          <span key={i} className="bg-red-500/20 text-red-700 dark:text-red-400 rounded-sm px-0.5">
            {seg.text}
          </span>
        );
      }
      if (side === "right" && seg.type === "added") {
        return (
          <span key={i} className="bg-green-500/20 text-green-700 dark:text-green-400 rounded-sm px-0.5">
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
}) => {
  // Pre-compute diffs for all fields
  const diffs = useMemo(() => {
    const result: Record<string, { left: DiffSegment[]; right: DiffSegment[] }> = {};
    for (const { key } of REVIEW_FIELDS) {
      const peerVal = (peerReviewData[key] || "").trim();
      const drVal = (decisionReviewData[key] || "").trim();
      if (peerVal !== drVal && peerVal && drVal) {
        result[key] = computeWordDiff(peerVal, drVal);
      }
    }
    return result;
  }, [peerReviewData, decisionReviewData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5" />
            Review Comparison
          </DialogTitle>
        </DialogHeader>

        {/* Column headers */}
        <div className="grid grid-cols-2 gap-6 px-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#c4940a]" />
            <span className="text-sm font-semibold">
              {peerReviewerName}'s Review
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#2563eb]" />
            <span className="text-sm font-semibold">
              Your Review (Decision Reviewer)
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30" />
            Removed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/30" />
            Added
          </span>
        </div>

        <Separator />

        {/* Scrollable comparison */}
        <div className="overflow-y-auto flex-1 pr-1">
          <div className="space-y-6">
            {REVIEW_FIELDS.map(({ label, key }) => {
              const peerVal = (peerReviewData[key] || "").trim();
              const drVal = (decisionReviewData[key] || "").trim();
              const isChanged = peerVal !== drVal;
              const bothEmpty = !peerVal && !drVal;
              const diff = diffs[key];

              if (bothEmpty) return null;

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{label}</p>
                    {isChanged && drVal && peerVal && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-[#2563eb] text-[#2563eb]"
                      >
                        Modified
                      </Badge>
                    )}
                    {!peerVal && drVal && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-[#3d5a47] text-[#3d5a47]"
                      >
                        Added
                      </Badge>
                    )}
                    {peerVal && !drVal && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-destructive text-destructive"
                      >
                        Removed
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div
                      className={`text-sm whitespace-pre-line rounded-md border p-3 min-h-[48px] ${
                        peerVal
                          ? "bg-[#c4940a]/5 border-[#c4940a]/20"
                          : "bg-muted/30 border-muted text-muted-foreground italic"
                      }`}
                    >
                      {diff ? (
                        <DiffText segments={diff.left} side="left" />
                      ) : (
                        peerVal || "No comment"
                      )}
                    </div>
                    <div
                      className={`text-sm whitespace-pre-line rounded-md border p-3 min-h-[48px] ${
                        drVal
                          ? isChanged
                            ? "bg-[#2563eb]/5 border-[#2563eb]/20"
                            : "bg-muted/10 border-muted"
                          : "bg-muted/30 border-muted text-muted-foreground italic"
                      }`}
                    >
                      {diff ? (
                        <DiffText segments={diff.right} side="right" />
                      ) : (
                        drVal || "No comment"
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Recommendation comparison */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Final Recommendation</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-3 rounded-md border bg-[#c4940a]/5 border-[#c4940a]/20">
                  {peerReviewData.recommendation ? (
                    <Badge
                      className={`rounded-full px-3 py-1 text-xs ${getRecommendationStyle(peerReviewData.recommendation)}`}
                    >
                      {formatRecommendation(peerReviewData.recommendation)}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      No recommendation
                    </span>
                  )}
                </div>
                <div className="p-3 rounded-md border bg-[#2563eb]/5 border-[#2563eb]/20">
                  {decisionReviewData.recommendation ? (
                    <Badge
                      className={`rounded-full px-3 py-1 text-xs ${getRecommendationStyle(decisionReviewData.recommendation)}`}
                    >
                      {formatRecommendation(decisionReviewData.recommendation)}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      No recommendation yet
                    </span>
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
