"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { ToastProvider, useToast } from "@/components/Toast";
import { Badge } from "@/components/Badge";
import { adminCreatePost, adminGetPost, adminUpdatePost, getSite } from "@/lib/api";
import type { Category, PostStatus } from "@/lib/types";

const CATEGORIES: Category[] = ["Performance", "Architecture", "Databases", "Testing"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "post";
}

const FMT: { type: string; label: string; title: string; italic?: boolean; bold?: boolean }[] = [
  { type: "bold", label: "B", title: "Bold", bold: true },
  { type: "italic", label: "I", title: "Italic", italic: true },
  { type: "h2", label: "H2", title: "Heading" },
  { type: "quote", label: "❝", title: "Quote" },
  { type: "list", label: "≡", title: "Bulleted list" },
  { type: "code", label: "‹›", title: "Inline code" },
  { type: "block", label: "{ }", title: "Code block" },
  { type: "link", label: "🔗", title: "Link" },
];

function EditorInner() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const postId = params.get("post");

  const bodyRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState<Category>("Performance");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<PostStatus>("DRAFT");
  const [words, setWords] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [companies, setCompanies] = useState<string[]>([]);

  useEffect(() => {
    if (!postId) {
      setLoaded(true);
      return;
    }
    adminGetPost(Number(postId))
      .then((p) => {
        setTitle(p.title);
        setExcerpt(p.excerpt);
        setCategory(p.category);
        setCompany(p.company || "");
        setStatus(p.status);
        if (bodyRef.current) bodyRef.current.innerHTML = p.body;
        setWords(countWords(p.body));
      })
      .catch(() => toast("Could not load post"))
      .finally(() => setLoaded(true));
  }, [postId, toast]);

  // Suggest the companies already in the Experience section, so a post links
  // cleanly to an experience entry for the tailored CV generator.
  useEffect(() => {
    getSite()
      .then((s) => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const x of s.experience) {
          const c = x.company.trim();
          if (c && !seen.has(c.toLowerCase())) {
            seen.add(c.toLowerCase());
            out.push(c);
          }
        }
        setCompanies(out);
      })
      .catch(() => {});
  }, []);

  const applyFmt = (type: string) => {
    const el = bodyRef.current;
    if (!el) return;
    el.focus();
    const cmd = document.execCommand.bind(document);
    if (type === "bold") cmd("bold");
    else if (type === "italic") cmd("italic");
    else if (type === "h2") cmd("formatBlock", false, "h2");
    else if (type === "quote") cmd("formatBlock", false, "blockquote");
    else if (type === "list") cmd("insertUnorderedList");
    else if (type === "block") cmd("formatBlock", false, "pre");
    else if (type === "code") {
      const sel = window.getSelection()?.toString();
      cmd("insertHTML", false, "<code>" + (sel || "code") + "</code>&nbsp;");
    } else if (type === "link") {
      const url = window.prompt("Link URL", "https://");
      if (url) cmd("createLink", false, url);
    }
    setWords(countWords(el.innerHTML));
  };

  const save = async (nextStatus: PostStatus) => {
    if (!title.trim()) {
      toast("Give the post a title first");
      return;
    }
    const body = bodyRef.current?.innerHTML || "";
    const w = countWords(body);
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const payload = {
      title: title.trim(),
      excerpt,
      body,
      category,
      company: company.trim(),
      status: nextStatus,
      readMin: Math.max(1, Math.round(w / 200)),
      date: nextStatus === "LIVE" ? today : "—",
      views: nextStatus === "LIVE" ? "0" : "—",
    };
    try {
      if (postId) await adminUpdatePost(Number(postId), payload);
      else await adminCreatePost(payload);
      toast(nextStatus === "LIVE" ? "Published — heading back to the dashboard…" : "Draft saved — heading back…");
      setTimeout(() => router.push("/admin"), 900);
    } catch {
      toast("Could not save the post");
    }
  };

  const slug = slugify(title);
  const readMeta = `${words} words`;
  // Options are the Experience companies; keep any already-saved value that is
  // no longer in that list so editing an old post never silently drops its tag.
  const companyOptions =
    company && !companies.some((c) => c.toLowerCase() === company.toLowerCase())
      ? [...companies, company]
      : companies;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb" }}>
      {/* TOP BAR */}
      <div style={{ background: "#fff", borderBottom: "1px solid #eceef2", position: "sticky", top: 0, zIndex: 40 }}>
        <div className="flex flex-wrap items-center gap-3.5" style={{ padding: "16px 28px" }}>
          <Link href="/admin" className="inline-flex items-center gap-2 text-[14px] font-medium transition-colors hover:text-ink" style={{ color: "#54596a" }}>
            <span style={{ fontSize: 15, lineHeight: 0 }}>←</span> Dashboard
          </Link>
          <span style={{ width: 1, height: 20, background: "#e2e5ee" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>
            {postId ? "Edit post" : "New post"}
          </span>
          <Badge variant={status}>{status}</Badge>
          <span className="flex-1" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa" }}>{readMeta}</span>
          <button
            onClick={() => save("DRAFT")}
            className="transition-colors hover:border-primary hover:text-primary"
            style={{ background: "#fff", color: "#1a1c22", border: "1px solid #d9dce4", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Save draft
          </button>
          <button
            onClick={() => save("LIVE")}
            className="text-white transition-colors hover:bg-[#3a45b8]"
            style={{ background: "#4f5bd5", border: "none", borderRadius: 11, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Publish
          </button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ padding: "28px 28px 64px" }}>
        <div className="mx-auto grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_300px]" style={{ maxWidth: 1120 }}>
          <div className="flex flex-col gap-4" style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: "28px 32px 30px" }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              style={{ border: "none", background: "transparent", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 32, letterSpacing: "-0.02em", color: "#1a1c22", padding: 0, width: "100%", outline: "none" }}
            />
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One-sentence excerpt for the blog index…"
              rows={2}
              className="focus:border-primary focus:outline-none"
              style={{ border: "1px solid #eceef2", borderRadius: 11, padding: "12px 15px", fontSize: 15, fontFamily: "var(--font-sans)", color: "#1a1c22", resize: "vertical", width: "100%" }}
            />
            <div style={{ border: "1px solid #eceef2", borderRadius: 11, overflow: "hidden" }}>
              <div className="flex flex-wrap items-center gap-0.5" style={{ padding: "7px 8px", borderBottom: "1px solid #eceef2", background: "#f9fafc" }}>
                {FMT.map((f) => (
                  <button
                    key={f.type}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFmt(f.type)}
                    title={f.title}
                    className="transition-colors hover:bg-[#eceef4] hover:text-ink"
                    style={{ minWidth: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", borderRadius: 7, color: "#54596a", fontSize: 13, cursor: "pointer", fontWeight: f.bold ? 700 : 500, fontStyle: f.italic ? "italic" : "normal", padding: "0 7px", fontFamily: "var(--font-sans)" }}
                  >
                    {f.label}
                  </button>
                ))}
                <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#9098aa" }}>
                  RICH TEXT
                </span>
              </div>
              <div
                ref={bodyRef}
                data-rte="1"
                contentEditable={loaded}
                suppressContentEditableWarning
                onInput={() => setWords(countWords(bodyRef.current?.innerHTML || ""))}
                data-placeholder="Write the post — select text and use the toolbar to format it, exactly as it will render."
                className="article"
                style={{ minHeight: "52vh", maxHeight: "70vh", overflowY: "auto", padding: "18px 20px", fontSize: 15.5, lineHeight: 1.75, fontFamily: "var(--font-sans)", color: "#2c2f38", background: "#fff" }}
              />
            </div>
          </div>

          {/* RAIL */}
          <div className="flex flex-col gap-3.5">
            <div style={rail}>
              <div style={railLabel}>DETAILS</div>
              <div className="flex flex-col gap-[11px]" style={{ fontSize: 13.5, color: "#54596a" }}>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge variant={status}>{status}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Slug</span>
                  <span className="truncate" style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#1a1c22", maxWidth: 160 }}>
                    /{slug}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Length</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#1a1c22" }}>{readMeta}</span>
                </div>
              </div>
            </div>
            <div style={rail}>
              <div style={railLabel}>CATEGORY</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                style={{ width: "100%", border: "1px solid #e2e5ee", borderRadius: 11, padding: "11px 12px", fontSize: 14, fontFamily: "var(--font-sans)", color: "#1a1c22", background: "#fff", cursor: "pointer" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div style={rail}>
              <div style={railLabel}>COMPANY</div>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                style={{ width: "100%", border: "1px solid #e2e5ee", borderRadius: 11, padding: "11px 12px", fontSize: 14, fontFamily: "var(--font-sans)", color: company ? "#1a1c22" : "#9098aa", background: "#fff", cursor: "pointer" }}
              >
                <option value="">No company</option>
                {companyOptions.map((c) => (
                  <option key={c} value={c} style={{ color: "#1a1c22" }}>
                    {c}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, color: "#9098aa", marginTop: 9, lineHeight: 1.5 }}>
                Optional. Pick a company from your Experience so the AI CV
                generator can turn this post into an experience point. Not shown
                on the blog.
              </div>
            </div>
            <div style={rail}>
              <div style={railLabel}>COVER</div>
              <div
                className="flex items-center justify-center text-center"
                style={{ aspectRatio: "16/9", border: "1.5px dashed #d9dce4", borderRadius: 11, background: "#f9fafc", color: "#9098aa", fontSize: 13, padding: 12 }}
              >
                Drop an image here
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function countWords(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

const rail: React.CSSProperties = { background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: 20 };
const railLabel: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa", marginBottom: 12 };

export default function EditorPage() {
  return (
    <AdminGate>
      {() => (
        <ToastProvider>
          <Suspense fallback={null}>
            <EditorInner />
          </Suspense>
        </ToastProvider>
      )}
    </AdminGate>
  );
}
