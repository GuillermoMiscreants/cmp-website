import {TextIcon} from '@sanity/icons/Text'
import {defineField, defineType} from 'sanity'
import {headingLevel, headingSize} from '../../../../web/src/lib/variants'
import {alignField, listField, styleFieldset} from '../../fields/style'

export const heading = defineType({
  name: 'heading',
  title: 'Heading',
  type: 'object',
  icon: TextIcon,
  fieldsets: [styleFieldset],
  fields: [
    defineField({
      name: 'text',
      title: 'Text',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    listField(
      'level',
      'Level',
      headingLevel,
      '2',
      'Semantic level for SEO and accessibility. Visual size is separate.',
    ),
    listField(
      'size',
      'Size',
      headingSize,
      'h2',
      'Visual size only. Use Level for SEO and accessibility.',
    ),
    alignField(),
  ],
  preview: {
    select: {title: 'text', level: 'level', size: 'size'},
    prepare({title, level, size}) {
      return {title: title || 'Heading', subtitle: `H${level || '2'} · ${size || 'h2'}`}
    },
  },
})
