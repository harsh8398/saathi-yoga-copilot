import type { Student } from "./db";
import type { Message } from "./ollama";

export const SLOTS = [
  "Monday 6:00 PM",
  "Tuesday 6:30 AM",
  "Wednesday 6:30 AM",
  "Wednesday 6:00 PM",
  "Thursday 6:00 PM",
  "Friday 6:30 AM",
  "Private 1:1",
];

export interface Plan {
  theme: string;
  blocks: { name: string; minutes: number; poses: { sanskrit: string; english: string; cue: string }[] }[];
  student_notes: { student: string; avoid: string[]; modification: string }[];
}

export interface ClassNotes {
  entries: { student: string; entry: string; followup_email: string }[];
}

export const planSchema = {
  type: "object",
  properties: {
    theme: { type: "string" },
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          minutes: { type: "integer" },
          poses: {
            type: "array",
            minItems: 2,
            items: {
              type: "object",
              properties: {
                sanskrit: { type: "string" },
                english: { type: "string" },
                cue: { type: "string" },
              },
              required: ["sanskrit", "english", "cue"],
            },
          },
        },
        required: ["name", "minutes", "poses"],
      },
    },
    student_notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          student: { type: "string" },
          avoid: { type: "array", items: { type: "string" } },
          modification: { type: "string" },
        },
        required: ["student", "avoid", "modification"],
      },
    },
  },
  required: ["theme", "blocks", "student_notes"],
};

export const notesSchema = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          student: { type: "string" },
          entry: { type: "string" },
          followup_email: { type: "string" },
        },
        required: ["student", "entry", "followup_email"],
      },
    },
  },
  required: ["entries"],
};

export const newsletterSchema = {
  type: "object",
  properties: { subject: { type: "string" }, body: { type: "string" } },
  required: ["subject", "body"],
};

const studentLine = (s: Student) =>
  [
    `- ${s.name}`,
    s.age_range && `age ${s.age_range}`,
    s.experience_level,
    s.goals && `goals: ${s.goals}`,
    s.injuries && `injuries: ${s.injuries}`,
    s.surgeries && `surgeries: ${s.surgeries}`,
    s.notes && `notes: ${s.notes}`,
  ]
    .filter(Boolean)
    .join("; ");

export function planMessages(teacher: string, style: string, slot: string, attendees: Student[]): Message[] {
  return [
    {
      role: "system",
      content: `You help ${teacher}, a Yoga Alliance certified teacher, plan a live online class taught over video call. ${style}
Teach traditional Asana and Pranayama. Give each pose its Sanskrit name and an English gloss, plus a one-line cue.
Plan exactly 45 minutes: block minutes must sum to 45. Use blocks such as Arrival, Warm-up, Standing, Floor, Pranayama, Savasana.
Every block lists its poses or breath practices in order (at least 2 each, 3 to 5 for Standing and Floor). Arrival is a centring breath, Pranayama lists breathing techniques such as Nadi Shodhana, and Savasana lists the settling cues.
Students join on camera in a home setting, so avoid poses that need props most people lack, and offer chair options when anyone is a senior.
For every student with an injury, surgery or health note, write a student_notes entry naming the poses to avoid and the modification to offer, citing their specific condition. Students with no health notes need no entry.
You are a planning aid. The teacher makes the final call on safety.`,
    },
    {
      role: "user",
      content: `Class: ${slot}\nStudents attending:\n${attendees.map(studentLine).join("\n")}`,
    },
  ];
}

export function notesMessages(teacher: string, style: string, plan: Plan | null, attendees: Student[], raw: string): Message[] {
  return [
    {
      role: "system",
      content: `You turn ${teacher}'s quick after-class notes into per-student progress log entries and warm, short follow-up emails written in her voice. ${style}
Only create entries for students named in the notes, and only use the exact student names from the attendee list. Never invent details the notes do not state.
Each follow-up email is 2 to 4 sentences, signed ${teacher}, with no medical advice beyond what she wrote.`,
    },
    {
      role: "user",
      content: `Attendees: ${attendees.map((s) => s.name).join(", ")}\n${plan ? `Today's theme: ${plan.theme}\n` : ""}Notes:\n${raw}`,
    },
  ];
}

export function newsletterMessages(teacher: string, style: string, notes: string[]): Message[] {
  return [
    {
      role: "system",
      content: `You write the weekly newsletter for ${teacher}'s yoga studio. ${style}
Friendly and short (150 to 250 words): what the week's classes explored, one pose or breath practice to try at home, and an invitation to join a class.
Never mention any student by name or any health detail. Sign off as ${teacher}.`,
    },
    { role: "user", content: `This week's class notes:\n${notes.join("\n---\n")}` },
  ];
}
