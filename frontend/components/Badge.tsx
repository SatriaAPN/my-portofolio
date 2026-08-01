import { CSSProperties, ReactNode } from "react";

const styles: Record<string, { bg: string; color: string }> = {
  LIVE: { bg: "#e9f6ee", color: "#2f7d4f" },
  DRAFT: { bg: "#f2f3f8", color: "#6b7180" },
  accent: { bg: "#eef0fb", color: "#4f5bd5" },
  warn: { bg: "#fdf3e8", color: "#a4661f" },
  success: { bg: "#e9f6ee", color: "#2f7d4f" },
  danger: { bg: "#fdf1f1", color: "#b3383c" },
};

// Mono status pill (LIVE / DRAFT / NEW / …).
export function Badge({
  children,
  variant = "accent",
  style,
}: {
  children: ReactNode;
  variant?: keyof typeof styles | string;
  style?: CSSProperties;
}) {
  const s = styles[variant] || styles.accent;
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        letterSpacing: "0.06em",
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// Mono label (STACK, PROJECTS, section kickers).
export function MonoLabel({
  children,
  color = "#9098aa",
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
