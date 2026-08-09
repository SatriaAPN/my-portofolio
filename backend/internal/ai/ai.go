// Package ai holds the pluggable engine behind the "Ask AI" chat and the
// "Tailored CV" generator. The default StubProvider ports the keyword-matching
// behavior from the design handoff. Swap in an LLM-backed Provider later without
// touching the handlers — they depend only on the Provider interface.
package ai

import (
	"strings"

	"portfolio-backend/internal/models"
)

// Grounding is the site data the engine reasons over (the real store contents,
// so answers reflect whatever the admin has edited).
type Grounding struct {
	Site     models.SiteContent
	Projects []models.Project
	Posts    []models.Post
}

func (g Grounding) LivePosts() int {
	n := 0
	for _, p := range g.Posts {
		if p.Status == "LIVE" {
			n++
		}
	}
	return n
}

// AssistRequest carries the editor's current (possibly unsaved) post content
// plus the author's instruction for the AI. Body is storage-form HTML —
// diagrams as metadata-only figures (see DIAGRAMS.md).
type AssistRequest struct {
	Instruction string   `json:"instruction"`
	Title       string   `json:"title"`
	Excerpt     string   `json:"excerpt"`
	Body        string   `json:"body"`
	Tags        []string `json:"tags"`
}

// AssistResult is the AI's full revised post. Fields the instruction didn't
// touch come back verbatim; nothing is persisted — the editor shows a diff
// and the author accepts or declines.
type AssistResult struct {
	Title   string `json:"title"`
	Excerpt string `json:"excerpt"`
	Body    string `json:"body"`
}

// Provider is the seam an LLM implementation plugs into.
type Provider interface {
	// Ask answers a visitor question grounded in g. Returns the answer text.
	Ask(question string, g Grounding) (string, error)
	// Tailor analyzes a job description against g and returns a CV result
	// (Date/ID/CreatedAt are stamped by the caller when persisting).
	Tailor(jd string, g Grounding) (models.CV, error)
	// AssistPost applies the instruction to the post and returns the revised
	// version for the editor's accept/decline review.
	AssistPost(req AssistRequest) (AssistResult, error)
}

func lower(s string) string { return strings.ToLower(s) }
