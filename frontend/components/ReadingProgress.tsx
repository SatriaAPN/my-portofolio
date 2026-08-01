"use client";

import { useEffect, useState } from "react";

// Fixed top reading-progress bar: width tracks scroll % (handoff spec).
export function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="print-hide fixed left-0 top-0 z-[60]"
      style={{
        height: 3,
        width: `${pct}%`,
        background: "linear-gradient(90deg,#4f5bd5,#7a5cff)",
        transition: "width 0.1s linear",
      }}
    />
  );
}
