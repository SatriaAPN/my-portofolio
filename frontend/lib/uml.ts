// UML sequence-diagram add-on for blog posts.
//
// The editor builds an array of steps ({ source, target, description,
// session_end }), renders it to an SVG string with renderUmlSvg, and embeds it
// in the post body as:
//
//   <figure data-uml="<uri-encoded step JSON>">…svg…</figure>
//
// The SVG is baked into the stored HTML, so the public blog page renders the
// diagram with no client JS; the metadata on the attribute is only read back
// by the editor to re-open the builder for an existing diagram.

export interface UmlStep {
  source: string;
  target: string;
  description: string;
  session_end: boolean;
}

/* ---------- layout constants ---------- */

const FRAME_PAD = 10; // svg edge → frame line
const CONTENT_PAD = 34; // frame line → outermost lifeline content
const TAB_W = 34; // frame corner tab (grows with a title)
const TAB_H = 24;
const BOX_H = 46; // participant box
const ACTOR_H = 64; // stick figure incl. name below
const HEAD_GAP = 52; // header bottom → first message
const ROW_GAP = 64; // vertical distance between messages
const SELF_H = 28; // extra height used by a self-message loop
const ACT_W = 13; // activation bar width
const ACT_PAD = 13; // activation overhang before/after its messages
const TAIL = 44; // lifeline continuation below the last message
const MIN_COL_GAP = 170;

const INK = "#1a1c22";
const MUTED = "#9098aa";

/* ---------- small helpers ---------- */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Rough text-width estimate (no DOM available server-side / in a pure fn).
function est(text: string, size: number, bold = false): number {
  return text.length * size * (bold ? 0.62 : 0.56);
}

// "user"/"actor" render as a stick figure; anything else as a named box.
function isActor(name: string): boolean {
  return /^(user|actor)$/i.test(name.trim());
}

