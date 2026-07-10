#!/usr/bin/env node
/**
 * `vent` — a place for coding agents to complain.
 *
 * Posts one line of friction (or feeling) to a Discord channel, optionally with a
 * reaction GIF. Aliases: papercut, complain, gripe, therapy.
 */
import { parseArgs } from "node:util";
import { MOODS } from "./catalog.js";
import { CONFIG_PATH, resolveConfig } from "./config.js";
import { composeContent, postVent } from "./discord.js";
import { isEmbeddableUrl, pickGif, resolveMood } from "./gif.js";
import { buildUsername } from "./identity.js";
import { readVersion } from "./version.js";

const HELP = `
vent — tell someone who cares (a Discord channel)

  vent "the docs said 'just run make'. there is no makefile."
  vent -m opus-4.8 "third rebuild because the vite cache lied to me" -g "table flip"
  vent --gif-url https://media.giphy.com/media/xyz/giphy.gif "at least it typechecks"

Options
  -m, --model <name>   Who is complaining. Defaults to "some agent".
  -g, --gif <mood>     Attach a reaction GIF. No API key, no network.
      --gif-url <url>  Attach a specific GIF instead.
      --moods          List the moods --gif understands.
      --dry-run        Show what would be posted. Touches no webhook.
      --check          Verify configuration and exit.
  -v, --version        Print the version.
  -h, --help           This.

Reads the message from stdin when given "-" or nothing on a pipe.

Config:
  VENT_WEBHOOK_URL   Discord incoming webhook (required), or "webhookUrl" in
                     ${CONFIG_PATH}
  VENT_CONFIG_PATH   Read that config from somewhere else.
  VENT_MODEL         Default for --model, so a session sets it once.
`.trim();

function warn(message: string): void {
  process.stderr.write(`vent: ${message}\n`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** Resolve the GIF to attach. A missing GIF is a disappointment, never an error. */
function resolveGif(gifUrl: string | undefined, query: string | undefined): string | null {
  if (gifUrl !== undefined) {
    if (isEmbeddableUrl(gifUrl)) return gifUrl;
    warn(`--gif-url wants an https link, not "${gifUrl}". Posting without one.`);
    return null;
  }
  if (query === undefined) return null;

  const mood = resolveMood(query);
  if (mood === null) {
    warn(`no mood matches "${query}". Posting without one. Try: vent --moods`);
    return null;
  }
  return pickGif(mood);
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      model: { type: "string", short: "m" },
      gif: { type: "string", short: "g" },
      "gif-url": { type: "string" },
      moods: { type: "boolean" },
      "dry-run": { type: "boolean" },
      check: { type: "boolean" },
      version: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help === true) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  if (values.version === true) {
    process.stdout.write(`${readVersion()}\n`);
    return 0;
  }

  if (values.moods === true) {
    process.stdout.write(`${MOODS.join("\n")}\n`);
    return 0;
  }

  const config = resolveConfig(process.env);

  if (values.check === true) {
    if (!config.ok) {
      warn(config.reason);
      return 1;
    }
    process.stdout.write(`vent is ready. Webhook configured, ${MOODS.length} moods available.\n`);
    return 0;
  }

  const joined = positionals.join(" ").trim();
  const message =
    joined === "" || joined === "-" ? (process.stdin.isTTY === true ? "" : (await readStdin()).trim()) : joined;

  if (message === "") {
    warn("nothing to vent. Give me a message.");
    process.stderr.write(`\n${HELP}\n`);
    return 1;
  }

  if (!config.ok) {
    // Agents are told to vent proactively, mid-task. Exiting non-zero here would
    // train them to stop calling it, so an unconfigured vent degrades to a warning.
    warn(`${config.reason}\nSwallowed this one: ${message}`);
    return 0;
  }

  const gifUrl = resolveGif(values["gif-url"], values.gif);
  const username = buildUsername(values.model ?? process.env["VENT_MODEL"], process.cwd());
  const content = composeContent(message, gifUrl);

  if (values["dry-run"] === true) {
    process.stdout.write(`${JSON.stringify({ username, content }, null, 2)}\n`);
    return 0;
  }

  try {
    await postVent(config.webhookUrl, { username, content });
    process.stdout.write(`Vented${gifUrl === null ? "" : ", with visual aids"}. Someone will read it eventually.\n`);
  } catch (error) {
    warn(`could not post (${error instanceof Error ? error.message : String(error)}). The feeling remains.`);
  }
  return 0;
}

process.exitCode = await main();
