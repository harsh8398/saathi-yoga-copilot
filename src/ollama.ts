export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function listModels(baseUrl: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/tags`);
  if (!res.ok) throw new Error(`Ollama answered ${res.status}`);
  const body = (await res.json()) as { models: { name: string }[] };
  return body.models.map((m) => m.name);
}

interface ChatOptions<T> {
  signal?: AbortSignal;
  onPartial?: (partial: Partial<T>) => void;
}

// Asks the model for JSON that matches `schema`. Ollama enforces the schema while decoding.
// The reply streams in, and onPartial gets the best parse of the JSON written so far.
export async function chatJson<T>(
  baseUrl: string,
  model: string,
  messages: Message[],
  schema: object,
  { signal, onPartial }: ChatOptions<T> = {},
): Promise<T> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      format: schema,
      stream: true,
      think: false,
      options: { temperature: 0.4 },
    }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Ollama answered ${res.status}: ${await res.text()}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines.filter(Boolean)) {
      text += (JSON.parse(line) as { message?: { content: string } }).message?.content ?? "";
    }
    const partial = parsePartialJson<T>(text);
    if (partial) onPartial?.(partial);
  }
  return JSON.parse(text) as T;
}

// Closes any open string, array or object so half-written JSON can be shown as it arrives.
// If the tail is unfinished (a dangling key or comma), it backs up to the last complete value.
export function parsePartialJson<T>(text: string): Partial<T> | null {
  for (let end = text.length; end > 0; end--) {
    const head = text.slice(0, end);
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    for (const ch of head) {
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    try {
      return JSON.parse(head + (inString ? '"' : "") + stack.reverse().join(""));
    } catch {
      // Back up one character and try again.
    }
  }
  return null;
}
