import {useEffect, useState} from 'react'
import {definePlugin, useValidationStatus, type LayoutProps} from 'sanity'

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
      if (event.key !== 'Delete') return
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

type PathSegment = string | number | {_key?: string}

/** The layers panel in the preview addresses a block as `sections[_key=="a"].content[_key=="b"]`. */
function layerPaths(path: PathSegment[]) {
  const found: string[] = []
  let built = ''
  for (const segment of path) {
    if (typeof segment === 'string') built += built ? `.${segment}` : segment
    else if (typeof segment === 'object' && segment._key) {
      built += `[_key=="${segment._key}"]`
      found.push(built)
    }
  }
  return found
}

function ValidationRelay({id, asked}: {id: string; asked: number}) {
  const {validation} = useValidationStatus(id, 'page', false)
  useEffect(() => {
    const frame = previewFrame()
    if (!frame?.contentWindow) return
    const levels: Record<string, 'error' | 'warning'> = {}
    for (const marker of validation) {
      if (marker.level !== 'error' && marker.level !== 'warning') continue
      for (const path of layerPaths(marker.path as PathSegment[])) {
        if (levels[path] !== 'error') levels[path] = marker.level
      }
    }
    frame.contentWindow.postMessage(
      {source: 'cmp-preview', type: 'validation', id, levels},
      new URL(frame.src).origin,
    )
  }, [id, validation, asked])
  return null
}

/** The preview names the page it shows. The Studio answers with that page's validation markers. */
function ValidationBridge() {
  const [id, setId] = useState<string | null>(null)
  const [asked, setAsked] = useState(0)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || data.source !== 'cmp-preview' || data.type !== 'request-validation') return
      if (!previewOrigins.has(event.origin) || typeof data.id !== 'string') return
      setId(data.id)
      setAsked((count) => count + 1)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  return id ? <ValidationRelay key={id} id={id} asked={asked} /> : null
}

function Layout(props: LayoutProps) {
  return (
    <>
      <DeleteSelectedBlock />
      <ValidationBridge />
      {props.renderDefault(props)}
    </>
  )
}

/** Delete removes the block clicked in Presentation, unless a property field has focus. Backspace is left for text editing. */
export const deleteSelectedBlock = definePlugin({
  name: 'delete-selected-block',
  studio: {
    components: {
      layout: Layout,
    },
  },
})
