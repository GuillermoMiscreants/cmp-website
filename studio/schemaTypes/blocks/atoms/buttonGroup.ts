import {InlineIcon} from '@sanity/icons/Inline'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {alignField, styleFieldset} from '../../fields/style'

export const buttonGroup = defineType({
  name: 'buttonGroup',
  title: 'Button group',
  type: 'object',
  icon: InlineIcon,
  fieldsets: [styleFieldset],
  fields: [
    defineField({
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      of: [defineArrayMember({type: 'button'})],
      validation: (rule) => rule.required().min(1).max(3).error('Add between 1 and 3 buttons.'),
    }),
    alignField(),
  ],
  preview: {
    select: {buttons: 'buttons', align: 'align'},
    prepare({buttons, align}) {
      const labels = Array.isArray(buttons)
        ? buttons.map((item) => item?.label).filter(Boolean).join(', ')
        : ''
      return {title: labels || 'Button group', subtitle: align || 'left'}
    },
  },
})
