// 11ty Plugins
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const eleventySass = require("@11tyrocks/eleventy-plugin-sass-lightningcss");

// Helper packages
const slugify = require("slugify");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const fs = require('fs');

const escapeHtml = (unsafe = "") =>
  String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(eleventySass);

  eleventyConfig.addPassthroughCopy("./src/fonts");
  eleventyConfig.addPassthroughCopy("./src/img");
  eleventyConfig.addPassthroughCopy("./src/favicon.png");

  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  eleventyConfig.addShortcode("petalsEpisodes", (episodes = []) => {
    const formatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

    if (!Array.isArray(episodes) || episodes.length === 0) {
      return `
        <section class="petals-episodes">
          <h2 class="petals-episodes__title">Latest Episodes</h2>
          <p class="petals-episodes__empty">Episodes will be published soon. Check back for updates!</p>
        </section>
      `;
    }

    const renderLinks = (links = {}) => {
      const entries = [
        { key: "spotify", label: "Spotify" },
        { key: "youtube", label: "YouTube" },
        { key: "apple", label: "Apple Podcasts" },
      ];

      return entries
        .filter((entry) => links[entry.key])
        .map(
          (entry) => `
            <a class="petals-episodes__link" href="${links[entry.key]}" target="_blank" rel="noopener noreferrer">
              ${entry.label}
            </a>
          `
        )
        .join("");
    };

    const items = episodes
      .slice(0, 12)
      .map((episode) => {
        const title = escapeHtml(episode.title || "Untitled Episode");
        const artwork = episode.artwork
          ? `<img class="petals-episodes__art" src="${episode.artwork}" alt="Artwork for ${title}" loading="lazy" />`
          : "";
        const date = episode.releaseDate ? new Date(episode.releaseDate) : null;
        const formattedDate = date && !Number.isNaN(date.valueOf()) ? formatter.format(date) : "";

        return `
          <li class="petals-episodes__item">
            <article class="petals-episodes__card">
              ${artwork}
              <div class="petals-episodes__content">
                <h3 class="petals-episodes__name">${title}</h3>
                ${formattedDate ? `<p class="petals-episodes__date">${formattedDate}</p>` : ""}
                <div class="petals-episodes__actions">
                  ${renderLinks(episode.links)}
                </div>
              </div>
            </article>
          </li>
        `;
      })
      .join("");

    return `
      <section class="petals-episodes">
        <h2 class="petals-episodes__title">Latest Episodes</h2>
        <ul class="petals-episodes__list">
          ${items}
        </ul>
      </section>
    `;
  });

  /* Markdown Overrides */
  let markdownLibrary = markdownIt({
    html: true,
  }).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.ariaHidden({
      class: "tdbc-anchor",
      space: false,
    }),
    level: [1, 2, 3],
    slugify: (str) =>
      slugify(str, {
        lower: true,
        strict: true,
        remove: /["]/g,
      }),
  });
  eleventyConfig.setLibrary("md", markdownLibrary);

  let getSvgContent = function (file) {
    let relativeFilePath = `./src/svg/${file}.svg`;
    let data = fs.readFileSync(relativeFilePath, 
    function(err, contents) {
       if (err) return err
       return contents
    });

    return data.toString('utf8');
  }
  eleventyConfig.addShortcode("svg", getSvgContent);

  return {
    dir: {
      input: "src",
      output: "public",
      layouts: "_layouts",
    },
  };
};
