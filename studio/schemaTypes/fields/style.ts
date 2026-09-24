import {defineField} from 'sanity'
import {align, background, sectionPadding, spacing} from '../../../web/src/lib/variants'

type Option = {title: string; value: string}

export function listField(
  name: string,
  title: string,
  list: readonly Option[],
  initial: string,
  description?: string,
  fieldset?: string,
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
      layout: 'dropdown',
    },
  })
}

export function alignField(
  description = 'Horizontal alignment.',
  initial: string | null = 'left',
) {
  return defineField({
    name: 'align',
    title: 'Align',
    type: 'string',
    description,
    ...(initial ? {initialValue: initial} : {}),
    options: {
      list: align.map((item) => ({title: item.title, value: item.value})),
      layout: 'dropdown',
    },
  })
}

export function edgePaddingField(name: 'paddingTop' | 'paddingBottom', title: string) {
  return listField(
    name,
    title,
    spacing,
    'none',
    'Space inside this edge. None leaves the items against the wrapper.',
    'padding',
  )
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

export function sectionPaddingField(name: 'paddingTop' | 'paddingBottom', title: string) {
  return listField(
    name,
    title,
    sectionPadding,
    'md',
    'Space inside this edge of the section, using the site spacing scale.',
    'padding',
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
