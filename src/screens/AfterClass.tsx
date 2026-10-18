import { useEffect, useState } from "react";
import type { Config } from "../App";
import { addLogEntry, listStudents, recentSessions, saveNotes, type Session, type Student } from "../db";
import { chatJson } from "../ollama";
import { notesMessages, notesSchema, type ClassNotes, type Plan } from "../prompts";

export default function AfterClass({ config }: { config: Config }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ClassNotes | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    recentSessions().then((s) => {
      setSessions(s);
      if (s[0]) setSessionId(s[0].id);
    });
    listStudents().then(setStudents);
  }, []);

  const session = sessions.find((s) => s.id === sessionId);

  async function process() {
    if (!session) return;
    const ids: number[] = JSON.parse(session.attendee_ids);
    const attendees = students.filter((s) => ids.includes(s.id));
    const plan: Plan | null = session.plan_json ? JSON.parse(session.plan_json) : null;
    setBusy(true);
    setError("");
    try {
      const out = await chatJson<ClassNotes>(
        config.baseUrl,
        config.model,
        notesMessages(config.teacher, config.style, plan, attendees, raw),
        notesSchema,
      );
      await saveNotes(session.id, raw);
      for (const e of out.entries) {
        const match = attendees.find((s) => s.name.toLowerCase() === e.student.toLowerCase());
        if (match) await addLogEntry(match.id, session.id, e.entry, e.followup_email);
      }
      setResult(out);
    } catch (e) {
      setError(`${e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>After class</h2>
      {sessions.length === 0 ? (
        <p className="muted">Plan a class first, then come back to log how it went.</p>
      ) : (
        <>
          <div className="row">
            <select value={sessionId ?? ""} onChange={(e) => setSessionId(Number(e.target.value))}>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.held_on} · {s.slot}
                </option>
              ))}
            </select>
            <button className="primary" disabled={busy || !raw.trim()} onClick={process}>
              {busy ? "Writing..." : "Log and draft follow-ups"}
            </button>
          </div>
          <textarea
            rows={8}
            placeholder="Ravi's knee felt better today. Meera skipped inversions. Everyone loved bhramari."
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          {result?.entries.map((e) => (
            <div key={e.student} className="card">
              <h4>{e.student}</h4>
              <p>{e.entry}</p>
              <pre>{e.followup_email}</pre>
              <button onClick={() => navigator.clipboard.writeText(e.followup_email)}>Copy email</button>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
