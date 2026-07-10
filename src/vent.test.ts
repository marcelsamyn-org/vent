import { describe, expect, mock, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveConfig } from "./config.js";
import { composeContent, postVent } from "./discord.js";
import { buildUsername } from "./identity.js";

const WEBHOOK = "https://discord.com/api/webhooks/123/abc";

/** A real repo with a real linked worktree, because that is where the naming broke. */
function withRepoAndWorktree(run: (paths: { repo: string; worktree: string }) => void): void {
  const scratch = mkdtempSync(join(tmpdir(), "vent-test-"));
  const repo = join(scratch, "petals");
  const worktree = join(scratch, "elated-thompson-5ae1cc");
  const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, stdio: "ignore" });
  try {
    execFileSync("git", ["init", "-q", "-b", "main", repo], { stdio: "ignore" });
    git(repo, "config", "user.email", "vent@test.local");
    git(repo, "config", "user.name", "vent");
    git(repo, "commit", "-q", "--allow-empty", "-m", "root");
    git(repo, "worktree", "add", "-q", "-b", "claude/venting-tool", worktree);
    run({ repo, worktree });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

describe("resolveConfig", () => {
  test("env wins over an absent config file", () => {
    const result = resolveConfig({ VENT_WEBHOOK_URL: WEBHOOK });
    expect(result).toEqual({ ok: true, config: { webhookUrl: WEBHOOK, tenorApiKey: null } });
  });

  test("refuses a webhook that is not Discord", () => {
    const result = resolveConfig({ VENT_WEBHOOK_URL: "https://evil.example/api/webhooks/1/2" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("evil.example");
  });

  test("reports missing configuration instead of throwing", () => {
    const result = resolveConfig({});
    expect(result.ok).toBe(false);
  });

  test("falls back through the Tenor key aliases", () => {
    const result = resolveConfig({ VENT_WEBHOOK_URL: WEBHOOK, GOOGLE_API_KEY: "goog" });
    expect(result.ok === true && result.config.tenorApiKey).toBe("goog");
  });

  test("treats a blank env var as unset", () => {
    const result = resolveConfig({ VENT_WEBHOOK_URL: WEBHOOK, VENT_TENOR_KEY: "  " });
    expect(result.ok === true && result.config.tenorApiKey).toBe(null);
  });
});

describe("composeContent", () => {
  test("keeps the GIF link and trims the message when over 2000 chars", () => {
    const gif = "https://tenor.com/view/x";
    const content = composeContent("a".repeat(2_500), gif);
    expect(content.length).toBeLessThanOrEqual(2_000);
    expect(content.endsWith(`…\n\n${gif}`)).toBe(true);
  });

  test("posts a bare message unchanged", () => {
    expect(composeContent("  the cache lied  ", null)).toBe("the cache lied");
  });
});

describe("buildUsername", () => {
  test("names the repo from a normal checkout", () => {
    withRepoAndWorktree(({ repo }) => {
      expect(buildUsername("opus-4.8", repo)).toBe("opus-4.8 · petals");
    });
  });

  test("names the repo and branch from a linked worktree, not the worktree directory", () => {
    withRepoAndWorktree(({ worktree }) => {
      expect(buildUsername("opus-4.8", worktree)).toBe("opus-4.8 · petals @ claude/venting-tool");
    });
  });

  test("falls back to the directory outside a repo", () => {
    expect(buildUsername(undefined, tmpdir())).toMatch(/^some agent · /);
  });

  test("censors names Discord rejects", () => {
    expect(buildUsername("clyde-the-discord-bot", "/nonexistent-dir-xyz")).toBe("█-the-█-bot · nonexistent-dir-xyz");
  });

  test("stays inside Discord's 80-character username limit", () => {
    expect(buildUsername("m".repeat(200), "/tmp").length).toBe(80);
  });
});

describe("postVent", () => {
  test("posts JSON with mentions disabled", async () => {
    const fetchMock = mock(async () => new Response("", { status: 204 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await postVent(WEBHOOK, { username: "opus · vent", content: "@everyone the build is red" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(WEBHOOK);
    expect(JSON.parse(String(init.body))).toEqual({
      username: "opus · vent",
      content: "@everyone the build is red",
      allowed_mentions: { parse: [] },
    });
  });

  test("retries once when rate limited", async () => {
    let calls = 0;
    global.fetch = mock(async () => {
      calls += 1;
      return calls === 1
        ? new Response("", { status: 429, headers: { "retry-after": "0" } })
        : new Response("", { status: 204 });
    }) as unknown as typeof fetch;

    await postVent(WEBHOOK, { username: "u", content: "c" });
    expect(calls).toBe(2);
  });

  test("throws when Discord rejects the payload", async () => {
    global.fetch = mock(async () => new Response("bad username", { status: 400 })) as unknown as typeof fetch;
    expect(postVent(WEBHOOK, { username: "u", content: "c" })).rejects.toThrow("400");
  });
});
