"use client";

import { useEffect, useRef, useState } from "react";

// Fullscreen zoom/pan lightbox for the diagram figures baked into the article
// (<figure data-uml> / <figure data-flowchart>, see DIAGRAMS.md). Click a
// diagram to open it fitted to the viewport; wheel / pinch / double-click to
// zoom, drag to pan, Escape / backdrop / ✕ to close. The server-rendered SVG
// is cloned as-is — nothing is re-rendered client-side.

type Opened = { html: string; w: number; h: number; label: string };

const MIN_SCALE = 0.15;
const MAX_SCALE = 8;
const FIT_PAD = 56; // viewport padding around the fitted diagram
const OPEN_CAP = 1.75; // don't blow tiny diagrams up on open

function fitScale(w: number, h: number) {
  return Math.min(
    (window.innerWidth - FIT_PAD) / w,
    (window.innerHeight - FIT_PAD) / h,
    OPEN_CAP,
  );
}

export function DiagramLightbox() {
  const [opened, setOpened] = useState<Opened | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Transform lives in a ref and is applied to the stage node directly, so
  // wheel/drag at pointer-move rate never re-renders the (large) SVG.
  const view = useRef({ s: 1, tx: 0, ty: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const downOnBackdrop = useRef(false);

  const setView = (s: number, tx: number, ty: number) => {
    view.current = { s, tx, ty };
    const el = stageRef.current;
    if (el) el.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  };

  // Zoom toward a viewport point so it stays put on screen.
  const zoomAt = (px: number, py: number, factor: number) => {
    const { s, tx, ty } = view.current;
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor));
    const k = ns / s;
    setView(ns, px - (px - tx) * k, py - (py - ty) * k);
  };

  const fit = (o: Opened) => {
    const s = fitScale(o.w, o.h);
    setView(s, (window.innerWidth - o.w * s) / 2, (window.innerHeight - o.h * s) / 2);
  };

  // Open on click of any diagram figure (event delegation over the article;
  // the editor's RTE figures open the builder instead, so skip those).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const fig = (e.target as Element | null)?.closest?.(
        "figure[data-uml], figure[data-flowchart]",
      );
      if (!fig || fig.closest("[data-rte]")) return;
      const svg = fig.querySelector("svg");
      if (!svg) return;
      const vb = (svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
      const w = Number(svg.getAttribute("width")) || vb[2];
      const h = vb[3] || svg.getBoundingClientRect().height;
      if (!w || !h) return;
      const o: Opened = {
        html: svg.outerHTML,
        w,
        h,
        label: svg.getAttribute("aria-label") || "Diagram",
      };
      view.current = { s: 1, tx: 0, ty: 0 };
      setOpened(o);
      // Stage mounts on this state update; fit() reaches it via the effect below.
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // On open: fit to screen, lock page scroll, bind Escape + non-passive wheel
  // (React's onWheel is passive, so preventDefault needs a manual listener).
  useEffect(() => {
    if (!opened) return;
    fit(opened);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpened(null);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022)));
    };
    const el = overlayRef.current;
    window.addEventListener("keydown", onKey);
    el?.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      el?.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  if (!opened) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    // Capture so drags that leave the window still end cleanly; can throw for
    // pointers that vanished mid-gesture.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragged.current = false;
      // Pointer capture retargets later events to the overlay, so remember
      // where the press actually started for the backdrop-click-closes check.
      downOnBackdrop.current = e.target === overlayRef.current;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const pts = pointers.current;
    if (pts.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragged.current = true;
      const { s, tx, ty } = view.current;
      setView(s, tx + dx, ty + dy);
    } else if (pts.size === 2) {
      // Pinch: zoom by finger-distance ratio around the midpoint, and pan by
      // the midpoint's own movement.
      const other = [...pts.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        dragged.current = true;
        const d0 = Math.hypot(prev.x - other.x, prev.y - other.y);
        const d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        const mx = (e.clientX + other.x) / 2;
        const my = (e.clientY + other.y) / 2;
        if (d0 > 0) zoomAt(mx, my, d1 / d0);
        const { s, tx, ty } = view.current;
        setView(s, tx + (mx - (prev.x + other.x) / 2), ty + (my - (prev.y + other.y) / 2));
      }
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (
      e.type === "pointerup" &&
      pointers.current.size === 0 &&
      !dragged.current &&
      downOnBackdrop.current
    ) {
      setOpened(null);
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const f = fitScale(opened.w, opened.h);
    const s = view.current.s;
    if (Math.abs(s - f) < 0.05) zoomAt(e.clientX, e.clientY, Math.max(1, f * 2) / s);
    else fit(opened);
  };

  const btn: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 9,
    border: "1px solid #d9dce4",
    background: "#fff",
    color: "#1a1c22",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
  };

  const { s, tx, ty } = view.current;
  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={opened.label}
      className="fixed inset-0 z-[100]"
      style={{
        background: "rgba(15,17,24,0.88)",
        overflow: "hidden",
        touchAction: "none",
        cursor: "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDoubleClick={onDoubleClick}
    >
      <div
        ref={stageRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: opened.w,
          height: opened.h,
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
          transformOrigin: "0 0",
          background: "#fff",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
        }}
        dangerouslySetInnerHTML={{ __html: opened.html }}
      />

      <div
        className="fixed right-4 top-4 flex items-center gap-2"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          style={btn}
          aria-label="Zoom out"
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.35)}
        >
          −
        </button>
        <button
          type="button"
          style={btn}
          aria-label="Zoom in"
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.35)}
        >
          +
        </button>
        <button
          type="button"
          style={{ ...btn, width: "auto", padding: "0 12px", fontSize: 11.5, fontFamily: "var(--font-mono)" }}
          aria-label="Fit to screen"
          onClick={() => fit(opened)}
        >
          FIT
        </button>
        <button type="button" style={btn} aria-label="Close" onClick={() => setOpened(null)}>
          ✕
        </button>
      </div>

      <div
        className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "rgba(255,255,255,0.55)",
          whiteSpace: "nowrap",
        }}
      >
        scroll to zoom · drag to pan · esc to close
      </div>
    </div>
  );
}
