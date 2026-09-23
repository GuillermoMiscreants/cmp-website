# Cyber Marketing Practice

Marketing site with a Sanity Studio. Published pages are built statically by Astro. Drafts are previewed through the Studio Presentation tool against on-demand Astro routes.

The site front end started from the Miscreants Astro starter (Tailwind v4, design tokens, component docs). Page content now comes from Sanity, not from files in `src/pages`.

## Layout

```
web/       Astro 7 site (Cloudflare adapter, Tailwind v4)
studio/    Sanity Studio (structure, schema, Presentation, Vision)
```

| App | Local URL | Role |
|---|---|---|
| `web` | http://localhost:4321 | Public site and preview routes |
| `studio` | http://localhost:3333 | Content editing |

Sanity project `66h6oo6f`, dataset `production`. Those ids are set in `studio/sanity.config.ts` and `studio/sanity.cli.ts`. The site reads the same project from `web/.env`.

## Requirements

- Node.js `>= 22.12.0` (required by `web`)
- A Sanity account with access to the project above

There is no root `package.json`. Install and run each app from its own directory.

## Setup

```sh
cp web/.env.example web/.env
cp studio/.env.example studio/.env
```

`web/.env`:

| Variable | Used for |
|---|---|
| `PUBLIC_SANITY_PROJECT_ID` | Sanity project id (`66h6oo6f`) |
| `PUBLIC_SANITY_DATASET` | Dataset (`production`) |
| `PUBLIC_SANITY_STUDIO_URL` | Studio origin. Local default is `http://localhost:3333` |
| `SANITY_API_READ_TOKEN` | Viewer token. Required for draft preview |
| `SANITY_API_WRITE_TOKEN` | Write token. Used only by `npm run seed` |

Create tokens at [sanity.io/manage](https://www.sanity.io/manage). Copy `SANITY_API_READ_TOKEN` into `web/.dev.vars` as well so the local Cloudflare preview worker can read it.

`studio/.env`:

| Variable | Used for |
|---|---|
| `SANITY_STUDIO_PREVIEW_ORIGIN` | Astro origin loaded in the Presentation iframe. Local default is `http://127.0.0.1:4321` |

Then:

```sh
cd web && npm install
cd ../studio && npm install
```

## Run locally

Use two terminals.

```sh
# site
cd web && npm run dev
```

```sh
# studio
cd studio && npm run dev
```

Published pages are generated at build time:

- `/` is the page whose slug is `home`
- `/{slug}` is every other published page

Until a `home` page is published, `/` shows an empty state.

### Preview

Open a page in Studio and use Presentation. The tool loads `SANITY_STUDIO_PREVIEW_ORIGIN` and turns preview on through `/api/preview/enable`. Draft routes are `/preview` (home) and `/preview/{slug}`. Exit preview with `/api/preview/disable`.

Preview needs `SANITY_API_READ_TOKEN`. Published builds do not: they query the public API with the `published` perspective and the CDN.

### Seed

From `web`, `npm run seed` writes a starter page into the dataset. It uses `SANITY_API_WRITE_TOKEN`, or the Sanity CLI login in `~/.config/sanity/config.json` if that token is unset.

## Content model

Editors work in Studio. Visual choices are named variants (width, background, spacing, alignment, button style). There is no free-form padding, color, or font field.

**Documents**

- `page` — title, slug, SEO, and a stack of sections. Slug `home` is the site root. A page may contain one H1.
- `siteSettings` — singleton: site title, logo, navigation, footer tagline, and copyright.

**Sections**

- `section` — open container. Content is a stack of components, optionally split into columns.
- Presets (`heroCentered`, `heroSplit`, `textCta`, `featureGrid`, `iconStats`, `ctaBand`) insert a section that is already filled in. The preset is not stored as its own type.
- Sealed sections (`logoMarquee`, `faq`) have their own fields and do not accept a free component stack.

**Components inside a section**

Text: eyebrow, heading, rich text. Actions: button group. Media: image, video. Layout: spacer, divider, card grid, columns. A card grid holds cards only. Columns cannot nest another columns block or a card grid.

Schema lives in `studio/schemaTypes`. The matching Astro components live in `web/src/components/blocks`. GROQ queries are in `web/src/lib/sanity/queries.ts`.

How to edit a page in Studio: [`web/docs/editing-pages.md`](web/docs/editing-pages.md).

## Commands

From `web`:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 4321 |
| `npm run build` | Production build to `web/dist/` |
| `npm run preview` | Serve the production build |
| `npm run check` | Typecheck, docs check, and production build |
| `npm run seed` | Write starter content to Sanity |

From `studio`:

| Command | What it does |
|---|---|
| `npm run dev` | Studio on port 3333 |
| `npm run build` | Build the Studio |
| `npm run deploy` | Deploy the hosted Studio |
| `npm run typegen` | Extract the schema and write `web/sanity.types.ts` |

Run `npm run typegen` in `studio` after a schema change so the site types stay in sync. Typegen is configured in `studio/sanity.cli.ts` to scan `web/src`.

## Site identity and hosting

Brand name, production URL, default description, and social image are in `web/src/data/site.ts`. `astro.config.mjs` reads `site.url` from that file for canonical URLs, Open Graph, JSON-LD, and the sitemap. The file still uses the `example.com` placeholder; set the real origin before launch.

The Astro config uses `output: 'static'` plus the Cloudflare adapter so published pages stay static while `/preview` and `/api/preview` stay on demand. `web/wrangler.jsonc` serves `dist/` as static assets.

Dev-only routes (`/components`, `/styleguide`, `/tve-preview`) are injected only by `astro dev`, or by a build with `SHOW_DEMOS=true`. They are excluded from the sitemap and do not ship in a normal production build.

## Further docs

The starter’s rulebook still applies to components, tokens, SEO, and deployment:

- [`web/README.md`](web/README.md) — starter quickstart
- [`web/docs/workflow.md`](web/docs/workflow.md) — which docs to read for a given task
- [`web/docs/editing-pages.md`](web/docs/editing-pages.md) — Studio editing
- [`web/DESIGN.md`](web/DESIGN.md) — brand values
