package api

import (
	"net/http"

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
	if p.Category == "" {
		p.Category = "Architecture"
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

func (s *Server) handleDeletePost(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r)
	if err != nil {
		writeErr(w, 400, "invalid id")
		return
	}
	if err := s.store.DeletePost(id); err != nil {
		writeErr(w, 500, "failed to delete post")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
