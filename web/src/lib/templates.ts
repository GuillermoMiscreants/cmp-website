/** Starter content for new sections. The studio and the Presentation block picker both read it. */

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

export const heroCentered = {
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

export const textCta = {
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

export const featureGrid = {
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

export const iconStats = {
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

export const ctaBand = {
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

export const heroSplit = {
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

export const plainSection = {
  variant: 'default',
  background: 'none',
  paddingTop: 'md',
  paddingBottom: 'md',
  align: 'left',
  borderTop: false,
  content: [],
}

export const faqPlaceholder = {
  heading: 'Frequently asked questions',
  intro: 'Answers to the questions we hear most.',
  closePrevious: true,
  background: 'none',
  items: [1, 2, 3].map((n) => ({
    _type: 'faqItem',
    _key: `item-${n}`,
    question: `Question ${n}?`,
    answer: 'Write a short, helpful answer here.',
  })),
}
