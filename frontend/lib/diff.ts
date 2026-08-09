// Diff utilities for the editor's AI-assist review screen.
//
// Bodies are compared in storage form (diagrams as metadata-only figures, so
// two figures differ exactly when their metadata differs). The diff works at
// the level of top-level HTML blocks (<p>, <h2>, <ul>, <figure>, …) via LCS;
// a removed block immediately followed by an added one is paired as
// "modified", and simple text blocks additionally get word-level marks.
// Client-side only (uses DOMParser).

export type DiffRow =
  | { kind: "same"; html: string }
  | { kind: "removed"; html: string }
  | { kind: "added"; html: string }
  | { kind: "modified"; oldMarked: string; newMarked: string };

const WORD_DIFF_TAGS = new Set(["P", "H2", "H3", "BLOCKQUOTE"]);
const WORD_DIFF_MAX = 800; // tokens; beyond this show whole blocks instead

/* ---------- public API ---------- */

export function diffBlocks(oldHtml: string, newHtml: string): DiffRow[] {
  const a = splitBlocks(oldHtml);
  const b = splitBlocks(newHtml);
  const ops = lcsOps(
    a.map((x) => x.key),
    b.map((x) => x.key),
  );

  // Walk the op list, buffering del/add runs so adjacent ones can be paired
  // into "modified" rows.
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  let dels: Block[] = [];
  let adds: Block[] = [];
  const flushRuns = () => {
    const n = Math.min(dels.length, adds.length);
    for (let k = 0; k < n; k++) {
      const o = dels[k];
      const nw = adds[k];
      if (WORD_DIFF_TAGS.has(o.tag) && WORD_DIFF_TAGS.has(nw.tag)) {
        const w = diffWordsMarked(o.text, nw.text);
        if (w) {
          rows.push({ kind: "modified", oldMarked: w.oldMarked, newMarked: w.newMarked });
          continue;
        }
      }
      rows.push({ kind: "removed", html: o.html });
      rows.push({ kind: "added", html: nw.html });
    }
    for (let k = n; k < dels.length; k++) rows.push({ kind: "removed", html: dels[k].html });
    for (let k = n; k < adds.length; k++) rows.push({ kind: "added", html: adds[k].html });
    dels = [];
    adds = [];
  };

  for (const op of ops) {
    if (op === "same") {
      flushRuns();
      rows.push({ kind: "same", html: a[i].html });
      i++;
      j++;
    } else if (op === "del") {
      dels.push(a[i]);
      i++;
    } else {
      adds.push(b[j]);
      j++;
    }
  }
  flushRuns();
  return rows;
}

// diffWordsMarked builds escaped HTML with word-level add/remove marks.
// Returns null when the texts are too large or identical.
export function diffWordsMarked(
  oldText: string,
  newText: string,
): { oldMarked: string; newMarked: string } | null {
  const a = oldText.split(/\s+/).filter(Boolean);
  const b = newText.split(/\s+/).filter(Boolean);
  if (a.length > WORD_DIFF_MAX || b.length > WORD_DIFF_MAX) return null;
  const ops = lcsOps(a, b);

  const oldParts: string[] = [];
  const newParts: string[] = [];
  let i = 0;
  let j = 0;
  for (const op of ops) {
    if (op === "same") {
      oldParts.push(escapeHtml(a[i]));
      newParts.push(escapeHtml(b[j]));
      i++;
      j++;
    } else if (op === "del") {
      oldParts.push(`<span style="${DEL_MARK}">${escapeHtml(a[i])}</span>`);
      i++;
    } else {
      newParts.push(`<span style="${INS_MARK}">${escapeHtml(b[j])}</span>`);
      j++;
    }
  }
  return { oldMarked: oldParts.join(" "), newMarked: newParts.join(" ") };
}

const DEL_MARK = "background:#f6c8c8;text-decoration:line-through;border-radius:3px;padding:0 2px";
const INS_MARK = "background:#c4e8ca;border-radius:3px;padding:0 2px";

/* ---------- internals ---------- */

interface Block {
  html: string;
  key: string; // whitespace-normalized html, used for equality
  tag: string;
  text: string;
}

function splitBlocks(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: Block[] = [];
  doc.body.childNodes.forEach((n) => {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as Element;
      blocks.push({
        html: el.outerHTML,
        key: el.outerHTML.replace(/\s+/g, " ").trim(),
        tag: el.tagName,
        text: (el.textContent || "").replace(/\s+/g, " ").trim(),
      });
    } else if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) {
      // Stray top-level text becomes a paragraph-like block.
      const text = n.textContent.replace(/\s+/g, " ").trim();
      blocks.push({ html: `<p>${escapeHtml(text)}</p>`, key: text, tag: "P", text });
    }
  });
  return blocks;
}

// Classic LCS over two sequences, emitting same/del/add ops in order.
function lcsOps<T>(a: T[], b: T[]): ("same" | "del" | "add")[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: ("same" | "del" | "add")[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push("same");
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push("del");
      i++;
    } else {
      ops.push("add");
      j++;
    }
  }
  while (i < n) {
    ops.push("del");
    i++;
  }
  while (j < m) {
    ops.push("add");
    j++;
  }
  return ops;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
