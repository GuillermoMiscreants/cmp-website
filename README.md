# Cyber Marketing Practice

Marketing site with a Sanity Studio. Editors build pages in Studio and see them live in the Presentation tool. Visitors get a static site, rebuilt every time an editor publishes.

The front end started from the Miscreants Astro starter (Tailwind v4, design tokens, component docs). Page content comes from Sanity, not from files in `src/pages`.

## How it fits together

```
                     ┌──────────────────────────┐
  editors ─────────► │ Sanity Studio            │  hosted at sanity.io (studio/)
                     │ + Presentation tool      │
                     └───────┬──────────┬───────┘
                 iframe      │          │ publish webhook
                 (drafts)    ▼          ▼
        ┌──────────────────────┐   ┌────────────────────────────┐
        │ Preview Worker       │   │ GitHub Action              │
        │ cmp-website-preview  │   │ deploy-production.yml      │
        │ server-rendered,     │   │ npm run build + wrangler   │
        │ reads drafts         │   └─────────────┬──────────────┘
        └──────────────────────┘                 ▼
                                    ┌────────────────────────────┐
                                    │ Production Worker          │
                                    │ cmp-website                │
                                    │ static assets from dist/   │
                                    └────────────────────────────┘
```

There are two separate deployments of the same `web/` package:

| | Production | Preview |
|---|---|---|
| Worker name | `cmp-website` (`web/wrangler.jsonc`) | `cmp-website-preview` (`web/wrangler.preview.jsonc`) |
| Astro output | `static` — no adapter, no server code | `server` — Cloudflare adapter, renders per request |
| Content | Published documents, public CDN | Drafts, using a Viewer token |
| Who uses it | Visitors | Editors, inside Presentation only |
| Indexed | Yes | No (`x-robots-tag: noindex, nofollow`) |
| Selected by | default build | `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true` |
| Updates when | A Sanity publish triggers a rebuild | You run `npm run deploy:preview` |

Local `npm run dev` behaves like the preview deployment (server rendering, preview tools on) so you can work on either side without deploying.

## Layout

```
web/       Astro 7 site, Tailwind v4, Cloudflare adapter and Workers config
studio/    Sanity Studio: schema, desk structure, Presentation config
.github/   Production deploy workflow
```

There is no root `package.json`. Install and run each app from its own directory.

| App | Local URL | Role |
|---|---|---|
| `web` | http://localhost:4321 | Site, plus preview routes and tools in dev |
| `studio` | http://localhost:3333 | Content editing |

Sanity project `66h6oo6f`, dataset `production`. The ids are set in `studio/sanity.config.ts` and `studio/sanity.cli.ts`, and the site reads them from `web/.env`.

## Requirements

- Node.js `>= 22.12.0`
- A Sanity account with access to the project above
- For deploys: a Cloudflare account with Wrangler access

## Setup

```sh
cp web/.env.example web/.env
cp studio/.env.example studio/.env
cd web && npm install
cd ../studio && npm install
```

`web/.env`:

| Variable | Used for |
|---|---|
| `PUBLIC_SANITY_PROJECT_ID` | Sanity project id (`66h6oo6f`) |
| `PUBLIC_SANITY_DATASET` | Dataset (`production`) |
| `PUBLIC_SANITY_STUDIO_URL` | Studio origin, used for click-to-edit links. Local default `http://localhost:3333` |
| `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` | Leave unset. `true` switches the build to the preview deployment. `npm run build:preview` sets it |
| `SANITY_API_READ_TOKEN` | Viewer token. Required for draft preview. Never needed for the production build |
| `SANITY_API_WRITE_TOKEN` | Write token. Used only by `npm run seed` |
| `SANITY_PREVIEW_SECRET` | Documented for deploy checklists. Presentation validates against the read token, not this string |

