// Copy/paste exchange format for the post editor (the "AI round-trip" card).
//
// exportPostSource turns a post into one self-describing text blob: a format
// guide (so an AI chat knows how to edit it, including the diagram semantics
// from DIAGRAMS.md), then the post as marker-delimited sections. Diagram
// figures are unwrapped from their URI-encoded storage form into readable
// inline JSON:
//
//   <figure data-diagram="uml" data-title="…">
//   [ …steps, one per line… ]
//   </figure>
//
// importPostSource is the inverse. It tolerates sloppy round-trips — the
// guide echoed back, the reply wrapped in a code fence, commentary outside
// the POST START/END markers — and validates every diagram with the
// canonical parsers, refusing the whole paste with a per-diagram reason
// rather than importing a figure that would render as nothing. Its output
// body is in storage form (metadata-only figures, see DIAGRAMS.md); callers
// hydrate for display.

import {
  dehydrateDiagrams,
  escapeAttr,
  FIGURE_RE,
  FLOW_ATTR,
  TITLE_ATTR,
  UML_ATTR,
  unescapeAttr,
} from "./diagrams";
import { parseUmlSteps, type UmlStep } from "./uml";
import { parseFlowchartData } from "./flowchart";

export interface ExchangePost {
  title: string;
  excerpt: string;
  tags: string[];
  body: string;
}

// Sections the AI dropped come back undefined so the editor keeps its
// current values; only the body is mandatory.
export interface ImportedPost {
  title?: string;
  excerpt?: string;
  tags?: string[];
  body: string;
}

export type ImportResult =
  | { ok: true; post: ImportedPost }
  | { ok: false; error: string };

const POST_START = "<!-- POST START -->";
const POST_END = "<!-- POST END -->";

// Readable-form figures produced by exportPostSource.
const READABLE_RE =
  /<figure\b[^>]*\bdata-diagram="(uml|flowchart)"[^>]*>([\s\S]*?)<\/figure>/gi;
const READABLE_TITLE_ATTR = /\bdata-title="([^"]*)"/i;

/* ---------- export ---------- */

export function exportPostSource(post: ExchangePost): string {
  const { body, hasUml, hasFlow } = toReadable(dehydrateDiagrams(post.body));
  return [
    formatGuide(hasUml, hasFlow),
    "",
    POST_START,
    "<!-- TITLE -->",
    post.title,
    "<!-- EXCERPT -->",
    post.excerpt,
    "<!-- TAGS -->",
    post.tags.join(", "),
    "<!-- BODY -->",
    body,
    POST_END,
    "",
  ].join("\n");
}

// Storage figures → readable figures. A figure whose metadata doesn't parse
// is passed through in storage form, same as hydrateDiagrams treats it.
function toReadable(html: string): { body: string; hasUml: boolean; hasFlow: boolean } {
  let hasUml = false;
  let hasFlow = false;
  const body = html.replace(FIGURE_RE, (figure) => {
    const uml = figure.match(UML_ATTR);
    if (uml) {
      const steps = parseUmlSteps(uml[1]);
      if (!steps) return figure;
      hasUml = true;
      const title = unescapeAttr(figure.match(TITLE_ATTR)?.[1] ?? "");
      const titleAttr = title ? ` data-title="${escapeAttr(title)}"` : "";
      return `<figure data-diagram="uml"${titleAttr}>\n[\n${prettyRows(steps)}\n]\n</figure>`;
    }
    const flow = figure.match(FLOW_ATTR);
    if (!flow) return figure;
    const data = parseFlowchartData(flow[1]);
    if (!data) return figure;
    hasFlow = true;
    const inner = `{\n  "title": ${JSON.stringify(data.title)},\n  "nodes": [\n${prettyRows(data.nodes, "    ")}\n  ],\n  "edges": [\n${prettyRows(data.edges, "    ")}\n  ]\n}`;
    return `<figure data-diagram="flowchart">\n${inner}\n</figure>`;
  });
  return { body, hasUml, hasFlow };
}

// One object per line, as in the DIAGRAMS.md examples — far easier for a
// model (or a human) to edit than a fully indented tree.
function prettyRows(rows: unknown[], indent = "  "): string {
  return rows.map((r) => indent + JSON.stringify(r)).join(",\n");
}

