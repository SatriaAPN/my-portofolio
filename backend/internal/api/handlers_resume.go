package api

import (
	"bytes"
	"encoding/base64"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// maxResumeBytes caps the decoded PDF at 5 MiB. The admin upload is base64, so
// the request body is ~4/3 of this; MaxBytesReader below leaves headroom.
const maxResumeBytes = 5 << 20

// handleGetResume streams the uploaded résumé PDF inline so the browser's
// native viewer opens it in a new tab. Public — the résumé is meant to be
// downloadable by anyone visiting the site.
func (s *Server) handleGetResume(w http.ResponseWriter, r *http.Request) {
	b64, name, err := s.store.GetResume()
	if err != nil || strings.TrimSpace(b64) == "" {
		writeErr(w, 404, "no résumé has been uploaded")
		return
	}
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		writeErr(w, 500, "stored résumé is corrupt")
		return
	}
	if name == "" {
		name = "resume.pdf"
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `inline; filename="`+sanitizeFilename(name)+`"`)
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// handleSetResume stores (or replaces) the résumé PDF. Admin-only. The body is
// {pdf: <data URL>, name: <filename>}; the PDF is validated by magic bytes and
// size before being stored as base64.
func (s *Server) handleSetResume(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxResumeBytes/3*4+(1<<20))
	var body struct {
		PDF  string `json:"pdf"`
		Name string `json:"name"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}

	b64, ok := stripBase64DataURL(body.PDF)
	if !ok {
		writeErr(w, 400, "please upload a PDF file")
		return
	}
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		writeErr(w, 400, "could not read the uploaded file")
		return
	}
	if len(data) == 0 {
		writeErr(w, 400, "the PDF is empty")
		return
	}
	if len(data) > maxResumeBytes {
		writeErr(w, 400, "PDF is larger than 5 MB")
		return
	}
	if !bytes.HasPrefix(data, []byte("%PDF-")) {
		writeErr(w, 400, "that file doesn't look like a PDF")
		return
	}

	name := sanitizeFilename(strings.TrimSpace(body.Name))
	if name == "" {
		name = "resume.pdf"
	}
	if !strings.HasSuffix(strings.ToLower(name), ".pdf") {
		name += ".pdf"
	}
	updated := time.Now().Format("Jan 02, 2006")

	if err := s.store.SetResume(b64, name, updated); err != nil {
		writeErr(w, 500, "could not save the résumé")
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "name": name, "updated": updated})
}

// handleDeleteResume removes the stored résumé. Admin-only.
func (s *Server) handleDeleteResume(w http.ResponseWriter, r *http.Request) {
	if err := s.store.ClearResume(); err != nil {
		writeErr(w, 500, "could not remove the résumé")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// stripBase64DataURL pulls the raw base64 out of a "data:...;base64,<payload>"
// URL. The media type isn't trusted here (some browsers report a PDF as
// application/octet-stream) — callers validate the bytes themselves.
func stripBase64DataURL(s string) (string, bool) {
	if !strings.HasPrefix(s, "data:") {
		return "", false
	}
	i := strings.Index(s, ";base64,")
	if i < 0 {
		return "", false
	}
	return s[i+len(";base64,"):], true
}

// sanitizeFilename strips path components and header-unsafe characters so the
// stored name is safe to echo back in a Content-Disposition header.
func sanitizeFilename(name string) string {
	name = strings.TrimSpace(name)
	if i := strings.LastIndexAny(name, `/\`); i >= 0 {
		name = name[i+1:]
	}
	name = strings.Map(func(r rune) rune {
		if r < 32 || r == '"' || r == '\'' {
			return -1
		}
		return r
	}, name)
	return strings.TrimSpace(name)
}
