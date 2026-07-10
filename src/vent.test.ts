import { describe, expect, mock, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CATALOG, MOODS } from "./catalog.js";
import { resolveConfig } from "./config.js";
import { composeContent, postVent } from "./discord.js";
import { isEmbeddableUrl, pickGif, resolveMood } from "./gif.js";
import { buildUsername } from "./identity.js";
import { readVersion } from "./version.js";

const WEBHOOK = "https://discord.com/api/webhooks/123/abc";
/** Keep the developer's real ~/.config/vent/config.json out of these tests. */
const NO_CONFIG_FILE = { VENT_CONFIG_PATH: "/nonexistent/vent/config.json" };

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
  test("reads the webhook from the environment", () => {
    expect(resolveConfig({ ...NO_CONFIG_FILE, VENT_WEBHOOK_URL: WEBHOOK })).toEqual({ ok: true, webhookUrl: WEBHOOK });
  });

  test("refuses a webhook that is not Discord", () => {
    const result = resolveConfig({ ...NO_CONFIG_FILE, VENT_WEBHOOK_URL: "https://evil.example/api/webhooks/1/2" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("evil.example");
  });

  test("reports missing configuration instead of throwing", () => {
    expect(resolveConfig(NO_CONFIG_FILE).ok).toBe(false);
  });

  test("names the config path it actually looked at", () => {
    const result = resolveConfig({ VENT_CONFIG_PATH: "/somewhere/else.json" });
    expect(result.ok === false && result.reason).toContain("/somewhere/else.json");
  });

  test("an empty env var does not shadow the config file", () => {
    const result = resolveConfig({ VENT_CONFIG_PATH: "/nonexistent/x.json", VENT_WEBHOOK_URL: "  " });
    expect(result.ok).toBe(false);
  });
});

describe("resolveMood", () => {
  test("matches a mood exactly", () => {
    expect(resolveMood("table-flip")).toBe("table-flip");
  });

  test("normalizes spacing and case", () => {
    expect(resolveMood("Groundhog Day")).toBe("groundhog-day");
  });

  test("follows colloquial aliases", () => {
    expect(resolveMood("idk")).toBe("shrug");
    expect(resolveMood("finally")).toBe("relief");
    expect(resolveMood("fire")).toBe("this-is-fine");
  });

  test("aliases win over loose containment", () => {
    // "fire" is a substring of dumpster-fire, but the alias points somewhere better.
    expect(resolveMood("fire")).not.toBe("dumpster-fire");
  });

  test("falls back to containment", () => {
    expect(resolveMood("screaming internally")).toBe("screaming");
  });

  test("returns null rather than guessing", () => {
    expect(resolveMood("quarterly revenue synergy")).toBe(null);
    expect(resolveMood("   ")).toBe(null);
  });

  test("refuses to guess from a query too short to mean anything", () => {
    // "a" is a substring of "despair"; containment would have matched it.
    expect(resolveMood("a")).toBe(null);
    expect(resolveMood("xy")).toBe(null);
    // ...but a real 3-letter alias still resolves.
    expect(resolveMood("wtf")).toBe("confused");
  });
});

describe("isEmbeddableUrl", () => {
  test("accepts an https gif", () => {
    expect(isEmbeddableUrl("https://media.giphy.com/media/abc/giphy.gif")).toBe(true);
  });

  test("rejects http, junk, and shell mishaps", () => {
    expect(isEmbeddableUrl("http://media.giphy.com/media/abc/giphy.gif")).toBe(false);
    expect(isEmbeddableUrl("table flip")).toBe(false);
    expect(isEmbeddableUrl("")).toBe(false);
    expect(isEmbeddableUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("readVersion", () => {
  test("reports the version from the shipped package.json", () => {
    expect(readVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("catalog", () => {
  test("every mood has at least one GIF and every URL is a giphy gif", () => {
    const urls = MOODS.flatMap((mood) => CATALOG[mood]);
    expect(MOODS.length).toBeGreaterThan(0);
    for (const mood of MOODS) expect(CATALOG[mood].length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^https:\/\/media\.giphy\.com\/media\/[A-Za-z0-9]+\/giphy(-downsized)?\.gif$/);
  });

  test("no GIF is shared between moods", () => {
    const urls = MOODS.flatMap((mood) => CATALOG[mood]);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("pickGif always returns one of the mood's own GIFs", () => {
    for (const mood of MOODS) {
      for (let i = 0; i < 10; i++) expect(CATALOG[mood]).toContain(pickGif(mood));
    }
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
