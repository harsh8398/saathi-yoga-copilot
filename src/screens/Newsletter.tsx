import { useState } from "react";
import type { Config } from "../App";
import { notesSince } from "../db";
import { chatJson } from "../ollama";
import { newsletterMessages, newsletterSchema } from "../prompts";

export default function Newsletter({ config }: { config: Config }) {
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const sessions = await notesSince(7);
      if (sessions.length === 0) throw new Error("No class notes from the last 7 days yet");
      const notes = sessions.map((s) => `${s.slot}: ${s.raw_notes}`);
      setDraft(
        await chatJson(config.baseUrl, config.model, newsletterMessages(config.teacher, config.style, notes), newsletterSchema),
      );
    } catch (e) {
      setError(`${e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Newsletter</h2>
      <p className="muted">Built from this week's class notes. Student names and health details are never included.</p>
      <button className="primary" disabled={busy} onClick={generate}>
        {busy ? "Writing..." : "Draft this week's newsletter"}
      </button>
      {error && <p className="error">{error}</p>}
      {draft && (
        <div className="card">
          <h4>{draft.subject}</h4>
          <pre>{draft.body}</pre>
          <button onClick={() => navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`)}>Copy</button>
        </div>
      )}
    </section>
  );
}
