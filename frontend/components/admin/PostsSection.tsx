import { Badge } from "@/components/Badge";
import type { Post } from "@/lib/types";

export function PostsSection({
  posts,
  onEdit,
  onDelete,
}: {
  posts: Post[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, overflow: "hidden" }}>
      <div
        className="grid items-center gap-4"
        style={{ gridTemplateColumns: "1fr 150px 110px 80px 36px", padding: "13px 22px", background: "#f9fafc", borderBottom: "1px solid #eceef2", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa" }}
      >
        <span>TITLE</span>
        <span>COMPANY</span>
        <span>STATUS</span>
        <span>VIEWS</span>
        <span />
      </div>
      {posts.map((p) => (
        <div
          key={p.id}
          onClick={() => onEdit(p.id)}
          className="grid cursor-pointer items-center gap-4 transition-colors hover:bg-[#f9fafc]"
          style={{ gridTemplateColumns: "1fr 150px 110px 80px 36px", padding: "15px 22px", borderBottom: "1px solid #f2f3f8" }}
        >
          <div className="min-w-0">
            <div className="truncate" style={{ fontSize: 15, fontWeight: 500 }}>
              {p.title}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", marginTop: 4 }}>
              {p.date}
            </div>
          </div>
          <span className="min-w-0">
            {p.company ? (
              <span
                className="inline-block max-w-full truncate align-middle"
                style={{ background: "#eef0fb", color: "#4f5bd5", fontSize: 12, fontWeight: 500, padding: "3px 9px", borderRadius: 999 }}
                title={p.company}
              >
                {p.company}
              </span>
            ) : (
              <span style={{ color: "#c2c6d2" }}>—</span>
            )}
          </span>
          <span>
            <Badge variant={p.status}>{p.status}</Badge>
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#54596a" }}>{p.views}</span>
          {/* Only drafts are deletable — a live post must be set to draft first. */}
          {p.status === "DRAFT" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(p.id);
              }}
              title="Delete draft"
              className="transition-colors hover:text-[#b3383c]"
              style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 16, cursor: "pointer", padding: 4, lineHeight: 1 }}
            >
              ×
            </button>
          ) : (
            <span title="Set to draft to delete" style={{ color: "#c2c6d2", fontSize: 16, textAlign: "center", cursor: "default" }}>
              ×
            </span>
          )}
        </div>
      ))}
      {posts.length === 0 && (
        <div style={{ padding: "40px 22px", textAlign: "center", color: "#9098aa", fontSize: 14 }}>
          No posts yet — create your first one.
        </div>
      )}
    </div>
  );
}
