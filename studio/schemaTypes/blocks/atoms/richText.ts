import {BlockContentIcon} from '@sanity/icons/BlockContent'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {textSize, tone} from '../../../../web/src/lib/variants'
import {alignField, listField} from '../../fields/style'

export const richText = defineType({
  name: 'richText',
  title: 'Text',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{title: 'Normal', value: 'normal'}],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Number', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    validation: (rule) =>
                      rule.uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}),
                  }),
                ],
              },
            ],
          },
        }),
      ],
    }),
    listField('size', 'Size', textSize, 'text-body-md', 'Body size from the type ramp.'),
    listField('tone', 'Tone', tone, 'default', 'Text color role.'),
    alignField('Leave empty to follow the section or content wrapper.', null),
  ],
  preview: {
    select: {body: 'body', size: 'size'},
    prepare({body, size}) {
      const block = Array.isArray(body) ? body.find((item) => item?._type === 'block') : undefined
      const text = block?.children?.map((child: {text?: string}) => child.text || '').join('') || 'Text'
      return {title: text, subtitle: size || 'text-body-md'}
    },
  },
})
