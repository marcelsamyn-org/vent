"""Harvest CANDIDATE reaction GIFs from Giphy search pages, to refresh src/catalog.ts.

This proposes; a human disposes. The output is not the catalog — render the candidates and
look at them, because ranking on slug text is only a decent guess. In the run that produced
the shipped catalog, about a third of the top picks were wrong: the "it works" mood came
back with a GIF reading UHM. NO.

Three defences against garbage, learned the hard way:
  1. Bare-id links (no descriptive words in the slug) are page furniture, not results.
     Giphy's own mascot is a perfectly valid GIF that appears on every search page.
  2. An id appearing under many unrelated moods is trending/related chrome. Blacklist it.
  3. Concurrency makes Giphy serve a resultless shell. Fetch serially, with retries.
Every surviving URL is then verified to be a live image/gif under the size cap.

    python3 scripts/harvest-candidates.py > candidates.json

Then eyeball them before promoting anything into the catalog (ImageMagick):

    magick <gif>[0] -resize 150x150^ -extent 150x150 label:<mood> -append tile.png
    montage tile*.png -tile 8x7 sheet.png
"""

import json
import re
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"
MAX_BYTES = 6_000_000
PER_MOOD = 3
CHROME_THRESHOLD = 3

# mood -> (search query, extra keywords used only for ranking)
MOODS: dict[str, tuple[str, str]] = {
    "groundhog-day": ("groundhog day", "groundhog day again repeat loop"),
    "table-flip": ("table flip", "table flip rage angry frustrated"),
    "this-is-fine": ("this is fine fire", "this is fine dog fire burning"),
    "facepalm": ("facepalm", "facepalm face palm"),
    "confused": ("confused math lady", "confused math lady calculating"),
    "waiting": ("still waiting", "waiting skeleton still forever"),
    "eye-roll": ("eye roll", "eye roll rolling eyes annoyed"),
    "exhausted": ("exhausted tired", "exhausted tired sigh sleepy done"),
    "shrug": ("shrug", "shrug idk dont know whatever"),
    "despair": ("staring into the distance", "staring distance defeated despair"),
    "relief": ("finally", "finally relief celebration yes thank"),
    "side-eye": ("side eye", "side eye suspicious squint doubt"),
    "nervous": ("nervous sweating", "nervous sweating sweat anxious"),
    "rage-quit": ("rage quit", "rage quit computer smash keyboard"),
    "it-works": ("it actually works", "surprised shocked works actually wow"),
    "slow-clap": ("slow clap", "slow clap applause sarcastic clapping"),
    "head-desk": ("head desk", "head desk banging keyboard frustrated"),
    "dumpster-fire": ("dumpster fire", "dumpster fire trash garbage burning"),
    "screaming": ("screaming internally", "screaming internally scream aaah"),
    "here-we-go-again": ("here we go again", "again ugh sigh annoyed groan"),
}

SLUG_LINK = re.compile(r"giphy\.com/gifs/([A-Za-z0-9-]{7,})")
STOPWORDS = {"i", "is", "it", "we", "go", "the", "into", "dont", "this", "here", "again", "actually"}


def fetch_html(query: str, attempts: int = 4) -> str:
    url = f"https://giphy.com/search/{query.replace(' ', '-')}"
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(request, timeout=25) as response:
                html = response.read().decode("utf8", "replace")
            if len([s for s in SLUG_LINK.findall(html) if "-" in s]) >= 5:
                return html
            last = RuntimeError("resultless shell")
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            last = error
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"{query}: {last}")


def relevance(slug: str, keywords: str) -> int:
    words = {w for w in keywords.lower().split() if w not in STOPWORDS}
    lowered = slug.lower()
    return sum(1 for word in words if word in lowered)


def verify(gif_id: str) -> str | None:
    for variant in ("giphy.gif", "giphy-downsized.gif"):
        url = f"https://media.giphy.com/media/{gif_id}/{variant}"
        try:
            request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
            with urllib.request.urlopen(request, timeout=20) as response:
                if response.status != 200 or "image/gif" not in response.headers.get("content-type", ""):
                    continue
                size = int(response.headers.get("content-length", "0"))
                if 0 < size <= MAX_BYTES:
                    return url
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError):
            continue
    return None


collected: dict[str, list[tuple[str, str]]] = {}
for mood, (query, _) in MOODS.items():
    html = fetch_html(query)
    seen: dict[str, str] = {}
    for slug in SLUG_LINK.findall(html):
        if "-" not in slug:  # bare id => page furniture, never a ranked result
            continue
        gif_id = slug.split("-")[-1]
        if len(gif_id) >= 7 and gif_id not in seen:
            seen[gif_id] = slug
    collected[mood] = list(seen.items())
    print(f"  fetched {mood:18s} {len(seen):3d} descriptive candidates", file=sys.stderr)
    time.sleep(0.4)

appearances: dict[str, int] = defaultdict(int)
for candidates in collected.values():
    for gif_id, _ in candidates:
        appearances[gif_id] += 1
chrome = {gif_id for gif_id, count in appearances.items() if count >= CHROME_THRESHOLD}
print(f"\nblacklisted {len(chrome)} ids seen under >={CHROME_THRESHOLD} moods\n", file=sys.stderr)

catalog: dict[str, list[str]] = {}
for mood, candidates in MOODS.items() and sorted(collected.items()):
    keywords = MOODS[mood][1]
    ranked = sorted((c for c in candidates if c[0] not in chrome), key=lambda c: -relevance(c[1], keywords))
    urls: list[str] = []
    picked: list[str] = []
    for gif_id, slug in ranked:
        if len(urls) >= PER_MOOD:
            break
        url = verify(gif_id)
        if url is not None:
            urls.append(url)
            picked.append(slug)
    catalog[mood] = urls
    flag = "  " if len(urls) == PER_MOOD else "!!"
    print(f"{flag} {mood:18s} {len(urls)}/{PER_MOOD}  {picked[0][:56] if picked else '—'}", file=sys.stderr)

all_urls = [u for urls in catalog.values() for u in urls]
if len(all_urls) != len(set(all_urls)):
    print("\n!! duplicate URLs across moods", file=sys.stderr)
short = [m for m, u in catalog.items() if len(u) < PER_MOOD]
if short:
    print(f"\n!! under-filled: {short}", file=sys.stderr)

print(json.dumps(catalog, indent=2))
