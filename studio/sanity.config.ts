import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool, defineDocuments, defineLocations} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

const previewOrigin =
  (import.meta as {env?: Record<string, string | undefined>}).env?.SANITY_STUDIO_PREVIEW_ORIGIN ||
  'http://127.0.0.1:4321'

export default defineConfig({
  name: 'default',
  title: 'Cyber Marketing Practice',

  projectId: '66h6oo6f',
  dataset: 'production',

  plugins: [
    structureTool({structure}),
    presentationTool({
      allowOrigins: [previewOrigin, 'http://localhost:4321'],
      previewUrl: {
        initial: `${previewOrigin}/preview`,
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
                  href: !doc?.slug || doc.slug === 'home' ? '/preview' : `/preview/${doc.slug}`,
                },
              ],
            }),
          }),
        },
        mainDocuments: defineDocuments([
          {route: '/preview', filter: `_type == "page" && slug.current == "home"`},
          {route: '/preview/:slug', filter: `_type == "page" && slug.current == $slug`},
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
