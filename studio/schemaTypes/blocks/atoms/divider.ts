import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {defineType} from 'sanity'
import {tone} from '../../../../web/src/lib/variants'
import {listField, styleFieldset} from '../../fields/style'

export const divider = defineType({
  name: 'divider',
  title: 'Divider',
  type: 'object',
  icon: BlockElementIcon,
  fieldsets: [styleFieldset],
  fields: [listField('tone', 'Tone', tone, 'default', 'Line color from the existing border roles.')],
  preview: {
    select: {tone: 'tone'},
    prepare({tone: toneValue}) {
      return {title: 'Divider', subtitle: toneValue || 'default'}
    },
  },
})
