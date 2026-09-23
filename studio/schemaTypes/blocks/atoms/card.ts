import {SquareIcon} from '@sanity/icons/Square'
import {defineField, defineType} from 'sanity'
import {cardBorder, cardStyle, iconName} from '../../../../web/src/lib/variants'
import {alignField, listField, styleFieldset} from '../../fields/style'
import {imageWithAlt} from '../../objects/imageWithAlt'

export const card = defineType({
  name: 'card',
  title: 'Card',
  type: 'object',
  icon: SquareIcon,
  fieldsets: [styleFieldset],
  fields: [
    listField('style', 'Style', cardStyle, 'featured', 'Featured card or the icon stat card.'),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      hidden: ({parent}) => parent?.style === 'icon',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      hidden: ({parent}) => parent?.style === 'icon',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {style?: string} | undefined
          if (parent?.style !== 'icon' && !value) return 'Add a title.'
          return true
        }),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      hidden: ({parent}) => parent?.style === 'icon',
    }),
    imageWithAlt(),
    defineField({
      name: 'button',
      title: 'Button',
      type: 'button',
      hidden: ({parent}) => parent?.style === 'icon',
    }),
    defineField({
      name: 'header',
      title: 'Header',
      type: 'string',
      hidden: ({parent}) => parent?.style !== 'icon',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {style?: string} | undefined
          if (parent?.style === 'icon' && !value) return 'Add a header.'
          return true
        }),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 3,
      hidden: ({parent}) => parent?.style !== 'icon',
    }),
    listField('icon', 'Icon', iconName, 'lucide:activity', 'Icon used by the icon stat card.', false),
    listField('border', 'Border', cardBorder, 'none', 'Border used by the featured card.'),
    alignField(),
  ],
  preview: {
    select: {title: 'title', header: 'header', style: 'style'},
    prepare({title, header, style}) {
      return {title: title || header || 'Card', subtitle: style || 'featured'}
    },
  },
})
