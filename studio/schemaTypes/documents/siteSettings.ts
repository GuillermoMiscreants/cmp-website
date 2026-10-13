import {CogIcon} from '@sanity/icons/Cog'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {imageWithAlt} from '../objects/imageWithAlt'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'siteTitle',
      title: 'Site title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      description: 'Base URL of the live site, e.g. https://example.com (no trailing slash).',
      type: 'url',
      validation: (rule) => rule.uri({scheme: ['https', 'http']}),
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      description: 'Square .ico, .png or .svg, at least 32×32.',
      type: 'file',
      options: {accept: '.ico,.png,.svg,image/x-icon,image/png,image/svg+xml'},
    }),
    imageWithAlt('logo', 'Logo'),
    defineField({
      name: 'nav',
      title: 'Navigation',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'navItem',
          fields: [
            defineField({name: 'label', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'link', type: 'link', validation: (rule) => rule.required().error('Add a link.')}),
          ],
          preview: {select: {title: 'label'}},
        }),
      ],
    }),
    defineField({name: 'footerTagline', title: 'Footer tagline', type: 'string'}),
    defineField({name: 'footerCopyright', title: 'Footer copyright', type: 'string'}),
  ],
  preview: {
    prepare() {
      return {title: 'Site settings'}
    },
  },
})
