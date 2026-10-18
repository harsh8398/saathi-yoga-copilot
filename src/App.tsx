import { useEffect, useState } from "react";
import { getSetting } from "./db";
import ClassPrep from "./screens/ClassPrep";
import AfterClass from "./screens/AfterClass";
import Students from "./screens/Students";
import Newsletter from "./screens/Newsletter";
import Settings from "./screens/Settings";
import "./styles.css";

export interface Config {
  baseUrl: string;
  model: string;
  teacher: string;
  style: string;
}

export const DEFAULTS: Config = {
  baseUrl: "http://localhost:11434",
  model: "gemma4:e4b-it-qat",
  teacher: "Your name",
  style: "Calm, warm and encouraging. Gentle humour is welcome.",
};

const TABS = ["Class prep", "After class", "Students", "Newsletter", "Settings"] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Class prep");
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    (async () => {
      setConfig({
        baseUrl: await getSetting("baseUrl", DEFAULTS.baseUrl),
        model: await getSetting("model", DEFAULTS.model),
        teacher: await getSetting("teacher", DEFAULTS.teacher),
        style: await getSetting("style", DEFAULTS.style),
      });
    })();
  }, []);

  if (!config) return null;

  return (
    <div className="app">
      <nav>
        <h1>Saathi</h1>
        <p className="tagline">Your class copilot. Everything stays on this laptop.</p>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <main>
        <div hidden={tab !== "Class prep"}><ClassPrep config={config} active={tab === "Class prep"} /></div>
        <div hidden={tab !== "After class"}><AfterClass config={config} active={tab === "After class"} /></div>
        <div hidden={tab !== "Students"}><Students /></div>
        <div hidden={tab !== "Newsletter"}><Newsletter config={config} /></div>
        <div hidden={tab !== "Settings"}><Settings config={config} onSave={setConfig} /></div>
      </main>
    </div>
  );
}
