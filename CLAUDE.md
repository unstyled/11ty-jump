# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Run 11ty with hot reload at localhost:8080
npm run build    # Production build
```

There are no tests or linting configured.

## Architecture

This is an [Eleventy (11ty)](https://11ty.dev) static site for **Unstyled**, a UK studio producing podcast content. It deploys to Netlify with `public/` as the output directory.

### Key configuration: `.eleventy.js`

- Input: `src/`, output: `public/`, layouts: `src/_layouts/`
- Plugins: syntax highlighting, RSS feed generation, Sass via lightningcss
- Custom shortcodes: `{% year %}`, `{% svg "filename" %}`, `{% petalsEpisodes episodes %}`
- Passthrough copy: `src/fonts/`, `src/img/`, `src/favicon.png`

### Content pages

Pages live in `src/pages/` as Markdown with frontmatter. Key frontmatter fields:
- `layout`: typically `page.njk`
- `permalink`: URL path
- `navigation`: label shown in site nav (omit to hide from nav)
- `backgroundColor`: sets a CSS custom property for page background color

### Podcast episode data (`src/_data/`)

Two data files fetch episodes from Pinecast RSS feeds at build time:
- `mlwEpisodes.js` → Make Life Work podcast (`pinecast.com/feed/make-life-work`)
- `petalsEpisodes.js` → PETALS podcast (`pinecast.com/feed/petals`)

Both follow the same pattern:
1. Check `.cache/` directory for a cached JSON file (1-hour TTL)
2. If stale/missing, fetch from Pinecast RSS, parse XML manually, cache result
3. On fetch failure, fall back to stale cache, then to `*.fallback.json` files in `src/_data/`

Episodes are rendered using the `{% petalsEpisodes episodes %}` shortcode defined in `.eleventy.js`. Both podcast pages use this same shortcode — `make-life-work.md` passes `mlwEpisodes` and `PETALS.md` passes `petalsEpisodes`.

### Layout chain

`base.njk` → wraps everything with `<html>`, Google Analytics, meta tags, footer
`page.njk` → extends `base.njk`, adds hero header with title/description and `<main>` content area

### Styling

Sass files in `src/css/` compiled by `@11tyrocks/eleventy-plugin-sass-lightningcss`. The main entry is `style.scss` which `@use`s all partials. CSS class naming convention uses `tdbc-` prefix (from the template origin) and feature-specific prefixes like `petals-episodes__`.

### Site metadata

Global site data lives in `src/_data/meta.js` — update `siteName`, `siteDescription`, `authorName`, and optionally `twitterUsername` here.

### Adding fallback episode data

If fetching from Pinecast fails and no cache exists, the data files look for:
- `src/_data/mlwEpisodes.fallback.json`
- `src/_data/petalsEpisodes.fallback.json`

These files don't currently exist but can be created with a JSON array of episode objects matching the shape: `{ id, title, artwork, releaseDate, description, links: { rss, apple, spotify, youtube } }`.
