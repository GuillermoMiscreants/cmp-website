import {ExpandIcon} from '@sanity/icons/Expand'
import {defineType} from 'sanity'
import {spacerSize} from '../../../../web/src/lib/variants'
import {listField} from '../../fields/style'

export const spacer = defineType({
  name: 'spacer',
  title: 'Spacer',
  type: 'object',
  icon: ExpandIcon,
  fields: [listField('size', 'Size', spacerSize, 'md', 'Empty vertical space.')],
  preview: {
    select: {size: 'size'},
    prepare({size}) {
      return {title: 'Spacer', subtitle: size || 'md'}
    },
  },
})
