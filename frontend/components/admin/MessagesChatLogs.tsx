import { Badge } from "@/components/Badge";
import type { ChatLog, Message } from "@/lib/types";

const statusVariant: Record<string, string> = {
  NEW: "accent",
  REPLIED: "success",
  READ: "DRAFT",
  ARCHIVED: "DRAFT",
};

export function MessagesSection({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((m, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: "20px 22px" }}>
          <div className="mb-[9px] flex items-center gap-3">
            <span
              className="flex flex-none items-center justify-center"
              style={{ width: 32, height: 32, borderRadius: "50%", background: "#eef0fb", color: "#4f5bd5", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-display)" }}
            >
              {m.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", marginTop: 2 }}>
                {m.role}
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa" }}>{m.time}</span>
            <Badge variant={statusVariant[m.status] || "DRAFT"}>{m.status}</Badge>
          </div>
          <p style={{ margin: 0, color: "#54596a", fontSize: 14.5 }}>{m.body}</p>
        </div>
      ))}
    </div>
  );
}

export function ChatLogsSection({ logs }: { logs: ChatLog[] }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, overflow: "hidden" }}>
      <div
        className="grid items-center gap-4"
        style={{ gridTemplateColumns: "1fr 150px 110px", padding: "13px 22px", background: "#f9fafc", borderBottom: "1px solid #eceef2", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa" }}
      >
        <span>QUESTION</span>
        <span>WHEN</span>
        <span>ANSWERED</span>
      </div>
      {logs.map((l, i) => (
        <div
          key={i}
          className="grid items-center gap-4"
          style={{ gridTemplateColumns: "1fr 150px 110px", padding: "15px 22px", borderBottom: "1px solid #f2f3f8" }}
        >
          <span style={{ fontSize: 14.5, color: "#3a3d47" }}>{l.question}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#9098aa" }}>{l.when}</span>
          <span>
            <Badge variant={l.answered ? "success" : "warn"}>{l.answered ? "YES" : "NO"}</Badge>
          </span>
        </div>
      ))}
    </div>
  );
}
