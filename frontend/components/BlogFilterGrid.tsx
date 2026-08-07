"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/Container";
import { PostTags } from "@/components/PostTags";
import type { Post } from "@/lib/types";

const STRIPE =
  "repeating-linear-gradient(45deg,#eef0f5,#eef0f5 9px,#e5e8ef 9px,#e5e8ef 18px)";

export function BlogFilterGrid({ posts }: { posts: Post[] }) {
  const [tag, setTag] = useState<string | null>(null);

  // Unique tags across all posts (case-insensitive), alphabetical.
  const allTags = Array.from(
    posts
      .reduce((m, p) => {
        for (const t of p.tags) m.set(t.toLowerCase(), t);
        return m;
      }, new Map<string, string>())
      .values()
  ).sort((a, b) => a.localeCompare(b));

  const shown = posts.filter(
    (p) => tag === null || p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );

  return (
    <>
      {/* TAG FILTER */}
      {allTags.length > 0 && (
        <Container className="flex flex-wrap items-center gap-2 pb-7">
          <span
            className="mr-1.5"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#9098aa" }}
          >
            FILTER
          </span>
          <button
            onClick={() => setTag(null)}
            className="transition-colors"
            style={{
              padding: "6px 13px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              background: tag === null ? "#eef0fb" : "#fff",
              color: tag === null ? "#4f5bd5" : "#54596a",
              border: `1px solid ${tag === null ? "#cdd4ff" : "#e2e5ee"}`,
            }}
          >
            All
          </button>
          {allTags.map((t) => {
            const active = tag !== null && tag.toLowerCase() === t.toLowerCase();
            return (
              <button
                key={t}
                onClick={() => setTag(active ? null : t)}
                className="transition-colors"
                style={{
                  padding: "6px 13px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  background: active ? "#4f5bd5" : "#fff",
                  color: active ? "#fff" : "#54596a",
                  border: `1px solid ${active ? "#4f5bd5" : "#e2e5ee"}`,
                }}
              >
                {t}
              </button>
            );
          })}
        </Container>
      )}

      {/* POST GRID */}
      <Container className="grid grid-cols-1 gap-[22px] pb-[72px] md:grid-cols-3">
        {shown.map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="flex flex-col overflow-hidden text-ink transition-[box-shadow,transform] duration-200 hover:-translate-y-[2px] hover:shadow-card"
            style={{ border: "1px solid #eceef2", borderRadius: 16 }}
          >
            <div style={{ aspectRatio: "16/10", background: STRIPE }} />
            <div className="flex flex-1 flex-col gap-2.5" style={{ padding: 20 }}>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 19,
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                {p.title}
              </h3>
              <p className="flex-1" style={{ color: "#54596a", fontSize: 14.5, margin: 0 }}>
                {p.excerpt}
              </p>
              <PostTags tags={p.tags} />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#9098aa" }}>
                {`${p.date} · ${p.readMin} MIN`.toUpperCase()}
              </div>
            </div>
          </Link>
        ))}
      </Container>
    </>
  );
}
