import { CSSProperties } from "react";

// Company avatar: an uploaded logo in a consistent frame, or a tinted
// monogram fallback so the row always looks intentional without a logo.
export function CompanyMark({
  company,
  logo,
  size = 40,
  radius = 10,
  style,
}: {
  company: string;
  logo?: string;
  size?: number;
  radius?: number;
  style?: CSSProperties;
}) {
  const initial = (company || "").trim().charAt(0).toUpperCase() || "·";
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flex: "0 0 auto",
    overflow: "hidden",
    ...style,
  };

  if (logo) {
    return (
      <span
        style={{ ...base, background: "#fff", border: "1px solid #e5e8ef", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={company} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
      </span>
    );
  }

  return (
    <span
      className="flex items-center justify-center"
      style={{
        ...base,
        background: "#eef0fb",
        color: "#4f5bd5",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initial}
    </span>
  );
}
