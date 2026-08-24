# Diagram embeds — the contract

Blog posts can embed two diagram types: **UML sequence diagrams** and
**flowcharts**. This file is the contract for anything that reads or writes
post bodies — the admin editor, the public page, and especially AI/API
writers drafting or updating posts.

## Storage contract (metadata only)

A diagram is a `<figure>` whose data attribute carries the diagram's
metadata as **URI-encoded JSON** (`encodeURIComponent(JSON.stringify(...))`,
double-quoted attribute). The metadata is the single source of truth; the
SVG is derived at read time and **never persisted**.

To put a diagram in a post body, emit exactly this — empty content, no SVG:

```html
<figure data-uml="%5B%7B%22source%22%3A%22user%22%2C...%5D"></figure>
<figure data-flowchart="%7B%22title%22%3A%22...%22%2C...%7D"></figure>
```

- Rendering happens on read via `hydrateDiagrams()` in
  `frontend/lib/diagrams.ts`: the public blog page bakes SVG server-side
  (`frontend/app/blog/[slug]/page.tsx`) and the admin editor renders on
  load. The editor strips SVG back out on save (`dehydrateDiagrams()`).
- Any inner SVG found in a stored body is stale display data — it is
  regenerated on read and removed on the next save. Never rely on it.
- **If you add a new consumer of `post.body`** (RSS, static export, email),
  run `hydrateDiagrams()` on the body first.
- A figure whose metadata fails to parse is passed through untouched (it
  renders as nothing). Validate JSON before writing.
- An optional sequence-diagram title lives on a separate
  `data-uml-title="..."` attribute (plain text, HTML-escaped). The
  flowchart's title lives inside its JSON.

## Sequence diagram (`data-uml`)

The metadata is an **array of steps**; each step is one labeled arrow,
rendered top to bottom in array order:

```json
[
  { "source": "user", "target": "BE", "description": "blog request",  "session_end": false },
  { "source": "BE",   "target": "DB", "description": "query posts",   "session_end": false },
  { "source": "DB",   "target": "BE", "description": "rows",          "session_end": true },
  { "source": "BE",   "target": "user", "description": "blog response", "session_end": true }
]
```

Semantics:

- Participants appear left to right in order of first mention. Identity is
  case-insensitive (`User` and `user` share a lifeline).
- A participant named `user` or `actor` (case-insensitive) is drawn as a
  stick figure; every other name is drawn as a box.
- `source === target` draws a self-message loop.
- `session_end: true` closes the **sender's** activation bar after that
  message — use it on the reply that completes a request. The receiver
  stays active until its own last message; a closed participant's next
  involvement opens a fresh bar.

### Combined fragments (`alt` / `opt`)

Conditional blocks are **marker rows** mixed into the same flat array. A
marker row sets `"fragment"` and carries its guard text in `"description"`;
it has **no participants** (`source`/`target` empty or omitted,
`session_end` false or omitted):

```json
[
  { "source": "user",   "target": "BE",     "description": "register server",    "session_end": false },
  { "source": "BE",     "target": "server", "description": "disk rebuild check", "session_end": false },
  { "source": "server", "target": "BE",     "description": "disk rebuild result", "session_end": true },
  { "fragment": "alt",  "description": "has rebuilding disk" },
  { "source": "BE", "target": "BE", "description": "insert tracker", "session_end": false },
  { "fragment": "else", "description": "" },
  { "source": "BE", "target": "BE", "description": "skip registration", "session_end": false },
  { "fragment": "end" },
  { "source": "BE", "target": "user", "description": "register result", "session_end": true }
]
```

- `"alt"` and `"opt"` open a frame around the rows that follow (guard
  optional); `"else"` starts the next operand of an `alt` (guard optional —
  renders as `[else]`); `"end"` closes the innermost open frame. Fragments
  may nest.
- Balance rules: every `alt`/`opt` needs an `end`, and `else` belongs
  directly inside an `alt`. The renderer is lenient — stray `else`/`end`
  rows are dropped and unclosed frames auto-close at the bottom — but
  writers should emit balanced markers; the editor dialog refuses to save
  unbalanced ones.
- Degradation: marker rows carry no participants, so readers that predate
  fragments filter them out and render the same diagram without frames.

## Flowchart (`data-flowchart`)

The metadata is one object: a title (optional, `""` for none), nodes on a
coarse grid, and directed edges:

```json
{
  "title": "RP Review - Fulfill Time Expectation Logic",
  "nodes": [
    { "id": "n1", "shape": "oval",     "text": "incident alert fired", "row": 0, "col": 1 },
    { "id": "n2", "shape": "decision", "text": "NOC acked in thread?", "row": 1, "col": 1 },
    { "id": "n3", "shape": "box",      "text": "fulfill time expectation = True", "row": 2, "col": 0 }
  ],
  "edges": [
    { "from": "n1", "to": "n2", "label": "" },
    { "from": "n2", "to": "n3", "label": "Yes" }
  ]
}
```

Semantics:

- Grid: `row 0` is the top, `col 0` is the left, max 30 each. **One node per
  cell** — two nodes sharing a cell draw on top of each other.
- Shapes: `oval` = start/end, `decision` = diamond (branches), `box` = step.
  Unknown shapes fall back to `box`.
- Edges reference node `id`s; `label` is optional (use `"Yes"`/`"No"` on
  decision branches).
- Routing is deterministic. For good-looking charts: run the main path top
  to bottom in a single column, push branches one column to the side, put
  results/merges on the bottom row — and **list a decision's "Yes" edge
  before its "No"**, because the first-listed edge gets the preferred route.
- Nodes with empty text and edges pointing at unknown ids are dropped.

## Where the code lives

- Renderers (pure functions, TypeScript): `frontend/lib/uml.ts`,
  `frontend/lib/flowchart.ts` — SVG is produced only from metadata.
- Hydrate/dehydrate: `frontend/lib/diagrams.ts`.
- Form UIs: `frontend/components/admin/UmlDialog.tsx`,
  `frontend/components/admin/FlowchartDialog.tsx` (toolbar buttons **UML**
  and **FLOW** in the post editor; click an existing diagram to edit it).
