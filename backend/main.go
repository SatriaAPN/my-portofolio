package main

import (
	"bufio"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"portfolio-backend/internal/ai"
	"portfolio-backend/internal/api"
	"portfolio-backend/internal/auth"
	"portfolio-backend/internal/db"
	"portfolio-backend/internal/store"
)

func main() {
	loadDotEnv(".env")

	port := envOr("PORT", "8080")
	dbPath := envOr("DB_PATH", "portfolio.db")
	secret := envOr("JWT_SECRET", "dev-secret-change-me")
	origin := envOr("FRONTEND_ORIGIN", "http://localhost:3000")
	cookieSecure := os.Getenv("COOKIE_SECURE") == "true"

	conn, err := db.Open(dbPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer conn.Close()

	st := store.New(conn)
	am := auth.NewManager(secret, cookieSecure)

	// The AI provider is pluggable: Claude when an API key is present, else the
	// keyword stub. Either way the app runs — the stub needs no key.
	var provider ai.Provider = ai.NewStub()
	if key := os.Getenv("ANTHROPIC_API_KEY"); key != "" {
		model := envOr("AI_MODEL", ai.DefaultModel)
		provider = ai.NewClaude(key, model)
		log.Printf("AI: Claude provider (model %s)", model)
	} else {
		log.Printf("AI: keyword stub (set ANTHROPIC_API_KEY to enable Claude)")
	}

	srv := api.NewServer(st, am, provider)
	handler := srv.Router(origin)

	httpServer := &http.Server{
		Addr:        ":" + port,
		Handler:     handler,
		ReadTimeout: 15 * time.Second,
		// AI endpoints (post assist, CV generation) legitimately hold the
		// response for a minute or more while the model works; a short write
		// timeout hangs up on them mid-request.
		WriteTimeout: 180 * time.Second,
	}

	log.Printf("portfolio backend listening on :%s (frontend origin: %s)", port, origin)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server: %v", err)
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// loadDotEnv loads KEY=VALUE lines from path into the environment (existing
// vars win). Missing file is not an error.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k, v = strings.TrimSpace(k), strings.Trim(strings.TrimSpace(v), `"'`)
		if _, exists := os.LookupEnv(k); !exists {
			os.Setenv(k, v)
		}
	}
}
