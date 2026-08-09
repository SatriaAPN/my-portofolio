<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Diagram embeds

Post bodies store UML/flowchart diagrams as metadata-only
`<figure data-uml|data-flowchart>` elements; SVG is rendered on read, never
persisted. Read `../DIAGRAMS.md` before touching the editor, the blog page,
or `lib/uml.ts` / `lib/flowchart.ts` / `lib/diagrams.ts` — and follow it when
writing post bodies through the API.
