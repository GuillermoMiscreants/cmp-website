import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool, defineDocuments, defineLocations} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {deleteSelectedBlock} from './deleteSelectedBlock'

const studioEnv = (import.meta as {env?: Record<string, string | boolean | undefined>}).env
const workerOrigin = 'https://cmp-website-preview.guillermo-casanova.workers.dev'

// `sanity dev` loads the local Astro server so preview code changes show up
// without deploying the Worker. A deployed Studio loads the Worker. Set
// SANITY_STUDIO_PREVIEW_ORIGIN to override either.
const previewOrigin =
  (studioEnv?.SANITY_STUDIO_PREVIEW_ORIGIN as string | undefined) ||
  (studioEnv?.DEV ? 'http://localhost:4321' : workerOrigin)

export default defineConfig({
  name: 'default',
  title: 'Cyber Marketing Practice',

  projectId: '66h6oo6f',
  dataset: 'production',

  plugins: [
    deleteSelectedBlock(),
    structureTool({structure}),
    presentationTool({
      allowOrigins: [
        previewOrigin,
        'https://cmp-website-preview.guillermo-casanova.workers.dev',
        'http://127.0.0.1:4321',
        'http://localhost:4321',
      ],
      previewUrl: {
        initial: previewOrigin,
        previewMode: {
          enable: '/api/preview/enable',
          disable: '/api/preview/disable',
        },
      },
      resolve: {
        locations: {
          page: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: [
                {
                  title: doc?.title || 'Untitled',
                  href: !doc?.slug || doc.slug === 'home' ? '/' : `/${doc.slug}`,
                },
              ],
            }),
          }),
        },
        mainDocuments: defineDocuments([
          {route: '/', filter: `_type == "page" && slug.current == "home"`},
          {route: '/:slug', filter: `_type == "page" && slug.current == $slug`},
        ]),
      },
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  vite: {
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },
})
