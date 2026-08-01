import { Badge } from "@/components/Badge";
import type { Overview } from "@/lib/types";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eceef2",
  borderRadius: 14,
};

export function OverviewSection({ data }: { data: Overview | null }) {
  if (!data) return <Skeleton />;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {data.stats.map((s) => (
          <div key={s.label} style={{ ...card, padding: 20 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa" }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 30, letterSpacing: "-0.02em", margin: "8px 0 4px" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 13, color: "#4f5bd5" }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div style={card}>
          <div style={cardHeader}>Recent posts</div>
          {data.recentPosts.map((p, i) => (
            <div key={i} className="flex items-center gap-3.5" style={row}>
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: 15, fontWeight: 500 }}>
                  {p.title}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", marginTop: 4 }}>
                  {p.meta}
                </div>
              </div>
              <Badge variant={p.status}>{p.status}</Badge>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={cardHeader}>Top questions to the AI</div>
          {data.topQuestions.map((q, i) => (
            <div key={i} className="flex items-center gap-3" style={{ ...row, padding: "13px 22px" }}>
              <span className="flex-1" style={{ fontSize: 14, color: "#3a3d47" }}>
                {q.text}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#4f5bd5" }}>
                {q.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const cardHeader: React.CSSProperties = {
  padding: "18px 22px",
  borderBottom: "1px solid #eceef2",
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: 16,
};
const row: React.CSSProperties = {
  padding: "15px 22px",
  borderBottom: "1px solid #f2f3f8",
};

function Skeleton() {
  return <div style={{ color: "#9098aa", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading…</div>;
}
