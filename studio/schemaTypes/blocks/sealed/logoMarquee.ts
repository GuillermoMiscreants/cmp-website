import {UsersIcon} from '@sanity/icons/Users'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {backgroundField} from '../../fields/style'

export const logoMarquee = defineType({
  name: 'logoMarquee',
  title: 'Logo marquee',
  type: 'object',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      initialValue: 'Trusted by leading data companies',
    }),
    defineField({
      name: 'logos',
      title: 'Logos',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          name: 'logo',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (rule) => rule.required().error('Describe this logo. Alt text is required.'),
            }),
          ],
        }),
      ],
      validation: (rule) => rule.min(1).error('Add at least one logo.'),
    }),
    backgroundField(),
  ],
  preview: {
    select: {title: 'label', background: 'background'},
    prepare({title, background}) {
      return {title: title || 'Logo marquee', subtitle: background || 'none'}
    },
  },
})
