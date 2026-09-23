import {defineField} from 'sanity'

/** Image with a required alt once an asset is chosen. */
export function imageWithAlt(name = 'image', title = 'Image') {
  return defineField({
    name,
    title,
    type: 'image',
    options: {hotspot: true},
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Required once an image is set. The preview and screen readers use it.',
        validation: (rule) =>
          rule.custom((alt, context) => {
            const parent = context.parent as {asset?: unknown} | undefined
            if (parent?.asset && !alt) return 'Describe this image. Alt text is required.'
            return true
          }),
      }),
    ],
  })
}
