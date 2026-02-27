import React from "react";
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

const DiffCheckerDialog: React.FC<DiffCheckerDialogProps> = ({
  open,
  onOpenChange,
  peerReviewData,
  decisionReviewData,
  peerReviewerName = "Peer Reviewer",
}) => {
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

        <Separator />

        {/* Scrollable comparison */}
        <div className="overflow-y-auto flex-1 pr-1">
          <div className="space-y-6">
            {REVIEW_FIELDS.map(({ label, key }) => {
              const peerVal = peerReviewData[key] || "";
              const drVal = decisionReviewData[key] || "";
              const isChanged = peerVal.trim() !== drVal.trim();
              const bothEmpty = !peerVal.trim() && !drVal.trim();

              if (bothEmpty) return null;

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{label}</p>
                    {isChanged && drVal.trim() && peerVal.trim() && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-[#2563eb] text-[#2563eb]"
                      >
                        Modified
                      </Badge>
                    )}
                    {!peerVal.trim() && drVal.trim() && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-[#3d5a47] text-[#3d5a47]"
                      >
                        Added
                      </Badge>
                    )}
                    {peerVal.trim() && !drVal.trim() && (
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
                        peerVal.trim()
                          ? "bg-[#c4940a]/5 border-[#c4940a]/20"
                          : "bg-muted/30 border-muted text-muted-foreground italic"
                      }`}
                    >
                      {peerVal.trim() || "No comment"}
                    </div>
                    <div
                      className={`text-sm whitespace-pre-line rounded-md border p-3 min-h-[48px] ${
                        drVal.trim()
                          ? isChanged
                            ? "bg-[#2563eb]/5 border-[#2563eb]/20"
                            : "bg-muted/10 border-muted"
                          : "bg-muted/30 border-muted text-muted-foreground italic"
                      }`}
                    >
                      {drVal.trim() || "No comment"}
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
