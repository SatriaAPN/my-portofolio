package store

import (
	"database/sql"
	"errors"

	"portfolio-backend/internal/models"
)

// UserWithHash is a user row including its password hash (never serialized).
type UserWithHash struct {
	models.User
	PasswordHash string
}

func (s *Store) GetUserByEmail(email string) (UserWithHash, error) {
	var u UserWithHash
	row := s.db.QueryRow(`SELECT id, email, name, password_hash FROM users WHERE email = ?`, email)
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return u, ErrNotFound
	}
	return u, err
}

func (s *Store) GetUser(id int64) (models.User, error) {
	var u models.User
	row := s.db.QueryRow(`SELECT id, email, name FROM users WHERE id = ?`, id)
	err := row.Scan(&u.ID, &u.Email, &u.Name)
	if errors.Is(err, sql.ErrNoRows) {
		return u, ErrNotFound
	}
	return u, err
}
