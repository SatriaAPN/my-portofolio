package api

import (
	"net/http"
)

// handleOverview blends real store counts with the handoff's demo figures.
func (s *Server) handleOverview(w http.ResponseWriter, r *http.Request) {
	posts, err := s.store.ListPosts()
	if err != nil {
		writeErr(w, 500, "failed to load overview")
		return
	}
	projects, _ := s.store.ListProjects()
	cvs, _ := s.store.ListCVs()

	live := 0
	for _, p := range posts {
		if p.Status == "LIVE" {
			live++
		}
	}
	featured := 0
	for _, p := range projects {
		if p.Featured {
			featured = featured + b2i(p.Featured)
		}
	}

	recent := []map[string]string{}
	for i, p := range posts {
		if i >= 5 {
			break
		}
		meta := p.Date
		if p.Views != "—" && p.Views != "" {
			meta = p.Date + " · " + p.Views + " views"
		}
		recent = append(recent, map[string]string{"title": p.Title, "meta": meta, "status": p.Status})
	}

	resp := map[string]any{
		"stats": []map[string]string{
			{"label": "LIVE POSTS", "value": itoaInt(live), "delta": "+2 this month"},
			{"label": "TOTAL VIEWS", "value": "18.7K", "delta": "+12% vs last month"},
			{"label": "PROJECTS", "value": itoaInt(len(projects)), "delta": itoaInt(featured) + " featured"},
			{"label": "TAILORED CVs", "value": itoaInt(len(cvs)), "delta": "AI generated"},
		},
		"recentPosts": recent,
		"topQuestions": []map[string]any{
			{"text": "What's his strongest tech stack?", "count": 42},
			{"text": "Is he open to remote work?", "count": 31},
			{"text": "How many years of experience does he have?", "count": 27},
			{"text": "What has he built recently?", "count": 19},
			{"text": "How can I contact him?", "count": 14},
		},
	}
	writeJSON(w, 200, resp)
}

func (s *Server) handleAnalytics(w http.ResponseWriter, r *http.Request) {
	// 30-day demo traffic with a "post day" spike at index 21.
	views := []int{420, 388, 512, 470, 560, 690, 610, 540, 505, 640, 720, 810, 760, 700, 880, 940, 1010, 870, 760, 690, 820, 1240, 980, 900, 1050, 1120, 990, 1080, 1160, 1210}
	visitors := []int{280, 250, 340, 300, 360, 450, 400, 360, 330, 420, 470, 520, 500, 460, 560, 600, 640, 560, 500, 450, 540, 760, 620, 590, 680, 720, 640, 700, 760, 790}
	dates := []string{"Jul 1", "", "", "", "Jul 5", "", "", "", "", "Jul 10", "", "", "", "", "Jul 15", "", "", "", "", "Jul 20", "", "", "", "", "Jul 25", "", "", "", "", "Jul 30"}

	resp := map[string]any{
		"stats": []map[string]any{
			{"label": "PAGE VIEWS", "value": "24.6K", "delta": "+12%", "spark": []int{12, 18, 15, 22, 26, 21, 30, 28, 34, 40}},
			{"label": "UNIQUE VISITORS", "value": "9.8K", "delta": "+8%", "spark": []int{8, 10, 9, 14, 13, 16, 18, 17, 21, 24}},
			{"label": "AVG. TIME", "value": "2m 41s", "delta": "+6%", "spark": []int{20, 22, 21, 24, 23, 26, 25, 28, 27, 30}},
			{"label": "AI CHATS", "value": "1.24K", "delta": "+21%", "spark": []int{4, 6, 5, 9, 11, 10, 14, 16, 19, 24}},
		},
		"traffic": map[string]any{
			"views":    views,
			"visitors": visitors,
			"dates":    dates,
			"gridlines": []map[string]any{
				{"label": "1.2K", "value": 1200},
				{"label": "800", "value": 800},
				{"label": "400", "value": 400},
			},
			"max": 1300,
			"spike": map[string]any{
				"index": 21,
				"value": 1240,
				"label": "1.24K · POST DAY",
			},
		},
		"health": map[string]any{
			"status":     "OPERATIONAL",
			"rows":       []map[string]string{{"label": "Uptime (30d)", "value": "99.98%"}, {"label": "p95 latency", "value": "184ms"}, {"label": "Error rate", "value": "0.02%"}, {"label": "Deploys (30d)", "value": "23"}},
			"lastDeploy": "LAST DEPLOY · JUL 30, 09:14 · main@a1f3c9d",
		},
		"topPages": []map[string]any{
			{"label": "/", "value": "8.4K", "share": 100},
			{"label": "/blog/cutting-p99-latency-by-60-with-connection-pooling", "value": "5.1K", "share": 61},
			{"label": "/projects", "value": "3.7K", "share": 44},
			{"label": "/blog", "value": "2.9K", "share": 35},
			{"label": "/ask-ai", "value": "2.2K", "share": 26},
		},
		"referrers": []map[string]any{
			{"label": "Google", "value": "42%", "share": 100},
			{"label": "LinkedIn", "value": "28%", "share": 67},
			{"label": "GitHub", "value": "16%", "share": 38},
			{"label": "Hacker News", "value": "9%", "share": 21},
			{"label": "Direct", "value": "5%", "share": 12},
		},
	}
	writeJSON(w, 200, resp)
}

func (s *Server) handleMessages(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, []map[string]any{
		{"initials": "MR", "name": "Maya Ruiz", "role": "Engineering Manager · StreamPay", "status": "NEW", "time": "2h ago", "body": "Hi Satria — your p99 latency write-up is exactly the kind of work we need on our payments platform. Are you open to a chat this week?"},
		{"initials": "TK", "name": "Tom Kessler", "role": "Recruiter · Northwind", "status": "REPLIED", "time": "1d ago", "body": "Loved the realtime collaboration project. We have a senior backend role that pairs well with your Go + Postgres background."},
		{"initials": "AL", "name": "Aisha Lund", "role": "CTO · Fathom", "status": "READ", "time": "3d ago", "body": "Your blog on event-driven pipelines resonated. Would you consider a fractional/advisory arrangement to start?"},
		{"initials": "DP", "name": "Diego Park", "role": "Founder · Loophole", "status": "NEW", "time": "4d ago", "body": "We're a small team shipping fast. Your end-to-end ownership style is what we're after — coffee sometime?"},
	})
}

func (s *Server) handleChatlogs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, []map[string]any{
		{"question": "What's his strongest tech stack?", "answered": true, "count": 42, "when": "Today"},
		{"question": "Is he open to remote work?", "answered": true, "count": 31, "when": "Today"},
		{"question": "Does he have Kubernetes experience?", "answered": false, "count": 9, "when": "Yesterday"},
		{"question": "How many years of experience does he have?", "answered": true, "count": 27, "when": "Yesterday"},
		{"question": "What's his expected salary?", "answered": false, "count": 6, "when": "2d ago"},
		{"question": "What has he built recently?", "answered": true, "count": 19, "when": "3d ago"},
	})
}

func b2i(b bool) int {
	if b {
		return 1
	}
	return 0
}

func itoaInt(i int) string {
	if i == 0 {
		return "0"
	}
	neg := i < 0
	if neg {
		i = -i
	}
	var buf [20]byte
	pos := len(buf)
	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		buf[pos] = '-'
	}
	return string(buf[pos:])
}