function sameParticipant(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/* ---------- renderer ---------- */

export function renderUmlSvg(rawSteps: UmlStep[], title = ""): string {
  const steps = rawSteps
    .map((s) => ({
      source: s.source.trim(),
      target: s.target.trim(),
      description: s.description.trim(),
      session_end: Boolean(s.session_end),
    }))
    .filter((s) => s.source && s.target && s.description);

  if (steps.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" style="max-width:320px;width:100%;height:auto"><rect x="1" y="1" width="318" height="78" fill="#f9fafc" stroke="#e2e5ee" stroke-dasharray="5 4" rx="10"/><text x="160" y="45" text-anchor="middle" font-size="13" fill="${MUTED}">Empty sequence diagram</text></svg>`;
  }

  // Participants in order of first appearance (case-insensitive identity).
  const participants: string[] = [];
  for (const s of steps) {
    for (const name of [s.source, s.target]) {
      if (!participants.some((p) => sameParticipant(p, name))) participants.push(name);
    }
  }
  const pIndex = (name: string) =>
    participants.findIndex((p) => sameParticipant(p, name));
  const isSelf = (s: UmlStep) => sameParticipant(s.source, s.target);

  /* ----- horizontal layout ----- */

  const widths = participants.map((p) =>
    isActor(p) ? Math.max(56, est(p, 13) + 10) : Math.max(96, est(p, 14.5, true) + 44),
  );

  // Minimum gap between adjacent lifeline centers: room for the two shapes
  // plus room for every message label that crosses this gap.
  const minGap: number[] = [];
  for (let i = 0; i < participants.length - 1; i++) {
    minGap.push(Math.max(MIN_COL_GAP, (widths[i] + widths[i + 1]) / 2 + 56));
  }
  let extraRight = 0;
  for (const s of steps) {
    const a = pIndex(s.source);
    const b = pIndex(s.target);
    const labelW = est(s.description, 13.5) + 90;
    if (a === b) {
      // Self-loop draws to the right of the lifeline.
      const need = 56 + est(s.description, 13.5) + 28;
      if (a === participants.length - 1) extraRight = Math.max(extraRight, need - widths[a] / 2);
      else minGap[a] = Math.max(minGap[a], need + widths[a + 1] / 2);
    } else {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let g = lo; g < hi; g++) minGap[g] = Math.max(minGap[g], labelW / (hi - lo));
    }
  }

  const contentLeft = FRAME_PAD + CONTENT_PAD;
  const centers: number[] = [];
  for (let i = 0; i < participants.length; i++) {
    centers.push(i === 0 ? contentLeft + widths[0] / 2 : centers[i - 1] + minGap[i - 1]);
  }
  const width =
    centers[centers.length - 1] +
    widths[widths.length - 1] / 2 +
    extraRight +
    CONTENT_PAD +
    FRAME_PAD;

  /* ----- vertical layout ----- */

  const headTop = FRAME_PAD + TAB_H + 16;
  const headH = Math.max(...participants.map((p) => (isActor(p) ? ACTOR_H : BOX_H)));
  const headBottom = headTop + headH;

  const msgY: number[] = [];
  for (let i = 0; i < steps.length; i++) {
    msgY.push(
      i === 0
        ? headBottom + HEAD_GAP
        : msgY[i - 1] + ROW_GAP + (isSelf(steps[i - 1]) ? SELF_H : 0),
    );
  }
  const lastY = msgY[steps.length - 1] + (isSelf(steps[steps.length - 1]) ? SELF_H : 0);
  const lifeBottom = lastY + TAIL;
  const height = lifeBottom + 16 + FRAME_PAD;

  /* ----- activations -----
     A participant's bar spans its first to last involvement. A step with
     session_end true closes the *sender's* bar after that message — the
     reply that completes its work — while the receiver stays active, so a
     caller's bar keeps running across several request/reply pairs (standard
     UML: the return message deactivates the callee, not the caller). The
     sender's next involvement starts a fresh bar. Bars start a little early
     when the participant sends its opening message and run a little late
     when it receives its closing one — the classic caller-wraps-callee look. */

  interface Bar {
    p: number;
    top: number;
    bottom: number;
  }
  const bars: Bar[] = [];
  for (let p = 0; p < participants.length; p++) {
    let first = -1;
    let last = -1;
    const flush = () => {
      if (first < 0) return;
      const top = msgY[first] - (pIndex(steps[first].source) === p ? ACT_PAD : 0);
      let bottom = msgY[last] + (pIndex(steps[last].target) === p ? ACT_PAD : 0);
      if (isSelf(steps[last])) bottom = msgY[last] + SELF_H + 10;
      bottom = Math.max(bottom, top + 28);
      bars.push({ p, top, bottom });
      first = last = -1;
    };
    steps.forEach((s, i) => {
      const isSrc = pIndex(s.source) === p;
      if (!isSrc && pIndex(s.target) !== p) return;
      if (first < 0) first = i;
      last = i;
      if (s.session_end && isSrc) flush();
    });
    flush();
  }
  const barAt = (p: number, y: number) =>
    bars.find((b) => b.p === p && b.top <= y && y <= b.bottom);

  /* ----- draw ----- */

  const out: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, extra = "") =>
    out.push(
      `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${INK}" stroke-width="1.3"${extra}/>`,
    );

  // Lifelines first so everything else draws on top of them.
  for (let i = 0; i < participants.length; i++) {
    out.push(
      `<line x1="${r(centers[i])}" y1="${headBottom}" x2="${r(centers[i])}" y2="${lifeBottom}" stroke="${MUTED}" stroke-width="1.2" stroke-dasharray="5 5"/>`,
    );
  }

  // Participant headers (bottom-aligned so all lifelines start together).
  for (let i = 0; i < participants.length; i++) {
    const name = participants[i];
    const cx = centers[i];
    if (isActor(name)) {
      const top = headBottom - ACTOR_H;
      out.push(`<g stroke="${INK}" stroke-width="1.5" fill="none">`);
      out.push(`<circle cx="${r(cx)}" cy="${top + 9}" r="7.5"/>`);
      line(cx, top + 16.5, cx, top + 33); // body
      line(cx - 11, top + 22, cx + 11, top + 22); // arms
      line(cx, top + 33, cx - 9, top + 46); // legs
      line(cx, top + 33, cx + 9, top + 46);
      out.push(`</g>`);
      out.push(
        `<text x="${r(cx)}" y="${headBottom - 3}" text-anchor="middle" font-size="13" fill="${INK}">${esc(name)}</text>`,
      );
    } else {
      const w = widths[i];
      out.push(
        `<rect x="${r(cx - w / 2)}" y="${headBottom - BOX_H}" width="${r(w)}" height="${BOX_H}" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`,
      );
      out.push(
        `<text x="${r(cx)}" y="${headBottom - BOX_H / 2 + 5}" text-anchor="middle" font-size="14.5" font-weight="600" fill="${INK}">${esc(name)}</text>`,
      );
    }
  }

  // Activation bars.
  for (const b of bars) {
    out.push(
      `<rect x="${r(centers[b.p] - ACT_W / 2)}" y="${r(b.top)}" width="${ACT_W}" height="${r(b.bottom - b.top)}" fill="#fff" stroke="${INK}" stroke-width="1.3"/>`,
    );
  }

  // Messages.
  steps.forEach((s, i) => {
    const y = msgY[i];
    const a = pIndex(s.source);
    const b = pIndex(s.target);
    if (a === b) {
      // Self-message loop out to the right.
      const xr = centers[a] + (barAt(a, y) ? ACT_W / 2 : 0);
      const loopW = 46;
      out.push(
        `<path d="M ${r(xr)} ${r(y)} H ${r(xr + loopW)} V ${r(y + SELF_H)} H ${r(xr + 11)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`,
      );
      out.push(arrowHead(xr, y + SELF_H, -1));
      out.push(
        `<text x="${r(xr + 8)}" y="${r(y - 8)}" font-size="13.5" fill="${INK}">${esc(s.description)}</text>`,
      );
    } else {
      const dir = b > a ? 1 : -1;
      const x1 = centers[a] + (barAt(a, y) ? (ACT_W / 2) * dir : 0);
      const x2 = centers[b] - (barAt(b, y) ? (ACT_W / 2) * dir : 0);
      line(x1, y, x2 - 11 * dir, y);
      out.push(arrowHead(x2, y, dir));
      out.push(
        `<text x="${r((x1 + x2) / 2)}" y="${r(y - 8)}" text-anchor="middle" font-size="13.5" fill="${INK}">${esc(s.description)}</text>`,
      );
    }
  });

  // Frame + corner tab (the classic "sd" pentagon; empty when untitled).
  const fx = FRAME_PAD;
  const fy = FRAME_PAD;
  out.push(
    `<rect x="${fx}" y="${fy}" width="${r(width - 2 * FRAME_PAD)}" height="${r(height - 2 * FRAME_PAD)}" fill="none" stroke="${INK}" stroke-width="1.4"/>`,
  );
  const tabW = title ? est(title, 12.5, true) + 36 : TAB_W;
  out.push(
    `<path d="M ${fx} ${fy} H ${r(fx + tabW)} V ${fy + TAB_H - 9} L ${r(fx + tabW - 9)} ${fy + TAB_H} H ${fx} Z" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`,
  );
  if (title) {
    out.push(
      `<text x="${fx + 12}" y="${fy + TAB_H - 7}" font-size="12.5" font-weight="600" fill="${INK}">${esc(title)}</text>`,
    );
  }

  const label =
    title ||
    `Sequence diagram: ${steps.map((s) => `${s.source} to ${s.target}: ${s.description}`).join("; ")}`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(width)} ${r(height)}" width="${r(width)}" role="img" aria-label="${esc(label)}" style="max-width:${r(width)}px;width:100%;height:auto;font-family:var(--font-sans),'Helvetica Neue',Arial,sans-serif">` +
    `<rect x="0" y="0" width="${r(width)}" height="${r(height)}" fill="#fff"/>` +
    out.join("") +
    `</svg>`
  );
}

