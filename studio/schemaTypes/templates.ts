import {defineArrayMember} from 'sanity'
import {
  ctaBand,
  faqPlaceholder,
  featureGrid,
  heroCentered,
  heroSplit,
  iconStats,
  plainSection,
  textCta,
} from '../../web/src/lib/templates'

export const plainSectionMember = defineArrayMember({
  type: 'section',
  name: 'section',
  title: 'Section',
  initialValue: plainSection,
})

export const faqMember = defineArrayMember({type: 'faq', name: 'faq', title: 'FAQ', initialValue: faqPlaceholder})

export const sectionPresets = [
  defineArrayMember({type: 'section', name: 'heroCentered', title: 'Hero – centered', initialValue: heroCentered}),
  defineArrayMember({type: 'section', name: 'heroSplit', title: 'Hero – split', initialValue: heroSplit}),
  defineArrayMember({type: 'section', name: 'textCta', title: 'Text + CTA', initialValue: textCta}),
  defineArrayMember({type: 'section', name: 'featureGrid', title: 'Feature grid', initialValue: featureGrid}),
  defineArrayMember({type: 'section', name: 'iconStats', title: 'Icon stats', initialValue: iconStats}),
  defineArrayMember({type: 'section', name: 'ctaBand', title: 'CTA band', initialValue: ctaBand}),
]
