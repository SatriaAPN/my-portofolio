package api

import (
	"net/http"

	"portfolio-backend/internal/ai"
)

func (s *Server) grounding() (ai.Grounding, error) {
	site, err := s.store.GetSite()
	if err != nil {
		return ai.Grounding{}, err
	}
	projects, err := s.store.ListProjects()
	if err != nil {
		return ai.Grounding{}, err
	}
	posts, err := s.store.ListPosts()
	if err != nil {
		return ai.Grounding{}, err
	}
	return ai.Grounding{Site: site, Projects: projects, Posts: posts}, nil
}

func (s *Server) handleGetSite(w http.ResponseWriter, r *http.Request) {
	site, err := s.store.GetSite()
	if err != nil {
		writeErr(w, 500, "failed to load site content")
		return
	}
	writeJSON(w, 200, site)
}

func (s *Server) handleListLivePosts(w http.ResponseWriter, r *http.Request) {
	posts, err := s.store.ListLivePosts()
	if err != nil {
		writeErr(w, 500, "failed to load posts")
		return
	}
	writeJSON(w, 200, posts)
}

func (s *Server) handleGetPostBySlug(w http.ResponseWriter, r *http.Request) {
	slug := strParam(r, "slug")
	post, err := s.store.GetPostBySlug(slug)
	if notFound(err) {
		writeErr(w, 404, "post not found")
		return
	}
	if err != nil {
		writeErr(w, 500, "failed to load post")
		return
	}
	// Only LIVE posts are visible publicly.
	if post.Status != "LIVE" {
		writeErr(w, 404, "post not found")
		return
	}
	writeJSON(w, 200, post)
}

func (s *Server) handleListProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := s.store.ListProjects()
	if err != nil {
		writeErr(w, 500, "failed to load projects")
		return
	}
	writeJSON(w, 200, projects)
}

func (s *Server) handleCommonQuestions(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{"questions": ai.CommonQuestions()})
}

func (s *Server) handleAsk(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Question string `json:"question"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}
	g, err := s.grounding()
	if err != nil {
		writeErr(w, 500, "failed to load context")
		return
	}
	answer, err := s.ai.Ask(body.Question, g)
	if err != nil {
		writeErr(w, 500, "failed to generate answer")
		return
	}
	writeJSON(w, 200, map[string]string{"answer": answer})
}
