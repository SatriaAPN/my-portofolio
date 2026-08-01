"use client";

import { useEffect, useRef, useState } from "react";
import { adminUpdateSite } from "@/lib/api";
import { resizeImageToDataURL } from "@/lib/image";
import { useToast } from "@/components/Toast";
import { CompanyMark } from "@/components/CompanyMark";
import type { SiteContent } from "@/lib/types";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #eceef2", borderRadius: 14 };
const inputBase: React.CSSProperties = { border: "1px solid #eceef2", borderRadius: 9, padding: "9px 11px", width: "100%" };

export function SiteSection({ site, onRefresh }: { site: SiteContent; onRefresh: () => void }) {
  const toast = useToast();
  const [sc, setSc] = useState(site);
  const [newSkill, setNewSkill] = useState("");
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

  const addSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const s = newSkill.trim();
    if (!s) return;
    setNewSkill("");
    save({ ...sc, skills: [...sc.skills, s] }, true);
  };

  const removeSkill = (i: number) => save({ ...sc, skills: sc.skills.filter((_, j) => j !== i) }, true);

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

      {/* Stack & skills */}
      <div style={card}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>
          Stack &amp; skills
        </div>
        <div className="flex flex-wrap items-center gap-2.5" style={{ padding: "18px 22px" }}>
          {sc.skills.map((sk, i) => (
            <span
              key={`${sk}-${i}`}
              className="inline-flex items-center gap-2"
              style={{ border: "1px solid #e5e8ef", padding: "7px 9px 7px 15px", borderRadius: 999, fontSize: 14, fontWeight: 500 }}
            >
              {sk}
              <button
                onClick={() => removeSkill(i)}
                title="Remove skill"
                className="flex items-center justify-center transition-colors hover:bg-[#fdf1f1] hover:text-[#b3383c]"
                style={{ background: "#f2f3f8", border: "none", color: "#54596a", width: 20, height: 20, borderRadius: "50%", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
          <form onSubmit={addSkill} className="flex items-center gap-2">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a skill…"
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
      </div>

      <div className="flex items-center gap-[7px]" style={{ fontSize: 13, color: "#9098aa" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2f7d4f", display: "inline-block" }} />
        Changes save automatically and show on the portfolio right away.
      </div>
    </div>
  );
}
