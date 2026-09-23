import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {backgroundField, styleFieldset} from '../../fields/style'

export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'object',
  icon: HelpCircleIcon,
  fieldsets: [styleFieldset],
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'faqItem',
          fields: [
            defineField({
              name: 'question',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'answer',
              type: 'text',
              rows: 3,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {title: 'question'},
          },
        }),
      ],
      validation: (rule) => rule.required().min(1).error('Add at least one question.'),
    }),
    defineField({
      name: 'closePrevious',
      title: 'Close the previous item',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'openByDefault',
      title: 'Open by default',
      type: 'number',
      description: 'Index of the item that starts open. Leave empty to start closed.',
    }),
    backgroundField(),
  ],
  preview: {
    select: {title: 'heading', background: 'background'},
    prepare({title, background}) {
      return {title: title || 'FAQ', subtitle: background || 'none'}
    },
  },
})
