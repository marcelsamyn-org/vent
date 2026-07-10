/**
 * Mood → GIF resolution against the built-in catalog. Aliases: reaction gif, emotional support.
 *
 * No API key, no network, no provider. Google shut the Tenor API down on 2026-06-30 and
 * Giphy's search API is paid; the media CDNs stayed free, so `vent` ships the URLs instead
 * of looking them up. For anything off-catalog, `--gif-url` takes an explicit link.
 */
import { z } from "zod";
import { CATALOG, MOODS, type Mood } from "./catalog.js";

/** Colloquial ways an agent might name a mood it feels. */
const ALIASES: Record<string, Mood> = {
  again: "here-we-go-again",
  annoyed: "eye-roll",
  angry: "table-flip",
  anxious: "nervous",
  applause: "slow-clap",
  bonk: "head-desk",
  burning: "this-is-fine",
  clap: "slow-clap",
  defeated: "despair",
  "deja-vu": "groundhog-day",
  done: "exhausted",
  doomed: "despair",
  doubt: "side-eye",
  dunno: "shrug",
  finally: "relief",
  fire: "this-is-fine",
  flip: "table-flip",
  forever: "waiting",
  garbage: "dumpster-fire",
  hopeless: "despair",
  idk: "shrug",
  keyboard: "head-desk",
  loop: "groundhog-day",
  math: "confused",
  quit: "rage-quit",
  rage: "table-flip",
  repeat: "groundhog-day",
  sarcastic: "slow-clap",
  scream: "screaming",
  shocked: "it-works",
  sigh: "exhausted",
  sleepy: "exhausted",
  smash: "rage-quit",
  success: "relief",
  surprised: "it-works",
  suspicious: "side-eye",
  sweat: "nervous",
  tired: "exhausted",
  trash: "dumpster-fire",
  ugh: "facepalm",
  victory: "relief",
  wait: "waiting",
  whatever: "shrug",
  works: "it-works",
  wow: "it-works",
  wtf: "confused",
};

function slugify(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isMood(value: string): value is Mood {
  return value in CATALOG;
}

/**
 * Containment on a very short query is a coin toss — "a" is a substring of "despair".
 * Exact moods and aliases still match at any length.
 */
const MIN_CONTAINMENT_LENGTH = 3;

/** Exact mood, then alias, then a loose containment match. Null when nothing fits. */
export function resolveMood(query: string): Mood | null {
  const slug = slugify(query);
  if (slug === "") return null;
  if (isMood(slug)) return slug;

  const alias = ALIASES[slug];
  if (alias !== undefined) return alias;

  if (slug.length < MIN_CONTAINMENT_LENGTH) return null;
  return MOODS.find((mood) => mood.includes(slug) || slug.includes(mood)) ?? null;
}

export function pickGif(mood: Mood): string {
  const options = CATALOG[mood];
  return options[Math.floor(Math.random() * options.length)] ?? options[0];
}

/**
 * `--gif-url` is the one place a caller hands us a URL. Discord only embeds https,
 * and a typo'd flag should degrade to a GIF-less vent rather than post the typo.
 */
export function isEmbeddableUrl(candidate: string): boolean {
  if (!z.url().safeParse(candidate).success) return false;
  return new URL(candidate).protocol === "https:";
}
