package store

import (
	"database/sql"
	"errors"

	"portfolio-backend/internal/models"
	"portfolio-backend/internal/util"
)

var ErrNotFound = errors.New("not found")

const postCols = `id, title, slug, company, tags, status, date, views, read_min, excerpt, body, position, created_at`

func scanPost(s interface{ Scan(...any) error }) (models.Post, error) {
	var p models.Post
	var tags string
	err := s.Scan(&p.ID, &p.Title, &p.Slug, &p.Company, &tags, &p.Status, &p.Date,
		&p.Views, &p.ReadMin, &p.Excerpt, &p.Body, &p.Position, &p.CreatedAt)
	p.Tags = jsonArray(tags)
	return p, err
}

// ListPosts returns every post, newest first (by position then id).
func (s *Store) ListPosts() ([]models.Post, error) {
	rows, err := s.db.Query(`SELECT ` + postCols + ` FROM posts ORDER BY position ASC, id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Post{}
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// ListLivePosts returns only LIVE posts, newest first.
func (s *Store) ListLivePosts() ([]models.Post, error) {
	all, err := s.ListPosts()
	if err != nil {
		return nil, err
	}
	out := []models.Post{}
	for _, p := range all {
		if p.Status == "LIVE" {
			out = append(out, p)
		}
	}
	return out, nil
}

func (s *Store) GetPost(id int64) (models.Post, error) {
	row := s.db.QueryRow(`SELECT `+postCols+` FROM posts WHERE id = ?`, id)
	p, err := scanPost(row)
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

func (s *Store) GetPostBySlug(slug string) (models.Post, error) {
	row := s.db.QueryRow(`SELECT `+postCols+` FROM posts WHERE slug = ?`, slug)
	p, err := scanPost(row)
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

// CreatePost inserts a post at the front (position 0) and shifts others down.
func (s *Store) CreatePost(p models.Post) (models.Post, error) {
	if p.Slug == "" {
		p.Slug = util.Slugify(p.Title)
	}
	p.Slug = s.uniqueSlug(p.Slug, 0)
	if _, err := s.db.Exec(`UPDATE posts SET position = position + 1`); err != nil {
		return p, err
	}
	res, err := s.db.Exec(`INSERT INTO posts
		(title, slug, company, tags, status, date, views, read_min, excerpt, body, position)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
		p.Title, p.Slug, p.Company, mustJSON(nonNil(p.Tags)), p.Status, p.Date, p.Views, p.ReadMin, p.Excerpt, p.Body)
	if err != nil {
		return p, err
	}
	id, _ := res.LastInsertId()
	return s.GetPost(id)
}

func (s *Store) UpdatePost(p models.Post) (models.Post, error) {
	if p.Slug == "" {
		p.Slug = util.Slugify(p.Title)
	}
	p.Slug = s.uniqueSlug(p.Slug, p.ID)
	_, err := s.db.Exec(`UPDATE posts SET title=?, slug=?, company=?, tags=?, status=?, date=?,
		views=?, read_min=?, excerpt=?, body=? WHERE id=?`,
		p.Title, p.Slug, p.Company, mustJSON(nonNil(p.Tags)), p.Status, p.Date, p.Views, p.ReadMin, p.Excerpt, p.Body, p.ID)
	if err != nil {
		return p, err
	}
	return s.GetPost(p.ID)
}

func (s *Store) DeletePost(id int64) error {
	_, err := s.db.Exec(`DELETE FROM posts WHERE id = ?`, id)
	return err
}

// uniqueSlug appends -2, -3, ... until the slug is unique (ignoring row `self`).
func (s *Store) uniqueSlug(base string, self int64) string {
	slug := base
	for i := 2; ; i++ {
		var id int64
		err := s.db.QueryRow(`SELECT id FROM posts WHERE slug = ?`, slug).Scan(&id)
		if errors.Is(err, sql.ErrNoRows) || id == self {
			return slug
		}
		slug = base + "-" + itoa(i)
	}
}

func itoa(i int) string {
	const digits = "0123456789"
	if i == 0 {
		return "0"
	}
	var b [20]byte
	pos := len(b)
	for i > 0 {
		pos--
		b[pos] = digits[i%10]
		i /= 10
	}
	return string(b[pos:])
}
