package api

import (
	"net/http"
	"strings"
	"time"
)

func (s *Server) handleListCV(w http.ResponseWriter, r *http.Request) {
	list, err := s.store.ListCVs()
	if err != nil {
		writeErr(w, 500, "failed to load CV history")
		return
	}
	writeJSON(w, 200, list)
}

func (s *Server) handleGetCV(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r)
	if err != nil {
		writeErr(w, 400, "invalid id")
		return
	}
	cv, err := s.store.GetCV(id)
	if notFound(err) {
		writeErr(w, 404, "CV not found")
		return
	}
	if err != nil {
		writeErr(w, 500, "failed to load CV")
		return
	}
	writeJSON(w, 200, cv)
}

func (s *Server) handleGenerateCV(w http.ResponseWriter, r *http.Request) {
	var body struct {
		JD string `json:"jd"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}
	if len(strings.TrimSpace(body.JD)) < 40 {
		writeErr(w, 400, "Paste a fuller job description first")
		return
	}
	g, err := s.grounding()
	if err != nil {
		writeErr(w, 500, "failed to load context")
		return
	}
	cv, err := s.ai.Tailor(body.JD, g)
	if err != nil {
		writeErr(w, 500, "failed to generate CV")
		return
	}
	cv.Date = time.Now().Format("Jan 02, 2006")
	saved, err := s.store.CreateCV(cv)
	if err != nil {
		writeErr(w, 500, "failed to save CV")
		return
	}
	writeJSON(w, 201, saved)
}

func (s *Server) handleDeleteCV(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r)
	if err != nil {
		writeErr(w, 400, "invalid id")
		return
	}
	if err := s.store.DeleteCV(id); err != nil {
		writeErr(w, 500, "failed to delete CV")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
