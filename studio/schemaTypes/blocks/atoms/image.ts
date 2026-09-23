import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'
import {imageAspect, imageRadius} from '../../../../web/src/lib/variants'
import {listField, styleFieldset} from '../../fields/style'
import {imageWithAlt} from '../../objects/imageWithAlt'

// `image` is a reserved built-in type, so the block is stored as `imageBlock`.
// The field inside it is still a real Sanity image (hotspot + alt).
export const imageBlock = defineType({
  name: 'imageBlock',
  title: 'Image',
  type: 'object',
  icon: ImageIcon,
  fieldsets: [styleFieldset],
  fields: [
    imageWithAlt(),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
    listField('aspect', 'Aspect', imageAspect, 'auto', 'Crop frame. Auto keeps the original ratio.'),
    listField('radius', 'Radius', imageRadius, 'none', 'Corner radius from the existing radius tokens.'),
  ],
  preview: {
    select: {caption: 'caption', alt: 'image.alt', media: 'image', aspect: 'aspect'},
    prepare({caption, alt, media, aspect}) {
      return {title: caption || alt || 'Image', subtitle: aspect || 'auto', media}
    },
  },
})
