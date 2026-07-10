/**
 * Posting a vent to a Discord incoming webhook. Aliases: publish, send, channel post.
 */
const MAX_CONTENT_LENGTH = 2_000;
const TIMEOUT_MS = 8_000;

export type VentPayload = {
  readonly username: string;
  readonly content: string;
};

/** Discord truncates nothing — it 400s. Trim the message, never the GIF link. */
export function composeContent(message: string, gifUrl: string | null): string {
  const trailer = gifUrl === null ? "" : `\n\n${gifUrl}`;
  const room = MAX_CONTENT_LENGTH - trailer.length;
  const body = message.trim();
  const trimmed = body.length > room ? `${body.slice(0, room - 1)}…` : body;
  return `${trimmed}${trailer}`;
}

async function send(webhookUrl: string, payload: VentPayload): Promise<Response> {
  return fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // A vent quoting a log line must never be able to ping a human.
    body: JSON.stringify({ ...payload, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function postVent(webhookUrl: string, payload: VentPayload): Promise<void> {
  let response = await send(webhookUrl, payload);

  if (response.status === 429) {
    const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "1");
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfterSeconds, 5) * 1_000));
    response = await send(webhookUrl, payload);
  }

  if (!response.ok) {
    throw new Error(`Discord rejected the vent: ${response.status} ${await response.text()}`);
  }
}
