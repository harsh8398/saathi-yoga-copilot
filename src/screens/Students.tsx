import { useEffect, useState } from "react";
import { deleteStudent, listStudents, logForStudent, saveStudent, type LogEntry, type NewStudent, type Student } from "../db";

const EMPTY: NewStudent = {
  email: "",
  name: "",
  age_range: "",
  experience_level: "",
  goals: "",
  injuries: "",
  surgeries: "",
  notes: "",
};

const FIELDS: (keyof NewStudent)[] = ["name", "email", "age_range", "experience_level", "goals", "injuries", "surgeries", "notes"];

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [draft, setDraft] = useState<(NewStudent & { id?: number }) | null>(null);
  const [log, setLog] = useState<{ name: string; entries: LogEntry[] } | null>(null);
  const [message, setMessage] = useState("");

  const refresh = () => listStudents().then(setStudents);
  useEffect(() => {
    refresh();
  }, []);

  async function save() {
    if (!draft?.name.trim()) return;
    await saveStudent(draft);
    setDraft(null);
    refresh();
  }

  // Accepts the output of: wrangler d1 execute <db> --remote --json --command "SELECT * FROM students"
  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const rows: NewStudent[] = Array.isArray(parsed) && parsed[0]?.results ? parsed[0].results : parsed;
      for (const r of rows) await saveStudent({ ...EMPTY, ...r });
      setMessage(`Imported ${rows.length} students.`);
      refresh();
    } catch (e) {
      setMessage(`Could not read that file: ${e}`);
    }
  }

  return (
    <section>
      <h2>Students</h2>
      <div className="row">
        <button className="primary" onClick={() => setDraft({ ...EMPTY })}>
          Add student
        </button>
        <label className="button">
          Import JSON
          <input type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </label>
        <span className="muted">{message}</span>
      </div>

      {draft && (
        <div className="card form">
          {FIELDS.map((f) => (
            <label key={f}>
              {f.replace("_", " ")}
              <input value={draft[f] ?? ""} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} />
            </label>
          ))}
          <div className="row">
            <button className="primary" onClick={save}>
              Save
            </button>
            <button onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      {students.map((s) => (
        <div key={s.id} className="card">
          <h4>{s.name}</h4>
          <p className="muted">
            {[s.age_range, s.experience_level, s.goals].filter(Boolean).join(" · ")}
          </p>
          {s.injuries && <p>Injuries: {s.injuries}</p>}
          {s.surgeries && <p>Surgeries: {s.surgeries}</p>}
          <div className="row">
            <button onClick={() => setDraft(s)}>Edit</button>
            <button onClick={async () => setLog({ name: s.name, entries: await logForStudent(s.id) })}>Progress log</button>
            <button
              onClick={async () => {
                await deleteStudent(s.id);
                refresh();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {log && (
        <div className="card">
          <h4>{log.name}: progress log</h4>
          {log.entries.length === 0 && <p className="muted">Nothing logged yet.</p>}
          {log.entries.map((e) => (
            <p key={e.id}>
              <span className="muted">{e.created_at.slice(0, 10)}</span> {e.entry}
            </p>
          ))}
          <button onClick={() => setLog(null)}>Close</button>
        </div>
      )}
    </section>
  );
}
