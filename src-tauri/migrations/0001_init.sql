CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  age_range TEXT,
  experience_level TEXT,
  goals TEXT,
  injuries TEXT,
  surgeries TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot TEXT NOT NULL,
  held_on TEXT NOT NULL,
  attendee_ids TEXT NOT NULL,
  plan_json TEXT,
  raw_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE log_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  entry TEXT NOT NULL,
  followup_draft TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
