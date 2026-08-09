import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { ReadingProgress } from "@/components/ReadingProgress";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { PostTags } from "@/components/PostTags";
import { getLivePosts, getPost } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { hydrateDiagrams } from "@/lib/diagrams";
import type { Post } from "@/lib/types";

const STRIPE =
  "repeating-linear-gradient(45deg,#eef0f5,#eef0f5 9px,#e5e8ef 9px,#e5e8ef 18px)";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const post = await getPost(slug);
    return { title: post.title, description: post.excerpt };
  } catch {
    return { title: "Post" };
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let post: Post;
  try {
    post = await getPost(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  // Older/Newer navigation across the LIVE list (newest first).
  let live: Post[] = [];
  try {
    live = await getLivePosts();
  } catch {
    /* ignore */
  }
  const idx = live.findIndex((p) => p.slug === post.slug);
  const older = idx >= 0 ? live[idx + 1] : undefined;
  const newer = idx > 0 ? live[idx - 1] : undefined;

  return (
    <main>
      <ReadingProgress />
      <SiteNav active="writing" variant="inner" />

      {/* ARTICLE HEADER */}
      <div className="mx-auto px-5 pt-16 md:px-10" style={{ maxWidth: 760 }}>
        <Link
          href="/blog"
          className="mb-[34px] inline-flex items-center gap-2 text-[14px] font-medium transition-colors hover:text-ink"
          style={{ color: "#54596a" }}
        >
          <span style={{ fontSize: 15, lineHeight: 0 }}>←</span> All posts
        </Link>
        <h1
          className="text-[32px] md:text-[44px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.025em", margin: "0 0 22px", textWrap: "balance" }}
        >
          {post.title}
        </h1>
        <p style={{ fontSize: 19, color: "#54596a", margin: "0 0 22px" }}>{post.excerpt}</p>
        {post.tags.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <PostTags tags={post.tags} size="md" />
          </div>
        )}
        <div
          className="flex items-center gap-3.5"
          style={{ paddingBottom: 34, borderBottom: "1px solid #eceef2" }}
        >
          <Avatar size={40} />
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>Satria Nusa</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#9098aa", marginTop: 2 }}>
              {`${post.date} · ${post.readMin} MIN READ`.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* COVER */}
      <div className="mx-auto px-5 pt-9 md:px-10" style={{ maxWidth: 960 }}>
        <div
          className="flex items-end"
          style={{ aspectRatio: "21/9", borderRadius: 18, border: "1px solid #e5e8ef", background: STRIPE, padding: 16 }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", background: "#fff", padding: "5px 10px", borderRadius: 7 }}>
            COVER IMAGE
          </span>
        </div>
      </div>

      {/* BODY — diagrams are stored as metadata-only figures; render them
          server-side so the page ships complete SVG with no client JS. */}
      <article
        className="article mx-auto px-5 pt-11 pb-6 md:px-10"
        style={{ maxWidth: 760 }}
        dangerouslySetInnerHTML={{ __html: hydrateDiagrams(post.body || `<p>${post.excerpt}</p>`) }}
      />

      {/* SHARE */}
      <div
        className="mx-auto flex flex-wrap items-center justify-end gap-4 px-5 pb-11 md:px-10"
        style={{ maxWidth: 760 }}
      >
        <CopyLinkButton />
      </div>

      {/* AUTHOR CARD */}
      <div className="mx-auto px-5 pb-[52px] md:px-10" style={{ maxWidth: 760 }}>
        <div
          className="flex items-center gap-[18px]"
          style={{ background: "#f6f7fb", border: "1px solid #eceef2", borderRadius: 16, padding: "26px 28px" }}
        >
          <Avatar size={52} />
          <div className="flex-1">
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>
              Satria Aluh Perwira Nusa
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 14.5, color: "#54596a" }}>
              Fullstack engineer, 4 years across backend and product. I write
              about what I ship — or <Link href="/ask-ai">ask my AI assistant</Link> anything.
            </p>
          </div>
          <Link
            href="/#contact"
            className="whitespace-nowrap transition-colors hover:border-primary hover:text-primary"
            style={{ border: "1px solid #d9dce4", color: "#1a1c22", padding: "10px 18px", borderRadius: 11, fontSize: 14, fontWeight: 500 }}
          >
            Get in touch
          </Link>
        </div>
      </div>

      {/* PREV / NEXT */}
      <div
        className="mx-auto grid grid-cols-1 gap-[18px] px-5 pb-[72px] md:grid-cols-2 md:px-10"
        style={{ maxWidth: 960 }}
      >
        {older ? (
          <Link
            href={`/blog/${older.slug}`}
            className="transition-shadow hover:shadow-card"
            style={{ border: "1px solid #eceef2", borderRadius: 16, padding: "22px 24px", color: "#1a1c22" }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", marginBottom: 10 }}>
              ← OLDER
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, lineHeight: 1.3 }}>
              {older.title}
            </div>
          </Link>
        ) : (
          <span />
        )}
        {newer && (
          <Link
            href={`/blog/${newer.slug}`}
            className="text-right transition-shadow hover:shadow-card"
            style={{ border: "1px solid #eceef2", borderRadius: 16, padding: "22px 24px", color: "#1a1c22" }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", marginBottom: 10 }}>
              NEWER →
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, lineHeight: 1.3 }}>
              {newer.title}
            </div>
          </Link>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-5 pb-14 text-center md:px-10">
        <div style={{ paddingTop: 24, borderTop: "1px solid #eceef2", fontFamily: "var(--font-mono)", fontSize: 12, color: "#9098aa" }}>
          © 2026 Satria Nusa · <Link href="/">satrianusa.dev</Link>
        </div>
      </div>
    </main>
  );
}

function Avatar({ size }: { size: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center text-white"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#4f5bd5,#6a5be0)",
        fontSize: size < 45 ? 13 : 16,
        fontWeight: 600,
        fontFamily: "var(--font-display)",
      }}
    >
      SN
    </span>
  );
}
