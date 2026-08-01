import type { CV } from "@/lib/types";

function scoreStyle(score: number): React.CSSProperties {
  let bg = "#fdf3e8",
    color = "#a4661f"; // amber
  if (score >= 75) {
    bg = "#e9f6ee";
    color = "#2f7d4f";
  } else if (score >= 55) {
    bg = "#eef0fb";
    color = "#4f5bd5";
  }
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    fontWeight: 600,
    background: bg,
    color,
  };
}

export function CVsSection({
  cvs,
  onOpen,
  onDelete,
  onNew,
}: {
  cvs: CV[];
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
}) {
  if (cvs.length === 0) {
    return (
      <div style={{ background: "#fff", border: "1.5px dashed #d9dce4", borderRadius: 14, padding: 44, textAlign: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#4f8cff,#7a5cff 55%,#e35bd0)", margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, marginBottom: 6 }}>
          No tailored CVs yet
        </div>
        <p style={{ color: "#54596a", fontSize: 14, margin: "0 0 18px" }}>
          Paste a job description and the AI drafts a CV from your live site data.
        </p>
        <button
          onClick={onNew}
          className="text-white transition-colors hover:bg-[#3a45b8]"
          style={{ background: "#4f5bd5", border: "none", borderRadius: 11, padding: "11px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          + New tailored CV
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, overflow: "hidden" }}>
      <div
        className="grid items-center gap-4"
        style={{ gridTemplateColumns: "1fr 110px 130px 80px 36px", padding: "13px 22px", background: "#f9fafc", borderBottom: "1px solid #eceef2", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa" }}
      >
        <span>ROLE</span>
        <span>MATCH</span>
        <span>KEYWORDS</span>
        <span>GAPS</span>
        <span />
      </div>
      {cvs.map((cv) => (
        <div
          key={cv.id}
          onClick={() => onOpen(cv.id)}
          className="grid cursor-pointer items-center gap-4 transition-colors hover:bg-[#f9fafc]"
          style={{ gridTemplateColumns: "1fr 110px 130px 80px 36px", padding: "15px 22px", borderBottom: "1px solid #f2f3f8" }}
        >
          <div className="min-w-0">
            <div className="truncate" style={{ fontSize: 15, fontWeight: 500 }}>
              {cv.role}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", marginTop: 4 }}>
              {[cv.company, cv.date].filter(Boolean).join(" · ")}
            </div>
          </div>
          <span>
            <span style={scoreStyle(cv.score)}>{cv.score}%</span>
          </span>
          <span style={{ fontSize: 13.5, color: "#54596a" }}>{cv.matchedNames.length} matched</span>
          <span style={{ fontSize: 13.5, color: "#54596a" }}>{cv.gaps.length}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(cv.id);
            }}
            title="Delete"
            className="transition-colors hover:text-[#b3383c]"
            style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 16, cursor: "pointer", padding: 4, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