/* ---------- import ---------- */

export function importPostSource(text: string): ImportResult {
  let t = text.replace(/\r\n/g, "\n").trim();
  // Tolerate the whole reply arriving wrapped in a code fence.
  t = t.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
  // Everything outside POST START/END is the guide or AI commentary. Match
  // whole lines only, so prose that merely mentions a marker can't hijack
  // the cut points.
  const start = /^[ \t]*<!--\s*POST START\s*-->[ \t]*$/m.exec(t);
  if (start) t = t.slice(start.index + start[0].length);
  const end = /^[ \t]*<!--\s*POST END\s*-->[ \t]*$/m.exec(t);
  if (end) t = t.slice(0, end.index);

  const sections: Partial<Record<string, string>> = {};
  const marker = /<!--\s*(TITLE|EXCERPT|TAGS|BODY)\s*-->/gi;
  let open: { name: string; at: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(t))) {
    if (open) sections[open.name] = t.slice(open.at, m.index).trim();
    open = { name: m[1].toUpperCase(), at: m.index + m[0].length };
  }
  if (open) sections[open.name] = t.slice(open.at).trim();

  const rawBody = sections.BODY;
  if (rawBody === undefined) {
    return { ok: false, error: "No <!-- BODY --> marker found — paste the whole reply, markers included." };
  }
  if (!rawBody) return { ok: false, error: "The BODY section is empty." };
  const conv = readableToStorage(rawBody);
  if (!conv.ok) return conv;
  return {
    ok: true,
    post: {
      title: sections.TITLE,
      excerpt: sections.EXCERPT,
      tags: sections.TAGS?.split(",").map((s) => s.trim()).filter(Boolean),
      body: conv.body,
    },
  };
}

// Readable figures → storage figures, validating each with the canonical
// parser. Any failure aborts the import with the diagram's number and the
// reason; a broken figure must never slip in silently (it would render as
// nothing). Storage-form figures already in the body pass through untouched.
function readableToStorage(html: string): { ok: true; body: string } | { ok: false; error: string } {
  let n = 0;
  let error: string | null = null;
  const fail = (figure: string, kind: string, why: string) => {
    error = error ?? `Diagram ${n} (${kind}): ${why}`;
    return figure;
  };
  const body = html.replace(READABLE_RE, (figure, kind: string, inner: string) => {
    n++;
    let parsed: unknown;
    try {
      parsed = JSON.parse(inner.trim());
    } catch {
      // A model may HTML-escape the JSON; try once more unescaped.
      try {
        parsed = JSON.parse(unescapeAttr(inner.trim()));
      } catch (e) {
        return fail(figure, kind, `its JSON does not parse — ${(e as Error).message}`);
      }
    }
    const encoded = encodeURIComponent(JSON.stringify(parsed));
    if (kind === "uml") {
      const steps = parseUmlSteps(encoded);
      if (!steps) return fail(figure, kind, "expected a JSON array of steps.");
      if (!steps.some((s) => !s.fragment)) {
        return fail(figure, kind, "no valid message rows — each needs source, target and description.");
      }
      const unbalanced = fragmentBalanceError(steps);
      if (unbalanced) return fail(figure, kind, unbalanced);
      const title = unescapeAttr(figure.match(READABLE_TITLE_ATTR)?.[1] ?? "");
      const titleAttr = title ? ` data-uml-title="${escapeAttr(title)}"` : "";
      return `<figure data-uml="${encodeURIComponent(JSON.stringify(steps))}"${titleAttr} contenteditable="false"></figure>`;
    }
    const data = parseFlowchartData(encoded);
    if (!data) return fail(figure, kind, 'expected a JSON object with "nodes" and "edges" arrays.');
    if (data.nodes.length === 0) return fail(figure, kind, "no nodes with text survived validation.");
    return `<figure data-flowchart="${encodeURIComponent(JSON.stringify(data))}" contenteditable="false"></figure>`;
  });
  return error ? { ok: false, error } : { ok: true, body };
}

