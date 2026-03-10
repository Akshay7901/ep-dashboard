import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Bell, FileText, MessageSquare, ClipboardCheck, Send, AlertCircle, FileSignature, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  category: "review" | "contract" | "query" | "metadata";
}

interface AuthorNotificationsPanelProps {
  reviews: any[];
  latestContract: any;
  queries: any[];
  metadataQueries?: any[];
}

const categoryColors: Record<string, string> = {
  review: "bg-blue-500/10 text-blue-600",
  contract: "bg-emerald-500/10 text-emerald-600",
  query: "bg-amber-500/10 text-amber-600",
  metadata: "bg-violet-500/10 text-violet-600",
};

const categoryLabels: Record<string, string> = {
  review: "Review",
  contract: "Contract",
  query: "Query",
  metadata: "Metadata",
};

function buildNotifications({
  reviews,
  latestContract,
  queries,
  metadataQueries = [],
}: AuthorNotificationsPanelProps): NotificationItem[] {
  const items: NotificationItem[] = [];

  // 1. Review submissions
  reviews.forEach((r: any, idx: number) => {
    if (r.status === "submitted" || r.is_submitted) {
      const role = r.reviewer_role === "peer_reviewer" ? "Peer Reviewer" : "Decision Reviewer";
      items.push({
        id: `review-${idx}`,
        icon: <ClipboardCheck className="h-4 w-4" />,
        title: `${role} Feedback Received`,
        description: "Review feedback has been submitted for your proposal.",
        timestamp: r.submitted_at || r.updated_at || r.created_at || "",
        category: "review",
      });
    }
  });

  // 2. Contract events
  if (latestContract) {
    if (latestContract.docusign_sent_at) {
      items.push({
        id: "contract-sent",
        icon: <Send className="h-4 w-4" />,
        title: "Contract Sent",
        description: "A publishing agreement has been sent for your review and signature.",
        timestamp: latestContract.docusign_sent_at,
        category: "contract",
      });
    }
    if (latestContract.docusign_completed_at) {
      items.push({
        id: "contract-signed",
        icon: <FileSignature className="h-4 w-4" />,
        title: "Contract Signed",
        description: "The publishing agreement has been signed successfully.",
        timestamp: latestContract.docusign_completed_at,
        category: "contract",
      });
    }
    if (latestContract.docusign_declined_at) {
      items.push({
        id: "contract-declined",
        icon: <AlertCircle className="h-4 w-4" />,
        title: "Contract Declined",
        description: latestContract.docusign_decline_reason || "The contract was declined.",
        timestamp: latestContract.docusign_declined_at,
        category: "contract",
      });
    }
    if (latestContract.created_at && !latestContract.docusign_sent_at) {
      items.push({
        id: "contract-created",
        icon: <FileText className="h-4 w-4" />,
        title: "Contract Prepared",
        description: "A contract has been prepared for this proposal.",
        timestamp: latestContract.created_at,
        category: "contract",
      });
    }
  }

  // 3. Contract query responses
  queries.forEach((q: any) => {
    if (q.responses && q.responses.length > 0) {
      q.responses.forEach((resp: any, rIdx: number) => {
        items.push({
          id: `query-resp-${q.id}-${rIdx}`,
          icon: <MessageSquare className="h-4 w-4" />,
          title: "Query Response Received",
          description: resp.response_text?.slice(0, 100) || "A response has been provided to your query.",
          timestamp: resp.responded_at || resp.created_at || "",
          category: "query",
        });
      });
    }
    if (q.query_text) {
      items.push({
        id: `query-${q.id}`,
        icon: <MessageSquare className="h-4 w-4" />,
        title: `Query Raised — ${q.category === "contract" ? "Contract" : "Peer Review Feedback"}`,
        description: q.query_text?.slice(0, 100) || "A query has been raised.",
        timestamp: q.created_at || "",
        category: "query",
      });
    }
  });

  // 4. Metadata queries & responses
  metadataQueries.forEach((mq: any) => {
    if (mq.type === "response") {
      items.push({
        id: `meta-resp-${mq.id}`,
        icon: <BookOpen className="h-4 w-4" />,
        title: "Metadata Response Received",
        description: mq.query_text?.slice(0, 100) || "The reviewer has responded to your metadata request.",
        timestamp: mq.created_at || "",
        category: "metadata",
      });
    } else if (mq.type === "query") {
      items.push({
        id: `meta-query-${mq.id}`,
        icon: <BookOpen className="h-4 w-4" />,
        title: "Metadata Change Requested",
        description: mq.query_text?.slice(0, 100) || "A metadata change request has been submitted.",
        timestamp: mq.created_at || "",
        category: "metadata",
      });
    }
  });

  // Sort newest first
  items.sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return items;
}

const AuthorNotificationsPanel: React.FC<AuthorNotificationsPanelProps> = (props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = buildNotifications(props);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative p-2 rounded-full transition-colors hover:bg-muted",
          open && "bg-muted"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {notifications.length > 0 && (
          <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-[#c05621] text-[10px] font-bold text-white flex items-center justify-center">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[460px] overflow-y-auto rounded-lg border bg-background shadow-lg z-50">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review, contract & metadata updates
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((item) => (
                <div key={item.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex gap-3">
                    <div className={cn("mt-0.5 p-1.5 rounded-md shrink-0", categoryColors[item.category])}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", categoryColors[item.category])}>
                          {categoryLabels[item.category]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      {item.timestamp && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(item.timestamp), "MMM d, yyyy · h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthorNotificationsPanel;