function arrowHead(tipX: number, tipY: number, dir: 1 | -1): string {
  return `<polygon points="${r(tipX)},${r(tipY)} ${r(tipX - 12 * dir)},${r(tipY - 5.5)} ${r(tipX - 12 * dir)},${r(tipY + 5.5)}" fill="${INK}"/>`;
}

function r(n: number): number {
  return Math.round(n * 2) / 2;
}

/* ---------- figure embed / read-back ---------- */

export function umlFigureHtml(steps: UmlStep[], title = ""): string {
  const data = encodeURIComponent(JSON.stringify(steps));
  const t = title ? ` data-uml-title="${esc(title)}"` : "";
  return `<figure data-uml="${data}"${t} contenteditable="false">${renderUmlSvg(steps, title)}</figure>`;
}

export function parseUmlFigure(
  el: Element,
): { steps: UmlStep[]; title: string } | null {
  const raw = el.getAttribute("data-uml");
  if (!raw) return null;
  try {
    const arr = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(arr)) return null;
    const steps = arr
      .map((x) => ({
        source: String(x?.source ?? ""),
        target: String(x?.target ?? ""),
        description: String(x?.description ?? ""),
        session_end: Boolean(x?.session_end),
      }))
      .filter((s) => s.source && s.target && s.description);
    return { steps, title: el.getAttribute("data-uml-title") || "" };
  } catch {
    return null;
  }
}
