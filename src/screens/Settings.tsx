import { useEffect, useState } from "react";
import type { Config } from "../App";
import { setSetting } from "../db";
import { listModels } from "../ollama";

export default function Settings({ config, onSave }: { config: Config; onSave: (c: Config) => void }) {
  const [draft, setDraft] = useState(config);
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    listModels(draft.baseUrl)
      .then((m) => {
        setModels(m);
        setStatus(`Ollama is running with ${m.length} models.`);
      })
      .catch(() => setStatus("Cannot reach Ollama. Start it and check the address."));
  }, [draft.baseUrl]);

  async function save() {
    for (const [k, v] of Object.entries(draft)) await setSetting(k, v);
    onSave(draft);
    setStatus("Saved.");
  }

  return (
    <section>
      <h2>Settings</h2>
      <div className="card form">
        <label>
          Teacher name
          <input value={draft.teacher} onChange={(e) => setDraft({ ...draft, teacher: e.target.value })} />
        </label>
        <label>
          Voice and style
          <textarea rows={3} value={draft.style} onChange={(e) => setDraft({ ...draft, style: e.target.value })} />
        </label>
        <label>
          Ollama address
          <input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
        </label>
        <label>
          Model
          <input list="models" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
          <datalist id="models">
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <p className="muted">{status}</p>
        <button className="primary" onClick={save}>
          Save
        </button>
      </div>
    </section>
  );
}
