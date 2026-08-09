"use client";

import { useEffect, useMemo } from "react";
import { diffBlocks, diffWordsMarked, type DiffRow } from "@/lib/diff";
import { hydrateDiagrams } from "@/lib/diagrams";

// Review screen for AI-assist proposals: shows what the AI wants to change
// (title, excerpt, body at block level with word marks) and lets the author
// accept the whole proposal or decline it. Bodies arrive in storage form;
// diagrams are hydrated here for display only.

export interface AssistVersion {
  title: string;
  excerpt: string;
  body: string;
}

interface Props {
  instruction: string;
  current: AssistVersion;
  proposal: AssistVersion;
  onAccept: () => void;
  onClose: () => void;
}

export function AiAssistDialog({ instruction, current, proposal, onAccept, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titleDiff = useMemo(
    () => (current.title.trim() === proposal.title.trim() ? null : diffWordsMarked(current.title, proposal.title)),
    [current.title, proposal.title],
  );
  const excerptDiff = useMemo(
    () => (current.excerpt.trim() === proposal.excerpt.trim() ? null : diffWordsMarked(current.excerpt, proposal.excerpt)),
    [current.excerpt, proposal.excerpt],
  );
  const rows = useMemo(() => diffBlocks(current.body, proposal.body), [current.body, proposal.body]);
  const changedBlocks = rows.filter((r) => r.kind !== "same").length;
  const hasChanges = !!titleDiff || !!excerptDiff || changedBlocks > 0;

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
        style={{ maxWidth: 980, maxHeight: "92vh", background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(26,28,34,0.28)", overflow: "hidden" }}
      >
        {/* HEADER */}
        <div className="flex items-start gap-3" style={{ padding: "18px 24px", borderBottom: "1px solid #eceef2" }}>
          <div className="min-w-0 flex-1">
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>
              AI proposal — review the changes
            </div>
            <div className="truncate" style={{ fontSize: 12.5, color: "#54596a", marginTop: 3 }}>
              Instruction: “{instruction}”
            </div>
            <div className="flex items-center gap-3" style={{ fontSize: 12, color: "#9098aa", marginTop: 6 }}>
              <span><span style={{ ...chip, background: "#fdf0f0", borderColor: "#f2c9c9" }} /> removed</span>
              <span><span style={{ ...chip, background: "#eefaf0", borderColor: "#bfe3c6" }} /> added</span>
              <span>{hasChanges ? `${changedBlocks} changed block${changedBlocks === 1 ? "" : "s"}` : "no changes"}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className="flex items-center justify-center transition-colors hover:bg-[#f2f3f8]"
            style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #e2e5ee", background: "#fff", color: "#54596a", fontSize: 15, cursor: "pointer", flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px 24px" }}>
          {!hasChanges && (
            <div
              className="flex items-center justify-center"
              style={{ border: "1.5px dashed #d9dce4", borderRadius: 12, minHeight: 100, color: "#54596a", fontSize: 14 }}
            >
              The AI proposed no changes for this instruction.
            </div>
          )}

          {titleDiff && (
            <section style={{ marginBottom: 18 }}>
              <div style={label}>TITLE</div>
              <div style={{ ...removedBox, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19 }} dangerouslySetInnerHTML={{ __html: titleDiff.oldMarked }} />
              <div style={{ ...addedBox, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19 }} dangerouslySetInnerHTML={{ __html: titleDiff.newMarked }} />
            </section>
          )}

          {excerptDiff && (
            <section style={{ marginBottom: 18 }}>
              <div style={label}>EXCERPT</div>
              <div style={removedBox} dangerouslySetInnerHTML={{ __html: excerptDiff.oldMarked }} />
              <div style={addedBox} dangerouslySetInnerHTML={{ __html: excerptDiff.newMarked }} />
            </section>
          )}

          {(changedBlocks > 0 || (!titleDiff && !excerptDiff && hasChanges)) && (
            <section>
              <div style={label}>BODY</div>
              <div className="article" style={{ fontSize: 15.5 }}>
                {rows.map((row, i) => (
                  <DiffRowView key={i} row={row} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-2.5" style={{ padding: "16px 24px", borderTop: "1px solid #eceef2", background: "#f9fafc" }}>
          <span style={{ fontSize: 12.5, color: "#9098aa" }}>
            Accepting only updates the editor — nothing is saved until you save the post.
          </span>
          <span className="flex-1" />
          <button
            onClick={onClose}
            className="transition-colors hover:border-primary hover:text-primary"
            style={{ background: "#fff", color: "#1a1c22", border: "1px solid #d9dce4", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            disabled={!hasChanges}
            className="text-white transition-colors hover:bg-[#3a45b8] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "#4f5bd5", border: "none", borderRadius: 11, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Accept &amp; apply
          </button>
        </div>
      </div>
    </div>
  );
}

function DiffRowView({ row }: { row: DiffRow }) {
  if (row.kind === "same") {
    return (
      <div style={{ opacity: 0.55, margin: "10px 0" }} dangerouslySetInnerHTML={{ __html: hydrateDiagrams(row.html) }} />
    );
  }
  if (row.kind === "modified") {
    return (
      <div style={{ margin: "10px 0" }}>
        <div style={removedBox} dangerouslySetInnerHTML={{ __html: row.oldMarked }} />
        <div style={addedBox} dangerouslySetInnerHTML={{ __html: row.newMarked }} />
      </div>
    );
  }
  const box = row.kind === "removed" ? removedBox : addedBox;
  return (
    <div style={{ ...box, margin: "10px 0" }} dangerouslySetInnerHTML={{ __html: hydrateDiagrams(row.html) }} />
  );
}

const label: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.05em",
  color: "#9098aa",
  marginBottom: 8,
};

const removedBox: React.CSSProperties = {
  background: "#fdf0f0",
  borderLeft: "3px solid #d64545",
  borderRadius: 8,
  padding: "10px 14px",
  margin: "6px 0",
};

const addedBox: React.CSSProperties = {
  background: "#eefaf0",
  borderLeft: "3px solid #3d9950",
  borderRadius: 8,
  padding: "10px 14px",
  margin: "6px 0",
};

const chip: React.CSSProperties = {
  display: "inline-block",
  width: 10,
  height: 10,
  borderRadius: 3,
  border: "1px solid",
  marginRight: 5,
  verticalAlign: "-1px",
};
