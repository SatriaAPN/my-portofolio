package api

import (
	"net/http"

	"portfolio-backend/internal/models"
)

func (s *Server) handleAdminListProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := s.store.ListProjects()
	if err != nil {
		writeErr(w, 500, "failed to load projects")
		return
	}
	writeJSON(w, 200, projects)
}

func (s *Server) handleCreateProject(w http.ResponseWriter, r *http.Request) {
	var p models.Project
	if err := decode(r, &p); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}
	p.Featured = false // new projects start unfeatured; toggle enforces the max.
	created, err := s.store.CreateProject(p)
	if err != nil {
		writeErr(w, 500, "failed to create project")
		return
	}
	writeJSON(w, 201, created)
}

func (s *Server) handleUpdateProject(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r)
	if err != nil {
		writeErr(w, 400, "invalid id")
		return
	}
	var p models.Project
	if err := decode(r, &p); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}
	p.ID = id
	// Enforce max 2 featured projects.
	if p.Featured {
		n, err := s.store.CountFeatured(id)
		if err != nil {
			writeErr(w, 500, "failed to update project")
			return
		}
		if n >= 2 {
			writeErr(w, 409, "Max 2 featured projects — unfeature one first.")
			return
		}
	}
	updated, err := s.store.UpdateProject(p)
	if err != nil {
		writeErr(w, 500, "failed to update project")
		return
	}
	writeJSON(w, 200, updated)
}

func (s *Server) handleDeleteProject(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r)
	if err != nil {
		writeErr(w, 400, "invalid id")
		return
	}
	if err := s.store.DeleteProject(id); err != nil {
		writeErr(w, 500, "failed to delete project")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) handleUpdateSite(w http.ResponseWriter, r *http.Request) {
	var sc models.SiteContent
	if err := decode(r, &sc); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}
	if sc.Headline == nil {
		sc.Headline = []string{}
	}
	if sc.SkillGroups == nil {
		sc.SkillGroups = []models.SkillGroup{}
	}
	if sc.Experience == nil {
		sc.Experience = []models.ExperienceItem{}
	}
	updated, err := s.store.UpdateSite(sc)
	if err != nil {
		writeErr(w, 500, "failed to update site content")
		return
	}
	writeJSON(w, 200, updated)
}
