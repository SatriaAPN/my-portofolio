"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { ToastProvider, useToast } from "@/components/Toast";
import {
  adminGenerateCV,
  adminGetCV,
  getLivePosts,
  getProjects,
  getSite,
} from "@/lib/api";
import type { CV, Project, SiteContent } from "@/lib/types";

const SAMPLE_JD = `Senior Backend Engineer — StreamPay

We are looking for a senior backend engineer to own our payments platform. You will design Go services on PostgreSQL and Kafka, drive p99 latency down across the checkout path, and mentor a team of four.

Experience with event-driven architecture, Docker, Kubernetes and observability tooling (Prometheus, Grafana) is a big plus. React familiarity helps — you will pair with product engineers on internal tools.`;

const STEPS = [
  "Reading the job description",
  "Matching skills & keywords",
  "Ranking projects & experience",
  "Writing your tailored CV",
];

type Stage = "input" | "working" | "done";

function CVInner() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const cvId = params.get("cv");

  const [stage, setStage] = useState<Stage>("input");
  const [jd, setJd] = useState("");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<CV | null>(null);
  const [copied, setCopied] = useState(false);

  const [site, setSite] = useState<SiteContent | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [livePosts, setLivePosts] = useState(0);

  useEffect(() => {
    getSite().then(setSite).catch(() => {});
    getProjects().then(setProjects).catch(() => {});
    getLivePosts().then((p) => setLivePosts(p.length)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cvId) return;
    adminGetCV(Number(cvId))
      .then((cv) => {
        setResult(cv);
        setJd(cv.jd);
        setStage("done");
      })
      .catch(() => toast("Could not load CV"));
  }, [cvId, toast]);

  // Drive the working-stage step animation.
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (stage !== "working") return;
    setStep(0);
    stepTimer.current = setInterval(() => {
      setStep((s) => (s < STEPS.length ? s + 1 : s));
    }, 700);
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, [stage]);

  const generate = async () => {
    if (jd.trim().length < 40) {
      toast("Paste a fuller job description first");
      return;
    }
    setStage("working");
    try {
      const [cv] = await Promise.all([
        adminGenerateCV(jd),
        new Promise((r) => setTimeout(r, STEPS.length * 700 + 150)),
      ]);
      setResult(cv as CV);
      setStage("done");
    } catch {
      toast("Could not generate CV");
      setStage("input");
    }
  };

  const copyText = async () => {
    if (!result || !site) return;
    const lines = [
      "SATRIA ALUH PERWIRA NUSA",
      "satria@email.com | satrianusa.dev | github.com/satrianusa",
      "",
      "TAILORED FOR: " + result.role + (result.company ? " at " + result.company : ""),
      "",
      "SUMMARY",
      result.summary,
      "",
      "SKILLS",
      result.skillsOrdered.join(", "),
      "",
      "EXPERIENCE",
    ];
    site.experience.forEach((x) => {
      lines.push(`${x.period} — ${x.role}${x.company ? " · " + x.company : ""}`);
      if (x.desc) lines.push(x.desc);
      (x.highlights || []).forEach((h) => lines.push(`- ${h}`));
      lines.push("");
    });
    lines.push("SELECTED PROJECTS");
    result.ranked.forEach((p) => lines.push(`${p.title} (${p.tech})`, p.desc, ""));
    lines.push("WRITING", `${livePosts} published posts on backend engineering at satrianusa.dev`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb" }}>
      {/* TOP BAR */}
      <div className="print-hide" style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #eceef2" }}>
        <div className="mx-auto flex items-center gap-3.5" style={{ maxWidth: 1120, padding: "13px 28px" }}>
          <Link href="/admin" className="inline-flex items-center gap-2 text-[14px] font-medium transition-colors hover:text-ink" style={{ color: "#54596a" }}>
            <span style={{ fontSize: 15, lineHeight: 0 }}>←</span> Dashboard
          </Link>
          <span style={{ width: 1, height: 20, background: "#e2e5ee" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>Tailored CV</span>
          <span style={{ background: "linear-gradient(100deg,#4f8cff,#7a5cff 55%,#e35bd0)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", padding: "4px 9px", borderRadius: 999 }}>
            ✦ AI
          </span>
          <span className="flex-1" />
          {stage === "done" && (
            <>
              <button onClick={copyText} className="transition-colors hover:border-primary hover:text-primary" style={barBtn}>
                {copied ? "Copied ✓" : "Copy as text"}
              </button>
              <button onClick={() => window.print()} className="transition-colors hover:border-primary hover:text-primary" style={barBtn}>
                Download PDF
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setJd("");
                  setStage("input");
                  if (cvId) router.replace("/admin/cv");
                }}
                className="text-white transition-colors hover:bg-[#3a45b8]"
                style={{ background: "#4f5bd5", border: "none", borderRadius: 11, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Start over
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "28px 28px 64px" }}>
        <div className="mx-auto" style={{ maxWidth: 1120 }}>
          {stage === "input" && (
            <InputStage
              jd={jd}
              setJd={setJd}
              onSample={() => setJd(SAMPLE_JD)}
              onGenerate={generate}
              site={site}
              projects={projects}
              livePosts={livePosts}
            />
          )}
          {stage === "working" && <WorkingStage step={step} />}
          {stage === "done" && result && site && (
            <ResultStage
              result={result}
              site={site}
              livePosts={livePosts}
              onBack={() => {
                setStage("input");
                if (cvId) router.replace("/admin/cv");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- INPUT ---------- */
function InputStage({
  jd,
  setJd,
  onSample,
  onGenerate,
  site,
  projects,
  livePosts,
}: {
  jd: string;
  setJd: (v: string) => void;
  onSample: () => void;
  onGenerate: () => void;
  site: SiteContent | null;
  projects: Project[];
  livePosts: number;
}) {
  const sources = [
    { label: "Experience", count: `${site?.experience.length ?? 0} roles` },
    { label: "Projects", count: `${projects.length} (${projects.filter((p) => p.featured).length} featured)` },
    { label: "Skills", count: String(site?.skills.length ?? 0) },
    { label: "Blog posts", count: `${livePosts} live` },
  ];
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_320px]">
      <div style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: "26px 30px" }}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.015em", margin: 0 }}>
            Paste the job description
          </h1>
          <button onClick={onSample} className="transition-colors hover:text-[#3a45b8]" style={{ background: "transparent", border: "none", color: "#4f5bd5", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 4 }}>
            Try a sample
          </button>
        </div>
        <p style={{ color: "#54596a", fontSize: 14.5, margin: "0 0 18px" }}>
          The AI reads it, matches it against your live site data, and drafts a CV
          aimed at this exact role.
        </p>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={14}
          placeholder={"Senior Backend Engineer — Acme\n\nWe're looking for an engineer to own our Go services on PostgreSQL…"}
          className="focus:border-primary focus:outline-none"
          style={{ width: "100%", border: "1px solid #eceef2", borderRadius: 12, padding: "16px 18px", fontSize: 14.5, lineHeight: 1.7, fontFamily: "var(--font-sans)", color: "#1a1c22", resize: "vertical", minHeight: 320, background: "#fff" }}
        />
        <div className="mt-3.5 flex items-center justify-between gap-3.5">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#9098aa" }}>
            {jd.length} CHARS
          </span>
          <button
            onClick={onGenerate}
            className="transition-transform hover:brightness-105"
            style={{ background: "linear-gradient(100deg,#4f8cff,#7a5cff 55%,#e35bd0)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", boxShadow: "0 8px 24px rgba(90,80,220,.25)" }}
          >
            ✦ Generate tailored CV
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa", marginBottom: 14 }}>
            DATA THE AI WILL USE
          </div>
          <div className="flex flex-col gap-3">
            {sources.map((s) => (
              <div key={s.label} className="flex items-center gap-[11px]">
                <span className="flex flex-none items-center justify-center" style={{ width: 22, height: 22, borderRadius: "50%", background: "#e9f6ee", color: "#2f7d4f", fontSize: 12 }}>
                  ✓
                </span>
                <span className="flex-1" style={{ fontSize: 14, color: "#3a3d47" }}>{s.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#9098aa" }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#eef0fb", border: "1px solid #dfe2fb", borderRadius: 14, padding: "16px 18px", fontSize: 13, color: "#3a3d47", lineHeight: 1.55 }}>
          <span style={{ color: "#4f5bd5" }}>✦</span> Everything is pulled live from
          your site — update it under <Link href="/admin">Site content &amp; Projects</Link> and
          regenerate anytime.
        </div>
      </div>
    </div>
  );
}

/* ---------- WORKING ---------- */
function WorkingStage({ step }: { step: number }) {
  return (
    <div style={{ maxWidth: 460, margin: "60px auto 0", background: "#fff", border: "1px solid #eceef2", borderRadius: 16, padding: "40px 40px 34px", textAlign: "center" }}>
      <div style={{ width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg,#4f8cff,#7a5cff 55%,#e35bd0)", margin: "0 auto 24px", animation: "orbPulse 1.4s ease-in-out infinite" }} />
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, marginBottom: 22 }}>
        Tailoring your CV…
      </div>
      <div className="flex flex-col gap-3 text-left">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <div
              key={label}
              className="flex items-center gap-2.5"
              style={{
                fontSize: 14,
                color: done ? "#2f7d4f" : current ? "#4f5bd5" : "#c3c8d4",
                fontWeight: current ? 500 : 400,
                animation: current ? "stepBlink 1.1s ease-in-out infinite" : undefined,
              }}
            >
              <span style={{ width: 20, display: "inline-block", textAlign: "center" }}>
                {done ? "✓" : current ? "●" : "○"}
              </span>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- RESULT ---------- */
function ResultStage({
  result,
  site,
  livePosts,
  onBack,
}: {
  result: CV;
  site: SiteContent;
  livePosts: number;
  onBack: () => void;
}) {
  const matched = new Set(result.matchedNames.map((n) => n.toLowerCase()));
  const cvTarget = (result.role + (result.company ? " · " + result.company : "")).toUpperCase();
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_1fr]">
      {/* rail */}
      <div className="print-hide flex flex-col gap-3.5">
        <div style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: 22 }}>
          <div style={railLabel}>MATCH</div>
          <div className="flex items-baseline gap-2">
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 44, letterSpacing: "-0.02em" }}>
              {result.score}%
            </span>
            <span style={{ fontSize: 13, color: "#54596a" }}>fit for this role</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "#f2f3f8", margin: "12px 0 10px", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#4f8cff,#7a5cff 60%,#e35bd0)", width: `${result.score}%` }} />
          </div>
          <div style={{ fontSize: 13, color: "#54596a" }}>
            {result.matchedNames.length} of {result.inJdCount} requirements found in your data
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: 22 }}>
          <div style={railLabel}>MATCHED FROM YOUR DATA</div>
          <div className="flex flex-wrap gap-[7px]">
            {result.matchedNames.map((mc) => (
              <span key={mc} style={{ background: "#eef0fb", color: "#4f5bd5", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 500 }}>
                {mc}
              </span>
            ))}
          </div>
        </div>

        {result.gaps.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: 22 }}>
            <div style={railLabel}>GAPS TO ADDRESS</div>
            <div className="mb-2.5 flex flex-wrap gap-[7px]">
              {result.gaps.map((gc) => (
                <span key={gc} style={{ background: "#fdf3e8", color: "#a4661f", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 500 }}>
                  {gc}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: "#9098aa", lineHeight: 1.5 }}>
              Asked for in the job post but not found in your data — worth a line
              in the cover letter.
            </div>
          </div>
        )}

        <button onClick={onBack} className="transition-colors hover:border-primary hover:text-primary" style={{ background: "#fff", border: "1px solid #d9dce4", color: "#1a1c22", borderRadius: 12, padding: "12px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          ← Edit job description &amp; regenerate
        </button>
      </div>

      {/* CV paper */}
      <div className="cv-paper" style={{ background: "#fff", border: "1px solid #e5e8ef", borderRadius: 16, boxShadow: "0 18px 50px rgba(30,34,70,.08)", padding: "46px 50px" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 27, letterSpacing: "-0.02em" }}>
              Satria Aluh Perwira Nusa
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#54596a", marginTop: 7 }}>
              satria@email.com · satrianusa.dev · github.com/satrianusa
            </div>
          </div>
          <span style={{ background: "#eef0fb", color: "#4f5bd5", fontFamily: "var(--font-mono)", fontSize: 10.5, padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap" }}>
            {cvTarget}
          </span>
        </div>
        <div style={{ height: 1, background: "#eceef2", margin: "22px 0" }} />

        <div style={cvHead}>SUMMARY</div>
        <p style={{ margin: "0 0 24px", fontSize: 14.5, lineHeight: 1.7, color: "#2c2f38" }}>{result.summary}</p>

        <div style={cvHead}>SKILLS — ORDERED FOR THIS ROLE</div>
        <div className="mb-[26px] flex flex-wrap gap-[7px]">
          {result.skillsOrdered.map((sk) => {
            const on = matched.has(sk.toLowerCase());
            return (
              <span
                key={sk}
                style={
                  on
                    ? { background: "#4f5bd5", color: "#fff", padding: "6px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 500 }
                    : { border: "1px solid #e5e8ef", color: "#54596a", padding: "6px 13px", borderRadius: 999, fontSize: 12.5 }
                }
              >
                {sk}
              </span>
            );
          })}
        </div>

        <div style={cvHead}>EXPERIENCE</div>
        <div className="mb-[26px] flex flex-col gap-4">
          {site.experience.map((xp, i) => (
            <div key={i} className="grid gap-4" style={{ gridTemplateColumns: "130px 1fr" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#9098aa", paddingTop: 2 }}>
                {xp.period}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {xp.role}
                  {xp.company ? <span style={{ color: "#54596a", fontWeight: 500 }}> · {xp.company}</span> : null}
                </div>
                {xp.desc && (
                  <div style={{ color: "#54596a", fontSize: 13.5, lineHeight: 1.6, marginTop: 4 }}>{xp.desc}</div>
                )}
                {xp.highlights?.length > 0 && (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#54596a", fontSize: 13.5, lineHeight: 1.6 }}>
                    {xp.highlights.map((h, k) => (
                      <li key={k} style={{ marginTop: k ? 3 : 0 }}>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={cvHead}>SELECTED PROJECTS</div>
        <div className="mb-[26px] flex flex-col gap-3.5">
          {result.ranked.map((cp, i) => (
            <div key={i} style={{ border: "1px solid #eceef2", borderRadius: 12, padding: "15px 18px" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span style={{ fontWeight: 600, fontSize: 14.5 }}>{cp.title}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#9098aa" }}>{cp.tech.toUpperCase()}</span>
              </div>
              <div style={{ color: "#54596a", fontSize: 13.5, lineHeight: 1.6, marginTop: 5 }}>{cp.desc}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#4f5bd5", marginTop: 8 }}>
                {cp.hits.length ? "MATCHES: " + cp.hits.slice(0, 4).join(", ").toUpperCase() : "INCLUDED FOR BREADTH"}
              </div>
            </div>
          ))}
        </div>

        <div style={cvHead}>WRITING</div>
        <p style={{ margin: 0, fontSize: 13.5, color: "#54596a", lineHeight: 1.6 }}>
          {livePosts} published posts on performance, architecture, and databases
          at satrianusa.dev — including the p99 latency work referenced above.
        </p>
      </div>
    </div>
  );
}

const barBtn: React.CSSProperties = {
  background: "#fff",
  color: "#1a1c22",
  border: "1px solid #d9dce4",
  borderRadius: 11,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};
const railLabel: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa", marginBottom: 12 };
const cvHead: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", color: "#4f5bd5", marginBottom: 10 };

export default function TailoredCVPage() {
  return (
    <AdminGate>
      {() => (
        <ToastProvider>
          <Suspense fallback={null}>
            <CVInner />
          </Suspense>
        </ToastProvider>
      )}
    </AdminGate>
  );
}
