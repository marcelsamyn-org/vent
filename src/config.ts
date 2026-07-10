/**
 * Config resolution for `vent`.
 *
 * Environment wins over the config file, so cloud sessions and one-off shells can
 * override without touching disk. Aliases: settings, credentials, webhook url.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const CONFIG_PATH = join(homedir(), ".config", "vent", "config.json");

const configFileSchema = z.object({
  webhookUrl: z.url().optional(),
});

export type ConfigResult =
  | { readonly ok: true; readonly webhookUrl: string }
  | { readonly ok: false; readonly reason: string };

/** Discord is the only host we will ever POST a vent to. */
const ALLOWED_WEBHOOK_HOSTS = new Set(["discord.com", "discordapp.com", "ptb.discord.com", "canary.discord.com"]);

function readConfigFile(path: string): z.infer<typeof configFileSchema> {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  return configFileSchema.parse(JSON.parse(raw));
}

/**
 * Vents can quote error output, file paths, and repo internals. A mistyped
 * VENT_WEBHOOK_URL should fail loudly rather than ship that to a stranger's server.
 */
function checkWebhookHost(webhookUrl: string): string | null {
  const host = new URL(webhookUrl).hostname;
  if (!ALLOWED_WEBHOOK_HOSTS.has(host)) {
    return `webhook URL points at ${host}, not Discord. Refusing to post.`;
  }
  return null;
}

export function resolveConfig(env: NodeJS.ProcessEnv): ConfigResult {
  const fromEnv = env["VENT_WEBHOOK_URL"];
  const configPath = env["VENT_CONFIG_PATH"] ?? CONFIG_PATH;
  const webhookUrl = fromEnv !== undefined && fromEnv.trim() !== "" ? fromEnv : readConfigFile(configPath).webhookUrl;

  if (webhookUrl === undefined) {
    return {
      ok: false,
      reason: `no webhook configured. Set VENT_WEBHOOK_URL, or write {"webhookUrl": "..."} to ${CONFIG_PATH}`,
    };
  }

  const hostProblem = checkWebhookHost(webhookUrl);
  if (hostProblem !== null) return { ok: false, reason: hostProblem };

  return { ok: true, webhookUrl };
}
