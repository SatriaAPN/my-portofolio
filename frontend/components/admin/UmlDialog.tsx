"use client";

import { useEffect, useMemo, useState } from "react";
import { renderUmlSvg, type UmlStep } from "@/lib/uml";

// Builder for the sequence-diagram add-on. The editor opens it empty (insert)
// or pre-filled from an existing <figure data-uml> (edit); onSave receives the
// cleaned steps and the parent handles the actual DOM insertion.

interface Props {
  initialSteps: UmlStep[];
  initialTitle: string;
  editing: boolean;
  onSave: (steps: UmlStep[], title: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}

const EMPTY_ROW: UmlStep = { source: "", target: "", description: "", session_end: false };

export function UmlDialog({ initialSteps, initialTitle, editing, onSave, onRemove, onClose }: Props) {
  const [rows, setRows] = useState<UmlStep[]>(
    initialSteps.length > 0 ? initialSteps : [{ ...EMPTY_ROW, source: "user" }],
  );
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const complete = useMemo(
    () => rows.filter((s) => s.source.trim() && s.target.trim() && s.description.trim()),
    [rows],
  );
  const svg = useMemo(
    () => (complete.length ? renderUmlSvg(complete, title.trim()) : ""),
    [complete, title],
  );

  const patch = (i: number, p: Partial<UmlStep>) =>
    setRows((cur) => cur.map((row, j) => (j === i ? { ...row, ...p } : row)));
  const remove = (i: number) => setRows((cur) => cur.filter((_, j) => j !== i));
  const move = (i: number, d: -1 | 1) =>
    setRows((cur) => {
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  // Prefill a reply: the previous step's target usually answers its source.
  const add = () =>
    setRows((cur) => {
      const last = cur[cur.length - 1];
      return [
        ...cur,
        last && last.source.trim() && last.target.trim()
          ? { ...EMPTY_ROW, source: last.target, target: last.source }
          : { ...EMPTY_ROW },
      ];
    });

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: "rgba(26,28,34,0.45)", padding: 18 }}
    >
      <div
        className="flex w-full flex-col"
        style={{ maxWidth: 920, maxHeight: "90vh", background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(26,28,34,0.28)", overflow: "hidden" }}
      >
        {/* HEADER */}
        <div className="flex items-center gap-3" style={{ padding: "18px 24px", borderBottom: "1px solid #eceef2" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>
              {editing ? "Edit sequence diagram" : "Insert sequence diagram"}
            </div>
            <div style={{ fontSize: 12.5, color: "#9098aa", marginTop: 2 }}>
              Each step is one arrow. Name a participant “user” to draw it as a stick figure.
            </div>
          </div>
          <span className="flex-1" />
          <button
            onClick={onClose}
            title="Close"
            className="flex items-center justify-center transition-colors hover:bg-[#f2f3f8]"
            style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #e2e5ee", background: "#fff", color: "#54596a", fontSize: 15, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px 24px" }}>
          <div style={label}>TITLE (OPTIONAL — SHOWN IN THE FRAME TAB)</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. fetch a blog post"
            className="focus:border-primary focus:outline-none"
            style={{ ...input, maxWidth: 340, marginBottom: 18 }}
          />

          <div style={label}>STEPS</div>
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => {
              const partial =
                (row.source.trim() || row.target.trim() || row.description.trim()) &&
                !(row.source.trim() && row.target.trim() && row.description.trim());
              return (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2"
                  style={{ border: `1px solid ${partial ? "#f0c36d" : "#eceef2"}`, borderRadius: 12, padding: "10px 12px", background: "#f9fafc" }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", width: 18, textAlign: "right" }}>
                    {i + 1}
                  </span>
                  <input
                    value={row.source}
                    onChange={(e) => patch(i, { source: e.target.value })}
                    placeholder="source"
                    className="focus:border-primary focus:outline-none"
                    style={{ ...input, width: 130 }}
                  />
                  <span style={{ color: "#9098aa", fontSize: 14 }}>→</span>
                  <input
                    value={row.target}
                    onChange={(e) => patch(i, { target: e.target.value })}
                    placeholder="target"
                    className="focus:border-primary focus:outline-none"
                    style={{ ...input, width: 130 }}
                  />
                  <input
                    value={row.description}
                    onChange={(e) => patch(i, { description: e.target.value })}
                    placeholder="description (arrow label)"
                    className="flex-1 focus:border-primary focus:outline-none"
                    style={{ ...input, minWidth: 150 }}
                  />
                  <label
                    className="flex cursor-pointer items-center gap-1.5"
                    title="Closes the sender's activation bar after this message; the receiver stays active"
                    style={{ fontSize: 12.5, color: "#54596a", whiteSpace: "nowrap" }}
                  >
                    <input
                      type="checkbox"
                      checked={row.session_end}
                      onChange={(e) => patch(i, { session_end: e.target.checked })}
                      style={{ accentColor: "#4f5bd5", width: 15, height: 15 }}
                    />
                    ends session
                  </label>
                  <span className="flex items-center gap-1">
                    <RowBtn onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</RowBtn>
                    <RowBtn onClick={() => move(i, 1)} disabled={i === rows.length - 1} title="Move down">↓</RowBtn>
                    <RowBtn onClick={() => remove(i)} disabled={rows.length === 1} title="Remove step">×</RowBtn>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center gap-3">
            <button
              onClick={add}
              className="transition-colors hover:bg-[#e3e6fa]"
              style={{ background: "#eef0fb", color: "#4f5bd5", border: "none", borderRadius: 11, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              + Add step
            </button>
            <span style={{ fontSize: 12, color: "#9098aa" }}>
              “Ends session” on a reply closes the sender’s activation bar — the receiver keeps going. Incomplete rows are left out.
            </span>
          </div>

          <div style={{ ...label, marginTop: 20 }}>PREVIEW</div>
          {svg ? (
            <div
              style={{ border: "1px solid #eceef2", borderRadius: 12, padding: 16, overflowX: "auto", textAlign: "center" }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{ border: "1.5px dashed #d9dce4", borderRadius: 12, minHeight: 120, color: "#9098aa", fontSize: 13.5 }}
            >
              Fill in a step (source, target and description) to see the diagram.
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-2.5" style={{ padding: "16px 24px", borderTop: "1px solid #eceef2", background: "#f9fafc" }}>
          {editing && onRemove && (
            <button
              onClick={onRemove}
              className="transition-colors hover:bg-[#fdecec]"
              style={{ background: "#fff", color: "#d64545", border: "1px solid #f2c9c9", borderRadius: 11, padding: "10px 15px", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              Remove diagram
            </button>
          )}
          <span className="flex-1" />
          <button
            onClick={onClose}
            className="transition-colors hover:border-primary hover:text-primary"
            style={{ background: "#fff", color: "#1a1c22", border: "1px solid #d9dce4", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => complete.length && onSave(complete, title.trim())}
            disabled={complete.length === 0}
            className="text-white transition-colors hover:bg-[#3a45b8] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "#4f5bd5", border: "none", borderRadius: 11, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            {editing ? "Update diagram" : "Insert diagram"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RowBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center justify-center transition-colors hover:bg-[#eceef4] disabled:cursor-default disabled:opacity-30"
      style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e2e5ee", background: "#fff", color: "#54596a", fontSize: 13, cursor: "pointer", padding: 0 }}
    >
      {children}
    </button>
  );
}

const label: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.05em",
  color: "#9098aa",
  marginBottom: 8,
};

const input: React.CSSProperties = {
  border: "1px solid #e2e5ee",
  borderRadius: 10,
  padding: "8px 11px",
  fontSize: 13.5,
  fontFamily: "var(--font-sans)",
  color: "#1a1c22",
  background: "#fff",
};
