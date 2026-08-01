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

// Provider is the seam an LLM implementation plugs into.
type Provider interface {
	// Ask answers a visitor question grounded in g. Returns the answer text.
	Ask(question string, g Grounding) (string, error)
	// Tailor analyzes a job description against g and returns a CV result
	// (Date/ID/CreatedAt are stamped by the caller when persisting).
	Tailor(jd string, g Grounding) (models.CV, error)
}

func lower(s string) string { return strings.ToLower(s) }
