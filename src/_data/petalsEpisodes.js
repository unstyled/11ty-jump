const fs = require("fs");
const path = require("path");

const LOOKUP_URL = "https://itunes.apple.com/lookup?id=1698197915&entity=podcastEpisode&limit=12";
const CACHE_DIR = path.join(__dirname, "..", "..", ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "petals-episodes.json");
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchEpisodes() {
  const response = await fetch(LOOKUP_URL);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];

  return results
    .filter((item) => item.wrapperType === "track" && item.kind === "podcast-episode")
    .map((item) => {
      const title = item.trackName || item.collectionName || "Untitled Episode";
      const releaseDate = item.releaseDate || item.releaseDateTime;
      const artwork = item.artworkUrl600 || item.artworkUrl160 || null;
      const appleUrl = item.trackViewUrl || item.collectionViewUrl || null;
      const query = encodeURIComponent(`${title} PETALS Podcast`);

      return {
        id: item.trackId || item.trackGuid || title,
        title,
        artwork,
        releaseDate,
        description: item.shortDescription || item.description || "",
        links: {
          apple: appleUrl,
          spotify: `https://open.spotify.com/search/${query}`,
          youtube: `https://www.youtube.com/results?search_query=${query}`,
        },
      };
    });
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function isCacheValid() {
  if (!fs.existsSync(CACHE_FILE)) {
    return false;
  }

  const stats = fs.statSync(CACHE_FILE);
  const age = Date.now() - stats.mtimeMs;

  return age < CACHE_TTL;
}

function readCache() {
  if (!fs.existsSync(CACHE_FILE)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read cached PETALS episodes", error);
  }

  return [];
}

function writeCache(data) {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to cache PETALS episodes", error);
  }
}

module.exports = async function petalsEpisodes() {
  if (isCacheValid()) {
    return readCache();
  }

  try {
    const episodes = await fetchEpisodes();
    writeCache(episodes);
    return episodes;
  } catch (error) {
    console.error("Failed to fetch PETALS episodes", error);
    const fallback = readCache();

    if (fallback.length > 0) {
      return fallback;
    }

    return [];
  }
};
