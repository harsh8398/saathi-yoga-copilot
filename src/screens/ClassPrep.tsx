import { useEffect, useRef, useState } from "react";
import type { Config } from "../App";
import { createSession, listStudents, type Student } from "../db";
import { chatJson } from "../ollama";
import { planMessages, planSchema, SLOTS, type Plan } from "../prompts";

export default function ClassPrep({ config, active }: { config: Config; active: boolean }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [slot, setSlot] = useState(SLOTS[0]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [plan, setPlan] = useState<Partial<Plan> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (active) listStudents().then(setStudents);
  }, [active]);

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  async function generate() {
    const attendees = students.filter((s) => picked.has(s.id));
    abort.current = new AbortController();
    setBusy(true);
    setError("");
    setPlan(null);
    try {
      const result = await chatJson<Plan>(
        config.baseUrl,
        config.model,
        planMessages(config.teacher, config.style, slot, attendees),
        planSchema,
        { signal: abort.current.signal, onPartial: setPlan },
      );
      setPlan(result);
      await createSession(slot, [...picked], JSON.stringify(result));
    } catch (e) {
      if (!abort.current.signal.aborted) setError(`${e}. Is Ollama running with ${config.model} pulled?`);
    } finally {
      setBusy(false);
    }
  }

  const blocks = plan?.blocks ?? [];
  const total = blocks.reduce((sum, b) => sum + (b?.minutes ?? 0), 0);

  return (
    <section>
      <h2>Class prep</h2>
      <div className="row">
        <select value={slot} onChange={(e) => setSlot(e.target.value)} disabled={busy}>
          {SLOTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {busy ? (
          <button onClick={() => abort.current?.abort()}>Stop</button>
        ) : (
          <button className="primary" disabled={picked.size === 0} onClick={generate}>
            Plan this class
          </button>
        )}
        {busy && <span className="muted">Writing...</span>}
      </div>

      {students.length === 0 && <p className="muted">Add or import students first.</p>}
      <div className="chips">
        {students.map((s) => (
          <label key={s.id} className={`chip ${picked.has(s.id) ? "on" : ""}`}>
            <input type="checkbox" checked={picked.has(s.id)} disabled={busy} onChange={() => toggle(s.id)} />
            {s.name}
            {(s.injuries || s.surgeries) && <span title="Has health notes"> •</span>}
          </label>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      {plan && (
        <div className="plan">
          <h3>{plan.theme}</h3>
          <p className="muted">{total} minutes so far. You make the final call on safety.</p>
          {(plan.student_notes?.length ?? 0) > 0 && (
            <div className="callouts">
              {plan.student_notes?.map((n, i) => (
                <div key={i} className="callout">
                  <strong>{n?.student}</strong>
                  <div>Avoid: {n?.avoid?.join(", ")}</div>
                  <div>{n?.modification}</div>
                </div>
              ))}
            </div>
          )}
          {blocks.map((b, i) => (
            <div key={i} className="block">
              <h4>
                {b?.name} <span className="muted">{b?.minutes ? `${b.minutes} min` : ""}</span>
              </h4>
              <ul>
                {b?.poses?.map((p, j) => (
                  <li key={j}>
                    <strong>{p?.sanskrit}</strong> {p?.english && `(${p.english})`} {p?.cue}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
