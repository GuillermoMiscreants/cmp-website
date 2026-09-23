import {defineField} from 'sanity'
import {align, background, spacing} from '../../../web/src/lib/variants'

type Option = {title: string; value: string}

export const styleFieldset = {
  name: 'style',
  title: 'Style',
  options: {collapsible: true, collapsed: true},
}

export function listField(
  name: string,
  title: string,
  list: readonly Option[],
  initial: string,
  description?: string,
  fieldset: string | false = 'style',
) {
  return defineField({
    name,
    title,
    type: 'string',
    description,
    ...(fieldset ? {fieldset} : {}),
    initialValue: initial,
    options: {
      list: list.map((item) => ({title: item.title, value: item.value})),
      layout: 'radio',
      direction: 'horizontal',
    },
  })
}

export function alignField(description = 'Horizontal alignment.') {
  return listField('align', 'Align', align, 'left', description)
}

export function backgroundField() {
  return listField(
    'background',
    'Background',
    background,
    'none',
    'Section surface. Dark and Brand use the existing theme palettes.',
  )
}

export function spacingField(initial: (typeof spacing)[number]['value'] = 'md') {
  return listField(
    'spacing',
    'Spacing',
    spacing,
    initial,
    'Vertical padding, using the section rhythm already in the site.',
  )
}

export const insertMenu = (groups: {name: string; title: string; of: string[]}[]) => ({
  insertMenu: {
    views: [
      {name: 'grid' as const, previewImageUrl: (type: string) => `/studio-previews/${type}.png`},
      {name: 'list' as const},
    ],
    groups,
  },
})
