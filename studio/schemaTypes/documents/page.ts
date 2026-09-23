import {DocumentIcon} from '@sanity/icons/Document'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {insertMenu} from '../fields/style'
import {sectionPresets} from '../templates'

type HeadingLike = {_type?: string; level?: string; content?: HeadingLike[]; columns?: HeadingLike[]}

function countH1(nodes: HeadingLike[] | undefined): number {
  let count = 0
  for (const node of nodes ?? []) {
    if (node._type === 'heading' && node.level === '1') count += 1
    if (node.content) count += countH1(node.content)
    if (node.columns) count += countH1(node.columns)
  }
  return count
}

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Use home for the page served at /.',
      options: {
        source: 'title',
        isUnique: async (slug, context) => {
          const client = context.getClient({apiVersion: '2026-09-22'})
          const id = context.document?._id?.replace(/^drafts\./, '')
          const count = await client.fetch<number>(
            `count(*[_type == "page" && slug.current == $slug && !(_id in [$id, $draftId])])`,
            {slug, id, draftId: `drafts.${id}`},
          )
          return count === 0
        },
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [
        defineArrayMember({type: 'section', name: 'section', title: 'Section'}),
        ...sectionPresets,
        defineArrayMember({type: 'logoMarquee', name: 'logoMarquee', title: 'Logo marquee'}),
        defineArrayMember({type: 'faq', name: 'faq', title: 'FAQ'}),
      ],
      options: insertMenu([
        {
          name: 'layout',
          title: 'Layout',
          of: ['section', 'heroCentered', 'heroSplit', 'textCta', 'featureGrid', 'iconStats', 'ctaBand', 'logoMarquee', 'faq'],
        },
      ]),
      validation: (rule) =>
        rule.custom((sections) => {
          if (countH1(sections as HeadingLike[] | undefined) > 1) {
            return 'A page can only have one heading set to level H1.'
          }
          return true
        }),
    }),
  ],
  preview: {
    select: {title: 'title', slug: 'slug.current'},
    prepare({title, slug}) {
      return {title: title || 'Untitled', subtitle: slug === 'home' ? '/' : slug ? `/${slug}` : 'No slug'}
    },
  },
})
