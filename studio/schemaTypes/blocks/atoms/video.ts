import {PlayIcon} from '@sanity/icons/Play'
import {defineField, defineType} from 'sanity'
import {imageAspect, videoMode} from '../../../../web/src/lib/variants'
import {listField, styleFieldset} from '../../fields/style'
import {imageWithAlt} from '../../objects/imageWithAlt'

export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fieldsets: [styleFieldset],
  fields: [
    defineField({
      name: 'url',
      title: 'Video URL',
      type: 'url',
      description: 'Direct video file URL. Playback uses the existing Media component.',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
    imageWithAlt('poster', 'Poster'),
    listField('mode', 'Mode', videoMode, 'click', 'How the video starts. Matches Media modes.'),
    listField('aspect', 'Aspect', imageAspect, '16/9', 'Frame used by the Media component.'),
  ],
  preview: {
    select: {title: 'url', mode: 'mode'},
    prepare({title, mode}) {
      return {title: title || 'Video', subtitle: mode || 'click'}
    },
  },
})
