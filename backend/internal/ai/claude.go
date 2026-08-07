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

// companyPosts returns the LIVE posts tagged with the given company (matched
// case-insensitively). Untagged posts and drafts are excluded, so only
// published, deliberately-linked writing feeds into a role's experience.
func companyPosts(posts []models.Post, company string) []models.Post {
	company = strings.TrimSpace(company)
	if company == "" {
		return nil
	}
	var out []models.Post
	for _, p := range posts {
		if p.Status == "LIVE" && strings.EqualFold(strings.TrimSpace(p.Company), company) {
			out = append(out, p)
		}
	}
	return out
}

// liveTags returns the de-duplicated tags across all LIVE posts, preserving
// first-seen order. These are surfaced to the CV generator as concrete
// evidence the candidate has hands-on experience with each.
func liveTags(posts []models.Post) []string {
	seen := make(map[string]bool)
	var out []string
	for _, p := range posts {
		if p.Status != "LIVE" {
			continue
		}
		for _, t := range p.Tags {
			key := strings.ToLower(strings.TrimSpace(t))
			if key == "" || seen[key] {
				continue
			}
			seen[key] = true
			out = append(out, strings.TrimSpace(t))
		}
	}
	return out
}

// groundingContext renders the live site data as a compact profile the model
// reasons over. Because it reads the real store, answers reflect admin edits.
func groundingContext(g Grounding) string {
	var b strings.Builder
	b.WriteString("Name: Satria Aluh Perwira Nusa — fullstack/backend engineer, 4 years' experience.\n")
	if len(g.Site.Headline) > 0 {
		b.WriteString("Top strengths: " + strings.Join(g.Site.Headline, ", ") + ".\n")
	}
	if len(g.Site.SkillGroups) > 0 {
		b.WriteString("Skills by category:\n")
		for _, grp := range g.Site.SkillGroups {
			if len(grp.Items) == 0 {
				continue
			}
			b.WriteString("  " + grp.Category + ": " + strings.Join(grp.Items, ", ") + "\n")
		}
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
			// Blog posts the admin tagged with this company become extra,
			// first-hand evidence for this role — so the tailored summary can
			// draw concrete experience points from what he actually wrote about.
			for _, p := range companyPosts(g.Posts, x.Company) {
				b.WriteString("    • Wrote about this work: “" + p.Title + "”")
				if p.Excerpt != "" {
					b.WriteString(" — " + p.Excerpt)
				}
				if len(p.Tags) > 0 {
					b.WriteString(" [" + strings.Join(p.Tags, ", ") + "]")
				}
				b.WriteString("\n")
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
		if tags := liveTags(g.Posts); len(tags) > 0 {
			b.WriteString("Topics written about on the blog (first-hand evidence of these skills): " + strings.Join(tags, ", ") + ".\n")
		}
	}
	b.WriteString("Availability: open to new roles, remote or hybrid. Contact: satria@email.com.\n")
	return b.String()
}
