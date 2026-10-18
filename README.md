# Saathi

A private class copilot for solo yoga teachers. It runs Gemma locally through Ollama, so student health information never leaves the teacher's laptop and there is no per-use cost.

- **Class prep:** pick a class and who is attending. Saathi drafts a 45-minute sequence and a callout per student (poses to avoid, modification to offer) based on their injuries and surgeries.
- **After class:** type quick notes. Saathi logs progress per student and drafts a personal follow-up email for each. It never sends anything itself.
- **Newsletter:** drafts the weekly newsletter from the week's notes, without names or health details.

Built with Tauri 2, React, SQLite and Ollama.

## Setup

1. Install the latest [Ollama](https://ollama.com/download) (Gemma 4 needs a recent version).
2. Pull a model: `ollama pull gemma4:e4b-it-qat` (a 6 GB build that leaves room for the rest of a 16 GB Mac)
3. `npm install`
4. `npm run tauri dev`

To build an app bundle: `npm run tauri build`.

## Importing students

Add students by hand, or import JSON from a Cloudflare D1 booking database:

```
npx wrangler d1 execute <database> --remote --json --command "SELECT * FROM students" > students.json
```

Then use **Import JSON** on the Students screen. `fixtures/sample-students.json` has a made-up roster to try.

## Choosing a model

Open **Settings** to pick any model Ollama has pulled. Smaller models are faster, larger ones follow the health callouts more carefully.

## Note on safety

Plans are suggestions. The teacher decides what is safe for each student.
