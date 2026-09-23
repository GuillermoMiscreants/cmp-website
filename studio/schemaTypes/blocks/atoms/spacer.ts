import {ExpandIcon} from '@sanity/icons/Expand'
import {defineType} from 'sanity'
import {spacing} from '../../../../web/src/lib/variants'
import {listField, styleFieldset} from '../../fields/style'

export const spacer = defineType({
  name: 'spacer',
  title: 'Spacer',
  type: 'object',
  icon: ExpandIcon,
  fieldsets: [styleFieldset],
  fields: [listField('size', 'Size', spacing, 'md', 'Empty space, using the section padding scale.')],
  preview: {
    select: {size: 'size'},
    prepare({size}) {
      return {title: 'Spacer', subtitle: size || 'md'}
    },
  },
})
