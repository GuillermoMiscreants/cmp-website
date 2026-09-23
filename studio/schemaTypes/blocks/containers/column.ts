import {defineArrayMember, defineField, defineType} from 'sanity'
import {insertMenu} from '../../fields/style'

const columnContent = [
  defineArrayMember({type: 'eyebrow', name: 'eyebrow'}),
  defineArrayMember({type: 'heading', name: 'heading'}),
  defineArrayMember({type: 'richText', name: 'richText'}),
  defineArrayMember({type: 'buttonGroup', name: 'buttonGroup'}),
  defineArrayMember({type: 'imageBlock', name: 'imageBlock'}),
  defineArrayMember({type: 'video', name: 'video'}),
  defineArrayMember({type: 'spacer', name: 'spacer'}),
  defineArrayMember({type: 'divider', name: 'divider'}),
]

export const column = defineType({
  name: 'column',
  title: 'Column',
  type: 'object',
  fields: [
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: columnContent,
      options: insertMenu([
        {name: 'text', title: 'Text', of: ['eyebrow', 'heading', 'richText']},
        {name: 'actions', title: 'Actions', of: ['buttonGroup']},
        {name: 'media', title: 'Media', of: ['imageBlock', 'video']},
        {name: 'layout', title: 'Layout', of: ['spacer', 'divider']},
      ]),
      validation: (rule) => rule.required().min(1).error('Add at least one component to this column.'),
    }),
  ],
  preview: {
    select: {content: 'content'},
    prepare({content}) {
      const first = Array.isArray(content) ? content[0] : undefined
      const title = first?.text || first?.label || first?._type || 'Column'
      return {title: String(title)}
    },
  },
})
