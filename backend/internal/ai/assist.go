package ai

// AI assist for the post editor: takes the current post + an instruction,
// returns the full revised post. The editor diffs the result against the
// current version and the author accepts or declines — nothing is persisted
// here.

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// assistSystem teaches the model the post's HTML dialect and the diagram
// contract (condensed from DIAGRAMS.md), and pins the output format.
const assistSystem = `You are the writing assistant inside the blog editor of Satria Aluh Perwira Nusa, a fullstack/backend engineer. You revise his blog posts on request.

Apply the INSTRUCTION to the post. Change only what the instruction calls for (plus directly necessary touch-ups). Preserve the author's voice and technical accuracy. Keep any field the instruction doesn't concern verbatim.

OUTPUT — return ONLY a JSON object, no markdown fences, no commentary:
{"title": "...", "excerpt": "...", "body": "..."}

BODY FORMAT — HTML restricted to these elements: <p>, <h2>, <h3>, <blockquote>, <ul>, <ol>, <li>, <pre>, <code>, <b>, <strong>, <i>, <em>, <a href="...">. No inline styles, no scripts, no images.

DIAGRAMS — posts may embed diagrams as figures whose data attribute holds URI-encoded JSON metadata and whose content is EMPTY (the site renders the SVG from metadata on read):
  <figure data-uml="<encodeURIComponent of JSON>"></figure>
  <figure data-flowchart="<encodeURIComponent of JSON>"></figure>
Preserve existing figures byte-for-byte unless the instruction asks to change or add diagrams.

Sequence diagram metadata (data-uml) — an ARRAY of arrows, rendered top to bottom:
  [{"source":"user","target":"BE","description":"blog request","session_end":false}, ...]
- A participant named "user" or "actor" is drawn as a stick figure; other names as boxes.
- "session_end": true closes the SENDER's activation bar — put it on the reply that completes a request.
- Conditional blocks: marker rows mixed into the same array — {"fragment":"alt","description":"<guard>"} opens a frame, {"fragment":"else","description":""} starts the alternative branch, {"fragment":"end"} closes it. "opt" = guarded frame without else. Marker rows have NO source/target. Keep markers balanced: every alt/opt needs an end; else only directly inside an alt; fragments may nest.
- An optional title goes on a separate data-uml-title="..." attribute (plain text).

Flowchart metadata (data-flowchart) — one object:
  {"title":"...","nodes":[{"id":"n1","shape":"oval|decision|box","text":"...","row":0,"col":0}],"edges":[{"from":"n1","to":"n2","label":"Yes"}]}
- Grid: row 0 is the top, col 0 is the left, one node per cell (max 30).
- oval = start/end, decision = diamond, box = step.
- Conventions: main path top-to-bottom in one column; branches one column to the side; results/merges on the bottom row. List a decision's "Yes" edge before its "No".`

// AssistPost runs the instruction through Claude. Unlike Ask, there is no
// silent stub fallback: an editing tool degrading to canned output would be
// confusing, so API failures surface to the editor as errors.
func (c *ClaudeProvider) AssistPost(req AssistRequest) (AssistResult, error) {
	instruction := strings.TrimSpace(req.Instruction)
	if instruction == "" {
		return AssistResult{}, errors.New("empty instruction")
	}

	tags := ""
	if len(req.Tags) > 0 {
		tags = "\nTAGS: " + strings.Join(req.Tags, ", ")
	}
	user := fmt.Sprintf(
		"INSTRUCTION:\n%s\n\nCURRENT TITLE:\n%s\n\nCURRENT EXCERPT:\n%s%s\n\nCURRENT BODY (HTML):\n%s\n\nReturn the revised post as JSON.",
		instruction, req.Title, req.Excerpt, tags, req.Body,
	)

	// Longer deadline than Ask/Tailor: full-body rewrites are bigger jobs.
	// One retry absorbs transient network flakes (VPN tunnels drop sockets).
	raw, err := c.completeWithin(90*time.Second, assistSystem, user, 8192)
	if err != nil {
		raw, err = c.completeWithin(90*time.Second, assistSystem, user, 8192)
	}
	if err != nil {
		return AssistResult{}, err
	}

	payload := extractJSON(raw)
	if payload == "" {
		return AssistResult{}, errors.New("assist: no JSON in model output")
	}
	var res AssistResult
	if err := json.Unmarshal([]byte(payload), &res); err != nil {
		return AssistResult{}, fmt.Errorf("assist: bad JSON from model: %w", err)
	}
	if strings.TrimSpace(res.Body) == "" {
		return AssistResult{}, errors.New("assist: model returned an empty body")
	}
	// A missing title/excerpt means "unchanged", never "blank the field".
	if strings.TrimSpace(res.Title) == "" {
		res.Title = req.Title
	}
	if strings.TrimSpace(res.Excerpt) == "" {
		res.Excerpt = req.Excerpt
	}
	return res, nil
}

// AssistPost on the stub appends a clearly-labeled marker paragraph so the
// propose → compare → accept flow is exercisable without an API key.
func (StubProvider) AssistPost(req AssistRequest) (AssistResult, error) {
	if strings.TrimSpace(req.Instruction) == "" {
		return AssistResult{}, errors.New("empty instruction")
	}
	marker := `<p><em>(AI assist is running in stub mode — set ANTHROPIC_API_KEY to get real edits. This marker paragraph is the stub's only proposed change.)</em></p>`
	return AssistResult{
		Title:   req.Title,
		Excerpt: req.Excerpt,
		Body:    req.Body + marker,
	}, nil
}

// extractJSON pulls the outermost {...} from model output, tolerating stray
// prose or code fences around it.
func extractJSON(s string) string {
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start < 0 || end <= start {
		return ""
	}
	return s[start : end+1]
}
