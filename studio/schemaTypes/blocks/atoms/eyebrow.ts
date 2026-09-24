import {TagIcon} from '@sanity/icons/Tag'
import {defineField, defineType} from 'sanity'
import {tone} from '../../../../web/src/lib/variants'
import {alignField, listField} from '../../fields/style'

export const eyebrow = defineType({
  name: 'eyebrow',
  title: 'Eyebrow',
  type: 'object',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'text',
      title: 'Text',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    alignField('Leave empty to follow the section or content wrapper.', null),
    listField('tone', 'Tone', tone, 'muted', 'Color role for this label.'),
  ],
  preview: {
    select: {title: 'text', tone: 'tone'},
    prepare({title, tone: toneValue}) {
      return {title: title || 'Eyebrow', subtitle: toneValue || 'muted'}
    },
  },
})
