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

// Asks the model for JSON that matches `schema`. Ollama enforces the schema while decoding.
export async function chatJson<T>(
  baseUrl: string,
  model: string,
  messages: Message[],
  schema: object,
): Promise<T> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      format: schema,
      stream: false,
      think: false,
      options: { temperature: 0.4 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama answered ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { message: { content: string } };
  return JSON.parse(body.message.content) as T;
}
