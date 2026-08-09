// Flowchart add-on for blog posts — the sibling of lib/uml.ts.
//
// Authors place nodes on a coarse grid (row 0 at the top) and connect them
// with directed, optionally labeled edges. The renderer sizes rows/columns to
// their content, draws the three classic shapes (oval = start/end, diamond =
// decision, box = step) and routes orthogonal arrows with a small set of
// deterministic rules — no auto-layout engine, the grid keeps it predictable.
//
// Embedded in the post body as <figure data-flowchart="<uri-encoded JSON>">
// with the rendered SVG baked in, so the public page needs no client JS; the
// attribute is only read back by the editor to re-open the builder.

export type FlowShape = "box" | "decision" | "oval";

export interface FlowNode {
  id: string;
  shape: FlowShape;
  text: string;
  row: number;
  col: number;
}

export interface FlowEdge {
  from: string;
  to: string;
  label: string;
}

export interface FlowchartData {
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/* ---------- layout constants ---------- */

const FRAME_PAD = 10; // svg edge → frame line
const TITLE_H = 30; // title strip height (only when a title is set)
const PAD = 28; // frame line → content
const H_GAP = 76; // gap between columns (vertical gutters live here)
const V_GAP = 56; // gap between rows (horizontal gutters live here)
const LINE_H = 17;
const ARROW = 10;
const MAX_GRID = 30;

const INK = "#1a1c22";
const MUTED = "#9098aa";
// draw.io's classic palette — matches the usual reference look.
const STYLE: Record<FlowShape, { fill: string; stroke: string }> = {
  oval: { fill: "#f8cecc", stroke: "#b85450" },
  decision: { fill: "#e1d5e7", stroke: "#9673a6" },
  box: { fill: "#d5e8d4", stroke: "#82b366" },
};

/* ---------- small helpers ---------- */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function est(text: string, size: number, bold = false): number {
  return text.length * size * (bold ? 0.62 : 0.56);
}

function r(n: number): number {
  return Math.round(n * 2) / 2;
}

// Greedy word wrap against the estimated width budget of the shape.
function wrap(text: string, maxW: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (cur && est(candidate, 13, true) > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

const clampGrid = (n: number) =>
  Math.max(0, Math.min(MAX_GRID, Math.round(Number.isFinite(n) ? n : 0)));

/* ---------- renderer ---------- */

type Pt = [number, number];

interface Placed {
  node: FlowNode;
  lines: string[];
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export function renderFlowchartSvg(data: FlowchartData): string {
  const title = data.title.trim();
  const nodes = data.nodes
    .map((n) => ({ ...n, text: n.text.trim(), row: clampGrid(n.row), col: clampGrid(n.col) }))
    .filter((n) => n.text);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = data.edges.filter(
    (e) => e.from !== e.to && ids.has(e.from) && ids.has(e.to),
  );

  if (nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" style="max-width:320px;width:100%;height:auto"><rect x="1" y="1" width="318" height="78" fill="#f9fafc" stroke="#e2e5ee" stroke-dasharray="5 4" rx="10"/><text x="160" y="45" text-anchor="middle" font-size="13" fill="${MUTED}">Empty flowchart</text></svg>`;
  }

  /* ----- node sizes ----- */

  const placed: Placed[] = nodes.map((node) => {
    const lines = wrap(node.text, node.shape === "decision" ? 118 : 160);
    const textW = Math.max(...lines.map((l) => est(l, 13, true)));
    const textH = lines.length * LINE_H;
    let w: number, h: number;
    if (node.shape === "box") {
      w = Math.max(110, textW + 30);
      h = Math.max(44, textH + 24);
    } else if (node.shape === "oval") {
      w = Math.max(120, textW + 52);
      h = Math.max(50, textH + 30);
    } else {
      // Diamond needs extra room: the text sits in its inscribed rectangle.
      w = Math.max(120, textW + 64);
      h = Math.max(64, textH + 44);
    }
    return { node, lines, w, h, cx: 0, cy: 0 };
  });

  /* ----- grid ----- */

  const maxCol = Math.max(...nodes.map((n) => n.col));
  const maxRow = Math.max(...nodes.map((n) => n.row));
  const colW: number[] = [];
  const rowH: number[] = [];
  for (let c = 0; c <= maxCol; c++) {
    const inCol = placed.filter((p) => p.node.col === c);
    colW.push(inCol.length ? Math.max(...inCol.map((p) => p.w)) : 40);
  }
  for (let rr = 0; rr <= maxRow; rr++) {
    const inRow = placed.filter((p) => p.node.row === rr);
    rowH.push(inRow.length ? Math.max(...inRow.map((p) => p.h)) : 30);
  }

  const contentLeft = FRAME_PAD + PAD;
  const contentTop = FRAME_PAD + (title ? TITLE_H : 0) + PAD;
  const colLeft: number[] = [];
  const rowTop: number[] = [];
  for (let c = 0; c <= maxCol; c++) {
    colLeft.push(c === 0 ? contentLeft : colLeft[c - 1] + colW[c - 1] + H_GAP);
  }
  for (let rr = 0; rr <= maxRow; rr++) {
    rowTop.push(rr === 0 ? contentTop : rowTop[rr - 1] + rowH[rr - 1] + V_GAP);
  }
  const contentRight = colLeft[maxCol] + colW[maxCol];
  const contentBottom = rowTop[maxRow] + rowH[maxRow];
  const width = contentRight + PAD + FRAME_PAD;
  const height = contentBottom + PAD + FRAME_PAD;

  for (const p of placed) {
    p.cx = colLeft[p.node.col] + colW[p.node.col] / 2;
    p.cy = rowTop[p.node.row] + rowH[p.node.row] / 2;
  }
  const byId = new Map(placed.map((p) => [p.node.id, p]));

  // Gutters: mid-gap channels edges travel through.
  const gutterX = (c: number) =>
    c >= maxCol ? contentRight + PAD * 0.55 : colLeft[c] + colW[c] + H_GAP / 2;
  const gutterY = (rr: number) =>
    rr >= maxRow ? contentBottom + PAD * 0.55 : rowTop[rr] + rowH[rr] + V_GAP / 2;

  const occ = new Set(nodes.map((n) => `${n.row}:${n.col}`));
  const colClear = (c: number, rFrom: number, rTo: number) => {
    for (let rr = rFrom; rr <= rTo; rr++) if (occ.has(`${rr}:${c}`)) return false;
    return true;
  };
  const rowClear = (rr: number, c1: number, c2: number) => {
    for (let c = Math.min(c1, c2) + 1; c < Math.max(c1, c2); c++)
      if (occ.has(`${rr}:${c}`)) return false;
    return true;
  };

  type Port = "top" | "bottom" | "left" | "right";
  const port = (p: Placed, which: Port): Pt => {
    if (which === "top") return [p.cx, p.cy - p.h / 2];
    if (which === "bottom") return [p.cx, p.cy + p.h / 2];
    if (which === "left") return [p.cx - p.w / 2, p.cy];
    return [p.cx + p.w / 2, p.cy];
  };

  /* ----- edge routing -----
     Deterministic rules, in order of preference:
       same row      → straight across, side to facing side
       down, same col→ straight bottom→top; if the bottom port is taken or a
                       node is in the way, loop through the column gutter
                       into the target's side
       down, diff col→ side exit, across at the source's level, down into the
                       target's top ("H-V"); if that side port is taken, drop
                       out of the bottom into the row gutter first ("V-H-V");
                       last resort loops through the vertical gutter
       up (loops)    → out the side, up a vertical gutter, into the side
     Same-row edges are routed first because both of their ports are fixed;
     everything else keeps the author's listed order, so putting a decision's
     "Yes" before its "No" gives the Yes branch the cleaner route. Coincident
     final segments are deliberate: converging arrows share a rail and read
     as a merge. */

  const used = new Set<string>();
  const markUsed = (id: string, p: Port) => used.add(`${id}:${p}`);
  const isUsed = (id: string, p: Port) => used.has(`${id}:${p}`);

  interface Routed {
    pts: Pt[];
    label: string;
  }
  const routed: Routed[] = [];

  const ordered = [...edges].sort((a, b) => {
    const same = (e: FlowEdge) =>
      byId.get(e.from)!.node.row === byId.get(e.to)!.node.row ? 0 : 1;
    return same(a) - same(b);
  });

  for (const e of ordered) {
    const A = byId.get(e.from)!;
    const B = byId.get(e.to)!;
    const { row: r1, col: c1 } = A.node;
    const { row: r2, col: c2 } = B.node;
    let pts: Pt[];

    if (r1 === r2) {
      const dir = c2 > c1 ? 1 : -1;
      const out: Port = dir > 0 ? "right" : "left";
      const inn: Port = dir > 0 ? "left" : "right";
      if (rowClear(r1, c1, c2)) {
        // Reverse twin (B→A on the same row) gets a small vertical offset so
        // the two lines don't overlap.
        const twin = edges.some((x) => x.from === e.to && x.to === e.from);
        const dy = twin ? (e.from < e.to ? -6 : 6) : 0;
        const [x1, y1] = port(A, out);
        const [x2, y2] = port(B, inn);
        pts = [
          [x1, y1 + dy],
          [x2, y2 + dy],
        ];
      } else {
        // Something sits between them: duck through the row gutter below.
        const g = gutterY(r1);
        pts = [port(A, "bottom"), [A.cx, g], [B.cx, g], port(B, "bottom")];
      }
      markUsed(A.node.id, out);
      markUsed(B.node.id, inn);
    } else if (r2 > r1) {
      if (c1 === c2) {
        if (!isUsed(A.node.id, "bottom") && colClear(c1, r1 + 1, r2 - 1)) {
          pts = [port(A, "bottom"), port(B, "top")];
          markUsed(A.node.id, "bottom");
        } else {
          // Around the column's right side, into the target's right port.
          const g = gutterX(c1);
          pts = [port(A, "right"), [g, A.cy], [g, B.cy], port(B, "right")];
          markUsed(A.node.id, "right");
          markUsed(B.node.id, "right");
        }
      } else {
        const dir = c2 > c1 ? 1 : -1;
        const side: Port = dir > 0 ? "right" : "left";
        if (
          !isUsed(A.node.id, side) &&
          rowClear(r1, c1, c2) &&
          colClear(c2, r1, r2 - 1)
        ) {
          pts = [port(A, side), [B.cx, A.cy], port(B, "top")];
          markUsed(A.node.id, side);
        } else if (!isUsed(A.node.id, "bottom") && colClear(c2, r1 + 1, r2 - 1)) {
          const g = gutterY(r1);
          pts = [port(A, "bottom"), [A.cx, g], [B.cx, g], port(B, "top")];
          markUsed(A.node.id, "bottom");
        } else {
          const g = dir > 0 ? gutterX(c2 - 1) : gutterX(c2);
          const inn: Port = dir > 0 ? "left" : "right";
          const gy = gutterY(r1);
          pts = [port(A, "bottom"), [A.cx, gy], [g, gy], [g, B.cy], port(B, inn)];
          markUsed(A.node.id, "bottom");
          markUsed(B.node.id, inn);
        }
      }
    } else {
      // Backward edge (a loop): out the side, up a gutter, into the side.
      const g = c1 === c2 ? gutterX(c1) : gutterX(Math.min(c1, c2));
      const out: Port = g > A.cx ? "right" : "left";
      const inn: Port = g > B.cx ? "right" : "left";
      const [ox, oy] = port(A, out);
      const [ix, iy] = port(B, inn);
      const oyAdj = oy + (isUsed(A.node.id, out) ? 8 : 0);
      const iyAdj = iy + (isUsed(B.node.id, inn) ? 8 : 0);
      pts = [
        [ox, oyAdj],
        [g, oyAdj],
        [g, iyAdj],
        [ix, iyAdj],
      ];
      markUsed(A.node.id, out);
      markUsed(B.node.id, inn);
    }

    // Drop zero-length segments so the arrowhead math stays simple.
    const clean = pts.filter(
      (p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1],
    );
    routed.push({ pts: clean, label: e.label.trim() });
  }

  /* ----- draw ----- */

  const out: string[] = [];

  // Edges under nodes so lines tuck beneath shape borders at the ports.
  for (const { pts, label } of routed) {
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dx = Math.sign(last[0] - prev[0]);
    const dy = Math.sign(last[1] - prev[1]);
    const lineEnd: Pt = [last[0] - dx * ARROW, last[1] - dy * ARROW];
    const d =
      `M ${r(pts[0][0])} ${r(pts[0][1])} ` +
      pts
        .slice(1, -1)
        .map((p) => `L ${r(p[0])} ${r(p[1])}`)
        .join(" ") +
      ` L ${r(lineEnd[0])} ${r(lineEnd[1])}`;
    out.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.3"/>`);
    // Arrowhead oriented along the final segment.
    const [tx, ty] = last;
    let head: string;
    if (dy > 0) head = `${tx},${ty} ${tx - 4.5},${ty - ARROW} ${tx + 4.5},${ty - ARROW}`;
    else if (dy < 0) head = `${tx},${ty} ${tx - 4.5},${ty + ARROW} ${tx + 4.5},${ty + ARROW}`;
    else if (dx > 0) head = `${tx},${ty} ${tx - ARROW},${ty - 4.5} ${tx - ARROW},${ty + 4.5}`;
    else head = `${tx},${ty} ${tx + ARROW},${ty - 4.5} ${tx + ARROW},${ty + 4.5}`;
    out.push(`<polygon points="${head}" fill="${INK}"/>`);

    if (label) {
      const [x0, y0] = pts[0];
      const [x1, y1] = pts[1];
      if (x1 === x0) {
        const ly = y1 > y0 ? y0 + 16 : y0 - 10;
        out.push(
          `<text x="${r(x0 + 7)}" y="${r(ly)}" font-size="12" fill="${INK}">${esc(label)}</text>`,
        );
      } else if (x1 > x0) {
        out.push(
          `<text x="${r(x0 + 9)}" y="${r(y0 - 7)}" font-size="12" fill="${INK}">${esc(label)}</text>`,
        );
      } else {
        out.push(
          `<text x="${r(x0 - 9)}" y="${r(y0 - 7)}" text-anchor="end" font-size="12" fill="${INK}">${esc(label)}</text>`,
        );
      }
    }
  }

  // Nodes.
  for (const p of placed) {
    const { fill, stroke } = STYLE[p.node.shape];
    if (p.node.shape === "box") {
      out.push(
        `<rect x="${r(p.cx - p.w / 2)}" y="${r(p.cy - p.h / 2)}" width="${r(p.w)}" height="${r(p.h)}" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>`,
      );
    } else if (p.node.shape === "oval") {
      out.push(
        `<ellipse cx="${r(p.cx)}" cy="${r(p.cy)}" rx="${r(p.w / 2)}" ry="${r(p.h / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>`,
      );
    } else {
      out.push(
        `<path d="M ${r(p.cx)} ${r(p.cy - p.h / 2)} L ${r(p.cx + p.w / 2)} ${r(p.cy)} L ${r(p.cx)} ${r(p.cy + p.h / 2)} L ${r(p.cx - p.w / 2)} ${r(p.cy)} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>`,
      );
    }
    const y0 = p.cy - ((p.lines.length - 1) * LINE_H) / 2 + 4.5;
    out.push(
      `<text x="${r(p.cx)}" y="${r(y0)}" text-anchor="middle" font-size="13" font-weight="600" fill="${INK}">` +
        p.lines
          .map((l, i) =>
            i === 0 ? esc(l) : `<tspan x="${r(p.cx)}" dy="${LINE_H}">${esc(l)}</tspan>`,
          )
          .join("") +
        `</text>`,
    );
  }

  // Frame + title strip.
  out.push(
    `<rect x="${FRAME_PAD}" y="${FRAME_PAD}" width="${r(width - 2 * FRAME_PAD)}" height="${r(height - 2 * FRAME_PAD)}" fill="none" stroke="${INK}" stroke-width="1.4"/>`,
  );
  if (title) {
    out.push(
      `<line x1="${FRAME_PAD}" y1="${FRAME_PAD + TITLE_H}" x2="${r(width - FRAME_PAD)}" y2="${FRAME_PAD + TITLE_H}" stroke="${INK}" stroke-width="1.4"/>`,
    );
    out.push(
      `<text x="${r(width / 2)}" y="${FRAME_PAD + TITLE_H / 2 + 5}" text-anchor="middle" font-size="13.5" font-weight="700" fill="${INK}">${esc(title)}</text>`,
    );
  }

  const label = title || `Flowchart with ${nodes.length} steps`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(width)} ${r(height)}" width="${r(width)}" role="img" aria-label="${esc(label)}" style="max-width:${r(width)}px;width:100%;height:auto;font-family:var(--font-sans),'Helvetica Neue',Arial,sans-serif">` +
    `<rect x="0" y="0" width="${r(width)}" height="${r(height)}" fill="#fff"/>` +
    out.join("") +
    `</svg>`
  );
}

/* ---------- figure embed / read-back ---------- */

export function flowchartFigureHtml(data: FlowchartData): string {
  const payload = encodeURIComponent(JSON.stringify(data));
  return `<figure data-flowchart="${payload}" contenteditable="false">${renderFlowchartSvg(data)}</figure>`;
}

// parseFlowchartData decodes the URI-encoded JSON carried by a
// data-flowchart attribute. Usable both from the DOM (editor) and from a raw
// HTML string (server-side hydration) — see lib/diagrams.ts.
export function parseFlowchartData(encoded: string): FlowchartData | null {
  try {
    const obj = JSON.parse(decodeURIComponent(encoded));
    if (!obj || !Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null;
    const nodes: FlowNode[] = obj.nodes
      .map((n: unknown, i: number) => {
        const x = n as Record<string, unknown>;
        const shape = x?.shape === "decision" || x?.shape === "oval" ? x.shape : "box";
        return {
          id: String(x?.id ?? `n${i + 1}`),
          shape: shape as FlowShape,
          text: String(x?.text ?? ""),
          row: clampGrid(Number(x?.row)),
          col: clampGrid(Number(x?.col)),
        };
      })
      .filter((n: FlowNode) => n.text.trim());
    const ids = new Set(nodes.map((n) => n.id));
    const edges: FlowEdge[] = obj.edges
      .map((e: unknown) => {
        const x = e as Record<string, unknown>;
        return {
          from: String(x?.from ?? ""),
          to: String(x?.to ?? ""),
          label: String(x?.label ?? ""),
        };
      })
      .filter((e: FlowEdge) => e.from !== e.to && ids.has(e.from) && ids.has(e.to));
    return { title: String(obj.title ?? ""), nodes, edges };
  } catch {
    return null;
  }
}

export function parseFlowchartFigure(el: Element): FlowchartData | null {
  const raw = el.getAttribute("data-flowchart");
  if (!raw) return null;
  return parseFlowchartData(raw);
}
