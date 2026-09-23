import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'

export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      initialValue: 'internal',
      options: {
        list: [
          {title: 'Internal', value: 'internal'},
          {title: 'External', value: 'external'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({
      name: 'internal',
      title: 'Page',
      type: 'reference',
      to: [{type: 'page'}],
      hidden: ({parent}) => parent?.type !== 'internal',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {type?: string} | undefined
          if (parent?.type === 'internal' && !value) return 'Choose a page to link to.'
          return true
        }),
    }),
    defineField({
      name: 'anchor',
      title: 'Anchor',
      type: 'string',
      description: 'Optional id on the destination page, without the #.',
      hidden: ({parent}) => parent?.type !== 'internal',
    }),
    defineField({
      name: 'external',
      title: 'URL',
      type: 'url',
      hidden: ({parent}) => parent?.type !== 'external',
      validation: (rule) =>
        rule.uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}).custom((value, context) => {
          const parent = context.parent as {type?: string} | undefined
          if (parent?.type === 'external' && !value) return 'Add a link.'
          return true
        }),
    }),
    defineField({
      name: 'openInNewTab',
      title: 'Open in a new tab',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})
