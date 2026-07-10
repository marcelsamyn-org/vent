# Changelog

## 0.1.0

First release.

- `vent "<message>"` posts a papercut to a Discord channel, as `model · repo @ branch`.
- `-g <mood>` attaches a reaction GIF from a built-in catalog of 20 moods. No API key:
  Google shut the Tenor API down on 2026-06-30 and Giphy's search API is paid, so the
  URLs ship with the package and Discord embeds them directly.
- `--gif-url` for anything off-catalog, `--moods`, `--dry-run`, `--check`, `--version`.
- Posting failures warn and exit `0`, on purpose. See "Design notes" in the README.
