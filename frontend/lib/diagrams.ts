// Hydration for the diagram <figure> embeds (see DIAGRAMS.md at repo root).
//
// Storage contract: post bodies persist diagrams as metadata-only figures —
//
//   <figure data-uml="<uri-encoded JSON>" data-uml-title="…"></figure>
//   <figure data-flowchart="<uri-encoded JSON>"></figure>
//
// The JSON metadata is the single source of truth. The SVG is derived data,
// rendered on read and never persisted:
//
//   hydrateDiagrams   — bakes fresh SVG into every parseable figure. Runs on
//                       the public blog page (server component) and when the
//                       editor loads a post. Pure string → string, no DOM.
//   dehydrateDiagrams — strips the SVG back out, leaving metadata only. Runs
//                       when the editor saves.
//
// Anything that can write a post body via the API (an AI, a script) only has
// to emit the metadata-only figure; it renders everywhere on the next read.
// Figures whose metadata doesn't parse are passed through untouched.

import { parseUmlSteps, renderUmlSvg } from "./uml";
import { parseFlowchartData, renderFlowchartSvg } from "./flowchart";

const FIGURE_RE =
  /<figure\b[^>]*\bdata-(?:uml|flowchart)="[^"]*"[^>]*>[\s\S]*?<\/figure>/gi;
const UML_ATTR = /\bdata-uml="([^"]*)"/i;
const TITLE_ATTR = /\bdata-uml-title="([^"]*)"/i;
const FLOW_ATTR = /\bdata-flowchart="([^"]*)"/i;

// Attribute values are HTML-escaped in the raw string; the URI-encoded JSON
// contains no entities, but the human-readable title attribute does.
function unescapeAttr(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

// Rebuild the figure tag canonically (attribute values verbatim), with the
// given inner content. Also normalizes contenteditable="false" so figures
// written without it still behave as atomic blocks in the editor.
function rebuildFigure(figure: string, inner: string): string {
  const uml = figure.match(UML_ATTR);
  if (uml) {
    const title = figure.match(TITLE_ATTR);
    const titleAttr = title ? ` data-uml-title="${title[1]}"` : "";
    return `<figure data-uml="${uml[1]}"${titleAttr} contenteditable="false">${inner}</figure>`;
  }
  const flow = figure.match(FLOW_ATTR);
  if (!flow) return figure;
  return `<figure data-flowchart="${flow[1]}" contenteditable="false">${inner}</figure>`;
}

export function hydrateDiagrams(html: string): string {
  return html.replace(FIGURE_RE, (figure) => {
    const uml = figure.match(UML_ATTR);
    if (uml) {
      const steps = parseUmlSteps(uml[1]);
      // No message arrows (empty or fragment markers only) → leave untouched.
      if (!steps || !steps.some((s) => !s.fragment)) return figure;
      const title = unescapeAttr(figure.match(TITLE_ATTR)?.[1] ?? "");
      return rebuildFigure(figure, renderUmlSvg(steps, title));
    }
    const flow = figure.match(FLOW_ATTR);
    if (flow) {
      const data = parseFlowchartData(flow[1]);
      if (!data || data.nodes.length === 0) return figure;
      return rebuildFigure(figure, renderFlowchartSvg(data));
    }
    return figure;
  });
}

export function dehydrateDiagrams(html: string): string {
  return html.replace(FIGURE_RE, (figure) => rebuildFigure(figure, ""));
}
