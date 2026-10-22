import {SplitVerticalIcon} from '@sanity/icons/SplitVertical'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {columnsGap, columnsLayout, verticalAlign} from '../../../../web/src/lib/variants'
import {listField} from '../../fields/style'

export const columns = defineType({
  name: 'columns',
  title: 'Columns',
  type: 'object',
  icon: SplitVerticalIcon,
  fields: [
    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'array',
      of: [defineArrayMember({type: 'column'})],
      validation: (rule) =>
        rule.required().min(1).max(4).custom((value, context) => {
          const layout = (context.parent as {layout?: string} | undefined)?.layout || '1-1'
          const expected = layout.split('-').length
          const count = Array.isArray(value) ? value.length : 0
          if (count !== expected) {
            return {message: `This layout expects ${expected} columns. You have ${count}.`, level: 'warning'}
          }
          return true
        }).warning(),
    }),
    listField('layout', 'Layout', columnsLayout, '1-1', 'Column split. The count must match the number of columns.'),
    listField('gap', 'Column gap', columnsGap, 'md', 'Space between columns, side to side.'),
    listField('rowGap', 'Row gap', columnsGap, 'md', 'Space between columns when they stack, top to bottom.'),
    listField('verticalAlign', 'Vertical align', verticalAlign, 'top', 'How columns line up with each other.'),
  ],
  preview: {
    select: {layout: 'layout', gap: 'gap'},
    prepare({layout, gap}) {
      return {title: 'Columns', subtitle: `${layout || '1-1'} · ${gap || 'md'}`}
    },
  },
})