Create tokens at [sanity.io/manage](https://www.sanity.io/manage).

`studio/.env`:

| Variable | Used for |
|---|---|
| `SANITY_STUDIO_PREVIEW_ORIGIN` | Optional. Overrides the Astro origin Presentation loads in its iframe. No trailing slash |

Without that override, `sanity dev` loads `http://localhost:4321` and a deployed Studio loads the preview Worker (`https://cmp-website-preview.guillermo-casanova.workers.dev`). The Presentation allow-list and the block-editing bridge in `studio/deleteSelectedBlock.tsx` both list those origins, so a new preview host has to be added in both places.

## Run locally

Use two terminals.

```sh
cd web && npm run dev        # site on :4321
cd studio && npm run dev     # Studio on :3333
```

Open Studio, open a page, and switch to Presentation. It loads the local site in an iframe.

Routes:

- `/` is the page whose slug is `home`. Until one is published, `/` shows an empty state.
- `/{slug}` is every other page.

There are no `/preview` routes. Preview is a cookie, not a URL: the same public paths render drafts when the cookie is set.

### Seed

`npm run seed` in `web` writes a starter page to the dataset. It uses `SANITY_API_WRITE_TOKEN`, or the Sanity CLI login in `~/.config/sanity/config.json` if that is unset.

## Presentation and preview

Presentation is the editing surface. The Studio config (`studio/sanity.config.ts`) points it at the preview host and tells it how to turn preview on and off:

1. Presentation opens `/api/preview/enable` on the preview host (`web/src/preview/enable.ts`).
2. The route validates Sanity's preview URL secret using the read token, sets the `sanity-preview` cookie, and redirects to the page.
3. With the cookie set, `index.astro` and `[slug].astro` fetch with the `drafts` perspective and stega encoding, so every piece of text carries its source location.
4. `/api/preview/disable` clears the cookie.

`web/src/preview/*` routes are injected only on the dev server and the preview build (`sanityPreviewRoutes` in `astro.config.mjs`). They do not exist in the production build.

Local HTTP uses a plain `SameSite=Lax` cookie because browsers drop Partitioned cookies on `http://localhost`. HTTPS previews use `SameSite=None; Secure; Partitioned` because the Studio embeds the site cross-site. See `web/src/lib/sanity/preview.ts`.

`web/src/middleware.ts` allows framing by Studio origins and sets `noindex` on the preview deployment. It does nothing on the production build.

The preview Worker is not behind Cloudflare Access (Access cannot be satisfied inside Studio's cross-site iframe). Instead the middleware returns 403 unless the request carries a signed `sanity-preview` cookie (`<expiry>.<HMAC>`, keyed on `SANITY_API_READ_TOKEN`). Only `/api/preview/enable` (after Sanity validates the preview secret) and `/api/preview/edit` issue one. `/api/preview/edit` still needs a Cloudflare Access application scoped to that single path, because it trusts the `cf-access-jwt-assertion` header. Rotating the read token signs everyone out.

### Editing tools in the preview

React tools load only in dev and in the preview build (`PreviewBridge.astro` → `PreviewEditing.tsx`, code in `web/src/components/preview/`). The React renderer is left out of the production build entirely.

| Tool | File | What it does |
|---|---|---|
| Block palette and picker | `palette.tsx`, `picker.tsx`, `inserts.ts` | Plus buttons and Cmd/Ctrl+K open a searchable block picker. New blocks are inserted with starter content |
| Layers | `layers.tsx` | Outline of sections and the components inside them. Click to select |
| Block tab | `blockTab.tsx`, `blockLabels.ts` | Tab over the hovered block with drag handle, name and delete |
| Drag reorder | `reorder.ts` | Reorder sections, components inside a section, and buttons in a button group |
| Inline text editing | `textEdit.ts` | Type directly on the page, with undo and redo |
| Loader | `loader.ts` | Covers the page while a structural change round-trips through Sanity |

After a change Presentation asks the iframe to refresh. `PreviewEditing.tsx` swaps the page's `#main` landmark instead of reloading, which keeps the visual editing connection up.

The Studio-side companion is `studio/deleteSelectedBlock.tsx`, a plugin that handles the delete shortcut for the selected block.

## Publish and deploy

### Production

Production is a plain static build served by Cloudflare Workers as assets from `web/dist/` (`web/wrangler.jsonc`, no `main`).

`.github/workflows/deploy-production.yml` builds and deploys it. It runs on:

- `repository_dispatch` with type `sanity-publish`, sent by a Sanity webhook when a document is published
- manual `workflow_dispatch`

Steps: `npm ci`, `npm run build` with the public Sanity ids, then `wrangler deploy -c wrangler.jsonc`.

Repository secrets: `CLOUDFLARE_API_TOKEN`. The Cloudflare account id is in the workflow file. The Sanity project id, dataset and Studio URL are set as build env in the workflow.

The Sanity webhook is configured in the Sanity project (sanity.io/manage → API → Webhooks), not in this repo. It must call the GitHub `dispatches` API with event type `sanity-publish`. If publishes stop showing up on the live site, check the webhook and the Actions tab first.

Manual deploy from `web`:

```sh
npm run deploy
```

### Preview Worker

```sh
cd web
npm run deploy:preview
```

That runs `build:preview` (server output, preview tools on, Studio URL set) and deploys `dist/server/wrangler.json`. The Worker needs the read token as a secret:

```sh
npx wrangler secret put SANITY_API_READ_TOKEN -c dist/server/wrangler.json
```

Redeploy the preview Worker after changing preview tooling or anything under `web/src/components/preview`. Content changes do not need a redeploy because the Worker reads drafts on every request.

If Presentation shows a 503 about `SANITY_API_READ_TOKEN`, the Worker secret is missing, revoked, or not a Viewer token.

### Studio

```sh
cd studio && npm run deploy
```

Deploys the hosted Studio (app id in `studio/sanity.cli.ts`). The hosted Studio loads the preview Worker, so deploy that first if you changed the preview.

### Contact form

`web/functions/api/contact.ts` is a Pages-style Function outside the Astro build, so the site stays static. It validates submissions and logs them. It sends mail only once the `send_email` binding and vars described in `web/wrangler.jsonc` are added. The Astro Action version is disabled. See `web/docs/how-to/contact-form-email.md`.

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

- Text: eyebrow, heading, rich text
- Actions: button group
- Media: image, video
- Layout: spacer, divider, card grid, columns, content wrapper

A card grid holds cards only. Columns cannot nest another columns block or a card grid. A content wrapper holds the same components as a section, except columns, and sets alignment and top and bottom padding for the group.

Where things live:

| What | Where |
|---|---|
| Schema | `studio/schemaTypes` (`documents`, `objects`, `fields`, `blocks/{atoms,containers,sealed}`, `templates.ts`) |
| Desk structure | `studio/structure.ts` |
| Astro components per block | `web/src/components/blocks/{atoms,containers,sealed}` |
| Page renderer | `web/src/components/blocks/PageView.astro`, `Blocks.astro` |
| GROQ queries | `web/src/lib/sanity/queries.ts` |
| Client and token handling | `web/src/lib/sanity/client.ts` |
| Style variants | `web/src/lib/variants.ts` |
| Generated types | `web/sanity.types.ts` |

Run `npm run typegen` in `studio` after any schema change so the site types stay in sync. Typegen scans `web/src` and writes `web/sanity.types.ts`.

Editor guide: [`web/docs/editing-pages.md`](web/docs/editing-pages.md).

## Commands

From `web`:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on 4321, server-rendered, preview tools on |
| `npm run build` | Production static build to `dist/` |
| `npm run build:preview` | Preview Worker build (server output, visual editing on) |
| `npm run preview` | Serve the last build locally |
| `npm run deploy` | Build and deploy the production Worker |
| `npm run deploy:preview` | Build and deploy the preview Worker |
| `npm run check` | Typecheck, docs check, and production build. Run before committing |
| `npm run typecheck` | `astro check` only |
| `npm run docs:build` / `docs:check` | Refresh and validate rule citations in `docs/` |
| `npm run spellcheck` | Advisory spell check across the repo |
| `npm run seed` | Write starter content to Sanity |

From `studio`:

| Command | What it does |
|---|---|
| `npm run dev` | Studio on 3333 |
| `npm run build` | Build the Studio |
| `npm run deploy` | Deploy the hosted Studio |
| `npm run typegen` | Extract the schema and write `web/sanity.types.ts` |

## Site identity and config

Brand name, production URL, default description, and social image are in `web/src/data/site.ts`. `astro.config.mjs` reads `site.url` from it for canonical URLs, Open Graph, JSON-LD, and the sitemap. The file still uses the `example.com` placeholder; set the real origin before launch.

Dev-only routes (`/components`, `/styleguide`, `/tve-preview`) are injected by `astro dev`, or by a build with `SHOW_DEMOS=true`. They are excluded from the sitemap and do not ship in a normal production build.

Images use `imageService: 'compile'`, so sharp runs at build time rather than in the Worker.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Presentation iframe is blank or refuses to load | The preview origin is not in the Studio allow-list, or you are loading a build without `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` |
| Preview bounces to the published page locally | A stale Partitioned cookie. Hit `/api/preview/disable` and reopen the page in Presentation |
| `Missing SANITY_API_READ_TOKEN` | Add a Viewer token to `web/.env`, or set the Worker secret on the preview deployment |
| Preview Worker returns 503 | The `SANITY_API_READ_TOKEN` secret is invalid. Re-run `wrangler secret put` |
| Published change is not on the live site | Check the Sanity webhook and the "Deploy production" run in GitHub Actions |
| Editing tools missing in Presentation | The preview Worker is out of date. Run `npm run deploy:preview` |
| Types are stale after a schema edit | Run `npm run typegen` in `studio` |

## Further docs

The starter's rulebook still applies to components, tokens, SEO, and deployment:

- [`web/README.md`](web/README.md) — starter quickstart
- [`web/docs/workflow.md`](web/docs/workflow.md) — which docs to read for a given task
- [`web/docs/editing-pages.md`](web/docs/editing-pages.md) — Studio editing
- [`web/DESIGN.md`](web/DESIGN.md) — brand values
- [`web/AGENTS.md`](web/AGENTS.md) — agent contract
