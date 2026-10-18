import Database from "@tauri-apps/plugin-sql";

export interface Student {
  id: number;
  email: string | null;
  name: string;
  age_range: string | null;
  experience_level: string | null;
  goals: string | null;
  injuries: string | null;
  surgeries: string | null;
  notes: string | null;
}

export interface LogEntry {
  id: number;
  student_id: number;
  session_id: number;
  entry: string;
  followup_draft: string | null;
  created_at: string;
}

export type NewStudent = Omit<Student, "id">;

const db = Database.load("sqlite:saathi.db");

export async function listStudents(): Promise<Student[]> {
  return (await db).select("SELECT * FROM students ORDER BY name");
}

export async function saveStudent(s: NewStudent & { id?: number }) {
  const d = await db;
  const values = [s.email || null, s.name, s.age_range, s.experience_level, s.goals, s.injuries, s.surgeries, s.notes];
  if (s.id) {
    await d.execute(
      "UPDATE students SET email=$1, name=$2, age_range=$3, experience_level=$4, goals=$5, injuries=$6, surgeries=$7, notes=$8 WHERE id=$9",
      [...values, s.id],
    );
  } else {
    await d.execute(
      `INSERT INTO students (email, name, age_range, experience_level, goals, injuries, surgeries, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(email) DO UPDATE SET name=excluded.name, age_range=excluded.age_range,
         experience_level=excluded.experience_level, goals=excluded.goals, injuries=excluded.injuries,
         surgeries=excluded.surgeries, notes=excluded.notes`,
      values,
    );
  }
}

export async function deleteStudent(id: number) {
  const d = await db;
  await d.execute("DELETE FROM log_entries WHERE student_id=$1", [id]);
  await d.execute("DELETE FROM students WHERE id=$1", [id]);
}

export async function createSession(slot: string, attendeeIds: number[], planJson: string): Promise<number> {
  const result = await (await db).execute(
    "INSERT INTO sessions (slot, held_on, attendee_ids, plan_json) VALUES ($1, date('now','localtime'), $2, $3)",
    [slot, JSON.stringify(attendeeIds), planJson],
  );
  return result.lastInsertId as number;
}

export interface Session {
  id: number;
  slot: string;
  held_on: string;
  attendee_ids: string;
  plan_json: string | null;
  raw_notes: string | null;
}

export async function recentSessions(limit = 20): Promise<Session[]> {
  return (await db).select("SELECT * FROM sessions ORDER BY id DESC LIMIT $1", [limit]);
}

export async function saveNotes(sessionId: number, rawNotes: string) {
  await (await db).execute("UPDATE sessions SET raw_notes=$1 WHERE id=$2", [rawNotes, sessionId]);
}

export async function addLogEntry(studentId: number, sessionId: number, entry: string, followup: string) {
  await (await db).execute(
    "INSERT INTO log_entries (student_id, session_id, entry, followup_draft) VALUES ($1,$2,$3,$4)",
    [studentId, sessionId, entry, followup],
  );
}

export async function logForStudent(studentId: number): Promise<LogEntry[]> {
  return (await db).select("SELECT * FROM log_entries WHERE student_id=$1 ORDER BY id DESC", [studentId]);
}

export async function notesSince(days: number): Promise<Session[]> {
  return (await db).select(
    "SELECT * FROM sessions WHERE raw_notes IS NOT NULL AND held_on >= date('now','localtime',$1) ORDER BY id",
    [`-${days} days`],
  );
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  const rows = await (await db).select<{ value: string }[]>("SELECT value FROM settings WHERE key=$1", [key]);
  return rows[0]?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await (await db).execute(
    "INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [key, value],
  );
}
