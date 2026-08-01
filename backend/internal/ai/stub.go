package ai

import (
	"math"
	"regexp"
	"sort"
	"strings"

	"portfolio-backend/internal/models"
)

// StubProvider reproduces the handoff's keyword-matching behavior. It needs no
// API key, so the app runs end-to-end out of the box.
type StubProvider struct{}

func NewStub() *StubProvider { return &StubProvider{} }

// ---- Ask AI -------------------------------------------------------------

type qa struct{ Q, A string }

var cannedAnswers = []qa{
	{"How many years of experience does he have?", "4 years total: 2 as a backend engineer, then 2 as a fullstack engineer."},
	{"What's his strongest tech stack?", "Go on the backend is where he's strongest (4 yrs in production), with JavaScript/React on the front end, plus SQL and Python."},
	{"What has he built recently?", "His featured project is a realtime collaboration service (Go, Postgres, WebSockets, React). He also wrote up a 60% p99 latency win on a Go API."},
	{"Is he open to remote work?", "Yes — Satria is open to remote and hybrid roles, and is currently open to new opportunities."},
	{"What does he write about?", "Mostly performance, architecture, and databases — a good starting point is 'Cutting our API p99 latency by 60% with Go'."},
	{"How can I contact him?", "Email satria@email.com, or download his resume from the portfolio. He usually replies within a day."},
}

// CommonQuestions is exposed so the frontend sidebar/chips stay in sync.
func CommonQuestions() []string {
	out := make([]string, len(cannedAnswers))
	for i, a := range cannedAnswers {
		out[i] = a.Q
	}
	return out
}

func (StubProvider) Ask(question string, _ Grounding) (string, error) {
	q := strings.ToLower(strings.TrimSpace(question))
	for _, a := range cannedAnswers {
		if strings.ToLower(a.Q) == q {
			return a.A, nil
		}
	}
	has := func(subs ...string) bool {
		for _, s := range subs {
			if strings.Contains(q, s) {
				return true
			}
		}
		return false
	}
	switch {
	case has("stack", "skill", "tech", "language"):
		return "Go on the backend (4 yrs) is his strongest, with JavaScript/React on the front end, plus SQL and Python.", nil
	case has("experience", "year", "senior"):
		return "4 years shipping production software: 2 as a backend engineer, then 2 as a fullstack engineer.", nil
	case has("remote", "relocat", "hybrid", "available", "open"):
		return "Yes — he's open to new roles right now, remote or hybrid.", nil
	case has("project", "built", "build", "ship", "work"):
		return "His featured project is a realtime collaboration service (Go, Postgres, WebSockets, React). He's also written up a 60% p99 latency improvement.", nil
	case has("blog", "writ", "post", "article"):
		return "He writes about performance, architecture, and databases — a good starting point is 'Cutting our API p99 latency by 60% with Go'.", nil
	case has("contact", "email", "reach", "hire", "resume"):
		return "Email satria@email.com, or download his resume from the portfolio — he usually replies within a day.", nil
	case has("hello", "hey") || q == "hi" || strings.HasPrefix(q, "hi "):
		return "Hi! I can tell you about Satria's experience, stack, projects, availability, or how to reach him. What would you like to know?", nil
	default:
		return "I can speak to Satria's experience, tech stack, projects, availability, and how to reach him. Try one of the common questions on the left, or ask about any of those.", nil
	}
}

// ---- Tailored CV --------------------------------------------------------

type dictEntry struct {
	Name string
	Re   *regexp.Regexp
}

// dict mirrors the DICT list in the Tailored CV prototype.
var dict = []dictEntry{
	{"Go", regexp.MustCompile(`(?i)\bgo(lang)?\b`)},
	{"JavaScript", regexp.MustCompile(`(?i)\bjavascript\b`)},
	{"TypeScript", regexp.MustCompile(`(?i)\btypescript\b`)},
	{"SQL", regexp.MustCompile(`(?i)\bsql\b`)},
	{"Python", regexp.MustCompile(`(?i)\bpython\b`)},
	{"React", regexp.MustCompile(`(?i)\breact\b`)},
	{"PostgreSQL", regexp.MustCompile(`(?i)\bpostgres(ql)?\b`)},
	{"Kafka", regexp.MustCompile(`(?i)\bkafka\b`)},
	{"Redis", regexp.MustCompile(`(?i)\bredis\b`)},
	{"Docker", regexp.MustCompile(`(?i)\bdocker\b`)},
	{"Kubernetes", regexp.MustCompile(`(?i)\bkubernetes|k8s\b`)},
	{"AWS", regexp.MustCompile(`(?i)\baws\b`)},
	{"GCP", regexp.MustCompile(`(?i)\bgcp\b`)},
	{"Prometheus", regexp.MustCompile(`(?i)\bprometheus\b`)},
	{"Grafana", regexp.MustCompile(`(?i)\bgrafana\b`)},
	{"WebSockets", regexp.MustCompile(`(?i)\bwebsockets?\b`)},
	{"gRPC", regexp.MustCompile(`(?i)\bgrpc\b`)},
	{"Node.js", regexp.MustCompile(`(?i)\bnode(\.js)?\b`)},
	{"Event-driven architecture", regexp.MustCompile(`(?i)event[- ]driven`)},
	{"Microservices", regexp.MustCompile(`(?i)\bmicroservices?\b`)},
	{"Observability", regexp.MustCompile(`(?i)\bobservability\b`)},
	{"CI/CD", regexp.MustCompile(`(?i)\bci/cd\b`)},
	{"Latency work", regexp.MustCompile(`(?i)\b(latency|p99|performance)\b`)},
	{"Mentoring", regexp.MustCompile(`(?i)\bmentor(ing|ship)?\b`)},
}

