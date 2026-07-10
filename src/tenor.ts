/**
 * GIF lookup via Tenor v2. Aliases: reaction gif, giphy, emotional support.
 *
 * Returns a tenor.com link rather than a raw .gif, because Discord renders that
 * as a playing GIF card. Needs a Google API key with the Tenor API enabled.
 */
import { z } from "zod";

const SEARCH_ENDPOINT = "https://tenor.googleapis.com/v2/search";
const RESULT_POOL = 10;
const TIMEOUT_MS = 5_000;

const searchResponseSchema = z.object({
  results: z.array(
    z.object({
      itemurl: z.url().optional(),
      url: z.url().optional(),
      media_formats: z.object({ gif: z.object({ url: z.url() }) }).partial().optional(),
    }),
  ),
});

type SearchResult = z.infer<typeof searchResponseSchema>["results"][number];

function bestLink(result: SearchResult): string | undefined {
  return result.itemurl ?? result.media_formats?.gif?.url ?? result.url;
}

/** Throws on network or API failure; the caller decides whether a missing GIF is fatal (it isn't). */
export async function findGif(query: string, apiKey: string): Promise<string | null> {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("client_key", "vent");
  url.searchParams.set("limit", String(RESULT_POOL));
  url.searchParams.set("media_filter", "gif");
  url.searchParams.set("contentfilter", "medium");
  url.searchParams.set("random", "true");

  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Tenor search failed: ${response.status} ${await response.text()}`);
  }

  const { results } = searchResponseSchema.parse(await response.json());
  const links = results.map(bestLink).filter((link): link is string => link !== undefined);
  if (links.length === 0) return null;

  return links[Math.floor(Math.random() * links.length)] ?? null;
}
