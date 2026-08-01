"use client";

import { useState } from "react";

// Copy-link button: flips to "Link copied ✓" for 1.8s (handoff spec).
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={copy}
      className="transition-colors"
      style={{
        border: `1px solid ${copied ? "#4f5bd5" : "#d9dce4"}`,
        background: "#fff",
        color: copied ? "#4f5bd5" : "#1a1c22",
        padding: "9px 16px",
        borderRadius: 11,
        fontSize: 13.5,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
      }}
    >
      {copied ? "Link copied ✓" : "Copy link"}
    </button>
  );
}
