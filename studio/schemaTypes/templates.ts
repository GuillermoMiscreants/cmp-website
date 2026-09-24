import {defineArrayMember} from 'sanity'

function textBlock(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    markDefs: [],
    children: [{_type: 'span' as const, _key: `${key}-span`, text, marks: []}],
  }
}

function buttonValue(key: string, label: string, variant: 'primary' | 'secondary' | 'tertiary') {
  return {
    _type: 'button' as const,
    _key: key,
    label,
    variant,
    withArrow: true,
    link: {_type: 'link' as const, type: 'external' as const, external: '/', openInNewTab: false},
  }
}

const heroCentered = {
  variant: 'default',
  background: 'none',
  paddingTop: 'xl',
  paddingBottom: 'xl',
  align: 'center',
  borderTop: false,
  content: [
    {_type: 'heading', _key: 'heading', text: 'Hello World', level: '1', size: 'h1', align: 'center'},
    {
      _type: 'richText',
      _key: 'text',
      size: 'text-body-lg',
      tone: 'muted',
      align: 'center',
      body: [textBlock('intro', 'This is a playground for Astro.')],
    },
    {
      _type: 'buttonGroup',
      _key: 'actions',
      align: 'center',
      buttons: [buttonValue('primary', 'Learn More', 'primary'), buttonValue('secondary', 'Get a Demo', 'secondary')],
    },
  ],
}

const textCta = {
  variant: 'narrow',
  background: 'none',
  paddingTop: 'md',
  paddingBottom: 'md',
  align: 'left',
  content: [
    {_type: 'heading', _key: 'heading', text: 'Text and a call to action', level: '2', size: 'h2', align: 'left'},
    {
      _type: 'richText',
      _key: 'text',
      size: 'text-body-md',
      tone: 'default',
      align: 'left',
      body: [textBlock('body', 'Add a short paragraph, then a button.')],
    },
    {_type: 'buttonGroup', _key: 'actions', align: 'left', buttons: [buttonValue('primary', 'Learn More', 'primary')]},
  ],
}

const featureGrid = {
  variant: 'wide',
  background: 'none',
  paddingTop: 'sm',
  paddingBottom: 'sm',
  align: 'left',
  borderTop: true,
  content: [
    {_type: 'heading', _key: 'heading', text: 'Features', level: '2', size: 'h2', align: 'left'},
    {
      _type: 'cardGrid',
      _key: 'grid',
      columns: '2',
      cards: [
        {
          _type: 'card',
          _key: 'card-a',
          style: 'featured',
          title: 'Design content structures your way.',
          description: 'A short description for this feature.',
          border: 'none',
          align: 'left',
        },
        {
          _type: 'card',
          _key: 'card-b',
          style: 'featured',
          title: 'Ship the same components editors already see.',
          description: 'A short description for this feature.',
          border: 'none',
          align: 'left',
        },
      ],
    },
  ],
}

const iconStats = {
  variant: 'wide',
  background: 'none',
  paddingTop: 'sm',
  paddingBottom: 'sm',
  align: 'left',
  content: [
    {
      _type: 'cardGrid',
      _key: 'grid',
      columns: '4',
      cards: ['98.3% uptime', 'Enterprise security', 'Scalable infrastructure', '24/7 support'].map(
        (header, index) => ({
          _type: 'card',
          _key: `stat-${index}`,
          style: 'icon',
          header,
          body: 'A short supporting line.',
          icon: 'lucide:activity',
          align: 'left',
        }),
      ),
    },
  ],
}

const ctaBand = {
  variant: 'default',
  background: 'dark',
  paddingTop: 'lg',
  paddingBottom: 'lg',
  align: 'center',
  content: [
    {_type: 'heading', _key: 'heading', text: 'Ready to start?', level: '2', size: 'h2', align: 'center'},
    {_type: 'buttonGroup', _key: 'actions', align: 'center', buttons: [buttonValue('primary', 'Learn More', 'primary')]},
  ],
}

const heroSplit = {
  variant: 'default',
  background: 'none',
  paddingTop: 'lg',
  paddingBottom: 'lg',
  align: 'left',
  content: [
    {
      _type: 'columns',
      _key: 'split',
      layout: '1-1',
      gap: 'md',
      verticalAlign: 'center',
      columns: [
        {
          _type: 'column',
          _key: 'media',
          content: [{_type: 'imageBlock', _key: 'image', aspect: '4/3', radius: 'card'}],
        },
        {
          _type: 'column',
          _key: 'copy',
          content: [
            {_type: 'heading', _key: 'heading', text: 'A split hero', level: '1', size: 'h1', align: 'left'},
            {
              _type: 'richText',
              _key: 'text',
              size: 'text-body-lg',
              tone: 'muted',
              align: 'left',
              body: [textBlock('intro', 'Image on one side, copy on the other.')],
            },
          ],
        },
      ],
    },
  ],
}

export const sectionPresets = [
  defineArrayMember({type: 'section', name: 'heroCentered', title: 'Hero – centered', initialValue: heroCentered}),
  defineArrayMember({type: 'section', name: 'heroSplit', title: 'Hero – split', initialValue: heroSplit}),
  defineArrayMember({type: 'section', name: 'textCta', title: 'Text + CTA', initialValue: textCta}),
  defineArrayMember({type: 'section', name: 'featureGrid', title: 'Feature grid', initialValue: featureGrid}),
  defineArrayMember({type: 'section', name: 'iconStats', title: 'Icon stats', initialValue: iconStats}),
  defineArrayMember({type: 'section', name: 'ctaBand', title: 'CTA band', initialValue: ctaBand}),
]
