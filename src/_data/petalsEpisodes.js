const fs = require("fs");
const path = require("path");

const FEED_URL = "https://pinecast.com/feed/petals";
const CACHE_DIR = path.join(__dirname, "..", "..", ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "petals-episodes.json");
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const FALLBACK_FILE = path.join(__dirname, "petalsEpisodes.fallback.json");

function decodeHtmlEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractTagContent(xml = "", tag) {
  if (!tag) {
    return "";
  }

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);

  if (!match) {
    return "";
  }

  return decodeHtmlEntities(match[1] || "");
}

function extractAttribute(xml = "", tag, attribute) {
  if (!tag || !attribute) {
    return "";
  }

  const regex = new RegExp(`<${tag}[^>]*${attribute}="([^"]+)"[^>]*?>`, "i");
  const match = xml.match(regex);

  if (!match) {
    return "";
  }

  return decodeHtmlEntities(match[1] || "");
}

function parseEpisodesFromFeed(xml = "") {
  if (!xml) {
    return [];
  }

  const defaultArtwork =
    extractAttribute(xml, "itunes:image", "href") || extractTagContent(xml, "url");

  const items = [];
  const itemRegex = /<item[\s>][\s\S]*?<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml))) {
    const itemXml = match[0];
    const title = extractTagContent(itemXml, "title") || "Untitled Episode";
    const link = extractTagContent(itemXml, "link");
    const guid = extractTagContent(itemXml, "guid");
    const releaseDate = extractTagContent(itemXml, "pubDate");
    const description = extractTagContent(itemXml, "description");
    const artwork =
      extractAttribute(itemXml, "itunes:image", "href") ||
      extractTagContent(itemXml, "itunes:image") ||
      defaultArtwork ||
      null;
    const enclosure = extractAttribute(itemXml, "enclosure", "url");

    const query = encodeURIComponent(`${title} PETALS Podcast`);

    items.push({
      id: guid || link || title,
      title,
      artwork,
      releaseDate,
      description,
      links: {
        rss: link || enclosure || FEED_URL,
        apple: `https://podcasts.apple.com/us/podcast/petals/id1698197915`,
        spotify: `https://open.spotify.com/search/${query}`,
        youtube: `https://www.youtube.com/results?search_query=${query}`,
      },
    });
  }

  return items;
}

async function fetchEpisodes() {
  const response = await fetch(FEED_URL);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const xml = await response.text();
  return parseEpisodesFromFeed(xml).slice(0, 10);
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

function readFallback() {
  if (!fs.existsSync(FALLBACK_FILE)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(FALLBACK_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read fallback PETALS episodes", error);
  }

  return [];
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
    console.warn("Failed to fetch PETALS episodes", error);
    const fallback = readCache();

    if (fallback.length > 0) {
      return fallback;
    }

    const fallbackData = readFallback();

    if (fallbackData.length > 0) {
      writeCache(fallbackData);
      return fallbackData;
    }

    return [];
  }
};
