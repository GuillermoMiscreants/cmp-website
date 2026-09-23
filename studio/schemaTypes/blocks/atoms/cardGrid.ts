import {ThLargeIcon} from '@sanity/icons/ThLarge'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {cardColumns} from '../../../../web/src/lib/variants'
import {listField, styleFieldset} from '../../fields/style'

export const cardGrid = defineType({
  name: 'cardGrid',
  title: 'Card grid',
  type: 'object',
  icon: ThLargeIcon,
  fieldsets: [styleFieldset],
  fields: [
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      of: [defineArrayMember({type: 'card'})],
      validation: (rule) => rule.required().min(2).max(6).error('Add between 2 and 6 cards.'),
    }),
    listField('columns', 'Columns', cardColumns, '2', 'Desktop columns. The grid stacks to one column on small screens.'),
  ],
  preview: {
    select: {cards: 'cards', columns: 'columns'},
    prepare({cards, columns}) {
      const count = Array.isArray(cards) ? cards.length : 0
      return {title: `Card grid · ${count}`, subtitle: `${columns || '2'} columns`}
    },
  },
})
