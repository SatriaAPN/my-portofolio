package db

import (
	"database/sql"
	"encoding/json"
	"os"

	"golang.org/x/crypto/bcrypt"
	"portfolio-backend/internal/util"
)

// sampleBody is the shared "built-in sample article" the design handoff shows
// for seeded posts. Admin-authored posts store their own rich-text HTML.
const sampleBody = `<p>Every performance story starts the same way: a dashboard turns red, someone pastes a graph in the channel, and the guessing begins. This one was no different — but the fix turned out to be less about clever code and more about understanding where the system actually spent its time.</p>
<h2>Where the time actually goes</h2>
<p>Before touching anything, we instrumented the hot path. The numbers were humbling: the handler logic accounted for a sliver of each request, while the rest disappeared into connection setup and waiting on the database. We had been optimizing the wrong half of the system.</p>
<pre><code>// before: a fresh connection per request
db, _ := sql.Open("pgx", dsn)
defer db.Close()
row := db.QueryRow(ctx, query, id)</code></pre>
<p>Once the picture was clear, the change was almost boring — pool the connections, cap the pool at something the database could actually sustain, and let requests queue for a warm connection instead of paying the handshake tax every time.</p>
<blockquote>The slowest part of most services isn't the code you wrote — it's the waiting you didn't measure.</blockquote>
<h2>What we changed</h2>
<ul>
<li>Introduced a pooler in front of Postgres and sized it to the real connection ceiling.</li>
<li>Moved read-heavy endpoints onto their own pool so a slow write couldn't starve them.</li>
<li>Added a p99 latency panel next to the throughput graph, so the trade-off was always visible.</li>
</ul>
<p>The result held up under the next traffic spike: p99 dropped by well over half, and — more importantly — it stayed there. The lesson wasn't the pooler. It was measuring first, so the fix was obvious before we wrote a line of it.</p>`

// seedPost mirrors one row from the handoff's blog-data.js SEED array.
type seedPost struct {
	Title    string
	Category string
	Status   string
	Date     string
	Views    string
	ReadMin  int
	Excerpt  string
}

var seedPosts = []seedPost{
	{"Cutting p99 latency by 60% with connection pooling", "Performance", "LIVE", "Jul 12, 2026", "4,120", 7, "Where the pool actually saturates, what pgbouncer changes, and the graphs that told us we were done."},
	{"Designing an event-driven order pipeline in Go", "Architecture", "LIVE", "Jun 28, 2026", "2,864", 11, "Outbox tables, idempotent consumers, and the failure modes we planned for before launch."},
	{"Postgres indexes I wish I understood earlier", "Databases", "LIVE", "Jun 03, 2026", "6,309", 9, "Partial, covering, and expression indexes — when each one pays off, and how to read a query plan without guessing."},
	{"Profiling Go services in production safely", "Performance", "LIVE", "Apr 02, 2026", "1,987", 8, "pprof endpoints, continuous profiling, and reading flame graphs under real traffic."},
	{"Migrating a monolith to event-driven services", "Architecture", "LIVE", "Mar 10, 2026", "3,455", 6, "How we carved services out of a five-year-old monolith without a big-bang rewrite."},
	{"Testing background jobs without flaky suites", "Testing", "DRAFT", "—", "—", 6, "Deterministic clocks, fake queues, and drawing the line between unit and integration."},
	{"What I learned shipping a realtime sync engine", "Architecture", "DRAFT", "—", "—", 12, "Conflict resolution, presence, and why the WebSocket layer was the easy part."},
}

func seed(conn *sql.DB) error {
	if err := seedAdmin(conn); err != nil {
		return err
	}
	if err := seedPostsTable(conn); err != nil {
		return err
	}
	if err := seedProjects(conn); err != nil {
		return err
	}
	if err := seedSite(conn); err != nil {
		return err
	}
	if err := seedCV(conn); err != nil {
		return err
	}
	return nil
}

func seedAdmin(conn *sql.DB) error {
	var n int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	email := envOr("ADMIN_EMAIL", "admin@satrianusa.dev")
	pass := envOr("ADMIN_PASSWORD", "admin1234")
	hash, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = conn.Exec(`INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)`,
		email, string(hash), "Satria Nusa")
	return err
}

func seedPostsTable(conn *sql.DB) error {
	var n int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM posts`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	for i, p := range seedPosts {
		body := ""
		if p.Status == "LIVE" {
			body = sampleBody
		}
		_, err := conn.Exec(`INSERT INTO posts
			(title, slug, category, status, date, views, read_min, excerpt, body, position)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			p.Title, util.Slugify(p.Title), p.Category, p.Status, p.Date, p.Views, p.ReadMin, p.Excerpt, body, i)
		if err != nil {
			return err
		}
	}
	return nil
}

