/**
 * The installed version, read from the shipped package.json. Aliases: --version, semver.
 *
 * Resolved relative to this module rather than cwd, so it is correct whether `vent` runs
 * from `dist/`, from source under bun, or from a global install.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";

const packageSchema = z.object({ version: z.string() });

export function readVersion(): string {
  const raw = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  return packageSchema.parse(JSON.parse(raw)).version;
}
