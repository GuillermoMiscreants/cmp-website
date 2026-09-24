import {StackCompactIcon} from '@sanity/icons/StackCompact'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {alignField, edgePaddingField, insertMenu} from '../../fields/style'
import {flowContentMembers} from './section'

const wrapperContentMembers = [
  ...flowContentMembers,
  defineArrayMember({type: 'contentWrapper', name: 'contentWrapper'}),
]

export const contentWrapper = defineType({
  name: 'contentWrapper',
  title: 'Content wrapper',
  type: 'object',
  icon: StackCompactIcon,
  fieldsets: [{name: 'padding', title: 'Padding', options: {columns: 2}}],
  fields: [
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: wrapperContentMembers,
      options: insertMenu([
        {name: 'text', title: 'Text', of: ['eyebrow', 'heading', 'richText']},
        {name: 'actions', title: 'Actions', of: ['buttonGroup']},
        {name: 'media', title: 'Media', of: ['imageBlock', 'video']},
        {name: 'layout', title: 'Layout', of: ['spacer', 'divider', 'cardGrid', 'contentWrapper']},
      ]),
      validation: (rule) => rule.required().min(1).error('Add at least one component to this wrapper.'),
    }),
    alignField('Alignment for items in this wrapper. An item can override it.', 'left'),
    edgePaddingField('paddingTop', 'Top'),
    edgePaddingField('paddingBottom', 'Bottom'),
  ],
  preview: {
    select: {
      first: 'content.0.text',
      align: 'align',
      paddingTop: 'paddingTop',
      paddingBottom: 'paddingBottom',
    },
    prepare({first, align, paddingTop, paddingBottom}) {
      return {
        title: first || 'Content wrapper',
        subtitle: `${align || 'left'} · ${paddingTop || 'none'} / ${paddingBottom || 'none'}`,
      }
    },
  },
})
