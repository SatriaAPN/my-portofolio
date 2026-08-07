"use client";

import { useEffect, useRef, useState } from "react";
import { adminDeleteResume, adminSetResume, adminUpdateSite } from "@/lib/api";
import { resizeImageToDataURL } from "@/lib/image";
import { fileToDataURL } from "@/lib/file";
import { useToast } from "@/components/Toast";
import { CompanyMark } from "@/components/CompanyMark";
import type { SiteContent, SkillGroup } from "@/lib/types";
import { SKILL_CATEGORIES } from "@/lib/skills";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #eceef2", borderRadius: 14 };
const inputBase: React.CSSProperties = { border: "1px solid #eceef2", borderRadius: 9, padding: "9px 11px", width: "100%" };

export function SiteSection({ site, onRefresh }: { site: SiteContent; onRefresh: () => void }) {
  const toast = useToast();
  const [sc, setSc] = useState(site);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newHeadline, setNewHeadline] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setSc(site), [site]);

  const save = (next: SiteContent, immediate = false) => {
    setSc(next);
    if (timer.current) clearTimeout(timer.current);
    const run = async () => {
      try {
        await adminUpdateSite(next);
        onRefresh();
      } catch {
        toast("Could not save — image may be too large");
      }
    };
    if (immediate) run();
    else timer.current = setTimeout(run, 600);
  };

  const setExp = (i: number, patch: Partial<SiteContent["experience"][number]>, immediate = false) =>
    save({ ...sc, experience: sc.experience.map((x, j) => (j === i ? { ...x, ...patch } : x)) }, immediate);

  const addExp = () =>
    save({ ...sc, experience: [...sc.experience, { period: "", role: "", company: "", location: "", logo: "", desc: "", highlights: [] }] }, true);

  const onExpLogo = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const url = await resizeImageToDataURL(f, 256);
      setExp(i, { logo: url }, true);
      toast("Logo updated");
    } catch {
      toast("Could not process image");
    }
  };

  const removeExp = (i: number) =>
    save({ ...sc, experience: sc.experience.filter((_, j) => j !== i) }, true);

  const setEdu = (i: number, patch: Partial<SiteContent["education"][number]>, immediate = false) =>
    save({ ...sc, education: sc.education.map((x, j) => (j === i ? { ...x, ...patch } : x)) }, immediate);

  const addEdu = () =>
    save({ ...sc, education: [...sc.education, { school: "", degree: "", field: "", period: "", location: "", logo: "", note: "" }] }, true);

  const removeEdu = (i: number) =>
    save({ ...sc, education: sc.education.filter((_, j) => j !== i) }, true);

  const onEduLogo = async (i: number, ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    try {
      const url = await resizeImageToDataURL(f, 256);
      setEdu(i, { logo: url }, true);
      toast("Logo updated");
    } catch {
      toast("Could not process image");
    }
  };

  const onHeroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const url = await resizeImageToDataURL(f);
      save({ ...sc, heroImage: url }, true);
      toast("Image updated");
    } catch {
      toast("Could not process image");
    }
  };

  const onResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast("Please choose a PDF file");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast("PDF is larger than 5 MB");
      return;
    }
    try {
      const dataUrl = await fileToDataURL(f);
      await adminSetResume(dataUrl, f.name);
      toast("Résumé updated");
      onRefresh();
    } catch {
      toast("Could not upload the résumé");
    }
  };

  const onResumeRemove = async () => {
    try {
      await adminDeleteResume();
      toast("Résumé removed");
      onRefresh();
    } catch {
      toast("Could not remove the résumé");
    }
  };

  // Always show the 4 canonical buckets in order, merging in any stored items,
  // then append any non-canonical groups (e.g. a legacy "Skills" bucket) so
  // nothing entered before categorization is ever hidden.
  const byName = new Map(sc.skillGroups.map((g) => [g.category, g.items] as const));
  const displayGroups: SkillGroup[] = [
    ...SKILL_CATEGORIES.map((c) => ({ category: c, items: byName.get(c) ?? [] })),
    ...sc.skillGroups.filter((g) => !SKILL_CATEGORIES.includes(g.category as (typeof SKILL_CATEGORIES)[number])),
  ];

  const setGroupItems = (category: string, items: string[]) => {
    const next = sc.skillGroups.some((g) => g.category === category)
      ? sc.skillGroups.map((g) => (g.category === category ? { ...g, items } : g))
      : [...sc.skillGroups, { category, items }];
    save({ ...sc, skillGroups: next }, true);
  };

  const addSkill = (category: string) => {
    const v = (drafts[category] || "").trim();
    if (!v) return;
    const items = byName.get(category) ?? [];
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDrafts((d) => ({ ...d, [category]: "" }));
      return;
    }
    setDrafts((d) => ({ ...d, [category]: "" }));
    setGroupItems(category, [...items, v]);
  };

  const removeSkill = (category: string, i: number) => {
    const items = byName.get(category) ?? [];
    setGroupItems(category, items.filter((_, j) => j !== i));
  };

  const addHeadline = (e: React.FormEvent) => {
    e.preventDefault();
    const v = newHeadline.trim();
    if (!v) return;
    setNewHeadline("");
    if (sc.headline.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    save({ ...sc, headline: [...sc.headline, v] }, true);
  };

  const removeHeadline = (i: number) => save({ ...sc, headline: sc.headline.filter((_, j) => j !== i) }, true);

  return (
    <div className="flex flex-col gap-5">
      {/* Experience */}
      <div style={card}>
        <div className="flex items-center justify-between" style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>Experience</span>
          <button
            onClick={addExp}
            className="transition-colors hover:bg-[#e3e6fa]"
            style={{ background: "#eef0fb", color: "#4f5bd5", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            + Add entry
          </button>
        </div>
        {sc.experience.map((x, i) => (
          <div
            key={i}
            className="grid items-start gap-3.5"
            style={{ gridTemplateColumns: "150px 1fr 30px", padding: "18px 22px", borderBottom: "1px solid #f2f3f8" }}
          >
            <input
              value={x.period}
              onChange={(e) => setExp(i, { period: e.target.value })}
              placeholder="2024 — NOW"
              className="focus:border-primary focus:outline-none"
              style={{ ...inputBase, fontFamily: "var(--font-mono)", fontSize: 12, color: "#4f5bd5" }}
            />
            <div className="flex flex-col gap-2">
              <input
                value={x.role}
                onChange={(e) => setExp(i, { role: e.target.value })}
                placeholder="Role title"
                className="focus:border-primary focus:outline-none"
                style={{ ...inputBase, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "#1a1c22" }}
              />
              <div className="flex gap-2">
                <input
                  value={x.company}
                  onChange={(e) => setExp(i, { company: e.target.value })}
                  placeholder="Company"
                  className="flex-1 focus:border-primary focus:outline-none"
                  style={{ ...inputBase, fontSize: 14, fontFamily: "var(--font-sans)", color: "#3a3d47" }}
                />
                <input
                  value={x.location}
                  onChange={(e) => setExp(i, { location: e.target.value })}
                  placeholder="Location"
                  className="focus:border-primary focus:outline-none"
                  style={{ ...inputBase, width: 150, fontSize: 14, fontFamily: "var(--font-sans)", color: "#3a3d47" }}
                />
              </div>
              <textarea
                value={x.desc}
                onChange={(e) => setExp(i, { desc: e.target.value })}
                rows={2}
                placeholder="Optional one-line summary…"
                className="focus:border-primary focus:outline-none"
                style={{ ...inputBase, fontSize: 13.5, fontFamily: "var(--font-sans)", color: "#54596a", resize: "vertical", lineHeight: 1.5 }}
              />

              <div className="flex flex-col gap-1.5">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.05em", color: "#9098aa" }}>
                  HIGHLIGHTS
                </div>
                {(x.highlights || []).map((h, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4f5bd5", flex: "0 0 auto" }} />
                    <input
                      value={h}
                      onChange={(e) =>
                        setExp(i, { highlights: (x.highlights || []).map((hh, k) => (k === j ? e.target.value : hh)) })
                      }
                      placeholder="Verb-first — add a metric where you can…"
                      className="flex-1 focus:border-primary focus:outline-none"
                      style={{ ...inputBase, fontSize: 13, fontFamily: "var(--font-sans)", color: "#54596a" }}
                    />
                    <button
                      onClick={() => setExp(i, { highlights: (x.highlights || []).filter((_, k) => k !== j) }, true)}
                      title="Remove highlight"
                      className="transition-colors hover:text-[#b3383c]"
                      style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 15, cursor: "pointer", padding: "2px 4px", lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setExp(i, { highlights: [...(x.highlights || []), ""] }, true)}
                  className="self-start transition-colors hover:bg-[#e3e6fa]"
                  style={{ background: "#eef0fb", color: "#4f5bd5", border: "none", borderRadius: 9, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
                >
                  + Add highlight
                </button>
              </div>

              <div className="flex items-center gap-2">
                <CompanyMark company={x.company} logo={x.logo} size={30} radius={8} />
                <label
                  className="cursor-pointer transition-colors hover:bg-[#e3e6fa]"
                  style={{ background: "#eef0fb", color: "#4f5bd5", borderRadius: 9, padding: "6px 12px", fontSize: 12.5, fontWeight: 600 }}
                >
                  {x.logo ? "Replace logo" : "Company logo"}
                  <input type="file" accept="image/*" onChange={(e) => onExpLogo(i, e)} className="hidden" />
                </label>
                {x.logo && (
                  <button
                    onClick={() => setExp(i, { logo: "" }, true)}
                    className="transition-colors hover:text-[#b3383c]"
                    style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 12.5, cursor: "pointer", padding: "6px 5px", fontFamily: "var(--font-sans)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => removeExp(i)}
              title="Remove entry"
              className="transition-colors hover:text-[#b3383c]"
              style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 17, cursor: "pointer", padding: 4, lineHeight: 1, marginTop: 4 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Education */}
      <div style={card}>
        <div className="flex items-center justify-between" style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>Education</span>
          <button
            onClick={addEdu}
            className="transition-colors hover:bg-[#e3e6fa]"
            style={{ background: "#eef0fb", color: "#4f5bd5", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            + Add entry
          </button>
        </div>
        {sc.education.map((e, i) => (
          <div
            key={i}
            className="grid items-start gap-3.5"
            style={{ gridTemplateColumns: "150px 1fr 30px", padding: "18px 22px", borderBottom: "1px solid #f2f3f8" }}
          >
            <input
              value={e.period}
              onChange={(ev) => setEdu(i, { period: ev.target.value })}
              placeholder="2018 — 2022"
              className="focus:border-primary focus:outline-none"
              style={{ ...inputBase, fontFamily: "var(--font-mono)", fontSize: 12, color: "#4f5bd5" }}
            />
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={e.degree}
                  onChange={(ev) => setEdu(i, { degree: ev.target.value })}
                  placeholder="B.Sc."
                  className="focus:border-primary focus:outline-none"
                  style={{ ...inputBase, width: 120, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "#1a1c22" }}
                />
                <input
                  value={e.field}
                  onChange={(ev) => setEdu(i, { field: ev.target.value })}
                  placeholder="Computer Science"
                  className="flex-1 focus:border-primary focus:outline-none"
                  style={{ ...inputBase, fontSize: 14, fontFamily: "var(--font-sans)", color: "#3a3d47" }}
                />
              </div>
              <div className="flex gap-2">
                <input
                  value={e.school}
                  onChange={(ev) => setEdu(i, { school: ev.target.value })}
                  placeholder="University"
                  className="flex-1 focus:border-primary focus:outline-none"
                  style={{ ...inputBase, fontSize: 14, fontFamily: "var(--font-sans)", color: "#3a3d47" }}
                />
                <input
                  value={e.location}
                  onChange={(ev) => setEdu(i, { location: ev.target.value })}
                  placeholder="Location"
                  className="focus:border-primary focus:outline-none"
                  style={{ ...inputBase, width: 150, fontSize: 14, fontFamily: "var(--font-sans)", color: "#3a3d47" }}
                />
              </div>
              <textarea
                value={e.note}
                onChange={(ev) => setEdu(i, { note: ev.target.value })}
                rows={2}
                placeholder="Optional — honors, thesis, relevant coursework…"
                className="focus:border-primary focus:outline-none"
                style={{ ...inputBase, fontSize: 13.5, fontFamily: "var(--font-sans)", color: "#54596a", resize: "vertical", lineHeight: 1.5 }}
              />

              <div className="flex items-center gap-2">
                <CompanyMark company={e.school} logo={e.logo} size={30} radius={8} />
                <label
                  className="cursor-pointer transition-colors hover:bg-[#e3e6fa]"
                  style={{ background: "#eef0fb", color: "#4f5bd5", borderRadius: 9, padding: "6px 12px", fontSize: 12.5, fontWeight: 600 }}
                >
                  {e.logo ? "Replace logo" : "University logo"}
                  <input type="file" accept="image/*" onChange={(ev) => onEduLogo(i, ev)} className="hidden" />
                </label>
                {e.logo && (
                  <button
                    onClick={() => setEdu(i, { logo: "" }, true)}
                    className="transition-colors hover:text-[#b3383c]"
                    style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 12.5, cursor: "pointer", padding: "6px 5px", fontFamily: "var(--font-sans)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => removeEdu(i)}
              title="Remove entry"
              className="transition-colors hover:text-[#b3383c]"
              style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 17, cursor: "pointer", padding: 4, lineHeight: 1, marginTop: 4 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Images */}
      <div style={card}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>
          Images
        </div>
        <div style={{ padding: "20px 22px" }} className="flex flex-col gap-2.5">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa" }}>
            HERO HEADSHOT
          </div>
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{ width: 150, height: 150, borderRadius: 12, border: "1px solid #eceef2", background: sc.heroImage ? undefined : "var(--stripe)" }}
          >
            {sc.heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sc.heroImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <span style={{ color: "#9098aa", fontSize: 12.5 }}>No image yet</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label
              className="cursor-pointer transition-colors hover:bg-[#e3e6fa]"
              style={{ background: "#eef0fb", color: "#4f5bd5", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}
            >
              Upload
              <input type="file" accept="image/*" onChange={onHeroFile} className="hidden" />
            </label>
            {sc.heroImage && (
              <button
                onClick={() => save({ ...sc, heroImage: "" }, true)}
                className="transition-colors hover:text-[#b3383c]"
                style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 13, cursor: "pointer", padding: "8px 6px", fontFamily: "var(--font-sans)" }}
              >
                Remove
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#9098aa" }}>Shown in the portfolio hero. Square works best.</div>
        </div>
      </div>

      {/* Résumé */}
      <div style={card}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>
          Résumé
        </div>
        <div style={{ padding: "20px 22px" }} className="flex flex-col gap-2.5">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa" }}>
            RÉSUMÉ PDF
          </div>
          <div className="flex items-center gap-3">
            <span
              className="flex flex-none items-center justify-center"
              style={{ width: 42, height: 42, borderRadius: 10, background: sc.hasResume ? "#eef0fb" : "var(--stripe)", fontSize: 20 }}
            >
              {sc.hasResume ? "📄" : ""}
            </span>
            <div className="flex min-w-0 flex-col">
              {sc.hasResume ? (
                <>
                  <span className="truncate" style={{ fontSize: 14, color: "#1a1c22", fontWeight: 500 }}>
                    {sc.resumeName || "resume.pdf"}
                  </span>
                  <a
                    href="/api/resume"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ fontSize: 12.5, color: "#4f5bd5" }}
                  >
                    Open current PDF ↗
                  </a>
                </>
              ) : (
                <span style={{ fontSize: 13.5, color: "#9098aa" }}>No résumé uploaded yet</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label
              className="cursor-pointer transition-colors hover:bg-[#e3e6fa]"
              style={{ background: "#eef0fb", color: "#4f5bd5", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}
            >
              {sc.hasResume ? "Replace PDF" : "Upload PDF"}
              <input type="file" accept="application/pdf" onChange={onResumeFile} className="hidden" />
            </label>
            {sc.hasResume && (
              <button
                onClick={onResumeRemove}
                className="transition-colors hover:text-[#b3383c]"
                style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 13, cursor: "pointer", padding: "8px 6px", fontFamily: "var(--font-sans)" }}
              >
                Remove
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#9098aa" }}>
            Opens from the “Résumé” button in the site header. PDF up to 5 MB.
          </div>
        </div>
      </div>

      {/* Headline strengths */}
      <div style={card}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>Headline strengths</div>
          <div style={{ fontSize: 12.5, color: "#9098aa", marginTop: 3 }}>
            The 3–4 you lead with — shown as the CORE row on the site and first on tailored CVs.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5" style={{ padding: "18px 22px" }}>
          {sc.headline.map((sk, i) => (
            <span
              key={`${sk}-${i}`}
              className="inline-flex items-center gap-2"
              style={{ background: "#4f5bd5", color: "#fff", padding: "7px 9px 7px 15px", borderRadius: 999, fontSize: 14, fontWeight: 600 }}
            >
              {sk}
              <button
                onClick={() => removeHeadline(i)}
                title="Remove from headline"
                className="flex items-center justify-center transition-colors hover:bg-[#3a45b8]"
                style={{ background: "rgba(255,255,255,0.22)", border: "none", color: "#fff", width: 20, height: 20, borderRadius: "50%", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
          <form onSubmit={addHeadline} className="flex items-center gap-2">
            <input
              value={newHeadline}
              onChange={(e) => setNewHeadline(e.target.value)}
              placeholder="Add a strength…"
              className="focus:border-primary focus:outline-none"
              style={{ border: "1px solid #eceef2", borderRadius: 999, padding: "8px 15px", fontSize: 14, fontFamily: "var(--font-sans)", color: "#1a1c22", width: 150 }}
            />
            <button
              type="submit"
              className="transition-colors hover:bg-[#e3e6fa]"
              style={{ background: "#eef0fb", color: "#4f5bd5", border: "none", borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              Add
            </button>
          </form>
        </div>
        {sc.headline.length > 4 && (
          <div style={{ padding: "0 22px 16px", fontSize: 12, color: "#9098aa" }}>
            Tip: keep it to 3–4 for impact — the rest still show in the categories below.
          </div>
        )}
      </div>

      {/* Skills by category */}
      <div style={card}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>Skills by category</div>
          <div style={{ fontSize: 12.5, color: "#9098aa", marginTop: 3 }}>
            Grouped for display; the Tailored CV still matches across every skill here.
          </div>
        </div>
        {displayGroups.map((g) => (
          <div key={g.category} style={{ padding: "16px 22px", borderBottom: "1px solid #f2f3f8" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9098aa", marginBottom: 11 }}>
              {g.category}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {g.items.map((sk, i) => (
                <span
                  key={`${sk}-${i}`}
                  className="inline-flex items-center gap-2"
                  style={{ border: "1px solid #e5e8ef", padding: "7px 9px 7px 15px", borderRadius: 999, fontSize: 14, fontWeight: 500 }}
                >
                  {sk}
                  <button
                    onClick={() => removeSkill(g.category, i)}
                    title="Remove skill"
                    className="flex items-center justify-center transition-colors hover:bg-[#fdf1f1] hover:text-[#b3383c]"
                    style={{ background: "#f2f3f8", border: "none", color: "#54596a", width: 20, height: 20, borderRadius: "50%", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addSkill(g.category);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={drafts[g.category] || ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [g.category]: e.target.value }))}
                  placeholder="Add…"
                  className="focus:border-primary focus:outline-none"
                  style={{ border: "1px solid #eceef2", borderRadius: 999, padding: "8px 15px", fontSize: 14, fontFamily: "var(--font-sans)", color: "#1a1c22", width: 130 }}
                />
                <button
                  type="submit"
                  className="transition-colors hover:bg-[#e3e6fa]"
                  style={{ background: "#eef0fb", color: "#4f5bd5", border: "none", borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-[7px]" style={{ fontSize: 13, color: "#9098aa" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2f7d4f", display: "inline-block" }} />
        Changes save automatically and show on the portfolio right away.
      </div>
    </div>
  );
}