var atRe = regexp.MustCompile(`\bat ([A-Z][A-Za-z0-9&]+)`)
var roleRe = regexp.MustCompile(`(?i)engineer|developer|lead|architect`)
var splitRe = regexp.MustCompile(`[—–|@]`)

func (StubProvider) Tailor(jd string, g Grounding) (models.CV, error) {
	site := g.Site
	projects := g.Projects

	// Haystack of everything we know about the candidate.
	var parts []string
	parts = append(parts, strings.Join(site.Skills, " "))
	for _, x := range site.Experience {
		parts = append(parts, x.Role+" "+x.Desc)
	}
	for _, p := range projects {
		parts = append(parts, p.Title+" "+p.Tech+" "+p.Desc)
	}
	hay := strings.ToLower(strings.Join(parts, " "))

	// Requirements present in the JD.
	var inJd []dictEntry
	for _, d := range dict {
		if d.Re.MatchString(jd) {
			inJd = append(inJd, d)
		}
	}

	skillHas := func(name string) bool {
		for _, sk := range site.Skills {
			if strings.EqualFold(sk, name) {
				return true
			}
		}
		return false
	}

	var matched []dictEntry
	for _, d := range inJd {
		if d.Re.MatchString(hay) || skillHas(d.Name) {
			matched = append(matched, d)
		}
	}
	matchedNames := names(matched)
	inSet := nameSet(matchedNames)

	gaps := []string{}
	for _, d := range inJd {
		if !inSet[d.Name] {
			gaps = append(gaps, d.Name)
		}
	}

	score := 62
	if len(inJd) > 0 {
		score = int(math.Round(45 + 50*(float64(len(matched))/float64(len(inJd)))))
		if score > 94 {
			score = 94
		}
	}

	// Role / company from the first line + an "at X" fallback.
	role, company := "Software Engineer", ""
	firstLine := strings.TrimSpace(strings.SplitN(jd, "\n", 2)[0])
	if firstLine != "" && len(firstLine) < 90 && roleRe.MatchString(firstLine) {
		segs := splitRe.Split(firstLine, -1)
		role = strings.TrimSpace(segs[0])
		if len(segs) > 1 && strings.TrimSpace(segs[1]) != "" {
			company = strings.TrimSpace(segs[1])
		}
	}
	if company == "" {
		if m := atRe.FindStringSubmatch(jd); m != nil {
			company = m[1]
		}
	}

	// Skills reordered: matched ones first (stable).
	skillsOrdered := append([]string{}, site.Skills...)
	sort.SliceStable(skillsOrdered, func(i, j int) bool {
		return boolToInt(!inSet[canonical(skillsOrdered[i], matchedNames)]) < boolToInt(!inSet[canonical(skillsOrdered[j], matchedNames)])
	})

	// Rank projects by keyword hits, take top 2.
	ranked := make([]models.RankedProject, 0, len(projects))
	for _, p := range projects {
		ptext := p.Title + " " + p.Tech + " " + p.Desc
		var hits []string
		for _, d := range inJd {
			if d.Re.MatchString(ptext) {
				hits = append(hits, d.Name)
			}
		}
		ranked = append(ranked, models.RankedProject{Title: p.Title, Tech: p.Tech, Desc: p.Desc, Hits: hits, N: len(hits)})
	}
	sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].N > ranked[j].N })
	if len(ranked) > 2 {
		ranked = ranked[:2]
	}

	// Summary.
	top := skillsOrdered
	if len(top) > 3 {
		top = top[:3]
	}
	summary := "Fullstack engineer with 4 years across backend and product, strongest in " + strings.Join(top, ", ") + ". "
	if len(ranked) > 0 {
		co := company
		if co == "" {
			co = "this role"
		}
		core := "core"
		if len(matchedNames) > 0 {
			core = matchedNames[0]
		}
		summary += "Recently shipped a " + strings.ToLower(ranked[0].Title) + " — directly relevant to " + co + "’s " + core + " work. "
	}
	summary += "Owns features from schema design to UI, and writes publicly about the engineering behind them."

	return models.CV{
		Role:          role,
		Company:       company,
		Score:         score,
		InJdCount:     len(inJd),
		MatchedNames:  nonNil(matchedNames),
		Gaps:          gaps,
		SkillsOrdered: nonNil(skillsOrdered),
		Ranked:        ranked,
		Summary:       summary,
		JD:            jd,
	}, nil
}

func names(ds []dictEntry) []string {
	out := make([]string, len(ds))
	for i, d := range ds {
		out[i] = d.Name
	}
	return out
}

func nameSet(ns []string) map[string]bool {
	m := make(map[string]bool, len(ns))
	for _, n := range ns {
		m[n] = true
	}
	return m
}

// canonical returns the matched-name spelling for skill sk (case-insensitive),
// or sk itself if not matched — so the inSet lookup works on skill labels.
func canonical(sk string, matchedNames []string) string {
	for _, n := range matchedNames {
		if strings.EqualFold(n, sk) {
			return n
		}
	}
	return sk
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
