package ai

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"

	"portfolio-backend/internal/models"
)

// DefaultModel is used when AI_MODEL is unset. Opus 5 is the current top model;
// override with AI_MODEL (e.g. claude-haiku-4-5) for cheaper/faster responses.
const DefaultModel = "claude-opus-5"

// ClaudeProvider answers with the Anthropic Claude API, grounded in the live
// site data. Ask is fully LLM-generated; Tailor keeps the deterministic
// keyword scoring (trustworthy match numbers) and uses the LLM for the tailored
// summary. Any API failure falls back to the keyword stub so the app never
// hard-fails on the AI path.
type ClaudeProvider struct {
	client   anthropic.Client
	model    string
	fallback *StubProvider
}

func NewClaude(apiKey, model string) *ClaudeProvider {
	if model == "" {
		model = DefaultModel
	}
	return &ClaudeProvider{
		client:   anthropic.NewClient(option.WithAPIKey(apiKey)),
		model:    model,
		fallback: NewStub(),
	}
}

func (c *ClaudeProvider) Model() string { return c.model }

// complete runs a single non-streaming message and returns the concatenated text.
func (c *ClaudeProvider) complete(system, user string, maxTokens int64) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	resp, err := c.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.Model(c.model),
		MaxTokens: maxTokens,
		System:    []anthropic.TextBlockParam{{Text: system}},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(user)),
		},
	})
	if err != nil {
		return "", err
	}

	var b strings.Builder
	for _, block := range resp.Content {
		if t, ok := block.AsAny().(anthropic.TextBlock); ok {
			b.WriteString(t.Text)
		}
	}
	return strings.TrimSpace(b.String()), nil
}

func (c *ClaudeProvider) Ask(question string, g Grounding) (string, error) {
	system := "You are the AI assistant on the portfolio site of Satria Aluh Perwira Nusa, a fullstack/backend engineer. " +
		"Recruiters and visitors ask you about him. Answer ONLY from the profile below. " +
		"Be concise (1-3 sentences), warm, and specific. If the profile doesn't cover something, say you don't have that detail and suggest emailing him. " +
		"Never invent facts, and don't mention that you were given a profile.\n\nPROFILE:\n" + groundingContext(g)

	answer, err := c.complete(system, question, 1024)
	if err != nil || answer == "" {
		return c.fallback.Ask(question, g)
	}
	return answer, nil
}

func (c *ClaudeProvider) Tailor(jd string, g Grounding) (models.CV, error) {
	// Deterministic scoring (score, matched, gaps, ranked, role/company, skills order).
	cv, err := c.fallback.Tailor(jd, g)
	if err != nil {
		return cv, err
	}

	// Let the LLM write the tailored summary; keep the stub summary on failure.
	topProject := ""
	if len(cv.Ranked) > 0 {
		topProject = cv.Ranked[0].Title
	}
	system := "You write a tailored CV summary for Satria Aluh Perwira Nusa, aimed at one specific job. " +
		"Use ONLY facts from the profile — never invent experience. Write 2-4 sentences, professional and concrete, " +
		"emphasizing overlap with the job. Do not use the word 'I'. Output ONLY the summary paragraph, no preamble or quotes."
	user := fmt.Sprintf(
		"JOB DESCRIPTION:\n%s\n\nMATCHED STRENGTHS: %s\nTARGET ROLE: %s%s\nMOST RELEVANT PROJECT: %s\n\nPROFILE:\n%s\n\nWrite the tailored summary.",
		jd,
		strings.Join(cv.MatchedNames, ", "),
		cv.Role,
		companySuffix(cv.Company),
		topProject,
		groundingContext(g),
	)

	if summary, err := c.complete(system, user, 800); err == nil && summary != "" {
		cv.Summary = summary
	}
	return cv, nil
}

func companySuffix(company string) string {
	if company == "" {
		return ""
	}
	return " at " + company
}

// groundingContext renders the live site data as a compact profile the model
// reasons over. Because it reads the real store, answers reflect admin edits.
func groundingContext(g Grounding) string {
	var b strings.Builder
	b.WriteString("Name: Satria Aluh Perwira Nusa — fullstack/backend engineer, 4 years' experience.\n")
	if len(g.Site.Skills) > 0 {
		b.WriteString("Skills: " + strings.Join(g.Site.Skills, ", ") + ".\n")
	}
	if len(g.Site.Experience) > 0 {
		b.WriteString("Experience:\n")
		for _, x := range g.Site.Experience {
			line := "- " + x.Role
			if x.Company != "" {
				line += " at " + x.Company
			}
			if x.Location != "" {
				line += " (" + x.Location + ")"
			}
			if x.Period != "" {
				line += ", " + x.Period
			}
			b.WriteString(line + ".")
			if x.Desc != "" {
				b.WriteString(" " + x.Desc)
			}
			b.WriteString("\n")
			for _, h := range x.Highlights {
				b.WriteString("    • " + h + "\n")
			}
		}
	}
	if len(g.Projects) > 0 {
		b.WriteString("Projects:\n")
		for _, p := range g.Projects {
			b.WriteString(fmt.Sprintf("- %s (%s, %s): %s\n", p.Title, p.Tech, p.Year, p.Desc))
		}
	}
	live := g.LivePosts()
	if live > 0 {
		b.WriteString(fmt.Sprintf("Writing: %d published blog posts on performance, architecture, and databases.\n", live))
	}
	b.WriteString("Availability: open to new roles, remote or hybrid. Contact: satria@email.com.\n")
	return b.String()
}
