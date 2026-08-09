"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { ToastProvider, useToast } from "@/components/Toast";
import { Badge } from "@/components/Badge";
import { UmlDialog } from "@/components/admin/UmlDialog";
import { FlowchartDialog } from "@/components/admin/FlowchartDialog";
import { adminCreatePost, adminGetPost, adminUpdatePost, getSite } from "@/lib/api";
import { parseUmlFigure, umlFigureHtml, type UmlStep } from "@/lib/uml";
import { flowchartFigureHtml, parseFlowchartFigure, type FlowchartData } from "@/lib/flowchart";
import { dehydrateDiagrams, hydrateDiagrams } from "@/lib/diagrams";
import type { PostStatus } from "@/lib/types";

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
  const [company, setCompany] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [status, setStatus] = useState<PostStatus>("DRAFT");
  const [words, setWords] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [companies, setCompanies] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  // Diagram add-ons: null = closed; el = the <figure> being edited (null when
  // inserting a new one). The caret is saved when a dialog opens because the
  // editor loses focus to the dialog's inputs.
  const [uml, setUml] = useState<{ steps: UmlStep[]; title: string; el: HTMLElement | null } | null>(null);
  const [flow, setFlow] = useState<{ chart: FlowchartData; el: HTMLElement | null } | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (!postId) {
      setLoaded(true);
      return;
    }
    adminGetPost(Number(postId))
      .then((p) => {
        setTitle(p.title);
        setExcerpt(p.excerpt);
        setCompany(p.company || "");
        setTags(p.tags || []);
        setStatus(p.status);
        // Bodies store diagrams as metadata-only figures — render them for
        // display (and refresh any stale baked SVG from older posts).
        if (bodyRef.current) bodyRef.current.innerHTML = hydrateDiagrams(p.body);
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
        setCompanies(dedupe(s.experience.map((x) => x.company)));
        setAllSkills(dedupe(s.skillGroups.flatMap((g) => g.items)));
      })
      .catch(() => {});
  }, []);

  const addTag = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setTagDraft("");
    setTags((cur) => (cur.some((t) => t.toLowerCase() === v.toLowerCase()) ? cur : [...cur, v]));
  };
  const removeTag = (i: number) => setTags((cur) => cur.filter((_, j) => j !== i));
  const skillSuggestions = allSkills.filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()));

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

  const saveCaret = () => {
    const el = bodyRef.current;
    const sel = window.getSelection();
    savedRangeRef.current =
      el && sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)
        ? sel.getRangeAt(0).cloneRange()
        : null;
  };

  const openUml = () => {
    saveCaret();
    setUml({ steps: [], title: "", el: null });
  };

  const openFlow = () => {
    saveCaret();
    setFlow({ chart: { title: "", nodes: [], edges: [] }, el: null });
  };

  // Clicking an existing diagram re-opens its builder pre-filled.
  const onBodyClick = (e: React.MouseEvent) => {
    const fig = (e.target as HTMLElement).closest?.(
      "figure[data-uml],figure[data-flowchart]",
    ) as HTMLElement | null;
    if (!fig || !bodyRef.current?.contains(fig)) return;
    if (fig.hasAttribute("data-uml")) {
      const parsed = parseUmlFigure(fig);
      if (parsed) setUml({ steps: parsed.steps, title: parsed.title, el: fig });
    } else {
      const parsed = parseFlowchartFigure(fig);
      if (parsed) setFlow({ chart: parsed, el: fig });
    }
  };

  // Replace the figure being edited, or insert at the saved caret (falling
  // back to the end of the post) with an empty paragraph after so writing can
  // continue below the figure.
  const insertFigureHtml = (html: string, editingEl: HTMLElement | null) => {
    const el = bodyRef.current;
    if (!el) return;
    const tpl = document.createElement("template");
    if (editingEl) {
      tpl.innerHTML = html;
      editingEl.replaceWith(tpl.content);
    } else {
      tpl.innerHTML = html + "<p><br></p>";
      let range = savedRangeRef.current;
      if (!range || !el.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }
      range.deleteContents();
      range.insertNode(tpl.content);
    }
    setWords(countWords(el.innerHTML));
  };

  const saveUml = (steps: UmlStep[], title: string) => {
    insertFigureHtml(umlFigureHtml(steps, title), uml?.el ?? null);
    setUml(null);
  };

  const removeUml = () => {
    uml?.el?.remove();
    setUml(null);
    setWords(countWords(bodyRef.current?.innerHTML || ""));
  };

  const saveFlow = (chart: FlowchartData) => {
    insertFigureHtml(flowchartFigureHtml(chart), flow?.el ?? null);
    setFlow(null);
  };

  const removeFlow = () => {
    flow?.el?.remove();
    setFlow(null);
    setWords(countWords(bodyRef.current?.innerHTML || ""));
  };

  const save = async (nextStatus: PostStatus) => {
    if (!title.trim()) {
      toast("Give the post a title first");
      return;
    }
    // Strip rendered SVG out of diagram figures — posts persist metadata
    // only; the blog page and editor re-render it on read (lib/diagrams.ts).
    const body = dehydrateDiagrams(bodyRef.current?.innerHTML || "");
    const w = countWords(body);
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const payload = {
      title: title.trim(),
      excerpt,
      body,
      company: company.trim(),
      tags,
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
                <span style={{ width: 1, height: 18, background: "#e2e5ee", margin: "0 4px" }} />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={openUml}
                  title="Insert sequence diagram (click a diagram in the text to edit it)"
                  className="transition-colors hover:bg-[#eceef4] hover:text-ink"
                  style={diagramBtn}
                >
                  UML
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={openFlow}
                  title="Insert flowchart (click a flowchart in the text to edit it)"
                  className="transition-colors hover:bg-[#eceef4] hover:text-ink"
                  style={diagramBtn}
                >
                  FLOW
                </button>
                <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#9098aa" }}>
                  RICH TEXT
                </span>
              </div>
              <div
                ref={bodyRef}
                data-rte="1"
                contentEditable={loaded}
                suppressContentEditableWarning
                onClick={onBodyClick}
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
              <div style={railLabel}>TAGS</div>
              {tags.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {tags.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="inline-flex items-center gap-1.5"
                      style={{ background: "#eef0fb", color: "#4f5bd5", padding: "5px 6px 5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500 }}
                    >
                      {t}
                      <button
                        onClick={() => removeTag(i)}
                        title="Remove tag"
                        className="flex items-center justify-center transition-colors hover:bg-[#dfe3fb]"
                        style={{ background: "rgba(79,91,213,0.15)", border: "none", color: "#4f5bd5", width: 18, height: 18, borderRadius: "50%", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTag(tagDraft);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  placeholder="Add a tag…"
                  className="flex-1 focus:border-primary focus:outline-none"
                  style={{ border: "1px solid #e2e5ee", borderRadius: 11, padding: "9px 12px", fontSize: 14, fontFamily: "var(--font-sans)", color: "#1a1c22", background: "#fff", minWidth: 0 }}
                />
                <button
                  type="submit"
                  className="transition-colors hover:bg-[#e3e6fa]"
                  style={{ background: "#eef0fb", color: "#4f5bd5", border: "none", borderRadius: 11, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
                >
                  Add
                </button>
              </form>
              {skillSuggestions.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.05em", color: "#9098aa" }}>
                    FROM YOUR SKILLS
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {skillSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addTag(s)}
                        title={`Add ${s}`}
                        className="transition-colors hover:bg-[#f2f3f8]"
                        style={{ background: "#fff", color: "#54596a", border: "1px solid #e2e5ee", borderRadius: 999, padding: "5px 11px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 12, color: "#9098aa", marginTop: 9, lineHeight: 1.5 }}>
                Shown as pills on the blog and used as skill evidence by the CV
                generator. Pick from your Skills or type any (e.g. cronjob).
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

      {uml && (
        <UmlDialog
          initialSteps={uml.steps}
          initialTitle={uml.title}
          editing={!!uml.el}
          onSave={saveUml}
          onRemove={uml.el ? removeUml : undefined}
          onClose={() => setUml(null)}
        />
      )}
      {flow && (
        <FlowchartDialog
          initial={flow.chart}
          editing={!!flow.el}
          onSave={saveFlow}
          onRemove={flow.el ? removeFlow : undefined}
          onClose={() => setFlow(null)}
        />
      )}
    </div>
  );
}

function countWords(html: string) {
  const text = html
    // Diagram labels live inside the embedded SVGs; they aren't prose.
    .replace(/<figure[^>]*data-(?:uml|flowchart)[\s\S]*?<\/figure>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

// Trim, drop empties, and de-duplicate case-insensitively, preserving order.
function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out;
}

const diagramBtn: React.CSSProperties = { minWidth: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", borderRadius: 7, color: "#54596a", fontSize: 11, cursor: "pointer", fontWeight: 700, letterSpacing: "0.03em", padding: "0 7px", fontFamily: "var(--font-sans)" };

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
