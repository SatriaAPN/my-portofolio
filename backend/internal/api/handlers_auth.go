package api

import (
	"net/http"
	"strings"

	"portfolio-backend/internal/auth"
)

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}
	email := strings.TrimSpace(strings.ToLower(body.Email))
	user, err := s.store.GetUserByEmail(email)
	if notFound(err) || (err == nil && !auth.CheckPassword(user.PasswordHash, body.Password)) {
		writeErr(w, 401, "That email and password don't match.")
		return
	}
	if err != nil {
		writeErr(w, 500, "login failed")
		return
	}
	if err := s.auth.SetCookie(w, user.ID); err != nil {
		writeErr(w, 500, "login failed")
		return
	}
	writeJSON(w, 200, user.User)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	s.auth.ClearCookie(w)
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(auth.CookieName)
	if err != nil {
		writeErr(w, 401, "unauthorized")
		return
	}
	// Reuse the middleware's parsing by validating through a lightweight path:
	// the manager exposes UserID only inside protected handlers, so re-parse here.
	uid := s.auth.UserIDFromToken(c.Value)
	if uid == 0 {
		writeErr(w, 401, "unauthorized")
		return
	}
	user, err := s.store.GetUser(uid)
	if err != nil {
		writeErr(w, 401, "unauthorized")
		return
	}
	writeJSON(w, 200, user)
}
