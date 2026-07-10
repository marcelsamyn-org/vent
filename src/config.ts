/**
 * Config resolution for `vent`.
 *
 * Environment wins over the config file, so cloud sessions and one-off shells can
 * override without touching disk. Aliases: settings, credentials, webhook url, tenor key.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const CONFIG_PATH = join(homedir(), ".config", "vent", "config.json");

const configFileSchema = z.object({
  webhookUrl: z.url().optional(),
  tenorApiKey: z.string().min(1).optional(),
});

export type VentConfig = {
  readonly webhookUrl: string;
  readonly tenorApiKey: string | null;
};

export type ConfigResult =
  | { readonly ok: true; readonly config: VentConfig }
  | { readonly ok: false; readonly reason: string };

/** Discord is the only host we will ever POST a vent to. */
const ALLOWED_WEBHOOK_HOSTS = new Set(["discord.com", "discordapp.com", "ptb.discord.com", "canary.discord.com"]);

function readConfigFile(): z.infer<typeof configFileSchema> {
  let raw: string;
  try {
    raw = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return {};
  }
  return configFileSchema.parse(JSON.parse(raw));
}

function firstNonEmpty(...values: readonly (string | undefined)[]): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== "");
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
  const file = readConfigFile();

  const webhookUrl = firstNonEmpty(env["VENT_WEBHOOK_URL"], file.webhookUrl);
  if (webhookUrl === undefined) {
    return {
      ok: false,
      reason: `no webhook configured. Set VENT_WEBHOOK_URL, or write {"webhookUrl": "..."} to ${CONFIG_PATH}`,
    };
  }

  const hostProblem = checkWebhookHost(webhookUrl);
  if (hostProblem !== null) return { ok: false, reason: hostProblem };

  const tenorApiKey = firstNonEmpty(
    env["VENT_TENOR_KEY"],
    env["TENOR_API_KEY"],
    env["GOOGLE_API_KEY"],
    file.tenorApiKey,
  );

  return { ok: true, config: { webhookUrl, tenorApiKey: tenorApiKey ?? null } };
}
