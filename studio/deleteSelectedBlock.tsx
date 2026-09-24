import {useEffect} from 'react'
import {definePlugin, type LayoutProps} from 'sanity'

const previewOrigins = new Set([
  'https://cmp-website-preview.guillermo-casanova.workers.dev',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
])

function isTextField(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  const editable = target.closest('[contenteditable]')
  if (editable && editable.getAttribute('contenteditable') !== 'false') return true
  const field = target.closest("textarea, select, [role='textbox'], input")
  if (field instanceof HTMLInputElement) {
    const type = field.type
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range', 'color'].includes(type)
  }
  return !!field
}

function previewFrame() {
  for (const frame of document.querySelectorAll('iframe')) {
    if (!(frame instanceof HTMLIFrameElement) || !frame.src) continue
    try {
      if (previewOrigins.has(new URL(frame.src).origin)) return frame
    } catch {
      continue
    }
  }
  return null
}

function DeleteSelectedBlock() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (isTextField(event.target) || isTextField(document.activeElement)) return
      const frame = previewFrame()
      if (!frame?.contentWindow) return
      event.preventDefault()
      frame.contentWindow.postMessage(
        {source: 'cmp-preview', type: 'delete-selected'},
        new URL(frame.src).origin,
      )
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}

function Layout(props: LayoutProps) {
  return (
    <>
      <DeleteSelectedBlock />
      {props.renderDefault(props)}
    </>
  )
}

/** Delete removes the block clicked in Presentation, unless a property field has focus. */
export const deleteSelectedBlock = definePlugin({
  name: 'delete-selected-block',
  studio: {
    components: {
      layout: Layout,
    },
  },
})
