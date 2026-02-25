import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, AlertTriangle, MessageSquare, User, Tag } from "lucide-react";
import { ContractQuery } from "@/lib/proposalsApi";
import { cn } from "@/lib/utils";

const QUERY_CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "feedback", label: "Feedback" },
];

interface ContractQueryThreadProps {
  queries: ContractQuery[];
  isLoading: boolean;
  viewAs: "author" | "reviewer";
  proposalStatus: string;
  /** For author: (text, category) => ...; For reviewer: (text, category, queryId) => ... */
  onSend: (text: string, category?: string, queryId?: number) => Promise<void>;
  isSending: boolean;
  hasActiveContract?: boolean;
}

const ContractQueryThread: React.FC<ContractQueryThreadProps> = ({
  queries,
  isLoading,
  viewAs,
  proposalStatus,
  onSend,
  isSending,
  hasActiveContract = false,
}) => {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("contract");
  const [selectedQueryId, setSelectedQueryId] = useState<string>("");
  const normalizedStatus = proposalStatus?.trim().toLowerCase().replace(/\s+/g, "_");
  const isQueriesRaised = normalizedStatus === "queries_raised";
  const isContractIssued = normalizedStatus === "contract_issued";

  const canSend =
    viewAs === "author"
      ? isContractIssued || isQueriesRaised || hasActiveContract
      : isQueriesRaised;

  const sendLabel = viewAs === "author" ? "Send Query" : "Send Response";

  // Get unanswered queries for DR to select from
  const unansweredQueries = queries.filter((q) => q.type === "query");

  const handleSubmit = async () => {
    if (!text.trim() || isSending) return;
    if (viewAs === "reviewer" && !selectedQueryId) return;
    const qId = viewAs === "reviewer" ? Number(selectedQueryId) : undefined;
    await onSend(text.trim(), category, qId);
    setText("");
    setSelectedQueryId("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading queries…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status banner for DR */}
      {viewAs === "reviewer" && isQueriesRaised && (
        <div className="flex items-center gap-3 p-3 border border-[#c4940a]/40 bg-[#c4940a]/5 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-[#c4940a] shrink-0" />
          <div>
            <p className="text-sm font-semibold">Author has queries</p>
            <p className="text-xs text-muted-foreground">
              Please respond to re-enable the signing button for the author.
            </p>
          </div>
        </div>
      )}

      {/* Status banner for Author when queries_raised */}
      {viewAs === "author" && isQueriesRaised && (
        <div className="flex items-center gap-3 p-3 border border-[#c4940a]/40 bg-[#c4940a]/5 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-[#c4940a] shrink-0" />
          <div>
            <p className="text-sm font-semibold">Query sent — awaiting response</p>
            <p className="text-xs text-muted-foreground">
              Signing is disabled until the editorial team responds. You can raise another query below.
            </p>
          </div>
        </div>
      )}

      {/* Thread */}
      {queries.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          No queries yet.
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {queries.map((q) => {
            const isQuery = q.type === "query";
            const alignRight =
              (viewAs === "author" && !isQuery) || (viewAs === "reviewer" && isQuery);
            const messageText = q.text || q.query_text || q.response_text || "";
            const senderName = q.raised_by_name || q.created_by || (isQuery ? "Author" : "Reviewer");
            const categoryLabel = q.category ? q.category.charAt(0).toUpperCase() + q.category.slice(1) : null;

            return (
              <div
                key={q.id}
                className={cn("flex", alignRight ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg p-3 space-y-2",
                    isQuery
                      ? "bg-muted/50 border border-border"
                      : "bg-[#3d5a47]/10 border border-[#3d5a47]/20"
                  )}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {senderName}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {isQuery ? "Query" : "Response"}
                    </Badge>
                    {categoryLabel && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                        <Tag className="h-2.5 w-2.5" />
                        {categoryLabel}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {format(new Date(q.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  {q.raised_by && (
                    <p className="text-[11px] text-muted-foreground">{q.raised_by}</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {messageText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Input */}
      {canSend && (
        <div className="space-y-3 pt-2 border-t">
          {viewAs === "author" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Question Type</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {QUERY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {viewAs === "reviewer" && unansweredQueries.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Responding to Query</label>
              <Select value={selectedQueryId} onValueChange={setSelectedQueryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select query to respond to" />
                </SelectTrigger>
                <SelectContent>
                  {unansweredQueries.map((q) => (
                    <SelectItem key={q.id} value={String(q.id)}>
                      #{q.id} — {(q.text || q.query_text || "").substring(0, 60)}{(q.text || q.query_text || "").length > 60 ? "…" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {viewAs === "author" ? "Your Question" : "Your Response"}
            </label>
            <Textarea
              placeholder={
                viewAs === "author"
                  ? "Type your query…"
                  : "Type your response…"
              }
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= 1000) setText(e.target.value);
              }}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {text.length}/1000 characters
            </span>
            <Button
              size="sm"
              className="bg-[#3d5a47] hover:opacity-90 text-white gap-2"
              onClick={handleSubmit}
              disabled={isSending || !text.trim() || (viewAs === "reviewer" && !selectedQueryId)}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sendLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractQueryThread;
