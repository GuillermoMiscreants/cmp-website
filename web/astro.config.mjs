// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig, envField } from 'astro/config';
import { loadEnv } from 'vite';

import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sanity from '@sanity/astro';
import cloudflare from '@astrojs/cloudflare';

// astro.config.mjs runs before Astro loads env files, so PUBLIC_* is not on
// import.meta.env yet. loadEnv reads the same variables the pages use.
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, PUBLIC_SANITY_STUDIO_URL } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
);

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { site } from './src/data/site.ts';

// Single source of truth for the production origin: this config derives `site`
// from src/data/site.ts rather than repeating the domain. Two copies plus a
// checklist item to keep them in sync is not a single source of truth.
//
// A placeholder origin warns, in every environment, and never fails the build.
// Previewing on a *.pages.dev URL before the client's domain is decided is
// normal and harmless — nothing is indexed or linked yet. The real gate is the
// pre-launch audit, which blocks on this at cutover, when it actually matters.
const PLACEHOLDER_ORIGIN = 'example.com';

if (site.url.includes(PLACEHOLDER_ORIGIN)) {
  console.warn(
    `\n[site] url is still the ${PLACEHOLDER_ORIGIN} placeholder.\n` +
      `       Canonical URLs, og:url and schema.org @id all resolve against it.\n` +
      `       Fine for previews — set the real domain in src/data/site.ts before launch.\n`
  );
}

// Internal / demo routes excluded from the public sitemap. A path is dropped if
// it equals one of these or sits under it. Extend per project.
const SITEMAP_EXCLUDE = ['/styleguide', '/components', '/tve-preview'];

// Demo / reference routes live in src/demos (NOT src/pages), so they are never
// auto-built. This integration injects them only in `astro dev` — or in a build
// when SHOW_DEMOS=true — so the component showcase + styleguide are available
// locally (for the client and their AI agent) but never shipped to production.
/** @returns {import('astro').AstroIntegration} */
function demoRoutes() {
  const DEMOS = [
    { pattern: '/styleguide', entrypoint: './src/demos/styleguide.astro' },
    { pattern: '/tve-preview', entrypoint: './src/demos/tve-preview.astro' },
    { pattern: '/components', entrypoint: './src/demos/components/index.astro' },
    { pattern: '/components/[...slug]', entrypoint: './src/demos/components/[...slug].astro' },
  ];
  return {
    name: 'demo-routes',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, logger }) => {
        const enabled = command === 'dev' || process.env.SHOW_DEMOS === 'true';
        if (!enabled) {
          logger.info('Demo routes excluded from this build (set SHOW_DEMOS=true to include).');
          return;
        }
        for (const route of DEMOS) injectRoute(route);
        logger.info(`Demo routes enabled (${DEMOS.length} routes).`);
      },
    },
  };
}

// Published pages stay static (`output: 'static'` + getStaticPaths).
// Preview routes and /api/preview set `prerender = false`, so the Cloudflare
// adapter is required. imageService 'compile' keeps sharp at build time; the
// adapter's default service would pass images through unoptimized.
// The contact-form Cloudflare action is still disabled (src/actions/
// index.ts.disabled).

// https://astro.build/config
export default defineConfig({
  // The production origin, derived from src/data/site.ts — set it there, not
  // here. Drives canonical URLs, og:url/og:image, JSON-LD @id values and the
  // sitemap.
  site: site.url,
  output: 'static',
  adapter: cloudflare({
    // Compile images with sharp at build time. The adapter's default service
    // passes images through unoptimized.
    imageService: 'compile',
    prerenderEnvironment: 'node',
  }),
  env: {
    schema: {
      SANITY_API_READ_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
  // Astro 7 defaults compressHTML to 'jsx' (JSX-style whitespace stripping).
  // Keep the v6 HTML-aware behavior so inline spacing doesn't shift.
  compressHTML: true,
  // Every internal link warms on hover. On a static site the pages are already
  // built, so this costs one cheap fetch for a link the visitor has signalled
  // intent on, and the navigation lands instantly. Independent of the client
  // router — this works without view transitions enabled.
  //
  // `viewport` would prefetch everything on screen; on a long marketing page
  // that is a lot of bandwidth spent on links nobody follows. Reconsider
  // prefetchAll on a content-heavy site with hundreds of routes.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  build: {
    // Inline page CSS into <head> instead of emitting render-blocking
    // stylesheet requests — a material FCP/LCP win for static sites.
    inlineStylesheets: 'always',
  },
  integrations: [
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      apiVersion: '2026-09-22',
      useCdn: false,
      // Studio URL is configured here. Encoding stays off on this client;
      // the preview client turns stega on per request.
      stega: {
        enabled: false,
        studioUrl: PUBLIC_SANITY_STUDIO_URL,
      },
    }),
    icon(),
    mdx(),
    demoRoutes(),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return !SITEMAP_EXCLUDE.some(
          (p) => pathname === p || pathname.startsWith(p + '/')
        );
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // @iconify/utils imports the CommonJS `debug` package. The Cloudflare
      // dev worker evaluates that file as ESM, so `module` is missing and
      // every on-demand route that renders an icon 500s. Logging is unused
      // in preview, so the import points at a no-op ESM module instead.
      alias: {
        debug: fileURLToPath(new URL('./src/lib/debug-shim.ts', import.meta.url)),
      },
    },
    // GSAP is only reached through a runtime `import()` inside component
    // scripts (Tabs), so Vite never sees it during its initial dependency
    // scan. The first lazy import triggers a re-optimize mid-session and the
    // in-flight request 504s with "Outdated Optimize Dep" — the animation
    // silently dies in dev. Pre-bundling it up front avoids the reload.
    optimizeDeps: {
      include: ['gsap', 'gsap/ScrollTrigger'],
    },
  }
});