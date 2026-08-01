import Link from "next/link";
import { BrandMark } from "./BrandMark";

type Active = "projects" | "writing" | "about" | null;

const links: { href: string; label: string; key: Active }[] = [
  { href: "/projects", label: "Projects", key: "projects" },
  { href: "/blog", label: "Writing", key: "writing" },
  { href: "/#about", label: "About", key: "about" },
];

export function SiteNav({
  active = null,
  variant = "home",
}: {
  active?: Active;
  variant?: "home" | "inner";
}) {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "saturate(180%) blur(12px)",
        WebkitBackdropFilter: "saturate(180%) blur(12px)",
        borderColor: "#eceef2",
      }}
    >
      <div className="flex items-center justify-between px-5 py-[18px] md:px-10">
        <Link href="/" aria-label="Home">
          <BrandMark />
        </Link>

        <div className="flex items-center gap-[18px] md:gap-[30px]">
          <div className="hidden items-center gap-[30px] md:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-[15px] transition-colors hover:text-ink"
                style={{
                  color: active === l.key ? "#1a1c22" : "#54596a",
                  fontWeight: active === l.key ? 600 : 400,
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {variant === "home" ? (
            <>
              <Link
                href="/ask-ai"
                className="flex items-center gap-[7px] text-[15px] font-medium"
                style={{ color: "#4f5bd5" }}
              >
                ✦ Ask AI
              </Link>
              <Link
                href="/#contact"
                className="text-[15px] font-medium text-white transition-colors hover:brightness-95"
                style={{ background: "#4f5bd5", padding: "10px 20px", borderRadius: 10 }}
              >
                Resume
              </Link>
            </>
          ) : (
            <Link
              href="/ask-ai"
              className="text-[15px] font-semibold text-white transition-colors hover:brightness-95"
              style={{ background: "#4f5bd5", padding: "10px 18px", borderRadius: 11 }}
            >
              Ask AI
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
