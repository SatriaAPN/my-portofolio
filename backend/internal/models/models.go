package models

// Post maps to the blog-data.js Post store.
type Post struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Slug      string `json:"slug"`
	Category  string `json:"category"` // Performance|Architecture|Databases|Testing
	Status    string `json:"status"`   // LIVE|DRAFT
	Date      string `json:"date"`     // e.g. "Jul 12, 2026"
	Views     string `json:"views"`
	ReadMin   int    `json:"readMin"`
	Excerpt   string `json:"excerpt"`
	Body      string `json:"body"` // rich-text HTML
	Position  int    `json:"-"`
	CreatedAt string `json:"createdAt"`
}

// Project maps to the projects-data.js Project store.
type Project struct {
	ID       int64  `json:"id"`
	Title    string `json:"title"`
	Tech     string `json:"tech"` // "GO · POSTGRES · REACT"
	Year     string `json:"year"`
	Featured bool   `json:"featured"`
	Image    string `json:"image"`
	Desc     string `json:"desc"`
	Position int    `json:"-"`
}

// ExperienceItem is one row of the experience timeline.
type ExperienceItem struct {
	Period     string   `json:"period"`
	Role       string   `json:"role"`
	Company    string   `json:"company"`
	Location   string   `json:"location"`
	Logo       string   `json:"logo"` // dataURL/URL; empty → monogram fallback in UI
	Desc       string   `json:"desc"` // optional one-line summary
	Highlights []string `json:"highlights"`
}

// SiteContent maps to the site-data.js store (single row).
type SiteContent struct {
	Skills       []string         `json:"skills"`
	Experience   []ExperienceItem `json:"experience"`
	HeroImage    string           `json:"heroImage"`
	ProjectImage string           `json:"projectImage"`
}

// RankedProject is one entry in a Tailored CV's ranked project list.
type RankedProject struct {
	Title string   `json:"title"`
	Tech  string   `json:"tech"`
	Desc  string   `json:"desc"`
	Hits  []string `json:"hits"`
	N     int      `json:"n"`
}

// CV maps to the cv-data.js Tailored CV store.
type CV struct {
	ID            int64           `json:"id"`
	Role          string          `json:"role"`
	Company       string          `json:"company"`
	Date          string          `json:"date"`
	Score         int             `json:"score"`
	InJdCount     int             `json:"inJdCount"`
	MatchedNames  []string        `json:"matchedNames"`
	Gaps          []string        `json:"gaps"`
	SkillsOrdered []string        `json:"skillsOrdered"`
	Ranked        []RankedProject `json:"ranked"`
	Summary       string          `json:"summary"`
	JD            string          `json:"jd"`
	CreatedAt     string          `json:"createdAt"`
}

// User is an admin account.
type User struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}
