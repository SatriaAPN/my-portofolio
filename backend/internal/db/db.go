package db

import (
	"database/sql"
	_ "embed"
	"fmt"

	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schemaSQL string

// Open opens (creating if needed) the SQLite database at path, applies the
// schema, and seeds first-run data.
func Open(path string) (*sql.DB, error) {
	dsn := fmt.Sprintf("file:%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)", path)
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	conn.SetMaxOpenConns(1) // SQLite writes are serialized; keep it simple.
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	if _, err := conn.Exec(schemaSQL); err != nil {
		return nil, fmt.Errorf("apply schema: %w", err)
	}
	if err := migrate(conn); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	if err := seed(conn); err != nil {
		return nil, fmt.Errorf("seed: %w", err)
	}
	return conn, nil
}

// migrate applies additive column changes that CREATE TABLE IF NOT EXISTS can't
// make to an already-created table. Each step is a no-op when the column is
// already present, so running it on a fresh DB (schema.sql already added them)
// or repeatedly is safe.
func migrate(conn *sql.DB) error {
	// The blog "tags" field was briefly named "tech"; carry the data over on DBs
	// created in that window. Runs before the add-column steps below.
	if err := renameColumn(conn, "posts", "tech", "tags"); err != nil {
		return err
	}

	type addCol struct{ table, column, def string }
	steps := []addCol{
		{"site_content", "resume_pdf", "TEXT NOT NULL DEFAULT ''"},
		{"site_content", "resume_name", "TEXT NOT NULL DEFAULT ''"},
		{"site_content", "resume_updated", "TEXT NOT NULL DEFAULT ''"},
		{"site_content", "education", "TEXT NOT NULL DEFAULT '[]'"},
		{"posts", "company", "TEXT NOT NULL DEFAULT ''"},
		{"posts", "tags", "TEXT NOT NULL DEFAULT '[]'"},
	}
	for _, s := range steps {
		has, err := columnExists(conn, s.table, s.column)
		if err != nil {
			return err
		}
		if has {
			continue
		}
		if _, err := conn.Exec("ALTER TABLE " + s.table + " ADD COLUMN " + s.column + " " + s.def); err != nil {
			return fmt.Errorf("add %s.%s: %w", s.table, s.column, err)
		}
	}
	return nil
}

// renameColumn renames table.from to table.to only when `from` exists and `to`
// does not, so it's a no-op on fresh DBs and safe to run repeatedly.
func renameColumn(conn *sql.DB, table, from, to string) error {
	hasFrom, err := columnExists(conn, table, from)
	if err != nil {
		return err
	}
	hasTo, err := columnExists(conn, table, to)
	if err != nil {
		return err
	}
	if hasFrom && !hasTo {
		if _, err := conn.Exec("ALTER TABLE " + table + " RENAME COLUMN " + from + " TO " + to); err != nil {
			return fmt.Errorf("rename %s.%s to %s: %w", table, from, to, err)
		}
	}
	return nil
}

func columnExists(conn *sql.DB, table, column string) (bool, error) {
	rows, err := conn.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		return false, err
	}
	defer rows.Close()
	for rows.Next() {
		var (
			cid, notnull, pk int
			name, ctype      string
			dflt             sql.NullString
		)
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return false, err
		}
		if name == column {
			return true, nil
		}
	}
	return false, rows.Err()
}
