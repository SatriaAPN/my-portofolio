// Renders a post's tags as small pills. Shared by the blog index cards and the
// post header so they look identical everywhere.
export function PostTags({
  tags,
  size = "sm",
}: {
  tags: string[];
  size?: "sm" | "md";
}) {
  if (!tags || tags.length === 0) return null;
  const pad = size === "md" ? "5px 12px" : "4px 10px";
  const fs = size === "md" ? 13 : 12;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          style={{
            background: "#eef0fb",
            color: "#4f5bd5",
            padding: pad,
            borderRadius: 999,
            fontSize: fs,
            fontWeight: 500,
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
