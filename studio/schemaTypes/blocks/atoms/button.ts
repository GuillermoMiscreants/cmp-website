import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'
import {buttonVariant} from '../../../../web/src/lib/variants'
import {listField} from '../../fields/style'

export const button = defineType({
  name: 'button',
  title: 'Button',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required().error('Add a label.'),
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      validation: (rule) => rule.required().error('Add a link.'),
    }),
    listField('variant', 'Variant', buttonVariant, 'primary', 'Uses the existing button styles.'),
    defineField({
      name: 'withArrow',
      title: 'Arrow',
      type: 'boolean',
      initialValue: true,
      description: 'Show the arrow the button component already draws.',
    }),
  ],
  preview: {
    select: {title: 'label', variant: 'variant'},
    prepare({title, variant}) {
      return {title: title || 'Button', subtitle: variant || 'primary'}
    },
  },
})
