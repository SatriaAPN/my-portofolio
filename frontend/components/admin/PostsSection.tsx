import { Badge } from "@/components/Badge";
import type { Post } from "@/lib/types";

export function PostsSection({
  posts,
  onEdit,
}: {
  posts: Post[];
  onEdit: (id: number) => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, overflow: "hidden" }}>
      <div
        className="grid items-center gap-4"
        style={{ gridTemplateColumns: "1fr 130px 120px 90px", padding: "13px 22px", background: "#f9fafc", borderBottom: "1px solid #eceef2", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa" }}
      >
        <span>TITLE</span>
        <span>CATEGORY</span>
        <span>STATUS</span>
        <span>VIEWS</span>
      </div>
      {posts.map((p) => (
        <div
          key={p.id}
          onClick={() => onEdit(p.id)}
          className="grid cursor-pointer items-center gap-4 transition-colors hover:bg-[#f9fafc]"
          style={{ gridTemplateColumns: "1fr 130px 120px 90px", padding: "15px 22px", borderBottom: "1px solid #f2f3f8" }}
        >
          <div className="min-w-0">
            <div className="truncate" style={{ fontSize: 15, fontWeight: 500 }}>
              {p.title}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", marginTop: 4 }}>
              {p.date}
            </div>
          </div>
          <span style={{ fontSize: 13.5, color: "#54596a" }}>{p.category}</span>
          <span>
            <Badge variant={p.status}>{p.status}</Badge>
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#54596a" }}>{p.views}</span>
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
