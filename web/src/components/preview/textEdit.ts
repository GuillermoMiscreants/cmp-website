import { stegaClean } from "@sanity/client/stega";
import { decodeSanityNodeData, type SanityStegaNode } from "@sanity/visual-editing-csm";
import { vercelStegaDecode } from "@vercel/stega";
import { recentlyDragged } from "./reorder";

type Field = {
  element: HTMLElement;
  id: string;
  path: string;
  /** The text node as rendered, with the invisible source-map characters. */
  encoded: string;
  text: string;
};

type Change = { id: string; path: string; before: string; after: string };

type Write = (id: string, path: string, value: string) => Promise<void>;

let installed = false;
let session: Field | null = null;
let write: Write | null = null;
const undoStack: Change[] = [];
const redoStack: Change[] = [];

/**
 * A leaf element whose only child is one stega-encoded text node. Stega is how
 * Sanity says which field produced the text, so the same marker tells us where
 * a typed value goes. Anything with child elements or mixed text is left alone.
 */
function fieldOf(element: Element): Field | null {
  if (!(element instanceof HTMLElement) || element.childElementCount > 0) return null;
  if (element.childNodes.length !== 1) return null;
  const node = element.childNodes[0];
  if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return null;
  const encoded = node.textContent;
  const text = stegaClean(encoded);
  if (text === encoded) return null;
  const decoded = vercelStegaDecode<SanityStegaNode>(encoded);
  const target = decoded ? decodeSanityNodeData(decoded) : undefined;
  if (!target || !("id" in target) || !("path" in target)) return null;
  if (typeof target.id !== "string" || typeof target.path !== "string") return null;
  return { element, id: stegaClean(target.id), path: stegaClean(target.path), encoded, text };
}

/** The page element under the pointer, looking through the Presentation overlay that sits on top of it. */
function fieldAtPoint(x: number, y: number) {
  for (const element of document.elementsFromPoint(x, y)) {
    if (element.closest("sanity-visual-editing, [data-insert-anchor]")) continue;
    return fieldOf(element);
  }
  return null;
}

function placeCaret(element: HTMLElement, x: number, y: number) {
  const selection = window.getSelection();
  if (!selection) return;
  let range: Range | null = null;
  const position = document.caretPositionFromPoint?.(x, y);
  if (position && element.contains(position.offsetNode)) {
    range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
  } else {
    const fallback = document.caretRangeFromPoint?.(x, y) ?? null;
    if (fallback && element.contains(fallback.startContainer)) range = fallback;
  }
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function onKeyDown(event: KeyboardEvent) {
  // Keep page scripts (menus, sliders, the delete shortcut) out of the typing.
  event.stopPropagation();
  if (event.key === "Enter") {
    event.preventDefault();
    finish(true);
  } else if (event.key === "Escape") {
    event.preventDefault();
    finish(false);
  } else if (event.key === " " && session?.element.closest("button")) {
    // A space inside a button presses it instead of typing.
    event.preventDefault();
    document.execCommand("insertText", false, " ");
  }
}

function onKeyUp(event: KeyboardEvent) {
  event.stopPropagation();
  if (event.key === " ") event.preventDefault();
}

function onBlur() {
  finish(true);
}

function begin(field: Field, x: number, y: number) {
  const { element } = field;
  session = field;
  document.documentElement.setAttribute("data-text-editing", "");
  element.setAttribute("data-text-editing-target", "");
  element.closest("a")?.setAttribute("draggable", "false");
  // Type into clean text. The encoded copy comes back on cancel or after the page refreshes.
  element.textContent = field.text;
  element.setAttribute("contenteditable", "plaintext-only");
  if (element.contentEditable !== "plaintext-only") element.setAttribute("contenteditable", "true");
  element.addEventListener("keydown", onKeyDown);
  element.addEventListener("keyup", onKeyUp);
  element.addEventListener("blur", onBlur);
  element.focus({ preventScroll: true });
  placeCaret(element, x, y);
}

function finish(commit: boolean) {
  const current = session;
  if (!current) return;
  session = null;
  const { element } = current;
  element.removeEventListener("keydown", onKeyDown);
  element.removeEventListener("keyup", onKeyUp);
  element.removeEventListener("blur", onBlur);
  const next = (element.textContent ?? "").replace(/[\r\n]+/g, " ");
  element.removeAttribute("contenteditable");
  element.removeAttribute("data-text-editing-target");
  element.closest("a")?.removeAttribute("draggable");
  document.documentElement.removeAttribute("data-text-editing");
  if (document.activeElement === element) element.blur();
  window.getSelection()?.removeAllRanges();

  if (!commit || next === current.text || !write) {
    element.textContent = current.encoded;
    return;
  }
  element.textContent = next;
  const change: Change = { id: current.id, path: current.path, before: current.text, after: next };
  void commitChange(change).catch((cause: unknown) => {
    console.error("Could not save the text.", cause);
    element.textContent = current.encoded;
  });
}

async function commitChange(change: Change) {
  if (!write) throw new Error("Document is not ready.");
  await write(change.id, change.path, change.after);
  undoStack.push(change);
  redoStack.length = 0;
}

/** Cmd/Ctrl+Z outside a field undoes the last text edit. While typing, the browser undoes keystrokes itself. */
function onUndoKey(event: KeyboardEvent) {
  if (session || !write) return;
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "z") return;
  const redo = event.shiftKey;
  const change = (redo ? redoStack : undoStack).pop();
  if (!change) return;
  event.preventDefault();
  (redo ? undoStack : redoStack).push(change);
  void write(change.id, change.path, redo ? change.after : change.before).catch((cause: unknown) => {
    console.error("Could not undo the text edit.", cause);
  });
}

function onClick(event: MouseEvent) {
  // Placing the caret, double-click to select a word, shift-click to extend: each is a click on the
  // text being edited. Left alone, Presentation sees it and opens the field in the Studio panel.
  // The browser still gets the click, so the caret and selection work.
  if (session && event.target instanceof Node && session.element.contains(event.target)) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }
  if (event.button !== 0 || event.defaultPrevented) return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  if (window.parent === window || session || recentlyDragged()) return;
  if (document.documentElement.hasAttribute("data-reordering")) return;
  // The insert plus floats over the page; a click on it belongs to the plus, not the text beneath.
  if (event.target instanceof Element && event.target.closest("[data-insert-anchor], [data-block-tab]")) return;
  const field = fieldAtPoint(event.clientX, event.clientY);
  if (!field) return;
  // Presentation would open the field in Studio and pull focus out of the page.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  begin(field, event.clientX, event.clientY);
}

/** Click a heading, button label, or other text to type into it on the page. Saves on Enter or when focus leaves. */
export function installTextEdit(save: Write) {
  write = save;
  if (installed) return;
  installed = true;
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onUndoKey);
}
