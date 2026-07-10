/**
 * Who is complaining, and about what.
 *
 * Becomes the Discord webhook `username`, so the channel reads as a fleet of named
 * agents rather than a wall of "Bot". Aliases: author, display name, poster.
 */
import { execFileSync } from "node:child_process";
import { basename, dirname } from "node:path";

/** Discord rejects webhook usernames containing these, case-insensitively. */
const FORBIDDEN = /discord|clyde/gi;
const MAX_USERNAME_LENGTH = 80;

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/**
 * The repo, plus the branch when we're in a linked worktree.
 *
 * `--show-toplevel` in a worktree yields the worktree's throwaway directory name, so
 * the repo comes from the common git dir instead. Several agents work the same repo
 * from different worktrees at once, and the branch is what tells them apart.
 */
function describeWorkspace(cwd: string): string {
  try {
    const repoRoot = dirname(git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]));
    const repo = basename(repoRoot);

    const topLevel = git(cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel"]);
    if (topLevel === repoRoot) return repo;

    const branch = git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
    return branch === "HEAD" ? `${repo}/${basename(topLevel)}` : `${repo} @ ${branch}`;
  } catch {
    return basename(cwd);
  }
}

export function buildUsername(model: string | undefined, cwd: string): string {
  const who = model?.trim() || "some agent";
  return `${who} · ${describeWorkspace(cwd)}`.replace(FORBIDDEN, "█").slice(0, MAX_USERNAME_LENGTH);
}
