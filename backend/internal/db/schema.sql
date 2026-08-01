-- Schema for the portfolio CMS. Maps 1:1 to the design-handoff data stores.

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Post (was blog-data.js, key sn_admin_posts)
CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    slug       TEXT NOT NULL DEFAULT '',
    category   TEXT NOT NULL DEFAULT 'Architecture', -- Performance|Architecture|Databases|Testing
    status     TEXT NOT NULL DEFAULT 'DRAFT',         -- LIVE|DRAFT
    date       TEXT NOT NULL DEFAULT '',              -- e.g. 'Jul 12, 2026'
    views      TEXT NOT NULL DEFAULT '—',
    read_min   INTEGER NOT NULL DEFAULT 1,
    excerpt    TEXT NOT NULL DEFAULT '',
    body       TEXT NOT NULL DEFAULT '',              -- rich-text HTML
    position   INTEGER NOT NULL DEFAULT 0,            -- ordering (newest first = smallest)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Project (was projects-data.js, key sn_projects)
CREATE TABLE IF NOT EXISTS projects (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    title    TEXT NOT NULL,
    tech     TEXT NOT NULL DEFAULT '',   -- 'GO · POSTGRES · REACT'
    year     TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0, -- bool, max 2 enforced in app layer
    image    TEXT NOT NULL DEFAULT '',
    descr    TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0
);

-- Site content (was site-data.js, key sn_site_content) — single row.
CREATE TABLE IF NOT EXISTS site_content (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    skills        TEXT NOT NULL DEFAULT '[]',
    experience    TEXT NOT NULL DEFAULT '[]',
    hero_image    TEXT NOT NULL DEFAULT '',
    project_image TEXT NOT NULL DEFAULT ''
);

-- Tailored CV history (was cv-data.js, key sn_cv_history, capped 20)
CREATE TABLE IF NOT EXISTS cv_history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    role           TEXT NOT NULL DEFAULT '',
    company        TEXT NOT NULL DEFAULT '',
    date           TEXT NOT NULL DEFAULT '',
    score          INTEGER NOT NULL DEFAULT 0,
    in_jd_count    INTEGER NOT NULL DEFAULT 0,
    matched_names  TEXT NOT NULL DEFAULT '[]',
    gaps           TEXT NOT NULL DEFAULT '[]',
    skills_ordered TEXT NOT NULL DEFAULT '[]',
    ranked         TEXT NOT NULL DEFAULT '[]',
    summary        TEXT NOT NULL DEFAULT '',
    jd             TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
