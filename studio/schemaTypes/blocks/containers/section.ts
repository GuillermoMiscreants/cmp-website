import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {sectionVariant} from '../../../../web/src/lib/variants'
import {alignField, backgroundField, insertMenu, listField, sectionPaddingField} from '../../fields/style'

/** Blocks that can sit in a section, a column, or a content wrapper. */
export const flowContentMembers = [
  defineArrayMember({type: 'eyebrow', name: 'eyebrow'}),
  defineArrayMember({type: 'heading', name: 'heading'}),
  defineArrayMember({type: 'richText', name: 'richText'}),
  defineArrayMember({type: 'buttonGroup', name: 'buttonGroup'}),
  defineArrayMember({type: 'imageBlock', name: 'imageBlock'}),
  defineArrayMember({type: 'video', name: 'video'}),
  defineArrayMember({type: 'spacer', name: 'spacer'}),
  defineArrayMember({type: 'divider', name: 'divider'}),
  defineArrayMember({type: 'cardGrid', name: 'cardGrid'}),
]

export const sectionContentMembers = [
  ...flowContentMembers,
  defineArrayMember({type: 'columns', name: 'columns'}),
  defineArrayMember({type: 'contentWrapper', name: 'contentWrapper'}),
]

export const section = defineType({
  name: 'section',
  title: 'Section',
  type: 'object',
  icon: BlockElementIcon,
  fieldsets: [{name: 'padding', title: 'Padding', options: {columns: 2}}],
  fields: [
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: sectionContentMembers,
      options: insertMenu([
        {name: 'text', title: 'Text', of: ['eyebrow', 'heading', 'richText']},
        {name: 'actions', title: 'Actions', of: ['buttonGroup']},
        {name: 'media', title: 'Media', of: ['imageBlock', 'video']},
        {name: 'layout', title: 'Layout', of: ['spacer', 'divider', 'cardGrid', 'columns', 'contentWrapper']},
      ]),
      validation: (rule) => rule.required().min(1).error('Add at least one component to this section.'),
    }),
    listField(
      'variant',
      'Width',
      sectionVariant,
      'default',
      'Content width inside the page container. Narrow is a text column. Wide drops the inner padding.',
    ),
    backgroundField(),
    sectionPaddingField('paddingTop', 'Top'),
    sectionPaddingField('paddingBottom', 'Bottom'),
    alignField('Default alignment for items in this section. An item can override it.'),
    defineField({
      name: 'borderTop',
      title: 'Top border',
      type: 'boolean',
      initialValue: false,
      description: 'Hairline along the top of the section.',
    }),
  ],
  preview: {
    select: {
      first: 'content.0.text',
      second: 'content.1.text',
      third: 'content.2.text',
      variant: 'variant',
      background: 'background',
    },
    prepare({first, second, third, variant, background}) {
      return {
        title: first || second || third || 'Section',
        subtitle: `${variant || 'default'} · ${background || 'none'}`,
      }
    },
  },
})
