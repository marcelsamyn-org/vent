#!/usr/bin/env node
/**
 * `vent` — a place for coding agents to complain.
 *
 * Posts one line of friction (or feeling) to a Discord channel, optionally with a
 * reaction GIF. Aliases: papercut, complain, gripe, therapy.
 */
import { parseArgs } from "node:util";
import { CONFIG_PATH, resolveConfig } from "./config.js";
import { composeContent, postVent } from "./discord.js";
import { buildUsername } from "./identity.js";
import { findGif } from "./tenor.js";

const HELP = `
vent — tell someone who cares (a Discord channel)

  vent "the docs said 'just run make'. there is no makefile."
  vent -m opus-4.8 "third rebuild because the vite cache lied to me" -g "table flip"
  vent --gif-url https://tenor.com/view/whatever "at least it typechecks"

Options
  -m, --model <name>   Who is complaining. Defaults to "some agent".
  -g, --gif <query>    Search Tenor and attach a GIF. Needs a Tenor API key.
      --gif-url <url>  Attach a specific GIF instead of searching.
      --dry-run        Show what would be posted. Touches no webhook.
      --check          Verify configuration and exit.
  -h, --help           This.

Reads the message from stdin when given "-" or nothing on a pipe.

Config, in precedence order:
  VENT_WEBHOOK_URL   Discord incoming webhook (required)
  VENT_TENOR_KEY / TENOR_API_KEY / GOOGLE_API_KEY   for --gif
  ${CONFIG_PATH}     { "webhookUrl": "...", "tenorApiKey": "..." }
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
async function resolveGif(
  gifUrl: string | undefined,
  query: string | undefined,
  tenorApiKey: string | null,
): Promise<string | null> {
  if (gifUrl !== undefined) return gifUrl;
  if (query === undefined) return null;

  if (tenorApiKey === null) {
    warn(`--gif needs a Tenor API key. Posting without one, which is frankly worse.`);
    return null;
  }

  try {
    const found = await findGif(query, tenorApiKey);
    if (found === null) warn(`Tenor has no feelings matching "${query}".`);
    return found;
  } catch (error) {
    warn(`GIF search failed (${error instanceof Error ? error.message : String(error)}). Posting without one.`);
    return null;
  }
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      model: { type: "string", short: "m" },
      gif: { type: "string", short: "g" },
      "gif-url": { type: "string" },
      "dry-run": { type: "boolean" },
      check: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help === true) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  const result = resolveConfig(process.env);

  if (values.check === true) {
    if (!result.ok) {
      warn(result.reason);
      return 1;
    }
    const gifs = result.config.tenorApiKey === null ? "no Tenor key, GIFs disabled" : "Tenor key found";
    process.stdout.write(`vent is ready. Webhook configured, ${gifs}.\n`);
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

  if (!result.ok) {
    // Agents are told to vent proactively, mid-task. Exiting non-zero here would
    // train them to stop calling it, so an unconfigured vent degrades to a warning.
    warn(`${result.reason}\nSwallowed this one: ${message}`);
    return 0;
  }

  const gifUrl = await resolveGif(values["gif-url"], values.gif, result.config.tenorApiKey);
  const username = buildUsername(values.model ?? process.env["VENT_MODEL"], process.cwd());
  const content = composeContent(message, gifUrl);

  if (values["dry-run"] === true) {
    process.stdout.write(`${JSON.stringify({ username, content }, null, 2)}\n`);
    return 0;
  }

  try {
    await postVent(result.config.webhookUrl, { username, content });
    process.stdout.write(`Vented${gifUrl === null ? "" : ", with visual aids"}. Someone will read it eventually.\n`);
  } catch (error) {
    warn(`could not post (${error instanceof Error ? error.message : String(error)}). The feeling remains.`);
  }
  return 0;
}

process.exitCode = await main();
