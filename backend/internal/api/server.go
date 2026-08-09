package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"portfolio-backend/internal/ai"
	"portfolio-backend/internal/auth"
	"portfolio-backend/internal/store"
)

// Server wires the store, auth manager, and AI provider into an http.Handler.
type Server struct {
	store *store.Store
	auth  *auth.Manager
	ai    ai.Provider
}

func NewServer(st *store.Store, am *auth.Manager, provider ai.Provider) *Server {
	return &Server{store: st, auth: am, ai: provider}
}

// Router builds the full route tree. allowedOrigin is the frontend origin used
// for CORS (credentialed).
func (s *Server) Router(allowedOrigin string) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{allowedOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })

	// ---- Public ----
	r.Get("/api/site", s.handleGetSite)
	r.Get("/api/posts", s.handleListLivePosts)
	r.Get("/api/posts/{slug}", s.handleGetPostBySlug)
	r.Get("/api/projects", s.handleListProjects)
	r.Get("/api/resume", s.handleGetResume)
	r.Get("/api/ai/common-questions", s.handleCommonQuestions)
	r.Post("/api/ai/ask", s.handleAsk)

	// ---- Auth ----
	r.Post("/api/auth/login", s.handleLogin)
	r.Post("/api/auth/logout", s.handleLogout)
	r.Get("/api/auth/me", s.handleMe)

	// ---- Admin (protected) ----
	r.Route("/api/admin", func(r chi.Router) {
		r.Use(s.auth.Middleware)

		r.Get("/posts", s.handleAdminListPosts)
		r.Post("/posts", s.handleCreatePost)
		r.Post("/posts/assist", s.handleAssistPost)
		r.Get("/posts/{id}", s.handleGetPost)
		r.Put("/posts/{id}", s.handleUpdatePost)
		r.Delete("/posts/{id}", s.handleDeletePost)

		r.Get("/projects", s.handleAdminListProjects)
		r.Post("/projects", s.handleCreateProject)
		r.Put("/projects/{id}", s.handleUpdateProject)
		r.Delete("/projects/{id}", s.handleDeleteProject)

		r.Put("/site", s.handleUpdateSite)
		r.Put("/resume", s.handleSetResume)
		r.Delete("/resume", s.handleDeleteResume)

		r.Get("/cv", s.handleListCV)
		r.Get("/cv/{id}", s.handleGetCV)
		r.Post("/cv/generate", s.handleGenerateCV)
		r.Delete("/cv/{id}", s.handleDeleteCV)

		r.Get("/overview", s.handleOverview)
		r.Get("/analytics", s.handleAnalytics)
		r.Get("/messages", s.handleMessages)
		r.Get("/chatlogs", s.handleChatlogs)
	})

	return r
}

// ---- helpers ----

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decode(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	return dec.Decode(v)
}

func idParam(r *http.Request) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
}

func strParam(r *http.Request, key string) string { return chi.URLParam(r, key) }

func notFound(err error) bool { return errors.Is(err, store.ErrNotFound) }