// Same balance rules the UML dialog enforces on save (see DIAGRAMS.md):
// every alt/opt needs an end, and else belongs directly inside an alt.
function fragmentBalanceError(steps: UmlStep[]): string | null {
  const stack: ("alt" | "opt")[] = [];
  for (const s of steps) {
    if (s.fragment === "alt" || s.fragment === "opt") stack.push(s.fragment);
    else if (s.fragment === "else" && stack[stack.length - 1] !== "alt") {
      return 'an "else" marker is not directly inside an "alt" frame.';
    } else if (s.fragment === "end" && !stack.pop()) {
      return 'an "end" marker has no open "alt"/"opt" frame.';
    }
  }
  if (stack.length) return `an "${stack[stack.length - 1]}" frame is never closed with "end".`;
  return null;
}

/* ---------- format guide ---------- */

// The primer the AI reads before the post. Wording condensed from
// DIAGRAMS.md — keep the two in sync if the contract changes. Diagram
// sections are included only when that diagram type is present.
function formatGuide(hasUml: boolean, hasFlow: boolean): string {
  const out = [
    "FORMAT GUIDE — read me first",
    "============================",
    "This is a blog post exported from a portfolio CMS. Improve it as",
    "instructed, then return the WHOLE document in exactly this format —",
    "same comment markers, same section order — so it can be pasted back",
    "into the editor.",
    "",
    "- TITLE and EXCERPT are plain text; TAGS is one comma-separated line.",
    "- BODY is HTML. Stick to p, h2, blockquote, ul/li, pre, code, a,",
    "  b/strong and i/em" +
      (hasUml || hasFlow ? ", plus the diagram <figure> blocks described below." : "."),
    // Worded without literal marker syntax so this guide, echoed back in a
    // reply, can never be mistaken for the markers themselves.
    "- Keep commentary outside the markers: anything before the POST START",
    "  marker and after the POST END marker is ignored on import.",
  ];
  if (hasUml) {
    out.push(
      "",
      "Sequence diagrams",
      "-----------------",
      "A sequence diagram is a <figure> whose content is plain JSON:",
      "",
      '  <figure data-diagram="uml" data-title="optional title">',
      "  [ ...steps ]",
      "  </figure>",
      "",
      "The JSON is an array of steps, drawn top-to-bottom as labeled arrows:",
      '  { "source": "A", "target": "B", "description": "label", "session_end": false }',
      "- Participants appear left-to-right in order of first mention;",
      '  "user"/"actor" draws as a stick figure, any other name as a box.',
      "- source === target draws a self-message loop.",
      '- "session_end": true closes the SENDER\'s activation bar after that',
      "  message — set it on the reply that completes a request.",
      "- Conditional blocks are marker rows mixed into the same array:",
      '  { "fragment": "alt", "description": "guard" } (or "opt") opens a',
      '  frame, { "fragment": "else", "description": "guard" } starts the',
      '  next branch of an alt, { "fragment": "end" } closes the frame.',
      "  Keep alt/opt/end balanced.",
      "- Edit the JSON to change a diagram; never replace it with SVG,",
      "  images, or a text description.",
    );
  }
  if (hasFlow) {
    out.push(
      "",
      "Flowcharts",
      "----------",
      "A flowchart is a <figure> whose content is plain JSON:",
      "",
      '  <figure data-diagram="flowchart">',
      '  { "title": "...", "nodes": [...], "edges": [...] }',
      "  </figure>",
      "",
      "- Nodes sit on a coarse grid, one node per cell:",
      '  { "id": "n1", "shape": "oval"|"decision"|"box", "text": "...", "row": 0, "col": 1 }',
      '  (row 0 = top, col 0 = left; "oval" = start/end, "decision" =',
      '  branch, "box" = step).',
      '- Edges connect node ids: { "from": "n1", "to": "n2", "label": "Yes" }.',
      "  List a decision's \"Yes\" edge before its \"No\" — the first edge",
      "  gets the preferred route.",
      "- For a clean layout keep the main path top-to-bottom in one column",
      "  and push branches one column to the side.",
      "- Edit the JSON to change a chart; never replace it with SVG or images.",
    );
  }
  return out.join("\n");
}
