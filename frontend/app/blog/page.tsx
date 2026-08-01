import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { BlogFilterGrid } from "@/components/BlogFilterGrid";
import { getLivePosts } from "@/lib/api";
import type { Post } from "@/lib/types";

export const metadata = {
  title: "Writing",
  description:
    "Notes from building backends that hold up — performance, architecture, and databases.",
};

const STRIPE =
  "repeating-linear-gradient(45deg,#eef0f5,#eef0f5 9px,#e5e8ef 9px,#e5e8ef 18px)";

export default async function BlogPage() {
  let posts: Post[] = [];
  try {
    posts = await getLivePosts();
  } catch {
    /* backend unreachable */
  }
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <main>
      <SiteNav active="writing" variant="inner" />

      {/* HEADER */}
      <div className="px-5 pt-[72px] pb-10 md:px-10">
        <div
          style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.06em", color: "#4f5bd5", marginBottom: 16 }}
        >
          THE BLOG
        </div>
        <h1
          className="text-[36px] md:text-[52px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.025em", margin: "0 0 16px", textWrap: "balance" }}
        >
          Notes from building backends that hold up.
        </h1>
        <p style={{ fontSize: 18, color: "#54596a", maxWidth: "52ch", margin: 0 }}>
          Performance, architecture, and databases — written up as I ship. New
          post roughly once a month.
        </p>
      </div>

      {/* FEATURED POST */}
      {featured && (
        <div className="px-5 pt-3 pb-11 md:px-10">
          <Link
            href={`/blog/${featured.slug}`}
            className="grid grid-cols-1 overflow-hidden text-ink transition-shadow duration-200 hover:shadow-cardhover md:grid-cols-[1.2fr_1fr]"
            style={{ border: "1px solid #eceef2", borderRadius: 18 }}
          >
            <div
              className="flex items-end"
              style={{ background: STRIPE, minHeight: 280, padding: 16 }}
            >
              <span
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", background: "#fff", padding: "5px 10px", borderRadius: 7 }}
              >
                COVER IMAGE
              </span>
            </div>
            <div className="flex flex-col justify-center" style={{ padding: "40px 44px" }}>
              <div className="mb-3.5 flex items-center gap-3">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#4f5bd5" }}>
                  {featured.category.toUpperCase()}
                </span>
                <span
                  style={{ background: "#eef0fb", color: "#4f5bd5", fontFamily: "var(--font-mono)", fontSize: 10.5, padding: "4px 10px", borderRadius: 999 }}
                >
                  LATEST
                </span>
              </div>
              <h2
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 30, lineHeight: 1.12, letterSpacing: "-0.02em", margin: "0 0 14px" }}
              >
                {featured.title}
              </h2>
              <p style={{ color: "#54596a", margin: "0 0 18px", fontSize: 16 }}>
                {featured.excerpt}
              </p>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#9098aa" }}>
                {`${featured.date} · ${featured.readMin} MIN`.toUpperCase()}
              </div>
            </div>
          </Link>
        </div>
      )}

      <BlogFilterGrid posts={rest} />

      {/* FOOTER */}
      <div className="px-5 pb-14 text-center md:px-10">
        <div
          style={{ paddingTop: 24, borderTop: "1px solid #eceef2", fontFamily: "var(--font-mono)", fontSize: 12, color: "#9098aa" }}
        >
          © 2026 Satria Nusa · <Link href="/">satrianusa.dev</Link>
        </div>
      </div>
    </main>
  );
}
