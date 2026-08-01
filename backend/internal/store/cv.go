package store

import (
	"database/sql"
	"encoding/json"
	"errors"

	"portfolio-backend/internal/models"
)

const cvHistoryCap = 20

const cvCols = `id, role, company, date, score, in_jd_count, matched_names, gaps, skills_ordered, ranked, summary, jd, created_at`

func scanCV(s interface{ Scan(...any) error }) (models.CV, error) {
	var c models.CV
	var matched, gaps, skills, ranked string
	err := s.Scan(&c.ID, &c.Role, &c.Company, &c.Date, &c.Score, &c.InJdCount,
		&matched, &gaps, &skills, &ranked, &c.Summary, &c.JD, &c.CreatedAt)
	if err != nil {
		return c, err
	}
	c.MatchedNames = jsonArray(matched)
	c.Gaps = jsonArray(gaps)
	c.SkillsOrdered = jsonArray(skills)
	c.Ranked = []models.RankedProject{}
	_ = json.Unmarshal([]byte(ranked), &c.Ranked)
	if c.Ranked == nil {
		c.Ranked = []models.RankedProject{}
	}
	return c, nil
}

// ListCVs returns CV history, newest first.
func (s *Store) ListCVs() ([]models.CV, error) {
	rows, err := s.db.Query(`SELECT ` + cvCols + ` FROM cv_history ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.CV{}
	for rows.Next() {
		c, err := scanCV(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) GetCV(id int64) (models.CV, error) {
	row := s.db.QueryRow(`SELECT `+cvCols+` FROM cv_history WHERE id = ?`, id)
	c, err := scanCV(row)
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	return c, err
}

// CreateCV prepends a new record and trims history to the cap.
func (s *Store) CreateCV(c models.CV) (models.CV, error) {
	res, err := s.db.Exec(`INSERT INTO cv_history
		(role, company, date, score, in_jd_count, matched_names, gaps, skills_ordered, ranked, summary, jd)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		c.Role, c.Company, c.Date, c.Score, c.InJdCount,
		mustJSON(c.MatchedNames), mustJSON(c.Gaps), mustJSON(c.SkillsOrdered), mustJSON(c.Ranked),
		c.Summary, c.JD)
	if err != nil {
		return c, err
	}
	// Trim to the newest cvHistoryCap rows.
	_, _ = s.db.Exec(`DELETE FROM cv_history WHERE id NOT IN (
		SELECT id FROM cv_history ORDER BY id DESC LIMIT ?)`, cvHistoryCap)
	id, _ := res.LastInsertId()
	return s.GetCV(id)
}

func (s *Store) DeleteCV(id int64) error {
	_, err := s.db.Exec(`DELETE FROM cv_history WHERE id = ?`, id)
	return err
}
