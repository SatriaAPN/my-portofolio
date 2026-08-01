import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { Reveal } from "@/components/Reveal";
import { CompanyMark } from "@/components/CompanyMark";
import { getSite, getLivePosts, getProjects } from "@/lib/api";
import type { Post, Project, SiteContent } from "@/lib/types";

const STRIPE =
  "repeating-linear-gradient(45deg,#eef0f5,#eef0f5 9px,#e5e8ef 9px,#e5e8ef 18px)";

export default async function HomePage() {
  let site: SiteContent = { skills: [], experience: [], heroImage: "", projectImage: "" };
  let posts: Post[] = [];
  let projects: Project[] = [];
  try {
    [site, posts, projects] = await Promise.all([getSite(), getLivePosts(), getProjects()]);
  } catch {
    /* backend unreachable — render with empty data */
  }

  const blogCards = posts.slice(0, 3);
  const featured = projects.filter((p) => p.featured).slice(0, 2);

  return (
    <main id="top">
      <SiteNav />

      {/* HERO */}
      <section className="grid grid-cols-1 items-center gap-[50px] px-5 pt-[56px] pb-[48px] md:grid-cols-[1.5fr_1fr] md:px-10 md:pt-20 md:pb-[60px]">
        <div>
          <div
            className="mb-6 inline-flex items-center gap-2"
            style={{
              background: "#eef0fb",
              color: "#4f5bd5",
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#34c778",
                display: "inline-block",
                animation: "pulseDot 2s infinite",
              }}
            />
            Open to new roles
          </div>
          <h1
            className="text-[38px] md:text-[56px]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              margin: "0 0 22px",
              textWrap: "balance",
            }}
          >
            Hi, I&rsquo;m Satria &mdash; I build software end to end.
          </h1>
          <p style={{ fontSize: 19, color: "#54596a", maxWidth: "40ch", margin: "0 0 32px" }}>
            Software engineer with 4 years across backend and fullstack. I ship
            reliable products and write about how I do it.
          </p>
          <div className="flex flex-wrap gap-[13px]">
            <Link
              href="#work"
              className="font-medium text-white transition-colors hover:brightness-95"
              style={{ background: "#4f5bd5", padding: "14px 26px", borderRadius: 12 }}
            >
              See my work
            </Link>
            <Link
              href="#contact"
              className="font-medium transition-colors hover:bg-[#f6f7fb]"
              style={{ border: "1px solid #d9dce4", color: "#1a1c22", padding: "14px 26px", borderRadius: 12 }}
            >
              Download resume
            </Link>
          </div>
        </div>

        <div
          className="relative flex items-end justify-center overflow-hidden"
          style={{
            aspectRatio: "1",
            borderRadius: 20,
            background: STRIPE,
            border: "1px solid #e5e8ef",
            padding: 16,
          }}
        >
          {site.heroImage ? (
            <div
              className="absolute inset-0"
              style={{
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundImage: `url(${site.heroImage})`,
              }}
            />
          ) : (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#9098aa",
                background: "#fff",
                padding: "5px 10px",
                borderRadius: 6,
              }}
            >
              headshot.jpg
            </span>
          )}
        </div>
      </section>

      {/* STACK CHIPS */}
      <section
        className="flex flex-wrap gap-2.5 px-5 py-7 md:px-10"
        style={{ borderTop: "1px solid #eceef2", borderBottom: "1px solid #eceef2" }}
      >
        <span
          className="mr-1.5 self-center"
          style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#9098aa" }}
        >
          STACK
        </span>
        {site.skills.map((sk) => (
          <span
            key={sk}
            style={{
              border: "1px solid #e5e8ef",
              padding: "8px 15px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {sk}
          </span>
        ))}
      </section>

      {/* WRITING */}
      <Reveal as="section">
        <div id="writing" className="px-5 pt-[68px] pb-[60px] md:px-10">
          <div className="mb-[30px] flex items-baseline justify-between">
            <h2 className="section-h2">From the blog</h2>
            <Link href="/blog" className="text-[15px] font-medium">
              All posts →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {blogCards.map((b) => (
              <Link
                key={b.id}
                href={`/blog/${b.slug}`}
                className="flex flex-col overflow-hidden text-ink transition-[box-shadow,transform] duration-200 hover:-translate-y-[3px] hover:shadow-cardhover"
                style={{ border: "1px solid #eceef2", borderRadius: 16 }}
              >
                <div style={{ aspectRatio: "16/10", background: STRIPE }} />
                <div style={{ padding: 20 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#4f5bd5", marginBottom: 10 }}>
                    {b.category}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.2, margin: "0 0 10px" }}>
                    {b.title}
                  </h3>
                  <span style={{ fontSize: 13, color: "#9098aa" }}>{b.readMin} min read</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Reveal>

      {/* EXPERIENCE */}
      <Reveal as="section">
        <div
          id="about"
          className="px-5 py-[60px] md:px-10"
          style={{ background: "#f6f7fb", borderTop: "1px solid #eceef2", borderBottom: "1px solid #eceef2" }}
        >
          <h2 className="section-h2" style={{ marginBottom: 32 }}>
            Experience
          </h2>
          <div className="flex flex-col gap-4">
            {site.experience.map((x, i) => (
              <div
                key={i}
                className="grid grid-cols-1 items-start gap-6 md:grid-cols-[160px_1fr]"
                style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: "26px 28px" }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#4f5bd5", paddingTop: 4 }}>
                  {x.period}
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <CompanyMark company={x.company} logo={x.logo} />
                    <div>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0, lineHeight: 1.15 }}>
                        {x.role}
                      </h3>
                      {(x.company || x.location) && (
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#54596a", marginTop: 4 }}>
                          {[x.company, x.location].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                  {x.desc && <p style={{ color: "#54596a", margin: 0 }}>{x.desc}</p>}
                  {x.highlights?.length > 0 && (
                    <ul
                      className="flex flex-col gap-2"
                      style={{ listStyle: "none", margin: x.desc ? "12px 0 0" : 0, padding: 0 }}
                    >
                      {x.highlights.map((h, k) => (
                        <li key={k} className="flex gap-2.5" style={{ color: "#54596a", fontSize: 14.5, lineHeight: 1.5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4f5bd5", flex: "0 0 auto", marginTop: 8 }} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* FEATURED PROJECTS */}
      <Reveal as="section">
        <div id="work" className="px-5 pt-[68px] pb-[60px] md:px-10">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="section-h2">Featured projects</h2>
            <Link href="/projects" className="text-[15px] font-medium">
              All projects →
            </Link>
          </div>
          <div className="flex flex-col gap-[22px]">
            {featured.map((fp) => (
              <div
                key={fp.id}
                className="grid grid-cols-1 overflow-hidden md:grid-cols-2"
                style={{ border: "1px solid #eceef2", borderRadius: 18 }}
              >
                <div className="relative flex items-end" style={{ background: STRIPE, minHeight: 300, padding: 16 }}>
                  {fp.image ? (
                    <div
                      className="absolute inset-0"
                      style={{ backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url(${fp.image})` }}
                    />
                  ) : (
                    <span
                      style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", background: "#fff", padding: "4px 9px", borderRadius: 5 }}
                    >
                      project-shot.png
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-start justify-center" style={{ padding: "40px 44px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#4f5bd5", marginBottom: 14 }}>
                    {fp.tech}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1.12, margin: "0 0 14px" }}>
                    {fp.title}
                  </h3>
                  <p style={{ color: "#54596a", margin: "0 0 22px" }}>{fp.desc}</p>
                  <Link href="/projects" style={{ fontWeight: 600 }}>
                    Read case study →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ASK AI BAND */}
      <Reveal as="section">
        <div
          id="ask"
          className="px-5 py-16 md:px-10"
          style={{ background: "linear-gradient(135deg,#4f5bd5,#6a5be0)", color: "#fff" }}
        >
          <div className="grid grid-cols-1 items-center gap-[50px] md:grid-cols-2">
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#c8ccf5", marginBottom: 16 }}>
                ✦ ASK AI ABOUT ME
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 36, lineHeight: 1.08, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
                Get answers about me, instantly.
              </h2>
              <p style={{ color: "#d6d9f7", margin: 0, maxWidth: "34ch" }}>
                A chat assistant trained on my experience and projects — ask it
                anything a recruiter would want to know.
              </p>
            </div>
            <Link
              href="/ask-ai"
              className="block"
              style={{ background: "#fff", color: "#1a1c22", borderRadius: 18, padding: 22, boxShadow: "0 24px 60px rgba(40,30,120,.35)" }}
            >
              <div className="mb-[18px] flex flex-col gap-3">
                <div className="flex justify-start">
                  <div style={{ maxWidth: "82%", padding: "12px 15px", fontSize: 14.5, borderRadius: "14px 14px 14px 4px", background: "#f1f2f7", color: "#1a1c22" }}>
                    What&rsquo;s Satria&rsquo;s strongest stack?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div style={{ maxWidth: "82%", padding: "12px 15px", fontSize: 14.5, borderRadius: "14px 14px 4px 14px", background: "#4f5bd5", color: "#fff" }}>
                    Go on the backend — 4 years in production — plus React on the front end. Want the details?
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5" style={{ background: "#f1f2f7", borderRadius: 12, padding: "12px 16px" }}>
                <span style={{ color: "#9098aa", fontSize: 14.5, flex: 1 }}>Ask a question…</span>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: "#4f5bd5", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                  ↑
                </span>
              </div>
              <div style={{ textAlign: "center", marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: "#4f5bd5", fontWeight: 500 }}>
                Open the assistant →
              </div>
            </Link>
          </div>
        </div>
      </Reveal>

      {/* CONTACT / FOOTER */}
      <Reveal as="section">
        <div id="contact" className="px-5 pt-[68px] pb-[56px] text-center md:px-10">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 42, lineHeight: 1.05, margin: "0 0 14px", letterSpacing: "-0.02em", textWrap: "balance" }}>
            Let&rsquo;s build something together.
          </h2>
          <p style={{ color: "#54596a", margin: "0 0 30px" }}>
            Open to new opportunities — reach out anytime.
          </p>
          <div className="flex flex-wrap justify-center gap-[13px]">
            <a
              href="mailto:satria@email.com"
              className="font-medium text-white transition-colors hover:brightness-95"
              style={{ background: "#4f5bd5", padding: "14px 26px", borderRadius: 12 }}
            >
              satria@email.com
            </a>
            <a href="https://www.linkedin.com/in/satrianusa" target="_blank" rel="noreferrer" style={{ border: "1px solid #d9dce4", color: "#1a1c22", padding: "14px 22px", borderRadius: 12 }}>
              LinkedIn
            </a>
            <a href="https://github.com/satrianusa" target="_blank" rel="noreferrer" style={{ border: "1px solid #d9dce4", color: "#1a1c22", padding: "14px 22px", borderRadius: 12 }}>
              GitHub
            </a>
          </div>
          <div style={{ marginTop: 52, paddingTop: 24, borderTop: "1px solid #eceef2", fontFamily: "var(--font-mono)", fontSize: 12, color: "#9098aa" }}>
            © 2026 Satria Nusa
          </div>
        </div>
      </Reveal>
    </main>
  );
}
