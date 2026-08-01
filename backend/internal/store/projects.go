package store

import (
	"database/sql"
	"errors"

	"portfolio-backend/internal/models"
)

const projectCols = `id, title, tech, year, featured, image, descr, position`

func scanProject(s interface{ Scan(...any) error }) (models.Project, error) {
	var p models.Project
	err := s.Scan(&p.ID, &p.Title, &p.Tech, &p.Year, &p.Featured, &p.Image, &p.Desc, &p.Position)
	return p, err
}

func (s *Store) ListProjects() ([]models.Project, error) {
	rows, err := s.db.Query(`SELECT ` + projectCols + ` FROM projects ORDER BY position ASC, id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Project{}
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) GetProject(id int64) (models.Project, error) {
	row := s.db.QueryRow(`SELECT `+projectCols+` FROM projects WHERE id = ?`, id)
	p, err := scanProject(row)
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

// CreateProject prepends a blank/new project (position 0), shifting others down.
func (s *Store) CreateProject(p models.Project) (models.Project, error) {
	if _, err := s.db.Exec(`UPDATE projects SET position = position + 1`); err != nil {
		return p, err
	}
	res, err := s.db.Exec(`INSERT INTO projects (title, tech, year, featured, image, descr, position)
		VALUES (?, ?, ?, ?, ?, ?, 0)`, p.Title, p.Tech, p.Year, p.Featured, p.Image, p.Desc)
	if err != nil {
		return p, err
	}
	id, _ := res.LastInsertId()
	return s.GetProject(id)
}

func (s *Store) UpdateProject(p models.Project) (models.Project, error) {
	_, err := s.db.Exec(`UPDATE projects SET title=?, tech=?, year=?, featured=?, image=?, descr=? WHERE id=?`,
		p.Title, p.Tech, p.Year, p.Featured, p.Image, p.Desc, p.ID)
	if err != nil {
		return p, err
	}
	return s.GetProject(p.ID)
}

func (s *Store) DeleteProject(id int64) error {
	_, err := s.db.Exec(`DELETE FROM projects WHERE id = ?`, id)
	return err
}

// CountFeatured returns how many projects are currently featured (excluding `except`).
func (s *Store) CountFeatured(except int64) (int, error) {
	var n int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM projects WHERE featured = 1 AND id != ?`, except).Scan(&n)
	return n, err
}
