package api

import (
	"log"
	"net/http"
	"strings"

	"portfolio-backend/internal/ai"
	"portfolio-backend/internal/models"
)

func (s *Server) handleAdminListPosts(w http.ResponseWriter, r *http.Request) {
	posts, err := s.store.ListPosts()
	if err != nil {
		writeErr(w, 500, "failed to load posts")
		return
	}
	writeJSON(w, 200, posts)
}

func (s *Server) handleGetPost(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r)
	if err != nil {
		writeErr(w, 400, "invalid id")
		return
	}
	post, err := s.store.GetPost(id)
	if notFound(err) {
		writeErr(w, 404, "post not found")
		return
	}
	if err != nil {
		writeErr(w, 500, "failed to load post")
		return
	}
	writeJSON(w, 200, post)
}

func (s *Server) handleCreatePost(w http.ResponseWriter, r *http.Request) {
	var p models.Post
	if err := decode(r, &p); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}
	if p.Status == "" {
		p.Status = "DRAFT"
	}
	created, err := s.store.CreatePost(p)
	if err != nil {
		writeErr(w, 500, "failed to create post")
		return
	}
	writeJSON(w, 201, created)
}

func (s *Server) handleUpdatePost(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r)
	if err != nil {
		writeErr(w, 400, "invalid id")
		return
	}
	var p models.Post
	if err := decode(r, &p); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}
	p.ID = id
	updated, err := s.store.UpdatePost(p)
	if err != nil {
		writeErr(w, 500, "failed to update post")
		return
	}
	writeJSON(w, 200, updated)
}

// handleAssistPost runs the editor's AI-assist request: current post content
// + an instruction in, a full revised version out. Nothing is persisted —
// the editor shows a comparison and the author accepts or declines.
func (s *Server) handleAssistPost(w http.ResponseWriter, r *http.Request) {
	var req ai.AssistRequest
	if err := decode(r, &req); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}
	if strings.TrimSpace(req.Instruction) == "" {
		writeErr(w, 400, "instruction is required")
		return
	}
	res, err := s.ai.AssistPost(req)
	if err != nil {
		log.Printf("assist: %v", err)
		writeErr(w, 502, "AI assist failed — try again")
		return
	}
	writeJSON(w, 200, res)
}

func (s *Server) handleDeletePost(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r)
	if err != nil {
		writeErr(w, 400, "invalid id")
		return
	}
	post, err := s.store.GetPost(id)
	if notFound(err) {
		writeErr(w, 404, "post not found")
		return
	}
	if err != nil {
		writeErr(w, 500, "failed to load post")
		return
	}
	// Live posts are public — they must be moved to draft before deletion,
	// so a post can never disappear from the site by an accidental delete.
	if post.Status == "LIVE" {
		writeErr(w, 409, "live posts can't be deleted — set the post to draft first")
		return
	}
	if err := s.store.DeletePost(id); err != nil {
		writeErr(w, 500, "failed to delete post")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