func seedProjects(conn *sql.DB) error {
	var n int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM projects`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	type sp struct {
		Title, Tech, Year string
		Featured          bool
		Desc              string
	}
	rows := []sp{
		{"Realtime collaboration service", "GO · POSTGRES · REACT", "2026", true, "A low-latency sync engine handling concurrent edits with conflict resolution — from schema design to the WebSocket layer to the front-end client."},
		{"Order pipeline rebuild", "GO · KAFKA · POSTGRES", "2025", true, "Event-driven order processing with outbox tables and idempotent consumers — cut failed orders by 40% during peak sales."},
		{"Internal feature-flag platform", "TYPESCRIPT · REACT · REDIS", "2024", false, "Self-serve flags with progressive rollouts and an audit trail, used by every product team."},
		{"Latency observability toolkit", "GO · PROMETHEUS · GRAFANA", "2024", false, "Tracing and dashboards that surfaced the p99 wins written up on the blog."},
	}
	for i, r := range rows {
		_, err := conn.Exec(`INSERT INTO projects (title, tech, year, featured, image, descr, position)
			VALUES (?, ?, ?, ?, '', ?, ?)`, r.Title, r.Tech, r.Year, r.Featured, r.Desc, i)
		if err != nil {
			return err
		}
	}
	return nil
}

func seedSite(conn *sql.DB) error {
	var n int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM site_content`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	skills, _ := json.Marshal([]string{"Go", "JavaScript", "SQL", "Python", "React", "PostgreSQL"})
	experience, _ := json.Marshal([]map[string]any{
		{
			"period": "2024 — NOW", "role": "Fullstack Engineer", "company": "StellarPay", "location": "Jakarta", "logo": "",
			"desc": "Own features from database to UI — React + Go services, realtime features, and the deploy pipeline behind them.",
			"highlights": []string{
				"Shipped the realtime collaboration service end to end — schema design, WebSocket layer, and React client.",
				"Cut checkout p99 latency 60% with connection pooling and query tuning.",
				"Moved releases from weekly to on-demand by owning the CI/CD pipeline.",
			},
		},
		{
			"period": "2022 — 2024", "role": "Backend Engineer", "company": "Northwind", "location": "Remote", "logo": "",
			"desc": "Built and scaled Go APIs and data pipelines. Focused on latency, reliability, and clean service boundaries.",
			"highlights": []string{
				"Rebuilt the order pipeline on Kafka with outbox tables and idempotent consumers — 40% fewer failed orders at peak.",
				"Scaled Go APIs and data pipelines through 5× traffic growth.",
				"Added tracing and dashboards that surfaced the p99 wins written up on the blog.",
			},
		},
	})
	_, err := conn.Exec(`INSERT INTO site_content (id, skills, experience, hero_image, project_image)
		VALUES (1, ?, ?, '', '')`, string(skills), string(experience))
	return err
}

func seedCV(conn *sql.DB) error {
	var n int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM cv_history`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	matched, _ := json.Marshal([]string{"Go", "React", "PostgreSQL", "Kafka", "Prometheus", "Grafana", "Event-driven architecture", "Observability", "Latency work"})
	gaps, _ := json.Marshal([]string{"Docker", "Kubernetes", "Mentoring"})
	skillsOrdered, _ := json.Marshal([]string{"Go", "React", "PostgreSQL", "JavaScript", "SQL", "Python"})
	ranked, _ := json.Marshal([]map[string]any{
		{"title": "Latency observability toolkit", "tech": "GO · PROMETHEUS · GRAFANA", "desc": "Tracing and dashboards that surfaced the p99 wins written up on the blog.", "hits": []string{"Go", "Prometheus", "Grafana", "Observability", "Latency work"}, "n": 5},
		{"title": "Order pipeline rebuild", "tech": "GO · KAFKA · POSTGRES", "desc": "Event-driven order processing with outbox tables and idempotent consumers — cut failed orders by 40% during peak sales.", "hits": []string{"Go", "Kafka", "PostgreSQL", "Event-driven architecture"}, "n": 4},
	})
	summary := "Fullstack engineer with 4 years across backend and product, strongest in Go, React, PostgreSQL. Recently shipped a latency observability toolkit — directly relevant to StreamPay’s Go work. Owns features from schema design to UI, and writes publicly about the engineering behind them."
	jd := "Senior Backend Engineer — StreamPay\n\nWe are looking for a senior backend engineer to own our payments platform. You will design Go services on PostgreSQL and Kafka, drive p99 latency down across the checkout path, and mentor a team of four.\n\nExperience with event-driven architecture, Docker, Kubernetes and observability tooling (Prometheus, Grafana) is a big plus. React familiarity helps — you will pair with product engineers on internal tools."
	_, err := conn.Exec(`INSERT INTO cv_history
		(role, company, date, score, in_jd_count, matched_names, gaps, skills_ordered, ranked, summary, jd)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"Senior Backend Engineer", "StreamPay", "Jul 28, 2026", 83, 12,
		string(matched), string(gaps), string(skillsOrdered), string(ranked), summary, jd)
	return err
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
