/**
 * Curated reaction GIFs, keyed by mood. Aliases: gif catalog, reactions, moods.
 *
 * Hand-picked and eyeballed, not search results: the GIF has to land the joke, and a
 * live search returns whatever is trending. Every URL was verified to serve `image/gif`.
 * Giphy's media CDN needs no API key, which is the point — `vent` stays a one-secret tool.
 *
 * Regenerate/extend by hand. If a URL rots, `vent --moods` still works; the post just
 * arrives without a GIF.
 */
export const CATALOG = {
  "confused": [
    "https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif",
    "https://media.giphy.com/media/UeT0nnRnkuaUo/giphy.gif",
  ],
  "despair": [
    "https://media.giphy.com/media/VjLFDdU89O3DsWE4Eh/giphy.gif",
    "https://media.giphy.com/media/9GIi9JT9o9QKHtKa5L/giphy.gif",
    "https://media.giphy.com/media/mSy7n1k1qtjaq0Wse0/giphy.gif",
  ],
  "dumpster-fire": [
    "https://media.giphy.com/media/WpXzDUQdQUulVtL3Sb/giphy.gif",
    "https://media.giphy.com/media/l4Ki6oZ4oPrrgLl9m/giphy.gif",
  ],
  "exhausted": [
    "https://media.giphy.com/media/8eIxUE9loFwZ4yCgiR/giphy.gif",
    "https://media.giphy.com/media/lShKLinpI0mP0eQDz6/giphy.gif",
  ],
  "eye-roll": [
    "https://media.giphy.com/media/eSDrboInS8aniqjSUj/giphy.gif",
    "https://media.giphy.com/media/Rhhr8D5mKSX7O/giphy.gif",
    "https://media.giphy.com/media/dEdmW17JnZhiU/giphy.gif",
  ],
  "facepalm": [
    "https://media.giphy.com/media/XD4qHZpkyUFfq/giphy.gif",
    "https://media.giphy.com/media/6yRVg0HWzgS88/giphy.gif",
    "https://media.giphy.com/media/3xz2BLBOt13X9AgjEA/giphy.gif",
  ],
  "groundhog-day": [
    "https://media.giphy.com/media/3o7WIQ4FARJdpmUni8/giphy.gif",
    "https://media.giphy.com/media/hc10gBL10d3Ko/giphy.gif",
  ],
  "head-desk": [
    "https://media.giphy.com/media/xTiTnslZ0E5sqMbEac/giphy.gif",
    "https://media.giphy.com/media/3KQ4VNwCrOThC/giphy.gif",
  ],
  "here-we-go-again": [
    "https://media.giphy.com/media/LpkBAUDg53FI8xLmg1/giphy.gif",
    "https://media.giphy.com/media/3ogwGdlQ74uxPja6FW/giphy.gif",
    "https://media.giphy.com/media/3ohjUSWcOGDbpeUFJS/giphy.gif",
  ],
  "it-works": [
    "https://media.giphy.com/media/kV1IeE5OFr9PXFZbvx/giphy.gif",
    "https://media.giphy.com/media/l4EoUzvXmUR7jsUXC/giphy.gif",
    "https://media.giphy.com/media/TSXSPZUSW0Lr9mYm8h/giphy.gif",
  ],
  "nervous": [
    "https://media.giphy.com/media/ZbNpDvKr8TXz1zE8M4/giphy.gif",
    "https://media.giphy.com/media/4QgiErmjZiPESRcKYt/giphy.gif",
  ],
  "rage-quit": [
    "https://media.giphy.com/media/D3cVX2TvzDpQI/giphy.gif",
    "https://media.giphy.com/media/ZdUF8dtccD2qyQqSqA/giphy.gif",
  ],
  "relief": [
    "https://media.giphy.com/media/j0vs5H7Kcz3Pm9LRDa/giphy.gif",
    "https://media.giphy.com/media/QWjFSsvUPCUncq6ItU/giphy.gif",
    "https://media.giphy.com/media/jVStxzak9yk2Q/giphy.gif",
  ],
  "screaming": [
    "https://media.giphy.com/media/Az3pxYx0UoTpm/giphy.gif",
    "https://media.giphy.com/media/2UlW42qqNY9udwlOke/giphy.gif",
    "https://media.giphy.com/media/wrN7iynZfJqow/giphy.gif",
  ],
  "shrug": [
    "https://media.giphy.com/media/jPAdK8Nfzzwt2/giphy.gif",
    "https://media.giphy.com/media/aZaT1wRPYN805ewKxR/giphy.gif",
    "https://media.giphy.com/media/hX7Wzpf6VxSGkQ0TiO/giphy.gif",
  ],
  "side-eye": [
    "https://media.giphy.com/media/H5C8CevNMbpBqNqFjl/giphy.gif",
    "https://media.giphy.com/media/94K4bYAdH00A8ytta1/giphy.gif",
  ],
  "slow-clap": [
    "https://media.giphy.com/media/ISUlmF3lWYrKg/giphy.gif",
    "https://media.giphy.com/media/bb0Xwo6UoHTPy/giphy.gif",
  ],
  "table-flip": [
    "https://media.giphy.com/media/9fjB9Az2AfPnFp8fv4/giphy.gif",
    "https://media.giphy.com/media/1rSN0ECFMIKZQcGEYc/giphy.gif",
    "https://media.giphy.com/media/8PUuNcwsmSHle/giphy.gif",
  ],
  "this-is-fine": [
    "https://media.giphy.com/media/2UCt7zbmsLoCXybx6t/giphy.gif",
    "https://media.giphy.com/media/SSQLhVdloMMdQjMkmZ/giphy.gif",
    "https://media.giphy.com/media/F2gwWo2vLgRMhjLFs0/giphy.gif",
  ],
  "waiting": [
    "https://media.giphy.com/media/MdXEFEyU5NIvjDJ20W/giphy.gif",
    "https://media.giphy.com/media/OAlOpMbLp0jCzfq2az/giphy.gif",
    "https://media.giphy.com/media/ZbZaqMgYi4HXOWboq6/giphy.gif",
  ],
} as const satisfies Record<string, readonly [string, ...string[]]>;

export type Mood = keyof typeof CATALOG;

export const MOODS = Object.keys(CATALOG) as readonly Mood[];
