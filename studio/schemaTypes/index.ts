import {button} from './blocks/atoms/button'
import {buttonGroup} from './blocks/atoms/buttonGroup'
import {card} from './blocks/atoms/card'
import {cardGrid} from './blocks/atoms/cardGrid'
import {divider} from './blocks/atoms/divider'
import {eyebrow} from './blocks/atoms/eyebrow'
import {heading} from './blocks/atoms/heading'
import {imageBlock} from './blocks/atoms/image'
import {richText} from './blocks/atoms/richText'
import {spacer} from './blocks/atoms/spacer'
import {video} from './blocks/atoms/video'
import {column} from './blocks/containers/column'
import {columns} from './blocks/containers/columns'
import {section} from './blocks/containers/section'
import {faq} from './blocks/sealed/faq'
import {logoMarquee} from './blocks/sealed/logoMarquee'
import {page} from './documents/page'
import {siteSettings} from './documents/siteSettings'
import {link} from './objects/link'
import {seo} from './objects/seo'

export const schemaTypes = [
  page,
  siteSettings,
  seo,
  link,
  section,
  columns,
  column,
  heading,
  eyebrow,
  richText,
  button,
  buttonGroup,
  imageBlock,
  video,
  spacer,
  divider,
  card,
  cardGrid,
  logoMarquee,
  faq,
]
