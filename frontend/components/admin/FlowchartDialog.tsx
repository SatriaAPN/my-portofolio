"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  renderFlowchartSvg,
  type FlowEdge,
  type FlowNode,
  type FlowShape,
  type FlowchartData,
} from "@/lib/flowchart";

// Builder for the flowchart add-on. Nodes go on a coarse grid (row 0 at the
// top), edges connect them by picking nodes from dropdowns; onSave receives
// the cleaned chart and the parent handles the DOM insertion.

interface Props {
  initial: FlowchartData;
  editing: boolean;
  onSave: (chart: FlowchartData) => void;
  onRemove?: () => void;
  onClose: () => void;
}

const SHAPES: { value: FlowShape; label: string }[] = [
  { value: "oval", label: "oval — start/end" },
  { value: "decision", label: "diamond — decision" },
  { value: "box", label: "box — step" },
];

export function FlowchartDialog({ initial, editing, onSave, onRemove, onClose }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [nodes, setNodes] = useState<FlowNode[]>(
    initial.nodes.length > 0
      ? initial.nodes
      : [{ id: "n1", shape: "oval", text: "", row: 0, col: 0 }],
  );
  const [edges, setEdges] = useState<FlowEdge[]>(initial.edges);
  const idRef = useRef(
    1 + nodes.reduce((m, n) => Math.max(m, Number(n.id.replace(/\D/g, "")) || 0), 0),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const complete = useMemo<FlowchartData>(() => {
    const keep = nodes.filter((n) => n.text.trim());
    const ids = new Set(keep.map((n) => n.id));
    return {
      title: title.trim(),
      nodes: keep,
      edges: edges.filter((e) => e.from !== e.to && ids.has(e.from) && ids.has(e.to)),
    };
  }, [nodes, edges, title]);
  const svg = useMemo(
    () => (complete.nodes.length ? renderFlowchartSvg(complete) : ""),
    [complete],
  );

  const patchNode = (i: number, p: Partial<FlowNode>) =>
    setNodes((cur) => cur.map((n, j) => (j === i ? { ...n, ...p } : n)));
  const removeNode = (i: number) => {
    const victim = nodes[i];
    setNodes((cur) => cur.filter((_, j) => j !== i));
    setEdges((cur) => cur.filter((e) => e.from !== victim.id && e.to !== victim.id));
  };
  const addNode = () => {
    // The id is minted outside the updater: React may run updaters twice in
    // dev (StrictMode), and side effects inside them would skip ids.
    const id = `n${idRef.current++}`;
    setNodes((cur) => [
      ...cur,
      {
        id,
        shape: cur.length === 0 ? "oval" : "box",
        text: "",
        row: cur.length ? Math.max(...cur.map((n) => n.row)) + 1 : 0,
        col: cur.length ? cur[cur.length - 1].col : 0,
      },
    ]);
  };

  const patchEdge = (i: number, p: Partial<FlowEdge>) =>
    setEdges((cur) => cur.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const removeEdge = (i: number) => setEdges((cur) => cur.filter((_, j) => j !== i));
  // Chain from the last edge's target; decisions get Yes/No label defaults.
  const addEdge = () => {
    const from = edges.length ? edges[edges.length - 1].to : nodes[0]?.id || "";
    const fromNode = nodes.find((n) => n.id === from);
    let label = "";
    if (fromNode?.shape === "decision") {
      const outgoing = edges.filter((e) => e.from === from).length;
      label = outgoing === 0 ? "Yes" : outgoing === 1 ? "No" : "";
    }
    setEdges((cur) => [...cur, { from, to: "", label }]);
  };

  const nodeOption = (n: FlowNode) => {
    const i = nodes.findIndex((x) => x.id === n.id);
    const text = n.text.trim() || `(${n.shape})`;
    return `${i + 1}. ${text.length > 28 ? text.slice(0, 27) + "…" : text}`;
  };
  const num = (v: string) => Math.max(0, Math.min(30, Math.round(Number(v) || 0)));

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
        style={{ maxWidth: 940, maxHeight: "90vh", background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(26,28,34,0.28)", overflow: "hidden" }}
      >
        {/* HEADER */}
        <div className="flex items-center gap-3" style={{ padding: "18px 24px", borderBottom: "1px solid #eceef2" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>
              {editing ? "Edit flowchart" : "Insert flowchart"}
            </div>
            <div style={{ fontSize: 12.5, color: "#9098aa", marginTop: 2 }}>
              Place nodes on a grid — row 0 is the top, columns go left to right — then connect them.
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
          <div style={label}>TITLE (OPTIONAL — SHOWN AS THE CHART HEADER)</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. RP Review - Fulfill Time Expectation Logic"
            className="focus:border-primary focus:outline-none"
            style={{ ...input, maxWidth: 400, marginBottom: 18 }}
          />

          <div style={label}>NODES</div>
          <div className="flex flex-col gap-2">
            {nodes.map((n, i) => (
              <div
                key={n.id}
                className="flex flex-wrap items-center gap-2"
                style={{ border: `1px solid ${n.text.trim() ? "#eceef2" : "#f0c36d"}`, borderRadius: 12, padding: "10px 12px", background: "#f9fafc" }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", width: 18, textAlign: "right" }}>
                  {i + 1}
                </span>
                <select
                  value={n.shape}
                  onChange={(e) => patchNode(i, { shape: e.target.value as FlowShape })}
                  style={{ ...input, width: 168, cursor: "pointer" }}
                >
                  {SHAPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <input
                  value={n.text}
                  onChange={(e) => patchNode(i, { text: e.target.value })}
                  placeholder="text"
                  className="flex-1 focus:border-primary focus:outline-none"
                  style={{ ...input, minWidth: 140 }}
                />
                <label style={numLabel}>
                  row
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={n.row}
                    onChange={(e) => patchNode(i, { row: num(e.target.value) })}
                    className="focus:border-primary focus:outline-none"
                    style={{ ...input, width: 58 }}
                  />
                </label>
                <label style={numLabel}>
                  col
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={n.col}
                    onChange={(e) => patchNode(i, { col: num(e.target.value) })}
                    className="focus:border-primary focus:outline-none"
                    style={{ ...input, width: 58 }}
                  />
                </label>
                <RowBtn onClick={() => removeNode(i)} disabled={nodes.length === 1} title="Remove node">
                  ×
                </RowBtn>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-3">
            <button onClick={addNode} style={addBtn} className="transition-colors hover:bg-[#e3e6fa]">
              + Add node
            </button>
            <span style={{ fontSize: 12, color: "#9098aa" }}>
              Nodes without text are left out. Same row + column stacks nodes on top of each other — give each its own cell.
            </span>
          </div>

          <div style={{ ...label, marginTop: 20 }}>ARROWS</div>
          {edges.length > 0 && (
            <div className="flex flex-col gap-2">
              {edges.map((e, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2"
                  style={{ border: "1px solid #eceef2", borderRadius: 12, padding: "10px 12px", background: "#f9fafc" }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa", width: 18, textAlign: "right" }}>
                    {i + 1}
                  </span>
                  <select
                    value={e.from}
                    onChange={(ev) => patchEdge(i, { from: ev.target.value })}
                    className="flex-1"
                    style={{ ...input, minWidth: 150, cursor: "pointer" }}
                  >
                    <option value="">— from —</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {nodeOption(n)}
                      </option>
                    ))}
                  </select>
                  <span style={{ color: "#9098aa", fontSize: 14 }}>→</span>
                  <select
                    value={e.to}
                    onChange={(ev) => patchEdge(i, { to: ev.target.value })}
                    className="flex-1"
                    style={{ ...input, minWidth: 150, cursor: "pointer" }}
                  >
                    <option value="">— to —</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {nodeOption(n)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={e.label}
                    onChange={(ev) => patchEdge(i, { label: ev.target.value })}
                    placeholder="label"
                    className="focus:border-primary focus:outline-none"
                    style={{ ...input, width: 90 }}
                  />
                  <RowBtn onClick={() => removeEdge(i)} title="Remove arrow">
                    ×
                  </RowBtn>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2.5 flex items-center gap-3">
            <button onClick={addEdge} disabled={nodes.length < 2} style={addBtn} className="transition-colors hover:bg-[#e3e6fa] disabled:cursor-not-allowed disabled:opacity-40">
              + Add arrow
            </button>
            <span style={{ fontSize: 12, color: "#9098aa" }}>
              List a decision’s “Yes” arrow before its “No” — the first one gets the cleaner route.
            </span>
          </div>

          <div style={{ ...label, marginTop: 20 }}>PREVIEW</div>
          {svg ? (
            <div
              style={{ border: "1px solid #eceef2", borderRadius: 12, padding: 16, overflow: "auto", maxHeight: 460, textAlign: "center" }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{ border: "1.5px dashed #d9dce4", borderRadius: 12, minHeight: 120, color: "#9098aa", fontSize: 13.5 }}
            >
              Give the first node some text to see the chart.
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
              Remove flowchart
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
            onClick={() => complete.nodes.length && onSave(complete)}
            disabled={complete.nodes.length === 0}
            className="text-white transition-colors hover:bg-[#3a45b8] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "#4f5bd5", border: "none", borderRadius: 11, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            {editing ? "Update flowchart" : "Insert flowchart"}
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

const numLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "#9098aa",
};

const addBtn: React.CSSProperties = {
  background: "#eef0fb",
  color: "#4f5bd5",
  border: "none",
  borderRadius: 11,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};
