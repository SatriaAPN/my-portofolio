import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { getProjects } from "@/lib/api";
import type { Project } from "@/lib/types";

export const metadata = {
  title: "Projects",
  description: "Things I've shipped end to end — with the stack behind each piece.",
};

const STRIPE =
  "repeating-linear-gradient(45deg,#eef0f5,#eef0f5 9px,#e5e8ef 9px,#e5e8ef 18px)";

export default async function ProjectsPage() {
  let projects: Project[] = [];
  try {
    projects = await getProjects();
  } catch {
    /* backend unreachable */
  }

  return (
    <main>
      <SiteNav active="projects" variant="inner" />

      {/* HEADER */}
      <div className="px-5 pt-[72px] pb-12 md:px-10">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.06em", color: "#4f5bd5", marginBottom: 16 }}>
          PROJECTS
        </div>
        <h1
          className="text-[36px] md:text-[52px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.025em", margin: "0 0 16px", textWrap: "balance" }}
        >
          Things I&rsquo;ve shipped end to end.
        </h1>
        <p style={{ fontSize: 18, color: "#54596a", maxWidth: "52ch", margin: 0 }}>
          From schema design to the pixels — the work I&rsquo;m proudest of, with
          the stack behind each piece.
        </p>
      </div>

      {/* PROJECT GRID */}
      <div className="grid grid-cols-1 gap-[22px] px-5 pb-[72px] md:grid-cols-2 md:px-10">
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-cardhover"
            style={{ border: "1px solid #eceef2", borderRadius: 18 }}
          >
            <div
              className="relative flex items-end"
              style={{ aspectRatio: "16/9", background: STRIPE, padding: 14 }}
            >
              {p.image && (
                <div
                  className="absolute inset-0"
                  style={{ backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url(${p.image})` }}
                />
              )}
              {p.featured && (
                <span
                  className="absolute"
                  style={{ top: 14, left: 14, background: "#eef0fb", color: "#4f5bd5", fontFamily: "var(--font-mono)", fontSize: 10.5, padding: "4px 10px", borderRadius: 999 }}
                >
                  FEATURED
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-[11px]" style={{ padding: "26px 28px" }}>
              <div className="flex items-center justify-between gap-3">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#4f5bd5" }}>
                  {p.tech.toUpperCase()}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#9098aa" }}>
                  {p.year}
                </span>
              </div>
              <h3
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 23, lineHeight: 1.15, letterSpacing: "-0.015em", margin: 0 }}
              >
                {p.title}
              </h3>
              <p className="flex-1" style={{ color: "#54596a", fontSize: 15, margin: 0 }}>
                {p.desc}
              </p>
            </div>
          </div>
        ))}
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
