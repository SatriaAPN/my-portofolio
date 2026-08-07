"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/Container";
import type { Post } from "@/lib/types";

const CATS = ["All", "Performance", "Architecture", "Databases", "Testing"] as const;
const STRIPE =
  "repeating-linear-gradient(45deg,#eef0f5,#eef0f5 9px,#e5e8ef 9px,#e5e8ef 18px)";

export function BlogFilterGrid({ posts }: { posts: Post[] }) {
  const [filter, setFilter] = useState<(typeof CATS)[number]>("All");
  const shown = posts.filter((p) => filter === "All" || p.category === filter);

  return (
    <>
      {/* FILTERS */}
      <Container className="flex flex-wrap items-center gap-2.5 pb-7">
        <span
          className="mr-1.5"
          style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#9098aa" }}
        >
          FILTER
        </span>
        {CATS.map((c) => {
          const active = filter === c;
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className="transition-colors"
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: 13.5,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                background: active ? "#4f5bd5" : "#fff",
                color: active ? "#fff" : "#54596a",
                border: `1px solid ${active ? "#4f5bd5" : "#e2e5ee"}`,
              }}
            >
              {c}
            </button>
          );
        })}
      </Container>

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
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#4f5bd5" }}>
                {p.category.toUpperCase()}
              </div>
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
